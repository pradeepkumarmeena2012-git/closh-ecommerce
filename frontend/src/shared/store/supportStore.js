import { create } from 'zustand';
import * as adminService from '../../modules/Admin/services/adminService';
import * as vendorService from '../../modules/Vendor/services/vendorService';
import api from '../utils/api';
import toast from 'react-hot-toast';
import socketService from '../utils/socket';

export const useSupportStore = create((set, get) => ({
    tickets: [],
    isLoading: false,
    error: null,
    pagination: {
        total: 0,
        page: 1,
        limit: 10,
        pages: 1
    },
    selectedTicket: null,
    _currentRole: null, // track which role is currently using the store

    fetchTickets: async (params = {}, role = 'admin') => {
        set({ isLoading: true, _currentRole: role });
        try {
            let response;
            if (role === 'admin') {
                response = await adminService.getAllTickets(params);
                // Join admin support room for real-time new tickets
                socketService.connect();
                socketService.joinRoom('admin_support');
                socketService.off('new_ticket');
                socketService.on('new_ticket', (newTicket) => {
                    const currentRole = get()._currentRole;
                    const filterType = params.type; // customer or vendor

                    // Only add if it matches the current view
                    if (currentRole === 'admin' && (!filterType || newTicket.type === filterType)) {
                        set(state => ({
                            tickets: [newTicket, ...state.tickets]
                        }));
                        toast.success(`New ${newTicket.type} support ticket!`);
                    }
                });
            } else if (role === 'vendor') {
                response = await vendorService.getVendorSupportTickets();
            } else {
                response = await api.get('/user/support/tickets');
            }

            const payload = response.data;
            console.log('📬 Support Tickets Payload:', payload);

            const ticketsList = role === 'admin' ? (payload?.tickets || []) : (payload || []);
            const paginationData = role === 'admin' ? (payload?.pagination || {}) : { total: ticketsList.length, page: 1, limit: 10, pages: 1 };

            set({
                tickets: ticketsList,
                pagination: paginationData,
                isLoading: false
            });
        } catch (error) {
            console.error('❌ Support Store Error:', error);
            set({ error: error.message, isLoading: false });
            toast.error(error.message || 'Failed to fetch tickets');
        }
    },

    fetchTicketById: async (id, role = 'admin') => {
        console.log(`🔍 Fetching ticket: ${id} as ${role}`);
        set({ isLoading: true });
        try {
            let response;
            if (role === 'admin') {
                response = await adminService.getTicketById(id);
            } else if (role === 'vendor') {
                response = await vendorService.getVendorSupportTicketById(id);
            } else {
                response = await api.get(`/user/support/tickets/${id}`);
            }

            console.log('✅ Ticket data received:', response.data);
            set({ selectedTicket: response.data, isLoading: false });
            return response.data;
        } catch (error) {
            console.error('❌ Fetch Ticket Error:', error);
            set({ isLoading: false });
            toast.error(error.message || 'Failed to fetch ticket details');
            return null;
        }
    },

    joinTicketRoom: (ticketId) => {
        socketService.connect();

        // Clear previous listeners to avoid duplicates
        socketService.off('new_support_message');

        // Wait a tiny bit for the socket connection to establish, then join room
        const doJoin = () => {
            socketService.joinRoom(`ticket_${ticketId}`);
            console.log(`📡 Joined support room: ticket_${ticketId}`);
        };

        // If socket is already connected, join immediately. Otherwise wait for connection.
        if (socketService.socket?.connected) {
            doJoin();
        } else {
            socketService.socket?.once('connect', doJoin);
        }

        // Listen for status updates
        socketService.on('ticket_status_updated', (updatedTicket) => {
            const currentSelected = get().selectedTicket;
            const updatedId = String(updatedTicket.id || updatedTicket._id);

            // Update in the list
            set(state => ({
                tickets: state.tickets.map(t =>
                    (String(t.id || t._id) === updatedId) ? { ...t, ...updatedTicket } : t
                ),
                // Update selected if it matches
                selectedTicket: (currentSelected && String(currentSelected.id || currentSelected._id) === updatedId)
                    ? { ...currentSelected, ...updatedTicket }
                    : currentSelected
            }));
        });

        // Listen for new messages
        socketService.on('new_support_message', (message) => {
            const currentSelected = get().selectedTicket;
            if (!currentSelected) return;

            const currentId = String(currentSelected.id || currentSelected._id);
            if (currentId !== String(ticketId)) return;

            const existingMsgs = currentSelected.messages || [];

            // Determine if the message came from the current user's role
            const currentRole = get()._currentRole;
            const isFromMe = (currentRole === 'admin' && message.senderType === 'admin') ||
                (currentRole === 'vendor' && message.senderType === 'vendor') ||
                (currentRole === 'customer' && message.senderType === 'user');

            if (isFromMe) {
                // If it's from me, find our optimistic 'me' message and replace it with the real one
                const optimisticIndex = existingMsgs.findIndex(m => m.senderId === 'me' && m.message === message.message);
                if (optimisticIndex > -1) {
                    const updatedMsgs = [...existingMsgs];
                    updatedMsgs[optimisticIndex] = message; // Replace with server version (proper timestamp/ID)
                    set({
                        selectedTicket: { ...currentSelected, messages: updatedMsgs }
                    });
                    return;
                }
            }

            // Otherwise, check for normal duplicates (prevent double-adding if room events overlap)
            const isDuplicate = existingMsgs.some(m =>
                m.message === message.message &&
                m.senderType === message.senderType &&
                (m._id === message._id || Math.abs(new Date(m.createdAt) - new Date(message.createdAt)) < 2000)
            );

            if (!isDuplicate) {
                set({
                    selectedTicket: {
                        ...currentSelected,
                        messages: [...existingMsgs, message]
                    }
                });
            }
        });
    },

    leaveTicketRoom: (ticketId) => {
        socketService.off('new_support_message');
        socketService.off('ticket_status_updated');
    },

    updateTicketStatus: async (id, status) => {
        try {
            await adminService.updateTicketStatus(id, status);

            const currentSelected = get().selectedTicket;
            const currentSelectedId = currentSelected ? String(currentSelected.id || currentSelected._id) : null;

            set((state) => ({
                tickets: state.tickets.map((t) =>
                    (t.id === id || t._id === id) ? { ...t, status } : t
                ),
                selectedTicket: (currentSelectedId === String(id))
                    ? { ...currentSelected, status }
                    : currentSelected
            }));
            toast.success('Status updated successfully');
            return true;
        } catch (error) {
            toast.error(error.message || 'Failed to update status');
            return false;
        }
    },

    addReply: async (id, message, role = 'admin') => {
        // Optimistic update: immediately show the sent message in the UI
        const currentSelected = get().selectedTicket;
        const optimisticMsg = {
            senderId: 'me',
            senderType: role === 'admin' ? 'admin' : role === 'vendor' ? 'vendor' : 'user',
            message: message,
            createdAt: new Date().toISOString()
        };

        if (currentSelected) {
            const currentId = String(currentSelected.id || currentSelected._id);
            if (String(id) === currentId) {
                set({
                    selectedTicket: {
                        ...currentSelected,
                        messages: [...(currentSelected.messages || []), optimisticMsg]
                    }
                });
            }
        }

        try {
            let response;
            if (role === 'admin') {
                response = await adminService.addTicketMessage(id, message);
            } else if (role === 'vendor') {
                response = await vendorService.addVendorTicketReply(id, message);
            } else {
                response = await api.post(`/user/support/tickets/${id}/messages`, { message });
            }

            return response.data;
        } catch (error) {
            // Rollback optimistic update on failure
            if (currentSelected) {
                set({ selectedTicket: currentSelected });
            }
            toast.error(error.message || 'Failed to send message');
            return null;
        }
    },

    createTicket: async (data, role = 'vendor') => {
        set({ isLoading: true });
        try {
            let response;
            if (role === 'vendor') {
                response = await vendorService.submitVendorHelpRequest(data.subject, data.description);
            } else {
                response = await api.post('/user/support/tickets', {
                    subject: data.subject,
                    message: data.description || data.message
                });
            }
            set({ isLoading: false });
            toast.success('Ticket created successfully');
            return response.data;
        } catch (error) {
            set({ isLoading: false });
            toast.error(error.message || 'Failed to create ticket');
            return null;
        }
    }
}));

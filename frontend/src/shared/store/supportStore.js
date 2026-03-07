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
            } else if (role === 'vendor') {
                response = await vendorService.getVendorSupportTickets();
            } else {
                response = await api.get('/user/support/tickets');
            }

            const payload = response.data;
            set({
                tickets: role === 'admin' ? payload.tickets : payload,
                pagination: role === 'admin' ? payload.pagination : { total: (payload || []).length, page: 1, limit: 10, pages: 1 },
                isLoading: false
            });
        } catch (error) {
            set({ error: error.message, isLoading: false });
            toast.error(error.message || 'Failed to fetch tickets');
        }
    },

    fetchTicketById: async (id, role = 'admin') => {
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

            set({ selectedTicket: response.data, isLoading: false });
            return response.data;
        } catch (error) {
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

        // Listen for new messages from the OTHER side
        socketService.on('new_support_message', (message) => {
            const currentSelected = get().selectedTicket;
            if (!currentSelected) return;

            const currentId = String(currentSelected.id || currentSelected._id);
            if (currentId !== String(ticketId)) return;

            // Prevent duplicates: check if message already exists
            const existingMsgs = currentSelected.messages || [];
            const isDuplicate = existingMsgs.some(m =>
                m.message === message.message &&
                m.senderType === message.senderType &&
                String(m.createdAt) === String(message.createdAt)
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
    },

    updateTicketStatus: async (id, status) => {
        try {
            await adminService.updateTicketStatus(id, status);
            set((state) => ({
                tickets: state.tickets.map((t) =>
                    (t.id === id || t._id === id) ? { ...t, status } : t
                )
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

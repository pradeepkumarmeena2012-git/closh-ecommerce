import React, { useState, useEffect, useRef } from 'react';
import { FiMessageSquare, FiSend, FiMail, FiPhoneCall, FiClock, FiPlus, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../../shared/utils/api';
import socketService from '../../../shared/utils/socket';
import { useSettingsStore } from '../../../shared/store/settingsStore';

const VendorHelp = () => {
    const { settings, initializePublic } = useSettingsStore();
    const [tickets, setTickets] = useState([]);
    const [ticketTypes, setTicketTypes] = useState([]);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const messagesEndRef = useRef(null);

    const vendorEmail = settings?.general?.vendorSupportEmail || "vendorsupport@clouse.com";
    const vendorPhone = settings?.general?.vendorSupportPhone || "+91 (800) 123-4567";

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const [formData, setFormData] = useState({
        subject: '',
        message: '',
        categoryId: '',
        priority: 'medium',
        status: 'open'
    });
    const [replyMessage, setReplyMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        initializePublic();
        fetchTickets();
        fetchTicketTypes();
    }, []);

    // Scroll to bottom when messages change
    useEffect(() => {
        if (selectedTicket) {
            scrollToBottom();
        }
    }, [selectedTicket?.messages]);

    // Real-time: join ticket room when a ticket is selected
    useEffect(() => {
        if (!selectedTicket) return;
        const ticketId = selectedTicket._id;
        socketService.connect();

        // Wait for connection before joining room
        const doJoin = () => {
            socketService.joinRoom(`ticket_${ticketId}`);
            console.log(`📡 Vendor joined support room: ticket_${ticketId}`);
        };

        if (socketService.socket?.connected) {
            doJoin();
        } else {
            socketService.socket?.once('connect', doJoin);
        }

        const handler = (message) => {
            setSelectedTicket((prev) => {
                if (!prev || prev._id !== ticketId) return prev;

                // Check if we have an optimistic version of this message
                const optimisticIdx = prev.messages.findIndex(m =>
                    m.isOptimistic &&
                    m.message === message.message &&
                    m.senderType === message.senderType
                );

                if (optimisticIdx !== -1) {
                    // Replace optimistic message with the real one from server
                    const newMessages = [...prev.messages];
                    newMessages[optimisticIdx] = message;
                    return { ...prev, messages: newMessages };
                }

                // Prevent duplicate messages by ID
                const isDuplicate = prev.messages.some(m =>
                    (m._id && message._id && m._id === message._id) ||
                    (m.message === message.message &&
                        m.senderType === message.senderType &&
                        Math.abs(new Date(m.createdAt) - new Date(message.createdAt)) < 5000)
                );
                if (isDuplicate) return prev;

                return {
                    ...prev,
                    messages: [...prev.messages, message]
                };
            });
        };
        socketService.on('new_support_message', handler);

        return () => {
            socketService.off('new_support_message');
        };
    }, [selectedTicket?._id]);

    const fetchTicketTypes = async () => {
        try {
            const response = await api.get('/vendor/support/ticket-types');
            setTicketTypes(response.data || []);
        } catch (error) {
            console.error('Failed to fetch ticket types:', error);
        }
    };

    const fetchTickets = async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/vendor/support/tickets');
            setTickets(response.data || []);
        } catch (error) {
            toast.error('Failed to fetch support history.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateSubmit = async (e) => {
        e.preventDefault();

        if (!formData.subject.trim() || !formData.message.trim()) {
            toast.error('Please fill in all fields');
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await api.post('/vendor/support/help-request', {
                subject: formData.subject,
                message: formData.message,
                categoryId: formData.categoryId,
                priority: formData.priority
            });

            toast.success('Help request submitted successfully!');
            setFormData({ subject: '', message: '', categoryId: '', priority: 'medium', status: 'open' });
            setIsCreating(false);

            // Refresh tickets and select the new one
            await fetchTickets();
            const newTicket = response.data;
            if (newTicket) {
                // Fetch might have already updated state, but let's re-find it
                setSelectedTicket(newTicket);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to submit request.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReplySubmit = async (e) => {
        e.preventDefault();

        if (!replyMessage.trim() || !selectedTicket) return;

        // Optimistic update: show message immediately
        const optimisticMsg = {
            senderId: 'vendor',
            senderType: 'vendor',
            message: replyMessage.trim(),
            createdAt: new Date().toISOString(),
            isOptimistic: true // Mark as optimistic to prevent double display
        };

        const previousTicket = { ...selectedTicket, messages: [...selectedTicket.messages] };

        setSelectedTicket({
            ...selectedTicket,
            messages: [...selectedTicket.messages, optimisticMsg],
            status: 'open'
        });
        setReplyMessage('');

        setIsSubmitting(true);
        try {
            await api.post(`/vendor/support/tickets/${selectedTicket._id}/messages`, {
                message: optimisticMsg.message
            });

            // Update in ticket list
            setTickets(tickets.map(t =>
                t._id === selectedTicket._id
                    ? { ...t, status: 'open' }
                    : t
            ));
        } catch (error) {
            // Rollback on failure
            setSelectedTicket(previousTicket);
            toast.error(error.response?.data?.message || 'Failed to send message.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'open':
            case 'in_progress':
                return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full font-medium">In Progress</span>;
            case 'resolved':
            case 'closed':
                return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">Closed</span>;
            default:
                return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full font-medium">{status}</span>;
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Support & Help</h1>
                    <p className="text-gray-500 mt-2">Manage your support requests and communicate with the admin.</p>
                </div>
                {!isCreating && !selectedTicket && (
                    <button
                        onClick={() => setIsCreating(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition"
                    >
                        <FiPlus size={18} /> New Request
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content Area */}
                <div className="lg:col-span-2">
                    {isCreating ? (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600">
                                        <FiMessageSquare size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900">Send New Request</h2>
                                        <p className="text-sm text-gray-500">We respond as soon as possible</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsCreating(false)} className="p-2 text-gray-400 hover:text-gray-600">
                                    <FiX size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleCreateSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Subject / Topic
                                        </label>
                                        <input
                                            type="text"
                                            name="subject"
                                            value={formData.subject}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-800 transition-colors"
                                            placeholder="e.g. Issue with payout"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Category
                                        </label>
                                        <select
                                            name="categoryId"
                                            value={formData.categoryId}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-800 transition-colors"
                                            required
                                        >
                                            <option value="">Select Category</option>
                                            {ticketTypes.map(type => (
                                                <option key={type.id} value={type.id}>{type.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Priority
                                        </label>
                                        <select
                                            name="priority"
                                            value={formData.priority}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-800 transition-colors"
                                        >
                                            <option value="low">Low</option>
                                            <option value="medium">Medium</option>
                                            <option value="high">High</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Status
                                        </label>
                                        <input
                                            type="text"
                                            value="Open"
                                            readOnly
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed font-medium uppercase text-xs tracking-wider"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Description
                                    </label>
                                    <textarea
                                        name="message"
                                        value={formData.message}
                                        onChange={handleChange}
                                        rows="6"
                                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-800 transition-colors resize-none"
                                        placeholder="Describe your issue..."
                                        required
                                    ></textarea>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl transition-all shadow-sm flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    <FiSend size={18} /> Submit
                                </button>
                            </form>
                        </div>
                    ) : selectedTicket ? (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[600px]">
                            {/* Chat Header */}
                            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-lg font-bold text-gray-900">{selectedTicket.subject}</h2>
                                        {getStatusBadge(selectedTicket.status)}
                                        {selectedTicket.ticketTypeId?.name && (
                                            <span className="px-2 py-1 bg-primary-50 text-primary-700 text-[10px] uppercase font-bold rounded-md">
                                                {selectedTicket.ticketTypeId.name}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">Ticket ID: {selectedTicket._id}</p>
                                </div>
                                <button onClick={() => setSelectedTicket(null)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl">
                                    <FiX size={20} />
                                </button>
                            </div>

                            {/* Chat Messages */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white">
                                {selectedTicket.messages.map((msg, idx) => (
                                    <div key={idx} className={`flex flex-col ${msg.senderType === 'vendor' ? 'items-end' : 'items-start'}`}>
                                        <div className={`max-w-[80%] p-3 text-sm rounded-2xl ${msg.senderType === 'vendor'
                                            ? 'bg-primary-600 text-white rounded-br-sm'
                                            : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
                                            }`}>
                                            {msg.message}
                                        </div>
                                        <span className="text-[10px] text-gray-400 mt-1">
                                            {msg.senderType === 'vendor' ? 'You' : 'Admin'} • {new Date(msg.createdAt).toLocaleTimeString()}
                                        </span>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Chat Input */}
                            <div className="p-4 bg-white border-t border-gray-100">
                                <form onSubmit={handleReplySubmit} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={replyMessage}
                                        onChange={(e) => setReplyMessage(e.target.value)}
                                        placeholder={selectedTicket.status === 'closed' ? "This ticket is closed" : "Type your reply..."}
                                        disabled={selectedTicket.status === 'closed' || isSubmitting}
                                        className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 text-sm disabled:cursor-not-allowed"
                                    />
                                    <button
                                        type="submit"
                                        disabled={selectedTicket.status === 'closed' || !replyMessage.trim() || isSubmitting}
                                        className="px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                    >
                                        <FiSend />
                                    </button>
                                </form>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 min-h-[400px]">
                            <h2 className="text-lg font-bold text-gray-900 mb-4">Your Recent Requests</h2>
                            {isLoading ? (
                                <p className="text-gray-500 text-center py-8">Loading history...</p>
                            ) : tickets.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                                        <FiMessageSquare size={24} />
                                    </div>
                                    <h3 className="text-gray-900 font-semibold mb-1">No requests right now</h3>
                                    <p className="text-gray-500 text-sm">If you need help, simply create a new request.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {tickets.map(ticket => (
                                        <div
                                            key={ticket._id}
                                            onClick={() => setSelectedTicket(ticket)}
                                            className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-white hover:text-black hover:border-primary-100 cursor-pointer transition"
                                        >
                                            <div className="flex-1 min-w-0 pr-4">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-semibold text-gray-900 truncate">{ticket.subject}</h3>
                                                    {getStatusBadge(ticket.status)}
                                                    {ticket.ticketTypeId?.name && (
                                                        <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                                                            {ticket.ticketTypeId.name}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-500 truncate">
                                                    {ticket.messages[ticket.messages.length - 1]?.message}
                                                </p>
                                                <p className="text-xs text-gray-400 mt-2">
                                                    Updated {new Date(ticket.updatedAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right side: Quick Info */}
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h3 className="font-bold text-gray-900 mb-4">Other Ways to Reach Us</h3>
                        <div className="space-y-4">
                            <div 
                                onClick={() => window.location.href = `mailto:${vendorEmail}?subject=Vendor%20Support%20Request`}
                                className="flex items-start gap-4 p-4 rounded-xl bg-white hover:bg-primary-50 transition cursor-pointer"
                            >
                                <div className="mt-1 text-primary-600"><FiMail size={20} /></div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900">Email Support</p>
                                    <p className="text-sm text-gray-500 mt-1">{vendorEmail}</p>
                                </div>
                            </div>
                            <div 
                                onClick={() => window.location.href = `tel:${vendorPhone.replace(/[^0-9+]/g, '')}`}
                                className="flex items-start gap-4 p-4 rounded-xl bg-white hover:bg-primary-50 transition cursor-pointer"
                            >
                                <div className="mt-1 text-primary-600"><FiPhoneCall size={20} /></div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900">Partner Helpline</p>
                                    <p className="text-sm text-gray-500 mt-1">{vendorPhone}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-primary-900 to-primary-800 rounded-2xl shadow-sm p-6 text-white text-center">
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                            <FiClock size={24} />
                        </div>
                        <h3 className="font-bold text-lg mb-2">Support Hours</h3>
                        <p className="text-primary-100 text-sm">
                            Our admin team is available Monday through Saturday.
                        </p>
                        <div className="mt-4 pt-4 border-t border-white/20">
                            <p className="font-semibold">09:00 AM - 07:00 PM (IST)</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VendorHelp;

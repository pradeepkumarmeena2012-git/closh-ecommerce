import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSupportStore } from '../../../../shared/store/supportStore';
import { useAuthStore } from '../../../../shared/store/authStore';
import AccountLayout from '../../components/Profile/AccountLayout';
import { FiMessageCircle, FiSend, FiClock, FiCheckCircle, FiInfo, FiPlus } from 'react-icons/fi';
import { ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SupportPage = () => {
    const { isAuthenticated, user } = useAuthStore();
    const {
        tickets,
        fetchTickets,
        fetchTicketById,
        selectedTicket,
        addReply,
        createTicket,
        joinTicketRoom,
        leaveTicketRoom,
        isLoading
    } = useSupportStore();

    const [activeChatId, setActiveChatId] = useState(null);
    const [newMessage, setNewMessage] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newTicket, setNewTicket] = useState({ subject: '', message: '' });
    const [searchParams] = useSearchParams();
    const messagesEndRef = useRef(null);

    useEffect(() => {
        const orderId = searchParams.get('orderId');
        if (orderId) {
            setShowCreateModal(true);
            setNewTicket(prev => ({ ...prev, subject: `Issue with Order #${orderId}` }));
        }
    }, [searchParams]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchTickets({}, 'customer');
        }
    }, [isAuthenticated, fetchTickets]);

    useEffect(() => {
        if (selectedTicket) {
            scrollToBottom();
        }
    }, [selectedTicket?.messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleSelectChat = async (id) => {
        if (activeChatId) {
            leaveTicketRoom(activeChatId);
        }
        setActiveChatId(id);
        const ticket = await fetchTicketById(id, 'customer');
        if (ticket) {
            joinTicketRoom(id);
        }
    };

    const handleSend = async () => {
        if (!newMessage.trim() || !activeChatId) return;
        await addReply(activeChatId, newMessage.trim(), 'customer');
        setNewMessage('');
    };

    const handleCreateTicket = async (e) => {
        e.preventDefault();
        if (!newTicket.subject || !newTicket.message) return;

        const result = await createTicket(newTicket, 'customer');
        if (result) {
            setShowCreateModal(false);
            setNewTicket({ subject: '', message: '' });
            handleSelectChat(result.id || result._id);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'open': return <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-[10px] font-bold uppercase">Open</span>;
            case 'in_progress': return <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-bold uppercase">Active</span>;
            case 'resolved': return <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 text-[10px] font-bold uppercase">Resolved</span>;
            default: return <span className="px-2 py-0.5 rounded-full bg-white0/10 text-gray-500 text-[10px] font-bold uppercase">{status}</span>;
        }
    };

    return (
        <AccountLayout>
            <div className="flex flex-col h-[75vh] min-h-[500px] md:h-[700px] bg-white overflow-hidden rounded-[32px] border border-gray-100 shadow-xl">
                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar: Chat List */}
                    <div className={`w-full md:w-80 flex flex-col border-r border-gray-100 ${activeChatId ? 'hidden md:flex' : 'flex'}`}>
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white/50 backdrop-blur-sm sticky top-0 z-10">
                            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Support</h2>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="p-2.5 bg-black text-white rounded-xl hover:bg-gray-800 transition-all shadow-lg active:scale-95"
                            >
                                <FiPlus size={20} strokeWidth={3} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-2 p-4 scrollbar-hide">
                            {tickets?.map(ticket => (
                                <button
                                    key={ticket.id || ticket._id}
                                    onClick={() => handleSelectChat(ticket.id || ticket._id)}
                                    className={`w-full text-left p-5 rounded-[24px] transition-all duration-300 group relative overflow-hidden ${activeChatId === (ticket.id || ticket._id)
                                        ? 'bg-black text-white shadow-xl scale-[1.02]'
                                        : 'hover:bg-gray-50 text-gray-700 bg-white border border-gray-100'}`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-[9px] font-black uppercase tracking-[0.1em] ${activeChatId === (ticket.id || ticket._id) ? 'text-white/40' : 'text-gray-400'}`}>
                                            #{(ticket.id || ticket._id).slice(-6)}
                                        </span>
                                        {activeChatId !== (ticket.id || ticket._id) && getStatusBadge(ticket.status)}
                                    </div>
                                    <p className={`font-black text-[14px] line-clamp-1 mb-2 uppercase tracking-tight ${activeChatId === (ticket.id || ticket._id) ? 'text-white' : 'text-gray-900'}`}>
                                        {ticket.subject}
                                    </p>
                                    <div className="flex items-center gap-2 opacity-50">
                                        <FiClock size={12} />
                                        <span className="text-[10px] font-black uppercase tracking-wider">{new Date(ticket.updatedAt).toLocaleDateString()}</span>
                                    </div>
                                </button>
                            ))}
                            {(!tickets || tickets.length === 0) && (
                                <div className="text-center py-20 px-6">
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <FiMessageCircle className="text-gray-200 text-3xl" />
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">No active conversations</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Chat Window */}
                    <div className={`flex-1 flex flex-col bg-gray-50 relative ${!activeChatId ? 'hidden md:flex' : 'flex'}`}>
                        {selectedTicket ? (
                            <>
                                {/* Chat Header */}
                                <div className="p-4 md:p-6 border-b border-gray-100 bg-white/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-20">
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => setActiveChatId(null)}
                                            className="md:hidden w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-all"
                                        >
                                            <ChevronLeft size={20} strokeWidth={3} />
                                        </button>
                                        <div>
                                            <h3 className="font-black text-gray-900 uppercase tracking-tight">{selectedTicket.subject}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Support Advisor Online</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="hidden sm:block">
                                        {getStatusBadge(selectedTicket.status)}
                                    </div>
                                </div>

                                {/* Messages */}
                                <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scrollbar-hide">
                                    {selectedTicket.messages?.map((msg, idx) => (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            key={idx}
                                            className={`flex ${msg.senderType === 'user' ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div className={`max-w-[85%] md:max-w-[70%] rounded-[28px] p-4 md:p-5 shadow-sm ${msg.senderType === 'user'
                                                ? 'bg-black text-white rounded-tr-none'
                                                : 'bg-white text-gray-900 rounded-tl-none border border-gray-100'
                                                }`}>
                                                <p className="text-[13px] md:text-[14px] leading-relaxed font-bold">{msg.message}</p>
                                                <div className={`text-[9px] font-black uppercase tracking-widest mt-3 flex items-center gap-2 ${msg.senderType === 'user' ? 'text-white/40' : 'text-gray-400'}`}>
                                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    {msg.senderType === 'user' && <FiCheckCircle size={10} />}
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Input Area */}
                                <div className="p-4 md:p-6 bg-white border-t border-gray-100">
                                    <div className="max-w-3xl mx-auto flex gap-3 items-center">
                                        <div className="flex-1 relative">
                                            <input
                                                type="text"
                                                value={newMessage}
                                                onChange={(e) => setNewMessage(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                                placeholder="Type your message..."
                                                className="w-full bg-gray-50 text-gray-900 border border-gray-100 rounded-[20px] px-6 py-4 text-[14px] font-bold focus:outline-none focus:border-black transition-all"
                                            />
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                                <button
                                                    onClick={handleSend}
                                                    className="p-3 bg-black text-white rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl"
                                                >
                                                    <FiSend size={18} strokeWidth={2.5} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white">
                                <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-8 shadow-inner">
                                    <FiMessageCircle className="text-5xl text-gray-200" />
                                </div>
                                <h3 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tight">Concierge Support</h3>
                                <p className="text-gray-400 text-[11px] max-w-[240px] font-black uppercase tracking-widest mb-10 leading-relaxed">Select a conversation or start a new inquiry to speak with our style advisors.</p>
                                <button
                                    onClick={() => setShowCreateModal(true)}
                                    className="px-10 py-4 bg-black text-white rounded-2xl font-black uppercase tracking-widest text-[12px] shadow-2xl hover:bg-gray-800 transition-all active:scale-95"
                                >
                                    New Inquiry
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Create Ticket Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowCreateModal(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative bg-white w-full max-w-md rounded-[32px] border border-gray-200 shadow-2xl p-8 overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-6">
                                <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-white transition-colors">&times;</button>
                            </div>

                            <h3 className="text-2xl font-bold text-gray-900 mb-2  uppercase">New Inquiry</h3>
                            <p className="text-gray-400 text-[12px] mb-8 font-medium">Please describe your concern and our advisors will get back to you.</p>

                            <form onSubmit={handleCreateTicket} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Subject</label>
                                    <input
                                        type="text"
                                        required
                                        value={newTicket.subject}
                                        onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 text-gray-900 focus:outline-none focus:border-black transition-all"
                                        placeholder="Order ID / Payment Issue / General"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Message</label>
                                    <textarea
                                        required
                                        value={newTicket.message}
                                        onChange={(e) => setNewTicket({ ...newTicket, message: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 text-gray-900 h-32 resize-none focus:outline-none focus:border-black transition-all"
                                        placeholder="Describe your issue in detail..."
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full py-5 bg-black text-white rounded-full font-bold uppercase text-[13px] shadow-[0_15px_30px_rgba(212,175,55,0.2)] disabled:opacity-50"
                                >
                                    {isLoading ? 'Sending...' : 'Send Inquiry'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </AccountLayout>
    );
};

export default SupportPage;

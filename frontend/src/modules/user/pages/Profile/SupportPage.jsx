import React, { useState, useEffect, useRef } from 'react';
import { useSupportStore } from '../../../../shared/store/supportStore';
import { useAuthStore } from '../../../../shared/store/authStore';
import AccountLayout from '../../components/Profile/AccountLayout';
import { FiMessageCircle, FiSend, FiClock, FiCheckCircle, FiInfo, FiPlus } from 'react-icons/fi';
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
    const messagesEndRef = useRef(null);

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
            case 'open': return <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-[10px] font-black uppercase">Open</span>;
            case 'in_progress': return <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-black uppercase">Active</span>;
            case 'resolved': return <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 text-[10px] font-black uppercase">Resolved</span>;
            default: return <span className="px-2 py-0.5 rounded-full bg-gray-500/10 text-gray-500 text-[10px] font-black uppercase">{status}</span>;
        }
    };

    return (
        <AccountLayout>
            <div className="flex flex-col h-[600px] md:h-[700px] bg-[#111111] overflow-hidden rounded-[24px]">
                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar: Chat List */}
                    <div className={`w-full md:w-80 flex flex-col border-r border-white/5 ${activeChatId ? 'hidden md:flex' : 'flex'}`}>
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <h2 className="text-xl font-black text-[#FAFAFA] tracking-tight">Support</h2>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="p-2 bg-[#D4AF37] text-black rounded-xl hover:bg-[#FAFAFA] transition-all"
                            >
                                <FiPlus size={20} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-1 p-3 scrollbar-hide">
                            {tickets?.map(ticket => (
                                <button
                                    key={ticket.id || ticket._id}
                                    onClick={() => handleSelectChat(ticket.id || ticket._id)}
                                    className={`w-full text-left p-4 rounded-2xl transition-all duration-300 group ${activeChatId === (ticket.id || ticket._id)
                                        ? 'bg-[#D4AF37] text-black'
                                        : 'hover:bg-white/5 text-white/70'}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`text-[10px] font-black uppercase tracking-wider ${activeChatId === (ticket.id || ticket._id) ? 'text-black/60' : 'text-white/30'}`}>
                                            #{(ticket.id || ticket._id).slice(-6)}
                                        </span>
                                        {activeChatId !== (ticket.id || ticket._id) && getStatusBadge(ticket.status)}
                                    </div>
                                    <p className={`font-bold text-[14px] line-clamp-1 mb-1 ${activeChatId === (ticket.id || ticket._id) ? 'text-black' : 'text-[#FAFAFA]'}`}>
                                        {ticket.subject}
                                    </p>
                                    <div className="flex items-center gap-2 opacity-60">
                                        <FiClock size={10} />
                                        <span className="text-[10px] font-medium">{new Date(ticket.updatedAt).toLocaleDateString()}</span>
                                    </div>
                                </button>
                            ))}
                            {(!tickets || tickets.length === 0) && (
                                <div className="text-center py-20 px-6 opacity-30">
                                    <FiMessageCircle className="mx-auto text-4xl mb-4" />
                                    <p className="text-sm font-bold">No active conversations</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Chat Window */}
                    <div className={`flex-1 flex flex-col bg-[#0a0a0a] relative ${!activeChatId ? 'hidden md:flex' : 'flex'}`}>
                        {selectedTicket ? (
                            <>
                                {/* Chat Header */}
                                <div className="p-4 md:p-6 border-b border-white/5 bg-[#111111]/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-10">
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => setActiveChatId(null)}
                                            className="md:hidden text-white/50 hover:text-white"
                                        >
                                            &larr;
                                        </button>
                                        <div>
                                            <h3 className="font-black text-[#FAFAFA] tracking-tight">{selectedTicket.subject}</h3>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Support Agent Online</span>
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
                                            <div className={`max-w-[85%] md:max-w-[70%] rounded-[24px] p-4 md:p-5 ${msg.senderType === 'user'
                                                ? 'bg-[#D4AF37] text-black rounded-tr-none shadow-[0_10px_30px_rgba(212,175,55,0.1)]'
                                                : 'bg-[#1a1a1a] text-[#FAFAFA] rounded-tl-none border border-white/5 shadow-2xl'
                                                }`}>
                                                <p className="text-[14px] leading-relaxed font-medium">{msg.message}</p>
                                                <div className={`text-[9px] font-black uppercase tracking-widest mt-2 flex items-center gap-1.5 ${msg.senderType === 'user' ? 'text-black/40' : 'text-white/30'}`}>
                                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    {msg.senderType === 'user' && <FiCheckCircle size={10} />}
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Input Area */}
                                <div className="p-4 md:p-6 bg-[#111111] border-t border-white/5">
                                    <div className="max-w-3xl mx-auto flex gap-3 items-center">
                                        <div className="flex-1 relative group">
                                            <input
                                                type="text"
                                                value={newMessage}
                                                onChange={(e) => setNewMessage(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                                placeholder="Ask us anything..."
                                                className="w-full bg-[#1a1a1a] text-[#FAFAFA] border border-white/10 rounded-full px-6 py-4 text-[14px] focus:outline-none focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/20 transition-all placeholder-white/20"
                                            />
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                                <button
                                                    onClick={handleSend}
                                                    className="p-2.5 bg-[#D4AF37] text-black rounded-full hover:scale-105 active:scale-95 transition-all shadow-[0_5px_15px_rgba(212,175,55,0.2)]"
                                                >
                                                    <FiSend size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6">
                                    <FiMessageCircle className="text-4xl text-[#D4AF37]" />
                                </div>
                                <h3 className="text-2xl font-black text-[#FAFAFA] mb-2 tracking-tight uppercase">Support Center</h3>
                                <p className="text-white/40 text-sm max-w-[280px] font-medium mb-8">Select a conversation or start a new ticket to talk to our luxury style advisors.</p>
                                <button
                                    onClick={() => setShowCreateModal(true)}
                                    className="px-8 py-4 bg-[#D4AF37] text-black rounded-full font-black uppercase text-[12px] tracking-[0.2em] shadow-[0_15px_30px_rgba(212,175,55,0.2)] hover:bg-[#FAFAFA] transition-all active:scale-95"
                                >
                                    Start New Inquiry
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
                            className="relative bg-[#111111] w-full max-w-md rounded-[32px] border border-white/10 shadow-2xl p-8 overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-6">
                                <button onClick={() => setShowCreateModal(false)} className="text-white/30 hover:text-white transition-colors">&times;</button>
                            </div>

                            <h3 className="text-2xl font-black text-[#FAFAFA] mb-2 tracking-tight uppercase">New Inquiry</h3>
                            <p className="text-white/40 text-[12px] mb-8 font-medium">Please describe your concern and our advisors will get back to you.</p>

                            <form onSubmit={handleCreateTicket} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Subject</label>
                                    <input
                                        type="text"
                                        required
                                        value={newTicket.subject}
                                        onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                                        className="w-full bg-[#1a1a1a] border border-white/10 rounded-2xl px-5 py-4 text-[#FAFAFA] focus:outline-none focus:border-[#D4AF37] transition-all"
                                        placeholder="Order ID / Payment Issue / General"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Message</label>
                                    <textarea
                                        required
                                        value={newTicket.message}
                                        onChange={(e) => setNewTicket({ ...newTicket, message: e.target.value })}
                                        className="w-full bg-[#1a1a1a] border border-white/10 rounded-2xl px-5 py-4 text-[#FAFAFA] h-32 resize-none focus:outline-none focus:border-[#D4AF37] transition-all"
                                        placeholder="Describe your issue in detail..."
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full py-5 bg-[#D4AF37] text-black rounded-full font-black uppercase text-[13px] tracking-[0.2em] shadow-[0_15px_30px_rgba(212,175,55,0.2)] disabled:opacity-50"
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

import { useState, useEffect, useRef } from 'react';
import { FiMessageCircle, FiX, FiSend, FiMinus, FiLoader } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useSupportStore } from '../../../../shared/store/supportStore';
import { useAuthStore } from '../../../../shared/store/authStore';
import toast from 'react-hot-toast';

const SupportChatWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState('list'); // 'list' or 'chat' or 'create'
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

    const [message, setMessage] = useState('');
    const [newTicketData, setNewTicketData] = useState({ subject: '', message: '' });
    const chatEndRef = useRef(null);

    useEffect(() => {
        if (isOpen && isAuthenticated) {
            fetchTickets({}, 'customer');
        }
    }, [isOpen, isAuthenticated, fetchTickets]);

    useEffect(() => {
        if (selectedTicket) {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [selectedTicket?.messages]);

    const handleOpenTicket = async (id) => {
        const ticket = await fetchTicketById(id, 'customer');
        if (ticket) {
            joinTicketRoom(id);
            setView('chat');
        }
    };

    const handleSendMessage = async () => {
        if (!message.trim() || !selectedTicket) return;
        const id = selectedTicket.id || selectedTicket._id;
        await addReply(id, message.trim(), 'customer');
        setMessage('');
    };

    const handleCreateTicket = async (e) => {
        e.preventDefault();
        if (!newTicketData.subject || !newTicketData.message) return;
        const ticket = await createTicket(newTicketData, 'customer');
        if (ticket) {
            setNewTicketData({ subject: '', message: '' });
            handleOpenTicket(ticket.id || ticket._id);
        }
    };

    const closeChat = () => {
        if (selectedTicket) {
            const id = selectedTicket.id || selectedTicket._id;
            leaveTicketRoom(id);
        }
        setIsOpen(false);
    };

    if (!isAuthenticated) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[9999]">
            <AnimatePresence>
                {isOpen ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="bg-white rounded-2xl shadow-2xl w-[350px] sm:w-[400px] h-[500px] flex flex-col overflow-hidden border border-gray-100"
                    >
                        {/* Header */}
                        <div className="bg-primary-600 p-4 text-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/20 rounded-lg">
                                    <FiMessageCircle className="text-xl" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm">Customer Support</h3>
                                    <span className="text-[10px] text-primary-100 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                                        We're online
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded">
                                    <FiMinus />
                                </button>
                                <button onClick={closeChat} className="p-1 hover:bg-white/20 rounded">
                                    <FiX />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto bg-gray-50 flex flex-col relative">
                            {isLoading && (
                                <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] z-50 flex items-center justify-center">
                                    <FiLoader className="text-3xl text-primary-600 animate-spin" />
                                </div>
                            )}
                            {view === 'list' && (
                                <div className="p-4 space-y-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-sm font-semibold text-gray-700">Your Tickets</h4>
                                        <button
                                            onClick={() => setView('create')}
                                            className="text-xs text-primary-600 font-bold hover:underline"
                                        >
                                            + New Ticket
                                        </button>
                                    </div>
                                    {(tickets || []).map((ticket) => (
                                        <button
                                            key={ticket.id || ticket._id}
                                            onClick={() => handleOpenTicket(ticket.id || ticket._id)}
                                            className="w-full text-left p-3 bg-white rounded-xl border border-gray-100 hover:border-primary-300 hover:shadow-md transition-all shadow-sm"
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-xs font-bold text-primary-600">#{(ticket.id || ticket._id).slice(-6)}</span>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${ticket.status === 'open' ? 'bg-red-100 text-red-600' :
                                                    ticket.status === 'in_progress' ? 'bg-blue-100 text-blue-600' :
                                                        'bg-green-100 text-green-600'
                                                    }`}>
                                                    {ticket.status}
                                                </span>
                                            </div>
                                            <p className="text-sm font-semibold line-clamp-1">{ticket.subject}</p>
                                            <span className="text-[10px] text-gray-400 mt-1 block">
                                                Last reply: {new Date(ticket.lastMessageAt || ticket.updatedAt).toLocaleDateString()}
                                            </span>
                                        </button>
                                    ))}
                                    {(!tickets || tickets.length === 0) && (
                                        <div className="text-center py-20 px-6">
                                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <FiMessageCircle className="text-2xl text-gray-400" />
                                            </div>
                                            <h5 className="font-bold text-gray-700 mb-1">How can we help?</h5>
                                            <p className="text-xs text-gray-500 mb-4">You haven't started any support chats yet.</p>
                                            <button
                                                onClick={() => setView('create')}
                                                className="bg-primary-600 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-lg shadow-primary-200"
                                            >
                                                Start a Conversation
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {view === 'create' && (
                                <div className="p-6 flex-1 flex flex-col justify-center">
                                    <button
                                        onClick={() => setView('list')}
                                        className="mb-4 text-xs text-primary-600 font-bold flex items-center gap-1 hover:underline"
                                    >
                                        &larr; Back to list
                                    </button>
                                    <h4 className="font-bold text-gray-800 mb-4">Start New Ticket</h4>
                                    <form onSubmit={handleCreateTicket} className="space-y-4">
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 mb-1 block">Subject</label>
                                            <input
                                                type="text"
                                                required
                                                value={newTicketData.subject}
                                                onChange={(e) => setNewTicketData({ ...newTicketData, subject: e.target.value })}
                                                placeholder="What's this regarding?"
                                                className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 mb-1 block">Message</label>
                                            <textarea
                                                required
                                                value={newTicketData.message}
                                                onChange={(e) => setNewTicketData({ ...newTicketData, message: e.target.value })}
                                                placeholder="Tell us more about your issue..."
                                                rows="4"
                                                className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            className="w-full bg-primary-600 text-white rounded-lg py-3 font-bold shadow-lg shadow-primary-200 mt-2"
                                        >
                                            Start Support Ticket
                                        </button>
                                    </form>
                                </div>
                            )}

                            {view === 'chat' && selectedTicket && (
                                <div className="flex flex-col flex-1">
                                    <div className="bg-white p-2 border-b border-gray-100 flex items-center justify-between">
                                        <button
                                            onClick={() => {
                                                leaveTicketRoom(selectedTicket.id || selectedTicket._id);
                                                setView('list');
                                            }}
                                            className="text-xs text-primary-600 font-bold flex items-center gap-1 p-1 hover:bg-gray-50 rounded"
                                        >
                                            &larr; Back
                                        </button>
                                        <p className="text-xs font-bold truncate max-w-[200px]">{selectedTicket.subject}</p>
                                        <div className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${selectedTicket.status === 'open' ? 'bg-red-100 text-red-600' :
                                            'bg-blue-100 text-blue-600'
                                            }`}>
                                            {selectedTicket.status}
                                        </div>
                                    </div>
                                    <div className="flex-1 p-4 overflow-y-auto space-y-4">
                                        {(selectedTicket.messages || []).map((msg, idx) => (
                                            <div key={idx} className={`flex ${msg.senderType === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[85%] rounded-2xl p-3 ${msg.senderType === 'user'
                                                    ? 'bg-primary-600 text-white rounded-tr-none'
                                                    : 'bg-white text-gray-800 rounded-tl-none border border-gray-100 shadow-sm'
                                                    }`}>
                                                    <p className="text-sm">{msg.message}</p>
                                                    <span className={`text-[10px] block mt-1 ${msg.senderType === 'user' ? 'text-primary-100' : 'text-gray-400'}`}>
                                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                        <div ref={chatEndRef} />
                                    </div>
                                    <div className="p-4 bg-white border-t border-gray-100 flex gap-2">
                                        <input
                                            type="text"
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                            placeholder="Type a message..."
                                            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                                        />
                                        <button
                                            onClick={handleSendMessage}
                                            className="bg-primary-600 text-white p-2.5 rounded-xl shadow-lg shadow-primary-200"
                                        >
                                            <FiSend />
                                        </button>
                                    </div>
                                </div>
                            )}
                            {view === 'chat' && !selectedTicket && !isLoading && (
                                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white">
                                    <FiMessageCircle className="text-4xl text-gray-200 mb-4" />
                                    <h4 className="font-bold text-gray-700">Ticket not found</h4>
                                    <p className="text-xs text-gray-500 mt-2">We couldn't load this conversation.</p>
                                    <button
                                        onClick={() => setView('list')}
                                        className="mt-6 text-sm text-primary-600 font-bold hover:underline"
                                    >
                                        Back to list
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                ) : (
                    <motion.button
                        layoutId="support-btn"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsOpen(true)}
                        className="bg-primary-600 text-white p-4 rounded-full shadow-2xl flex items-center justify-center group"
                    >
                        <FiMessageCircle className="text-2xl" />
                        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap ml-0 group-hover:ml-2 font-bold text-sm">
                            Support
                        </span>
                    </motion.button>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SupportChatWidget;

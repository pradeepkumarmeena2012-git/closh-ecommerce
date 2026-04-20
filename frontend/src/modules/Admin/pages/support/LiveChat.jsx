import { useState, useEffect, useMemo, useRef } from 'react';
import { FiMessageCircle, FiSend, FiUser, FiCheckCircle } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useSupportStore } from '../../../../shared/store/supportStore';

const LiveChat = ({ type = 'customer' }) => {
  const {
    tickets,
    isLoading,
    fetchTickets,
    fetchTicketById,
    addReply,
    updateTicketStatus,
    selectedTicket,
    joinTicketRoom,
    leaveTicketRoom
  } = useSupportStore();
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (selectedTicket?.messages) {
      scrollToBottom();
    }
  }, [selectedTicket?.messages]);

  useEffect(() => {
    fetchTickets({ limit: 200, type });
  }, [fetchTickets, type]);

  const chats = useMemo(() => {
    return (tickets || [])
      .filter((ticket) => ['open', 'in_progress'].includes(ticket.status))
      .map((ticket) => {
        const lastMessage = ticket.messages?.[ticket.messages.length - 1];
        return {
          id: ticket.id,
          customerName: ticket.customer?.name || 'Anonymous',
          // Correctly reference the ID
          lastMessage: lastMessage?.message || ticket.subject || 'No messages yet',
          unreadCount: ticket.isReadByAdmin ? 0 : 1, // Simple unread indicator
          status: ticket.status,
          lastActivity: ticket.lastMessageAt || ticket.updatedAt || ticket.createdAt,
        };
      });
  }, [tickets]);

  const handleSelectChat = async (chat) => {
    if (selectedTicket?.id) {
      leaveTicketRoom(selectedTicket.id);
    }
    const detail = await fetchTicketById(chat.id);
    if (detail) {
      joinTicketRoom(chat.id);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket?.id) return;
    const sent = await addReply(selectedTicket.id, newMessage.trim());
    if (sent) setNewMessage('');
  };

  const handleResolve = async () => {
    if (!selectedTicket?.id) return;
    if (window.confirm('Are you sure you want to resolve this ticket?')) {
      await updateTicketStatus(selectedTicket.id, 'resolved');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="lg:hidden">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
          {type === 'customer' ? 'Customer' : 'Vendor'} Live Chat
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          Manage {type === 'customer' ? 'customer' : 'vendor'} support chats
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800">Active Chats</h3>
          </div>
          <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
            {isLoading && chats.length === 0 ? (
              <div className="flex justify-center p-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : chats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => handleSelectChat(chat)}
                className={`p-4 cursor-pointer hover:bg-white hover:text-black transition-colors ${selectedTicket?.id === chat.id ? 'bg-primary-50' : ''
                  }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FiUser className="text-gray-400" />
                    <span className="font-semibold text-gray-800">{chat.customerName}</span>
                  </div>
                  {chat.unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {chat.unreadCount}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 truncate">{chat.lastMessage}</p>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-xs text-gray-400">
                    {chat.lastActivity ? new Date(chat.lastActivity).toLocaleTimeString() : 'N/A'}
                  </p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full uppercase font-bold ${chat.status === 'open' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                    {chat.status}
                  </span>
                </div>
              </div>
            ))}
            {!isLoading && chats.length === 0 && (
              <div className="p-6 text-center text-gray-500 text-sm">
                No active support chats.
              </div>
            )}
          </div>
        </div>

        {selectedTicket ? (
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800">{selectedTicket.customer?.name || 'Anonymous'}</h3>
                <p className="text-xs text-gray-500">Ticket ID: {selectedTicket.id}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${selectedTicket.status === 'resolved' ? 'bg-green-100 text-green-700' :
                    selectedTicket.status === 'open' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                  {selectedTicket.status}
                </span>
                {selectedTicket.status !== 'resolved' && (
                  <button
                    onClick={handleResolve}
                    className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <FiCheckCircle /> Resolve
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[500px]">
              {(selectedTicket.messages || []).map((msg, idx) => (
                <div
                  key={`${msg.createdAt || idx}-${idx}`}
                  className={`flex ${msg.senderType === 'admin' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${msg.senderType === 'admin'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-800'
                    }`}>
                    <p>{msg.message}</p>
                    <p className={`text-xs mt-1 ${msg.senderType === 'admin' ? 'text-primary-100' : 'text-gray-500'
                      }`}>
                      {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString() : ''}
                    </p>
                  </div>
                </div>
              ))}
              {(!selectedTicket.messages || selectedTicket.messages.length === 0) && (
                <p className="text-center text-gray-500 text-sm">No messages yet.</p>
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  onClick={handleSendMessage}
                  className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <FiSend />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 flex items-center justify-center p-12">
            <div className="text-center">
              <FiMessageCircle className="mx-auto text-4xl text-gray-400 mb-4" />
              <p className="text-gray-500">Select a chat to start conversation</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default LiveChat;


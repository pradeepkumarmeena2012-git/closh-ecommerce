import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FiMessageSquare,
  FiSearch,
  FiPlus,
  FiEye,
  FiArrowLeft,
  FiCalendar,
  FiTag,
  FiSend,
} from "react-icons/fi";
import { motion } from "framer-motion";
import DataTable from "../../Admin/components/DataTable";
import Badge from "../../../shared/components/Badge";
import AnimatedSelect from "../../Admin/components/AnimatedSelect";
import { useSupportStore } from "../../../shared/store/supportStore";
import toast from "react-hot-toast";

const SupportTickets = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const {
    tickets,
    isLoading,
    fetchTickets,
    fetchTicketById,
    selectedTicket,
    joinTicketRoom,
    leaveTicketRoom,
    addReply,
    createTicket
  } = useSupportStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchTickets({}, 'vendor');
  }, [fetchTickets]);

  const filteredTickets = useMemo(() => {
    return (Array.isArray(tickets) ? tickets : []).filter((ticket) => {
      const matchesSearch =
        !searchQuery ||
        (ticket.id || ticket._id)?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.subject?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || ticket.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [tickets, searchQuery, statusFilter]);

  const handleSave = async (ticketData) => {
    const success = await createTicket(ticketData, 'vendor');
    if (success) {
      setShowForm(false);
      fetchTickets({}, 'vendor');
    }
  };

  const getStatusVariant = (status) => {
    const statusMap = {
      open: "error",
      in_progress: "warning",
      resolved: "success",
      closed: "default",
    };
    return statusMap[status] || "default";
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: "bg-red-100 text-red-800",
      medium: "bg-yellow-100 text-yellow-800",
      low: "bg-blue-100 text-blue-800",
    };
    return colors[priority] || "bg-gray-100 text-gray-800";
  };

  const columns = [
    {
      key: "id",
      label: "Ticket ID",
      sortable: true,
      render: (_, row) => (
        <span className="font-semibold text-gray-800">{row.id || row._id}</span>
      ),
    },
    {
      key: "subject",
      label: "Subject",
      sortable: true,
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (value) => (
        <Badge variant={getStatusVariant(value)}>{value}</Badge>
      ),
    },
    {
      key: "createdAt",
      label: "Created",
      sortable: true,
      render: (value) => new Date(value).toLocaleDateString(),
    },
    {
      key: "actions",
      label: "Actions",
      render: (_, row) => (
        <button
          onClick={() => navigate(`/vendor/support-tickets/${row.id || row._id}`)}
          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
          <FiEye />
        </button>
      ),
    },
  ];

  useEffect(() => {
    if (id) {
      fetchTicketById(id, 'vendor').then(ticket => {
        if (ticket) joinTicketRoom(id);
      });
    }
    return () => {
      if (id) leaveTicketRoom(id);
    };
  }, [id, fetchTicketById, joinTicketRoom, leaveTicketRoom]);

  // Render detail view if ID is present
  if (id && selectedTicket) {
    return (
      <TicketDetail
        ticket={selectedTicket}
        navigate={navigate}
        getStatusVariant={getStatusVariant}
        getPriorityColor={getPriorityColor}
        addReply={addReply}
      />
    );
  }

  // Render list view
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2 flex items-center gap-2">
            <FiMessageSquare className="text-primary-600" />
            Support Tickets
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Create and manage support tickets
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold">
          <FiPlus />
          <span>Create Ticket</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 sm:gap-4">
          <div className="relative flex-1 w-full sm:min-w-[200px]">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tickets..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm sm:text-base"
            />
          </div>

          <AnimatedSelect
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: "all", label: "All Status" },
              { value: "open", label: "Open" },
              { value: "in_progress", label: "In Progress" },
              { value: "resolved", label: "Resolved" },
              { value: "closed", label: "Closed" },
            ]}
            className="w-full sm:w-auto min-w-[140px]"
          />
        </div>
      </div>

      {/* Tickets Table */}
      {filteredTickets.length > 0 ? (
        <DataTable
          data={filteredTickets}
          columns={columns}
          pagination={true}
          itemsPerPage={10}
        />
      ) : (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
          <FiMessageSquare className="mx-auto text-4xl text-gray-300 mb-4" />
          <p className="text-gray-500">No tickets found. Start a new ticket to get help.</p>
        </div>
      )}

      {showForm && (
        <TicketForm onSave={handleSave} onClose={() => setShowForm(false)} />
      )}
    </motion.div>
  );
};

const TicketDetail = ({
  ticket,
  navigate,
  getStatusVariant,
  getPriorityColor,
  addReply,
}) => {
  const [message, setMessage] = useState("");
  const messages = ticket.messages || [];

  const handleSend = async () => {
    if (!message.trim()) return;
    await addReply(ticket.id || ticket._id, message.trim(), 'vendor');
    setMessage("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate("/vendor/support-tickets")}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <FiArrowLeft className="text-xl" />
        </button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
            {ticket.subject}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Ticket ID: {ticket.id || ticket._id}
          </p>
        </div>
        <div className="ml-auto">
          <Badge variant={getStatusVariant(ticket.status)}>
            {ticket.status}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat Area */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-[500px]">
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.senderType === 'vendor' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-lg p-3 ${msg.senderType === 'vendor'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                    }`}>
                    <p className="text-sm">{msg.message}</p>
                    <span className="text-[10px] opacity-70 mt-1 block">
                      {new Date(msg.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
              {messages.length === 0 && (
                <div className="text-center py-20 text-gray-400">
                  No messages yet.
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type your message..."
                className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                onClick={handleSend}
                className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <FiSend />
              </button>
            </div>
          </div>
        </div>

        {/* Info Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100">Details</h3>
            <div className="space-y-4">
              <div>
                <span className="text-xs text-gray-500 block">Priority</span>
                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase mt-1 ${getPriorityColor(ticket.priority)}`}>
                  {ticket.priority}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Created On</span>
                <span className="text-sm font-medium text-gray-700">
                  {new Date(ticket.createdAt).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Type</span>
                <span className="text-sm font-medium text-gray-700">
                  {ticket.type || 'General'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const TicketForm = ({ onSave, onClose }) => {
  const [formData, setFormData] = useState({
    subject: "",
    type: "Technical Support",
    priority: "medium",
    description: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[10000] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <h3 className="text-lg font-bold mb-4">Create Support Ticket</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">
              Subject *
            </label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) =>
                setFormData({ ...formData, subject: e.target.value })
              }
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Type</label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none">
                <option>Technical Support</option>
                <option>Billing Inquiry</option>
                <option>Product Inquiry</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) =>
                  setFormData({ ...formData, priority: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              required
              rows="6"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold">
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold shadow-lg shadow-primary-200">
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SupportTickets;

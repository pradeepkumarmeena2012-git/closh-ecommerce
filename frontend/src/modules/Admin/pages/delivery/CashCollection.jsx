import { useState, useEffect } from "react";
import {
  FiSearch,
  FiDollarSign,
  FiCheckCircle,
  FiClock,
  FiX,
} from "react-icons/fi";
import { motion } from "framer-motion";
import DataTable from "../../components/DataTable";
import Pagination from "../../components/Pagination";
import Badge from "../../../../shared/components/Badge";
import AnimatedSelect from "../../components/AnimatedSelect";
import { formatCurrency } from "../../utils/adminHelpers";
import { settleCash as settleCashApi, getAllDeliveryBoys, getCashHistory } from "../../services/adminService";

const CashCollection = () => {
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending"); // Default to pending collection
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    pages: 1,
  });
  const [isSettlingId, setIsSettlingId] = useState(null);
  const [historyModal, setHistoryModal] = useState({ open: false, data: [], loading: false, boy: null });
  const [serverStats, setServerStats] = useState({ totalLifetime: 0, pendingSettlement: 0 });
  const itemsPerPage = 20;

  useEffect(() => {
    const timer = setTimeout(() => {
      const fetchPage = async () => {
        try {
          const response = await getAllDeliveryBoys({
            search: searchQuery || undefined,
            page: currentPage,
            limit: itemsPerPage,
          });
          const rows = (response?.data?.deliveryBoys || []).map((boy) => ({
            ...boy,
            id: boy.id || boy._id,
            cashInHand: Number(boy.cashInHand ?? boy.stats?.cashInHand ?? 0),
            totalDeliveries: Number(boy.totalDeliveries ?? boy.stats?.totalDeliveries ?? 0),
            cashCollected: Number(boy.cashCollected || 0),
          }));
          setDeliveryBoys(rows);
          setServerStats(response?.data?.summary || { totalLifetime: 0, pendingSettlement: 0 });
          setPagination(response?.data?.pagination || {
            total: rows.length,
            page: 1,
            limit: itemsPerPage,
            pages: 1,
          });
        } catch {
          setDeliveryBoys([]);
        }
      };
      fetchPage();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const boysWithCash = deliveryBoys.filter(boy => {
    const hasCash = (boy.cashInHand || 0) > 0;
    if (statusFilter === 'pending') return hasCash;
    if (statusFilter === 'settled') return !hasCash;
    return true;
  });

  const totalCollected = serverStats.totalLifetime;
  const totalPending = serverStats.pendingSettlement;

  const handleSettleCash = async (row) => {
    if (!row?.id || Number(row.cashInHand || 0) <= 0) return;
    setIsSettlingId(row.id);
    try {
      await settleCashApi(row.id);
      const response = await getAllDeliveryBoys({
        search: searchQuery || undefined,
        page: currentPage,
        limit: itemsPerPage,
      });
      const rows = (response?.data?.deliveryBoys || []).map((boy) => ({
        ...boy,
        id: boy.id || boy._id,
        cashInHand: Number(boy.cashInHand ?? boy.stats?.cashInHand ?? 0),
        totalDeliveries: Number(boy.totalDeliveries ?? boy.stats?.totalDeliveries ?? 0),
        cashCollected: Number(boy.cashCollected || 0),
      }));
      setDeliveryBoys(rows);
      setPagination(response?.data?.pagination || pagination);
    } finally {
      setIsSettlingId(null);
    }
  };

  const handleViewHistory = async (row) => {
    setHistoryModal({ open: true, data: [], loading: true, boy: row });
    try {
      const response = await getCashHistory(row.id);
      setHistoryModal(prev => ({ ...prev, data: response?.data?.history || [], loading: false }));
    } catch {
      setHistoryModal(prev => ({ ...prev, loading: false }));
    }
  };

  const columns = [
    {
      key: "name",
      label: "Delivery Boy",
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold">
            {value.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-gray-800">{value}</p>
            <p className="text-xs text-gray-500">{row.phone}</p>
          </div>
        </div>
      )
    },
    {
      key: "cashInHand",
      label: "Cash In Hand",
      sortable: true,
      render: (value) => (
        <div className="flex items-center gap-2">
          <span className="text-green-600 font-bold">₹</span>
          <span className="font-bold text-gray-800">{formatCurrency(value || 0).replace('₹', '')}</span>
        </div>
      ),
    },
    {
      key: "totalDeliveries",
      label: "Deliveries",
      sortable: true,
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          {row.cashInHand > 0 ? (
            <button
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold flex items-center gap-2"
              disabled={isSettlingId === row.id}
              onClick={() => handleSettleCash(row)}>
              <FiCheckCircle />
              {isSettlingId === row.id ? 'Settling...' : 'Settle Cash'}
            </button>
          ) : (
            <Badge variant="success">Settled</Badge>
          )}
          <button
            onClick={() => handleViewHistory(row)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
            title="View History">
            <FiClock />
          </button>
        </div>
      ),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6">
      <div className="lg:hidden">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
          Cash Collection
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          Track cash on delivery collections
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Total Collected (Lifetime)</p>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(totalCollected)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Pending Collection</p>
          <p className="text-2xl font-bold text-orange-600">
            {formatCurrency(totalPending)}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, phone or email..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <AnimatedSelect
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: "all", label: "All Delivery Boys" },
              { value: "pending", label: "Pending Collection" },
              { value: "settled", label: "Settled" },
            ]}
            className="min-w-[140px]"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <DataTable
          data={boysWithCash}
          columns={columns}
          pagination={false}
        />
        <Pagination
          currentPage={pagination.page || currentPage}
          totalPages={pagination.pages || 1}
          totalItems={pagination.total || 0}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          className="mt-6"
        />
      </div>

      {/* History Modal */}
      {historyModal.open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setHistoryModal({ open: false, data: [], loading: false, boy: null })}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl relative z-10 flex flex-col max-h-[80vh]">

            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Collection History</h3>
                <p className="text-sm text-gray-500">{historyModal.boy?.name} ({historyModal.boy?.phone})</p>
              </div>
              <button
                onClick={() => setHistoryModal({ open: false, data: [], loading: false, boy: null })}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <FiX className="text-gray-500 w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {historyModal.loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-gray-500 font-medium">Fetching history...</p>
                </div>
              ) : historyModal.data.length > 0 ? (
                <div className="space-y-4">
                  {historyModal.data.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-primary-200 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${item.isSettled ? 'bg-green-100' : 'bg-orange-100'}`}>
                          <span className={`${item.isSettled ? 'text-green-600' : 'text-orange-600'} font-bold`}>₹</span>
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">Order #{item.orderId}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(item.date).toLocaleDateString()} at {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{formatCurrency(item.amount)}</p>
                        <Badge variant={item.isSettled ? "success" : "warning"}>
                          {item.isSettled ? 'Settled' : 'Pending'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FiClock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">No collection history found.</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setHistoryModal({ open: false, data: [], loading: false, boy: null })}
                className="w-full py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

export default CashCollection;

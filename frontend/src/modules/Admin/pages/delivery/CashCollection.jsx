import { useState, useEffect } from "react";
import {
  FiSearch,
  FiDollarSign,
  FiCheckCircle,
  FiClock,
  FiX,
  FiInfo,
  FiUserCheck
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import DataTable from "../../components/DataTable";
import Pagination from "../../components/Pagination";
import Badge from "../../../../shared/components/Badge";
import AnimatedSelect from "../../components/AnimatedSelect";
import { formatCurrency } from "../../utils/adminHelpers";
import { settleCash as settleCashApi, getAllDeliveryBoys, getCashHistory } from "../../services/adminService";
import { useAdminAuthStore } from "../../store/adminStore";
import toast from "react-hot-toast";

const CashCollection = () => {
  const { admin } = useAdminAuthStore();
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

  // New Collection Modal State
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [selectedBoy, setSelectedBoy] = useState(null);
  const [collectionData, setCollectionData] = useState({
    amount: '',
    notes: ''
  });

  const fetchPageData = async () => {
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

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPageData();
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

  const handleOpenCollectModal = (row) => {
    setSelectedBoy(row);
    setCollectionData({
      amount: row.cashInHand,
      notes: ''
    });
    setShowCollectModal(true);
  };

  const handleConfirmCollection = async (e) => {
    e.preventDefault();
    if (!selectedBoy?.id) return;
    
    setIsSettlingId(selectedBoy.id);
    try {
      await settleCashApi(selectedBoy.id, collectionData.amount, collectionData.notes);
      toast.success(`₹${collectionData.amount} collected from ${selectedBoy.name}`);
      setShowCollectModal(false);
      fetchPageData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Collection failed');
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
          <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 font-bold border border-orange-100">
            {value.charAt(0)}
          </div>
          <div>
            <p className="font-bold text-gray-800">{value}</p>
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
          <span className="text-orange-600 font-bold text-lg">₹</span>
          <span className="font-black text-gray-900 text-lg">{value?.toLocaleString() || 0}</span>
        </div>
      ),
    },
    {
      key: "totalDeliveries",
      label: "Deliveries",
      sortable: true,
      render: (val) => <span className="font-bold text-gray-600">{val} Orders</span>
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          {row.cashInHand > 0 ? (
            <button
              className="px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-black transition-all text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-slate-200"
              onClick={() => handleOpenCollectModal(row)}>
              <FiCheckCircle className="w-4 h-4" />
              Collect Cash
            </button>
          ) : (
            <Badge variant="success">Fully Settled</Badge>
          )}
          <button
            onClick={() => handleViewHistory(row)}
            className="p-2.5 text-gray-400 hover:text-slate-900 hover:bg-gray-100 rounded-xl transition-all border border-gray-100"
            title="View Collection History">
            <FiClock className="w-4 h-4" />
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
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-3xl font-black text-gray-900 tracking-tight">Cash Collection</h1>
           <p className="text-gray-500 mt-1 uppercase text-[10px] font-black tracking-widest">Manage Delivery Partner COD Settlements</p>
        </div>
        
        <div className="flex gap-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 min-w-[160px]">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Lifetime</p>
                <p className="text-xl font-black text-emerald-600">{formatCurrency(totalCollected)}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 min-w-[160px] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-5">
                    <FiDollarSign className="w-12 h-12" />
                </div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Pending Total</p>
                <p className="text-xl font-black text-orange-500">{formatCurrency(totalPending)}</p>
            </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, phone or email..."
            className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-slate-900 transition-all font-medium"
          />
        </div>

        <AnimatedSelect
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: "all", label: "All Riders" },
            { value: "pending", label: "Pending Collection" },
            { value: "settled", label: "Settled" },
          ]}
          className="min-w-[200px] !py-3 !bg-gray-50 !border-none !rounded-xl"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <DataTable
          data={boysWithCash}
          columns={columns}
          pagination={false}
        />
        <div className="p-4 border-t border-gray-50 bg-gray-50/30">
          <Pagination
            currentPage={pagination.page || currentPage}
            totalPages={pagination.pages || 1}
            totalItems={pagination.total || 0}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {/* Premium Collection Modal */}
      <AnimatePresence>
        {showCollectModal && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowCollectModal(false)}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden"
                >
                    <div className="p-8 bg-slate-900 text-white relative">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <FiCheckCircle className="w-24 h-24" />
                        </div>
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-2xl font-black tracking-tight">Record Collection</h3>
                                <button onClick={() => setShowCollectModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                    <FiX className="w-6 h-6" />
                                </button>
                            </div>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Collecting from {selectedBoy?.name}</p>
                            <div className="mt-4 flex items-center gap-2">
                                <span className="px-2 py-1 bg-white/10 rounded text-[9px] font-black uppercase tracking-wider text-slate-300">
                                    Processed By: {admin?.name || 'Admin'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleConfirmCollection} className="p-8 space-y-6 bg-white">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Collection Amount (₹)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-gray-300">₹</span>
                                <input 
                                    type="number"
                                    required
                                    className="w-full pl-10 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-slate-900 text-2xl font-black text-slate-900 transition-all"
                                    value={collectionData.amount}
                                    onChange={(e) => setCollectionData({...collectionData, amount: e.target.value})}
                                />
                            </div>
                            <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1 font-bold">
                                <FiInfo className="w-3 h-3" />
                                THIS WILL RESET THE RIDER'S CASH BALANCE
                            </p>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Audit Notes / Location</label>
                            <textarea 
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-slate-900 text-sm font-medium transition-all"
                                rows="3"
                                placeholder="Where was the cash collected? Any discrepancies?"
                                value={collectionData.notes}
                                onChange={(e) => setCollectionData({...collectionData, notes: e.target.value})}
                            ></textarea>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button 
                                type="button" 
                                onClick={() => setShowCollectModal(false)}
                                className="flex-1 py-4 bg-gray-100 text-gray-500 font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-gray-200 transition-all"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                disabled={isSettlingId}
                                className="flex-1 py-4 bg-slate-900 text-white font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-black transition-all shadow-xl shadow-slate-200 disabled:opacity-50"
                            >
                                {isSettlingId ? 'Processing...' : 'Confirm'}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

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
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl relative z-10 flex flex-col max-h-[80vh] overflow-hidden">

            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Order Wise Collection</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">{historyModal.boy?.name} ({historyModal.boy?.phone})</p>
              </div>
              <button
                onClick={() => setHistoryModal({ open: false, data: [], loading: false, boy: null })}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <FiX className="text-gray-500 w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {historyModal.loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-gray-500 font-medium">Fetching history...</p>
                </div>
              ) : historyModal.data.length > 0 ? (
                <div className="space-y-3">
                  {historyModal.data.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 hover:border-slate-200 transition-all shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${item.isSettled ? 'bg-emerald-50' : 'bg-orange-50'}`}>
                          <span className={`font-black ${item.isSettled ? 'text-emerald-600' : 'text-orange-600'}`}>₹</span>
                        </div>
                        <div>
                          <p className="font-black text-gray-900">Order #{item.orderId}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                            Delivered: {new Date(item.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-slate-900 text-lg">{formatCurrency(item.amount)}</p>
                        <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${item.isSettled ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                          {item.isSettled ? 'Admin Collected' : 'With Rider'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FiClock className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                  <p className="text-gray-400 font-black uppercase text-xs tracking-widest">No order history found.</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 bg-white">
              <button
                onClick={() => setHistoryModal({ open: false, data: [], loading: false, boy: null })}
                className="w-full py-4 bg-gray-100 text-gray-600 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-gray-200 transition-colors">
                Close View
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

export default CashCollection;

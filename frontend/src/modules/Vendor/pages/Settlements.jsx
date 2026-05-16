import { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FiDollarSign,
  FiClock,
  FiCheckCircle,
  FiFileText,
  FiSearch,
  FiArrowUpRight,
  FiCalendar,
  FiSend
} from "react-icons/fi";
import { motion } from "framer-motion";
import Badge from "../../../shared/components/Badge";
import { formatPrice } from "../../../shared/utils/helpers";
import { useVendorAuthStore } from "../store/vendorAuthStore";
import { getVendorEarnings, requestSettlement } from "../services/vendorService";
import { toast } from "react-hot-toast";

const Settlements = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { vendor } = useVendorAuthStore();

  const hasBankDetails = useMemo(() => {
    const b = vendor?.bankDetails;
    return !!(b?.upiId || (b?.accountNumber && b?.ifscCode));
  }, [vendor]);

  const getInitialTab = () => {
    const path = location.pathname;
    if (path.endsWith("/pending")) return "pending";
    if (path.endsWith("/ready")) return "ready";
    if (path.endsWith("/completed")) return "completed";
    return "pending";
  };

  const [activeTab, setActiveTab] = useState(getInitialTab());
  const [commissions, setCommissions] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [earningsSummary, setEarningsSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  const vendorId = vendor?.id || vendor?._id;

  const fetchEarnings = async () => {
    setIsLoading(true);
    try {
      const res = await getVendorEarnings();
      const data = res?.data ?? res;
      setCommissions(data?.commissions ?? []);
      setSettlements(data?.settlements ?? []);
      setEarningsSummary(data?.summary ?? null);
    } catch {
      // errors handled by api.js toast
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!vendorId) return;
    fetchEarnings();
  }, [vendorId]);

  useEffect(() => {
    setActiveTab(getInitialTab());
  }, [location.pathname]);

  const filteredCommissions = useMemo(() => {
    let list = commissions;
    
    // Filter by phase based on active tab
    if (activeTab === "pending") {
        list = list.filter(c => c.settlementPhase === 'pending');
    } else if (activeTab === "ready") {
        list = list.filter(c => c.settlementPhase === 'ready' || c.settlementPhase === 'requested');
    } else if (activeTab === "completed") {
        list = list.filter(c => c.settlementPhase === 'settled');
    }

    if (search) {
        list = list.filter(c => 
            (c.orderDisplayId || c.orderId?._id || '').toLowerCase().includes(search.toLowerCase())
        );
    }
    return list;
  }, [commissions, activeTab, search]);

  useEffect(() => {
    setSelectedIds([]); // Reset selection when tab changes
  }, [activeTab]);

  const handleRequestPayout = async (ids = []) => {
    if (isRequesting) return;
    
    let targets = [];
    if (Array.isArray(ids) && ids.length > 0) {
        targets = ids;
    } else if (typeof ids === 'string' && ids.length > 0) {
        targets = [ids];
    } else if (selectedIds.length > 0) {
        targets = selectedIds;
    } else {
        // Fallback: If nothing selected, request ALL ready commissions (Bulk action)
        targets = filteredCommissions
            .filter(c => c.settlementPhase === 'ready')
            .map(c => c._id);
    }
    
    if (targets.length === 0) {
        toast.error("No ready orders available to request");
        return;
    }
    
    setIsRequesting(true);
    try {
        await requestSettlement(targets);
        toast.success(`Settlement request for ${targets.length} order(s) sent!`);
        setSelectedIds([]);
        fetchEarnings();
    } catch (err) {
        toast.error(err?.message || "Failed to request settlement");
    } finally {
        setIsRequesting(false);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
        prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const readyIds = filteredCommissions
        .filter(c => c.settlementPhase === 'ready')
        .map(c => c._id);
    
    if (selectedIds.length === readyIds.length && readyIds.length > 0) {
        setSelectedIds([]);
    } else {
        setSelectedIds(readyIds);
    }
  };

  if (isLoading && !commissions.length) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Settlement Center</h1>
          <p className="text-gray-500 text-sm">Monitor and request your order payouts</p>
        </div>

        {!hasBankDetails && (
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-center gap-4 animate-pulse">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                    <FiDollarSign className="text-xl" />
                </div>
                <div className="flex-1">
                    <p className="text-amber-800 font-bold text-sm">Bank Details Missing</p>
                    <p className="text-amber-600 text-xs font-medium">Please update your bank or UPI details in your profile to request payouts.</p>
                </div>
                <button 
                    onClick={() => navigate('/vendor/settings/payment')}
                    className="px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 transition-colors"
                >
                    Update Now
                </button>
            </div>
        )}
        
        {activeTab === 'ready' && selectedIds.length === 0 && filteredCommissions.some(c => c.settlementPhase === 'ready') && (
            <button 
                onClick={() => {
                    if (!hasBankDetails) {
                        toast.error("Please update bank details in profile first");
                        return;
                    }
                    handleRequestPayout();
                }}
                disabled={isRequesting}
                title={!hasBankDetails ? "Please fill bank details in profile to request payout" : ""}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold shadow-lg transition-all disabled:opacity-50 ${
                    !hasBankDetails 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-primary-600 text-white hover:bg-primary-700 shadow-primary-200'
                }`}
            >
                <FiSend />
                {isRequesting ? 'Requesting...' : 'Request Payout for All Ready Orders'}
            </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`bg-white rounded-2xl p-5 border shadow-sm transition-all ${activeTab === 'pending' ? 'border-amber-200 bg-amber-50/30' : 'border-gray-100'}`}>
            <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
                    <FiClock />
                </div>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pending (Wait 24h)</span>
            </div>
            <h3 className="text-xl font-black text-amber-700">
                {formatPrice(earningsSummary?.pendingAmount || 0)}
            </h3>
        </div>

        <div className={`bg-white rounded-2xl p-5 border shadow-sm transition-all ${activeTab === 'ready' ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-100'}`}>
            <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">
                    <FiArrowUpRight />
                </div>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Ready to Payout</span>
            </div>
            <h3 className="text-xl font-black text-emerald-700">
                {formatPrice(earningsSummary?.readyAmount || 0)}
            </h3>
        </div>

        <div className={`bg-white rounded-2xl p-5 border shadow-sm transition-all ${activeTab === 'completed' ? 'border-blue-200 bg-blue-50/30' : 'border-gray-100'}`}>
            <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                    <FiCheckCircle />
                </div>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Settled</span>
            </div>
            <h3 className="text-xl font-black text-blue-700">
                {formatPrice(earningsSummary?.paidEarnings || 0)}
            </h3>
        </div>
      </div>

      {/* Selected Orders Summary - Only shows when orders are selected in Ready tab */}
      {activeTab === 'ready' && selectedIds.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-primary-600 text-white rounded-3xl p-6 shadow-xl shadow-primary-200 flex flex-col md:flex-row items-center justify-between gap-6"
          >
              <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl">
                      <FiDollarSign />
                  </div>
                  <div>
                      <p className="text-primary-100 text-xs font-black uppercase tracking-[0.2em] mb-1">Selected Settlement Total</p>
                      <h2 className="text-4xl font-black">{formatPrice(selectedIds.reduce((sum, id) => {
                          const item = commissions.find(c => c._id === id);
                          return sum + (item?.vendorEarnings || 0);
                      }, 0))}</h2>
                      <p className="text-primary-200 text-[10px] font-bold mt-1 uppercase tracking-widest">{selectedIds.length} Orders Selected for Request</p>
                  </div>
              </div>
              <button 
                onClick={() => {
                    if (!hasBankDetails) {
                        toast.error("Please update bank details in profile first");
                        return;
                    }
                    handleRequestPayout();
                }}
                disabled={isRequesting}
                className={`w-full md:w-auto px-10 py-4 rounded-2xl font-black shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3 text-lg ${
                    !hasBankDetails 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-white text-primary-600 hover:bg-gray-50'
                }`}
              >
                  <FiSend />
                  {isRequesting ? 'Processing...' : 'Request Payout Now'}
              </button>
          </motion.div>
      )}

      {/* Tabs and Content */}
      <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100 bg-gray-50/50">
            <button 
                onClick={() => navigate('/vendor/settlements/pending')}
                className={`flex-1 py-4 text-xs sm:text-sm font-bold transition-all px-4 ${activeTab === 'pending' ? 'text-primary-600 border-b-2 border-primary-600 bg-white' : 'text-gray-400 hover:text-gray-600'}`}
            >
                Pending
            </button>
            <button 
                onClick={() => navigate('/vendor/settlements/ready')}
                className={`flex-1 py-4 text-xs sm:text-sm font-bold transition-all px-4 ${activeTab === 'ready' ? 'text-primary-600 border-b-2 border-primary-600 bg-white' : 'text-gray-400 hover:text-gray-600'}`}
            >
                Ready to Payment
            </button>
            <button 
                onClick={() => navigate('/vendor/settlements/completed')}
                className={`flex-1 py-4 text-xs sm:text-sm font-bold transition-all px-4 ${activeTab === 'completed' ? 'text-primary-600 border-b-2 border-primary-600 bg-white' : 'text-gray-400 hover:text-gray-600'}`}
            >
                Settlement
            </button>
        </div>

        <div className="p-4 sm:p-6">
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-6">
                    <div className="relative w-full sm:w-80">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                            type="text"
                            placeholder="Search by Order ID..."
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm transition-all"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50/50 text-gray-400 text-[10px] uppercase font-black tracking-widest border-b border-gray-50">
                            <tr>
                                {activeTab === 'ready' && (
                                    <th className="px-4 py-4 text-left w-10">
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="checkbox"
                                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                                onChange={toggleSelectAll}
                                                checked={selectedIds.length > 0 && selectedIds.length === filteredCommissions.filter(c => c.settlementPhase === 'ready').length}
                                            />
                                            <span className="text-[8px] font-black whitespace-nowrap">SELECT ALL</span>
                                        </div>
                                    </th>
                                )}
                                <th className="px-4 py-4 text-left">Order Detail</th>
                                <th className="px-4 py-4 text-right">Net Earning</th>
                                <th className="px-4 py-4 text-center">Status</th>
                                {activeTab === 'completed' && <th className="px-4 py-4 text-right">Paid At</th>}
                                {activeTab === 'ready' && <th className="px-4 py-4 text-right">Action</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredCommissions.map((c) => (
                                <tr key={c._id} className={`hover:bg-gray-50/80 transition-colors group ${selectedIds.includes(c._id) ? 'bg-primary-50/30' : ''}`}>
                                    {activeTab === 'ready' && (
                                        <td className="px-4 py-5">
                                            {c.settlementPhase === 'ready' && (
                                                <input 
                                                    type="checkbox"
                                                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                                    checked={selectedIds.includes(c._id)}
                                                    onChange={() => toggleSelect(c._id)}
                                                />
                                            )}
                                        </td>
                                    )}
                                    <td className="px-4 py-5">
                                        <div className="font-bold text-gray-800 text-sm">#{c.orderDisplayId || c.orderId?._id?.slice(-8)}</div>
                                        <div className="text-[10px] text-gray-400 font-medium">
                                            Delivered: {new Date(c.createdAt).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="px-4 py-5 text-right">
                                        <div className="font-black text-emerald-600">{formatPrice(c.vendorEarnings)}</div>
                                        <div className="text-[9px] text-gray-400">-{formatPrice(c.commission)} (Fee)</div>
                                    </td>
                                    <td className="px-4 py-5 text-center">
                                        <Badge variant={
                                            c.settlementPhase === 'settled' ? 'success' : 
                                            c.settlementPhase === 'requested' ? 'info' :
                                            c.settlementPhase === 'ready' ? 'primary' : 'warning'
                                        }>
                                            {c.settlementPhase?.toUpperCase() || 'PENDING'}
                                        </Badge>
                                    </td>
                                    {activeTab === 'completed' && (
                                        <td className="px-4 py-5 text-right text-xs text-gray-500 font-medium">
                                            {c.paidAt ? new Date(c.paidAt).toLocaleDateString() : 'N/A'}
                                        </td>
                                    )}
                                    {activeTab === 'ready' && (
                                        <td className="px-4 py-5 text-right">
                                            {c.settlementPhase === 'ready' ? (
                                                <button 
                                                    onClick={() => handleRequestPayout(c._id)}
                                                    disabled={isRequesting}
                                                    className="text-[10px] font-bold bg-primary-50 text-primary-600 px-3 py-1 rounded-lg hover:bg-primary-600 hover:text-white transition-all border border-primary-100"
                                                >
                                                    Request
                                                </button>
                                            ) : (
                                                <span className="text-[10px] text-gray-400 italic">Processing...</span>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            ))}
                            {filteredCommissions.length === 0 && (
                                <tr>
                                    <td colSpan={activeTab === 'completed' ? 4 : 3} className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-2 opacity-30">
                                            <FiFileText size={40} />
                                            <p className="text-sm font-bold">No records in this phase</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Settlements;

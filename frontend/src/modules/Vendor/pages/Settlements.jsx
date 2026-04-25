import { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FiDollarSign,
  FiTrendingUp,
  FiClock,
  FiCheckCircle,
  FiFileText,
  FiSearch,
  FiArrowUpRight,
  FiArrowDownLeft,
  FiCalendar
} from "react-icons/fi";
import { motion } from "framer-motion";
import Badge from "../../../shared/components/Badge";
import { formatPrice } from "../../../shared/utils/helpers";
import { useVendorAuthStore } from "../store/vendorAuthStore";
import { getVendorEarnings } from "../services/vendorService";

const Settlements = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { vendor } = useVendorAuthStore();

  const [activeTab, setActiveTab] = useState("overview"); // overview, earnings, payouts
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [commissions, setCommissions] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [earningsSummary, setEarningsSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");

  const vendorId = vendor?.id || vendor?._id;

  useEffect(() => {
    if (!vendorId) return;

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

    fetchEarnings();
  }, [vendorId]);

  const filteredCommissions = useMemo(() => {
    let list = commissions;
    if (selectedStatus !== "all") {
        list = list.filter(c => (c.status || 'pending') === selectedStatus);
    }
    if (search) {
        list = list.filter(c => 
            (c.orderDisplayId || c.orderId?._id || '').toLowerCase().includes(search.toLowerCase())
        );
    }
    return list;
  }, [commissions, selectedStatus, search]);

  if (isLoading) {
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
          <p className="text-gray-500 text-sm">Monitor your earnings, orders, and platform payouts</p>
        </div>
        <div className="flex items-center gap-3">
             <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 flex items-center gap-2">
                <FiCalendar className="text-gray-400" />
                <span className="text-sm font-medium text-gray-700">All Time</span>
             </div>
        </div>
      </div>

      {/* Financial Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <FiDollarSign size={80} />
            </div>
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
                    <FiTrendingUp />
                </div>
                <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total Sales</span>
            </div>
            <h3 className="text-2xl font-black text-gray-800">
                {formatPrice(earningsSummary?.totalSales || commissions.reduce((sum, c) => sum + (c.subtotal || 0), 0))}
            </h3>
            <p className="text-xs text-gray-400 mt-2 italic">* Gross selling price</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <FiClock size={80} />
            </div>
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600">
                    <FiClock />
                </div>
                <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Available</span>
            </div>
            <h3 className="text-2xl font-black text-amber-600">
                {formatPrice(earningsSummary?.availableBalance || 0)}
            </h3>
            <p className="text-xs text-gray-400 mt-2 italic">Ready for payout</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <FiCheckCircle size={80} />
            </div>
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                    <FiCheckCircle />
                </div>
                <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Paid Payouts</span>
            </div>
            <h3 className="text-2xl font-black text-gray-800">
                {formatPrice(earningsSummary?.paidEarnings || settlements.reduce((sum, s) => sum + s.amount, 0))}
            </h3>
            <p className="text-xs text-gray-400 mt-2 italic">Transferred to bank</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-primary-100 shadow-sm relative overflow-hidden group bg-gradient-to-br from-primary-50 to-white">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity text-primary-600">
                <FiDollarSign size={80} />
            </div>
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center text-white shadow-lg">
                    <FiDollarSign />
                </div>
                <span className="text-sm font-bold text-primary-700 uppercase tracking-wider">Net Earnings</span>
            </div>
            <h3 className="text-2xl font-black text-primary-700">
                {formatPrice(earningsSummary?.totalEarnings || 0)}
            </h3>
            <p className="text-xs text-primary-600/70 mt-2 italic">* After all deductions</p>
        </div>
      </div>

      {/* Tabs and Content */}
      <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100">
            <button 
                onClick={() => setActiveTab('overview')}
                className={`flex-1 py-4 text-sm font-bold transition-all px-4 ${activeTab === 'overview' ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50/10' : 'text-gray-400 hover:text-gray-600'}`}
            >
                Order Ledger
            </button>
            <button 
                onClick={() => setActiveTab('payouts')}
                className={`flex-1 py-4 text-sm font-bold transition-all px-4 ${activeTab === 'payouts' ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50/10' : 'text-gray-400 hover:text-gray-600'}`}
            >
                Payout History
            </button>
        </div>

        <div className="p-4 sm:p-6">
            {activeTab === 'overview' ? (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-6">
                        <div className="relative w-full sm:w-80">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                                type="text"
                                placeholder="Search by Order ID..."
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm transition-all"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <select 
                                className="flex-1 sm:flex-none px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value)}
                            >
                                <option value="all">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="paid">Settled</option>
                            </select>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50/50 text-gray-400 text-[10px] uppercase font-black tracking-widest border-b border-gray-50">
                                <tr>
                                    <th className="px-4 py-4 text-left">Order Detail</th>
                                    <th className="px-4 py-4 text-right">Uploaded Price</th>
                                    <th className="px-4 py-4 text-right">Commission</th>
                                    <th className="px-4 py-4 text-right">Net Earning</th>
                                    <th className="px-4 py-4 text-center">Settlement</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredCommissions.map((c) => (
                                    <tr key={c._id} className="hover:bg-gray-50/80 transition-colors group">
                                        <td className="px-4 py-5">
                                            <div className="font-bold text-gray-800 text-sm">#{c.orderDisplayId || c.orderId?._id?.slice(-8)}</div>
                                            <div className="text-[10px] text-gray-400 font-medium">
                                                {new Date(c.createdAt).toLocaleDateString()} at {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </td>
                                        <td className="px-4 py-5 text-right font-medium text-gray-900">
                                            {formatPrice(c.basePrice || c.subtotal)}
                                        </td>
                                        <td className="px-4 py-5 text-right font-bold text-red-500/80 text-xs">
                                            -{formatPrice(c.commission)}
                                            <span className="block text-[8px] opacity-70">({c.commissionRate}%)</span>
                                        </td>
                                        <td className="px-4 py-5 text-right">
                                            <div className="font-black text-emerald-600">{formatPrice(c.vendorEarnings)}</div>
                                        </td>
                                        <td className="px-4 py-5 text-center">
                                            <Badge variant={c.status === 'paid' ? 'success' : 'warning'}>
                                                {c.status?.toUpperCase() || 'PENDING'}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))}
                                {filteredCommissions.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-2 opacity-30">
                                                <FiFileText size={40} />
                                                <p className="text-sm font-bold">No earning records found</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="p-2 bg-primary-100 text-primary-600 rounded-lg">
                            <FiCheckCircle />
                        </div>
                        <h3 className="font-bold text-gray-800">Successful Bank Transfers</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {settlements.map((s) => (
                            <div key={s._id} className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100 flex justify-between items-center group hover:border-primary-200 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-primary-600 border border-gray-100">
                                        <FiArrowUpRight size={20} />
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{new Date(s.createdAt).toDateString()}</div>
                                        <div className="font-black text-gray-700 text-lg">{formatPrice(s.amount)}</div>
                                        <div className="text-[10px] italic text-gray-400">Ref: {s.referenceId || 'N/A'}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <Badge variant="success">COMPLETED</Badge>
                                    <div className="text-[9px] text-gray-400 mt-2 uppercase font-black">{s.method?.replace('_', ' ')}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    {settlements.length === 0 && (
                        <div className="py-20 text-center">
                            <div className="flex flex-col items-center gap-2 opacity-20">
                                <FiArrowUpRight size={40} />
                                <p className="text-sm font-bold">No payout history available</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>
    </motion.div>
  );
};

export default Settlements;

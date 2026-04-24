import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../../shared/utils/api';
import { formatPrice } from '../../../../shared/utils/helpers';
import Badge from '../../../../shared/components/Badge';
import { FiX, FiClock, FiUser, FiInfo, FiCreditCard, FiTrash2, FiSmartphone, FiUserCheck } from 'react-icons/fi';
import { 
    Wallet, 
    Clock, 
    CheckCircle, 
    Search,
    RefreshCw,
    Eye,
    ChevronRight,
    UserCircle,
    Smartphone,
    DollarSign,
    Check,
    Truck,
    ArrowUpRight,
    ArrowDownLeft
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAdminAuthStore } from '../../store/adminStore';

const Settlements = () => {
    const { admin } = useAdminAuthStore();
    const [vendors, setVendors] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    
    // Vendor Settlement State
    const [showVendorModal, setShowVendorModal] = useState(false);
    const [selectedVendor, setSelectedVendor] = useState(null);
    const [vendorSettlementData, setVendorSettlementData] = useState({
        amount: '',
        method: 'bank_transfer',
        referenceId: '',
        notes: '',
        commissionIds: []
    });
    
    // Pending Orders State
    const [showPendingModal, setShowPendingModal] = useState(false);
    const [pendingCommissions, setPendingCommissions] = useState([]);
    const [selectedCommissionIds, setSelectedCommissionIds] = useState([]);
    const [isFetchingPending, setIsFetchingPending] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [vRes, hRes] = await Promise.all([
                api.get(`/admin/settlements/balances?search=${search}`),
                api.get('/admin/settlements/history')
            ]);
            setVendors(vRes.data || []);
            // Filter history for vendor type
            const allSettlements = hRes.data?.settlements || [];
            setHistory(allSettlements.filter(s => s.type === 'vendor'));
        } catch (error) {
            console.error('Fetch error:', error);
            toast.error('Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [search]);

    const handleVendorSettle = async (e) => {
        e.preventDefault();
        try {
            await api.post('/admin/settlements/process', {
                vendorId: selectedVendor._id,
                ...vendorSettlementData
            });
            setShowVendorModal(false);
            setVendorSettlementData({ amount: '', method: 'bank_transfer', referenceId: '', notes: '', commissionIds: [] });
            toast.success('Settlement processed successfully');
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Settlement failed');
        }
    };

    const fetchPendingOrders = async (vendor) => {
        setSelectedVendor(vendor);
        setShowPendingModal(true);
        setIsFetchingPending(true);
        setSelectedCommissionIds([]); // Reset selection
        try {
            const res = await api.get(`/admin/settlements/vendor/${vendor._id}/pending-commissions`);
            setPendingCommissions(res.data || []);
            // Default to selecting all
            setSelectedCommissionIds((res.data || []).map(c => c._id));
        } catch (error) {
            toast.error('Failed to fetch pending orders');
        } finally {
            setIsFetchingPending(false);
        }
    };

    const toggleCommission = (id) => {
        setSelectedCommissionIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleAllCommissions = () => {
        if (selectedCommissionIds.length === pendingCommissions.length) {
            setSelectedCommissionIds([]);
        } else {
            setSelectedCommissionIds(pendingCommissions.map(c => c._id));
        }
    };

    const selectedTotal = useMemo(() => {
        return pendingCommissions
            .filter(c => selectedCommissionIds.includes(c._id))
            .reduce((sum, c) => sum + (c.vendorEarnings || 0), 0);
    }, [pendingCommissions, selectedCommissionIds]);

    const getPaymentDisplay = (order) => {
        if (!order) return 'N/A';
        const method = order.paymentMethod?.toUpperCase() || 'COD';
        const coll = order.codCollectionMethod ? ` (${order.codCollectionMethod.toUpperCase()})` : '';
        return `${method}${coll}`;
    };

    const handleStartSettlement = () => {
        if (selectedCommissionIds.length === 0) {
            toast.error('Please select at least one order to settle');
            return;
        }
        setVendorSettlementData({
            ...vendorSettlementData,
            amount: selectedTotal,
            commissionIds: selectedCommissionIds
        });
        setShowPendingModal(false);
        setShowVendorModal(true);
    };

    return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Vendor Settlements</h1>
                    <p className="text-gray-500">Manage vendor payouts and payment history</p>
                </div>
                <button 
                   onClick={fetchData}
                   className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Table Content */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-semibold text-gray-800 tracking-tight">Vendor Balances</h3>
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                                type="text"
                                placeholder="Search vendors..."
                                className="pl-9 pr-4 py-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all w-64"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-medium">
                                <tr>
                                    <th className="px-6 py-4">Store</th>
                                    <th className="px-6 py-4 text-right">Available Balance</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {vendors.map((vendor) => (
                                    <tr key={vendor._id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-800">{vendor.storeName}</div>
                                            <div className="text-xs text-gray-400">{vendor.name}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="font-semibold text-blue-600">₹{vendor.availableBalance?.toLocaleString() || 0}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button 
                                                    onClick={() => fetchPendingOrders(vendor)}
                                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all flex items-center gap-1 group/btn"
                                                    title="View Pending Orders"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                    <span className="text-xs font-bold hidden group-hover/btn:block">View Details</span>
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        setSelectedVendor(vendor);
                                                        setVendorSettlementData({...vendorSettlementData, amount: vendor.availableBalance, commissionIds: []});
                                                        setShowVendorModal(true);
                                                    }}
                                                    disabled={vendor.availableBalance <= 0}
                                                    className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 disabled:bg-gray-200 disabled:cursor-not-allowed transition-all"
                                                >
                                                    Settle Total
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {loading && <div className="p-12 text-center text-gray-400">Loading vendors...</div>}
                        {!loading && vendors.length === 0 && <div className="p-12 text-center text-gray-400">No vendors found.</div>}
                    </div>
                </div>

                {/* History Sidebar */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-fit">
                    <div className="p-4 border-b border-gray-100">
                        <h3 className="font-semibold text-gray-800 tracking-tight">Recent Payouts</h3>
                    </div>
                    <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
                        {history.map((payout) => (
                            <div key={payout._id} className="p-4 hover:bg-gray-50 transition-colors">
                                <div className="flex justify-between items-start mb-1">
                                    <div className="text-sm font-bold text-gray-800 truncate">
                                        {payout.vendorId?.storeName || 'Vendor'}
                                    </div>
                                    <div className="text-sm font-black text-blue-600">
                                        ₹{payout.amount}
                                    </div>
                                </div>
                                <div className="flex justify-between items-center text-[10px] text-gray-400 mt-2">
                                    <div className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {new Date(payout.createdAt).toLocaleDateString()}
                                    </div>
                                    <div className="flex items-center gap-1 font-bold text-gray-500 uppercase">
                                        <FiUserCheck className="w-3 h-3" />
                                        By: {payout.processedBy?.name || 'Admin'}
                                    </div>
                                </div>
                                <div className="mt-2 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 rounded font-black text-[9px] uppercase bg-blue-50 text-blue-600">
                                            {payout.method?.replace(/_/g, ' ')}
                                        </span>
                                    </div>
                                    <ArrowUpRight className="w-3 h-3 text-blue-400" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Vendor Settlement Modal */}
            {showVendorModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-6 bg-blue-600 text-white flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-bold">Complete Settlement</h3>
                                <p className="text-blue-100 text-sm mt-1">Settle account for {selectedVendor?.storeName}</p>
                            </div>
                            <div className="text-right">
                                <span className="bg-black/20 px-2 py-1 rounded text-[10px] font-black uppercase">Processed By: {admin?.name || 'Admin'}</span>
                            </div>
                        </div>
                        <form onSubmit={handleVendorSettle} className="p-6 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Settlement Amount (₹)</label>
                                <input 
                                    type="number"
                                    required
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-lg font-bold"
                                    value={vendorSettlementData.amount}
                                    onChange={(e) => setVendorSettlementData({...vendorSettlementData, amount: e.target.value})}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Method</label>
                                    <select 
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-medium text-sm"
                                        value={vendorSettlementData.method}
                                        onChange={(e) => setVendorSettlementData({...vendorSettlementData, method: e.target.value})}
                                    >
                                        <option value="bank_transfer">Bank Transfer</option>
                                        <option value="upi">UPI</option>
                                        <option value="cash">Cash</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Ref ID</label>
                                    <input 
                                        type="text"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none text-sm"
                                        value={vendorSettlementData.referenceId}
                                        onChange={(e) => setVendorSettlementData({...vendorSettlementData, referenceId: e.target.value})}
                                        placeholder="TXN-XXXX"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Notes</label>
                                <textarea 
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl outline-none text-sm"
                                    rows="2"
                                    value={vendorSettlementData.notes}
                                    onChange={(e) => setVendorSettlementData({...vendorSettlementData, notes: e.target.value})}
                                    placeholder="Optional notes..."
                                />
                            </div>
                            <div className="flex space-x-3 pt-4">
                                <button type="button" onClick={() => setShowVendorModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors">Cancel</button>
                                <button type="submit" className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-blue-200 transition-all">Settle Now</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Pending Orders Detail Modal */}
            {showPendingModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20">
                                    <Eye className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold">Unsettled Deliveries</h3>
                                    <p className="text-slate-400 text-sm mt-1">{selectedVendor?.storeName}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowPendingModal(false)} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
                                <FiX className="w-6 h-6" />
                            </button>
                        </div>
                        
                        {/* Summary Header */}
                        <div className="bg-slate-800 px-6 py-3 flex justify-between items-center border-t border-slate-700">
                             <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2 text-slate-300 text-xs font-bold">
                                    <input 
                                        type="checkbox" 
                                        className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
                                        checked={selectedCommissionIds.length === pendingCommissions.length && pendingCommissions.length > 0}
                                        onChange={toggleAllCommissions}
                                    />
                                    SELECT ALL
                                </div>
                                <span className="text-slate-500 text-xs">|</span>
                                <span className="text-slate-300 text-xs font-bold uppercase tracking-wider">{selectedCommissionIds.length} ORDERS SELECTED</span>
                             </div>
                             <div className="text-right">
                                <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest block">Selected Earnings</span>
                                <span className="text-blue-400 font-black text-lg">{formatPrice(selectedTotal)}</span>
                             </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                            {isFetchingPending ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-gray-500 font-bold">Loading order details...</p>
                                </div>
                            ) : pendingCommissions.length === 0 ? (
                                <div className="text-center py-20 text-gray-400">
                                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                    <p>No unsettling deliveries found.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-3">
                                    {pendingCommissions.map((comm) => {
                                        const isSelected = selectedCommissionIds.includes(comm._id);
                                        return (
                                            <div 
                                                key={comm._id} 
                                                onClick={() => toggleCommission(comm._id)}
                                                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 ${
                                                    isSelected 
                                                    ? 'bg-white border-blue-200 shadow-md ring-1 ring-blue-100' 
                                                    : 'bg-white border-gray-100 opacity-60 hover:opacity-100'
                                                }`}
                                            >
                                                <div className={`w-6 h-6 rounded-md flex items-center justify-center border-2 transition-all ${
                                                    isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200'
                                                }`}>
                                                    {isSelected && <Check className="w-4 h-4" strokeWidth={4} />}
                                                </div>

                                                <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-4">
                                                    <div>
                                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Order ID</div>
                                                        <div className="font-bold text-gray-800 truncate">#{comm.orderId?.orderId || 'N/A'}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Rider</div>
                                                        <div className="font-bold text-gray-700 flex items-center gap-1">
                                                            <FiUser className="text-blue-500" />
                                                            {comm.orderId?.deliveryBoyId?.name || 'N/A'}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Payment</div>
                                                        <div className="font-bold text-emerald-600 flex items-center gap-1 text-xs">
                                                            <Smartphone className="w-3 h-3" />
                                                            {getPaymentDisplay(comm.orderId)}
                                                        </div>
                                                    </div>
                                                    <div className="text-right pr-2">
                                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Earnings</div>
                                                        <div className="font-black text-blue-600">{formatPrice(comm.vendorEarnings)}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="p-6 bg-white border-t border-gray-100 flex justify-between items-center shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
                            <div>
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Settle Amount</div>
                                <div className="text-3xl font-black text-slate-900">{formatPrice(selectedTotal)}</div>
                            </div>
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setShowPendingModal(false)}
                                    className="px-6 py-3 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleStartSettlement}
                                    disabled={selectedCommissionIds.length === 0}
                                    className="px-10 py-3 bg-slate-900 text-white font-bold rounded-2xl shadow-xl shadow-slate-200 hover:bg-black transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Proceed Settlement
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settlements;

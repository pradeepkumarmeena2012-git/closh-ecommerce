import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Wallet, 
    ArrowUpRight, 
    Clock, 
    CheckCircle, 
    Search,
    Filter,
    CreditCard,
    ArrowRight,
    RefreshCw
} from 'lucide-react';

const Settlements = () => {
    const [vendors, setVendors] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [selectedVendor, setSelectedVendor] = useState(null);
    const [settlementData, setSettlementData] = useState({
        amount: '',
        method: 'bank_transfer',
        referenceId: '',
        notes: ''
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [vRes, hRes] = await Promise.all([
                axios.get(`/api/admin/settlements/balances?search=${search}`),
                axios.get('/api/admin/settlements/history')
            ]);
            setVendors(vRes.data.data);
            setHistory(hRes.data.data.settlements);
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [search]);

    const handleSettle = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/admin/settlements/process', {
                vendorId: selectedVendor._id,
                ...settlementData
            });
            setShowModal(false);
            setSettlementData({ amount: '', method: 'bank_transfer', referenceId: '', notes: '' });
            fetchData();
        } catch (error) {
            alert(error.response?.data?.message || 'Settlement failed');
        }
    };

    return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Vendor Settlements</h1>
                    <p className="text-gray-500">Manage vendor earnings and payouts</p>
                </div>
                <button 
                   onClick={fetchData}
                   className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4">
                    <div className="p-3 bg-blue-50 rounded-xl">
                        <Wallet className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Total Owed</p>
                        <h3 className="text-xl font-bold">₹{vendors.reduce((sum, v) => sum + v.availableBalance, 0).toLocaleString()}</h3>
                    </div>
                </div>
                {/* Add more stats card here */}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Vendors Ledger */}
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
                                    <th className="px-6 py-4">Store Name</th>
                                    <th className="px-6 py-4 text-right">Balance</th>
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
                                            <div className="font-semibold text-blue-600">₹{vendor.availableBalance.toLocaleString()}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => {
                                                    setSelectedVendor(vendor);
                                                    setSettlementData({...settlementData, amount: vendor.availableBalance});
                                                    setShowModal(true);
                                                }}
                                                disabled={vendor.availableBalance <= 0}
                                                className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-200 disabled:cursor-not-allowed transition-all"
                                            >
                                                Settle
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* History Sidebar */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-fit">
                    <div className="p-4 border-b border-gray-100">
                        <h3 className="font-semibold text-gray-800 tracking-tight">Recent Payouts</h3>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {history.map((payout) => (
                            <div key={payout._id} className="p-4 hover:bg-gray-50 transition-colors">
                                <div className="flex justify-between items-start mb-1">
                                    <div className="text-sm font-medium text-gray-800 truncate">
                                        {payout.type === 'rider' 
                                            ? `Rider: ${payout.deliveryBoyId?.name}` 
                                            : payout.vendorId?.storeName || 'Vendor'}
                                    </div>
                                    <div className="text-sm font-bold text-green-600">₹{payout.amount}</div>
                                </div>
                                <div className="flex justify-between items-center text-xs text-gray-400">
                                    <div className="flex items-center">
                                        <Clock className="w-3 h-3 mr-1" />
                                        {new Date(payout.createdAt).toLocaleDateString()}
                                    </div>
                                    <div className={`uppercase tracking-wider font-semibold text-[10px] px-2 py-0.5 rounded ${
                                        payout.type === 'rider' ? 'bg-purple-50 text-purple-600' : 'bg-green-50 text-green-600'
                                    }`}>
                                        {payout.type === 'rider' ? 'Cash Collection' : payout.method}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Settlement Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 bg-blue-600 text-white">
                            <h3 className="text-xl font-bold">Process Payout</h3>
                            <p className="text-blue-100 text-sm mt-1">Settling for {selectedVendor?.storeName}</p>
                        </div>
                        <form onSubmit={handleSettle} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Amount (₹)</label>
                                <input 
                                    type="number"
                                    required
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                    value={settlementData.amount}
                                    onChange={(e) => setSettlementData({...settlementData, amount: e.target.value})}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Method</label>
                                    <select 
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none"
                                        value={settlementData.method}
                                        onChange={(e) => setSettlementData({...settlementData, method: e.target.value})}
                                    >
                                        <option value="bank_transfer">Bank Transfer</option>
                                        <option value="upi">UPI</option>
                                        <option value="cash">Cash</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Transaction ID</label>
                                    <input 
                                        type="text"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none"
                                        value={settlementData.referenceId}
                                        onChange={(e) => setSettlementData({...settlementData, referenceId: e.target.value})}
                                        placeholder="TXN-XXXX"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Internal Notes</label>
                                <textarea 
                                    rows="2"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none"
                                    value={settlementData.notes}
                                    onChange={(e) => setSettlementData({...settlementData, notes: e.target.value})}
                                />
                            </div>
                            <div className="flex space-x-3 pt-4">
                                <button 
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-3 bg-gray-100 text-gray-600 font-semibold rounded-xl hover:bg-gray-200 transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
                                >
                                    Confirm
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settlements;

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheck, FiX, FiClock, FiSearch, FiMessageCircle } from 'react-icons/fi';
import api from '../../../../shared/utils/api';
import toast from 'react-hot-toast';

const EnquiriesPage = () => {
    const [enquiries, setEnquiries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedEnquiry, setSelectedEnquiry] = useState(null);
    const [adminRemarks, setAdminRemarks] = useState('');
    
    const [activeTab, setActiveTab] = useState('enquiries'); // 'enquiries' or 'reasons'
    const [reasons, setReasons] = useState([]);
    const [newReason, setNewReason] = useState('');

    useEffect(() => {
        fetchEnquiries();
        fetchReasons();
    }, []);

    const fetchReasons = async () => {
        try {
            const res = await api.get('/admin/cancellation-reasons');
            if (res?.success) {
                setReasons(res.reasons);
            }
        } catch (error) {
            console.error('Failed to fetch reasons', error);
        }
    };

    const handleAddReason = async () => {
        if (!newReason.trim()) return;
        try {
            const res = await api.post('/admin/cancellation-reasons', { reason: newReason.trim() });
            if (res?.success) {
                toast.success('Reason added');
                setNewReason('');
                fetchReasons();
            }
        } catch (error) {
            toast.error('Failed to add reason');
        }
    };

    const handleDeleteReason = async (id) => {
        if (!window.confirm('Are you sure you want to delete this reason?')) return;
        try {
            const res = await api.delete(`/admin/cancellation-reasons/${id}`);
            if (res?.success) {
                toast.success('Reason deleted');
                fetchReasons();
            }
        } catch (error) {
            toast.error('Failed to delete reason');
        }
    };

    const fetchEnquiries = async () => {
        try {
            const res = await api.get('/admin/enquiries');
            if (res?.success) {
                setEnquiries(res.enquiries);
            }
        } catch (error) {
            toast.error('Failed to fetch enquiries');
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (status) => {
        if (!selectedEnquiry) return;
        try {
            const res = await api.post(`/admin/enquiries/${selectedEnquiry._id}/handle`, {
                status,
                adminRemarks
            });
            if (res?.success) {
                toast.success(`Enquiry ${status} successfully`);
                setSelectedEnquiry(null);
                setAdminRemarks('');
                fetchEnquiries();
            }
        } catch (error) {
            toast.error('Failed to update enquiry status');
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'approved': return 'bg-green-100 text-green-800 border-green-200';
            case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-slate-100 text-slate-800 border-slate-200';
        }
    };

    if (loading) {
        return <div className="p-6 text-center text-slate-500">Loading enquiries...</div>;
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Cancellations & Enquiries</h1>
                    <p className="text-sm text-slate-500 mt-1">Review delivery boy requests and manage cancellation reasons</p>
                </div>
                
                <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                    <button 
                        onClick={() => setActiveTab('enquiries')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'enquiries' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Pending Enquiries
                    </button>
                    <button 
                        onClick={() => setActiveTab('reasons')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'reasons' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Cancellation Reasons
                    </button>
                </div>
            </div>

            {activeTab === 'enquiries' ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                                <th className="p-4">Date</th>
                                <th className="p-4">Order ID</th>
                                <th className="p-4">Delivery Boy</th>
                                <th className="p-4">Reason</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {enquiries.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-slate-400">No enquiries found</td>
                                </tr>
                            ) : (
                                enquiries.map((enquiry) => (
                                    <tr key={enquiry._id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 text-sm text-slate-600">
                                            {new Date(enquiry.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="p-4 text-sm font-medium text-slate-800">
                                            #{enquiry.orderId?.orderId || 'N/A'}
                                        </td>
                                        <td className="p-4 text-sm text-slate-600">
                                            {enquiry.deliveryBoyId?.name || 'N/A'} <br/>
                                            <span className="text-xs text-slate-400">{enquiry.deliveryBoyId?.phone || ''}</span>
                                        </td>
                                        <td className="p-4 text-sm text-slate-600 max-w-xs truncate">
                                            {enquiry.reasonId?.reason || enquiry.reasonText}
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${getStatusColor(enquiry.status)}`}>
                                                {enquiry.status}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <button
                                                onClick={() => setSelectedEnquiry(enquiry)}
                                                className="text-primary-600 hover:text-primary-800 text-sm font-medium transition-colors"
                                            >
                                                View & Handle
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-6 max-w-3xl">
                    <h2 className="text-lg font-bold text-slate-800 mb-4">Manage Pre-defined Reasons</h2>
                    <p className="text-sm text-slate-500 mb-6">These reasons will appear as quick-select options for delivery boys when they need to cancel a delivery or report an issue.</p>
                    
                    <div className="flex gap-3 mb-8">
                        <input 
                            type="text" 
                            value={newReason}
                            onChange={(e) => setNewReason(e.target.value)}
                            placeholder="e.g. Customer not picking up call, Door is locked..."
                            className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddReason()}
                        />
                        <button 
                            onClick={handleAddReason}
                            disabled={!newReason.trim()}
                            className="bg-primary-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-sm hover:bg-primary-700 active:scale-95 transition-all disabled:opacity-50"
                        >
                            Add Reason
                        </button>
                    </div>

                    <div className="space-y-3">
                        {reasons.length === 0 ? (
                            <p className="text-slate-400 text-sm italic text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">No reasons added yet.</p>
                        ) : (
                            reasons.map((r) => (
                                <div key={r._id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 group hover:border-slate-300 transition-colors">
                                    <span className="font-medium text-slate-700">{r.reason}</span>
                                    <button 
                                        onClick={() => handleDeleteReason(r._id)}
                                        className="text-slate-400 hover:text-rose-600 p-2 rounded-lg hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100"
                                        title="Delete Reason"
                                    >
                                        <FiX size={18} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Modal for Handling Enquiry */}
            <AnimatePresence>
                {selectedEnquiry && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
                            onClick={() => setSelectedEnquiry(null)}
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg p-6 relative z-10"
                        >
                            <button
                                onClick={() => setSelectedEnquiry(null)}
                                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
                            >
                                <FiX className="text-xl" />
                            </button>

                            <h2 className="text-xl font-bold text-slate-800 mb-6">Handle Enquiry</h2>

                            <div className="space-y-4 mb-6">
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Order ID</p>
                                            <p className="font-semibold text-slate-800">#{selectedEnquiry.orderId?.orderId}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Delivery Boy</p>
                                            <p className="font-semibold text-slate-800">{selectedEnquiry.deliveryBoyId?.name}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Cancellation Reason</p>
                                            <p className="font-medium text-slate-700 bg-white p-3 rounded-lg border border-slate-200">
                                                {selectedEnquiry.reasonId?.reason || selectedEnquiry.reasonText}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {selectedEnquiry.status === 'pending' ? (
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Admin Remarks</label>
                                        <textarea
                                            value={adminRemarks}
                                            onChange={(e) => setAdminRemarks(e.target.value)}
                                            placeholder="Add a note (optional)..."
                                            className="w-full h-24 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                                        />
                                        <div className="flex gap-3 mt-4">
                                            <button
                                                onClick={() => handleAction('rejected')}
                                                className="flex-1 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 font-semibold py-2.5 rounded-xl transition-all"
                                            >
                                                Reject Cancellation
                                            </button>
                                            <button
                                                onClick={() => handleAction('approved')}
                                                className="flex-1 bg-green-600 text-white hover:bg-green-700 font-semibold py-2.5 rounded-xl shadow-sm transition-all"
                                            >
                                                Approve Cancellation
                                            </button>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-3 text-center">
                                            Approving will create a return flow for multi-vendor orders (nearest to farthest) or cancel the order immediately.
                                        </p>
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Admin Remarks</label>
                                        <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                            {selectedEnquiry.adminRemarks || 'No remarks provided.'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default EnquiriesPage;

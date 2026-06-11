import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiEdit2, FiTrash2, FiCheck, FiX } from 'react-icons/fi';
import api from '../../../../shared/utils/api';
import toast from 'react-hot-toast';

const CancellationReasons = () => {
    const [reasons, setReasons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingReason, setEditingReason] = useState(null);
    const [formData, setFormData] = useState({ reason: '', isActive: true });

    useEffect(() => {
        fetchReasons();
    }, []);

    const fetchReasons = async () => {
        try {
            const res = await api.get('/admin/cancellation-reasons');
            if (res.data?.success) {
                setReasons(res.data.reasons);
            }
        } catch (error) {
            toast.error('Failed to fetch cancellation reasons');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingReason) {
                const res = await api.put(`/admin/cancellation-reasons/${editingReason._id}`, formData);
                if (res.data?.success) {
                    toast.success('Reason updated successfully');
                }
            } else {
                const res = await api.post('/admin/cancellation-reasons', formData);
                if (res.data?.success) {
                    toast.success('Reason created successfully');
                }
            }
            closeModal();
            fetchReasons();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save reason');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this reason?')) return;
        try {
            const res = await api.delete(`/v1/admin/cancellation-reasons/${id}`);
            if (res.data?.success) {
                toast.success('Reason deleted successfully');
                fetchReasons();
            }
        } catch (error) {
            toast.error('Failed to delete reason');
        }
    };

    const openModal = (reason = null) => {
        if (reason) {
            setEditingReason(reason);
            setFormData({ reason: reason.reason, isActive: reason.isActive });
        } else {
            setEditingReason(null);
            setFormData({ reason: '', isActive: true });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingReason(null);
        setFormData({ reason: '', isActive: true });
    };

    if (loading) return <div className="p-6 text-center text-slate-500">Loading reasons...</div>;

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Cancellation Reasons</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage reasons available for delivery cancellation</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-medium transition-colors shadow-sm"
                >
                    <FiPlus /> Add Reason
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                            <th className="p-4">Reason</th>
                            <th className="p-4 w-32">Status</th>
                            <th className="p-4 w-32 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {reasons.length === 0 ? (
                            <tr>
                                <td colSpan="3" className="p-8 text-center text-slate-400">No reasons found</td>
                            </tr>
                        ) : (
                            reasons.map((r) => (
                                <tr key={r._id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 font-medium text-slate-800">{r.reason}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${r.isActive ? 'bg-green-100 text-green-700 border-green-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                            {r.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => openModal(r)} className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                                                <FiEdit2 />
                                            </button>
                                            <button onClick={() => handleDelete(r._id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                                                <FiTrash2 />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
                            onClick={closeModal}
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 relative z-10"
                        >
                            <h2 className="text-xl font-bold text-slate-800 mb-6">{editingReason ? 'Edit Reason' : 'Add Reason'}</h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Reason Text</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.reason}
                                        onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                                        placeholder="e.g. Customer Refused"
                                    />
                                </div>
                                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <label className="text-sm font-semibold text-slate-700 cursor-pointer flex-1" htmlFor="isActiveSwitch">
                                        Active Status
                                    </label>
                                    <button
                                        type="button"
                                        id="isActiveSwitch"
                                        onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                                        className={`w-11 h-6 rounded-full transition-colors relative ${formData.isActive ? 'bg-primary-500' : 'bg-slate-300'}`}
                                    >
                                        <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-2.5 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 shadow-sm transition-colors"
                                    >
                                        Save Reason
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CancellationReasons;

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Tag, Ticket, Clock, AlertCircle, CheckCircle2, Loader2, ChevronRight } from 'lucide-react';
import api from '../../../../shared/utils/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const CouponsModal = ({ isOpen, onClose, onApply, cartTotal }) => {
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            fetchCoupons();
        }
    }, [isOpen]);

    const fetchCoupons = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get('/coupons/available');
            const data = response.data?.data || response.data || [];
            setCoupons(data);
        } catch (err) {
            console.error('Error fetching coupons:', err);
            setError('Failed to load coupons. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-white w-full max-w-[450px] rounded-t-[32px] md:rounded-[32px] shadow-2xl relative flex flex-col max-h-[85vh] overflow-hidden border border-gray-100"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-50 bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-50 rounded-2xl flex items-center justify-center">
                            <Tag size={20} className="text-red-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Available Coupons</h2>
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Save more on your order</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center hover:bg-gray-100 transition-all active:scale-90"
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center space-y-4">
                            <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
                            <p className="text-xs font-bold text-gray-400 uppercase">Finding best deals...</p>
                        </div>
                    ) : error ? (
                        <div className="py-20 px-10 text-center">
                            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertCircle size={32} className="text-red-500" />
                            </div>
                            <p className="text-gray-800 font-bold mb-2">{error}</p>
                            <button
                                onClick={fetchCoupons}
                                className="text-red-500 font-bold text-sm uppercase underline"
                            >
                                Try Again
                            </button>
                        </div>
                    ) : coupons.length === 0 ? (
                        <div className="py-20 px-10 text-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Ticket size={32} className="text-gray-300" />
                            </div>
                            <h3 className="text-gray-800 font-bold mb-1">No Coupons Available</h3>
                            <p className="text-gray-400 text-xs font-medium">Check back later for new offers and discounts.</p>
                        </div>
                    ) : (
                        coupons.map((coupon, index) => {
                            const isApplicable = cartTotal >= (coupon.minOrderValue || 0);

                            return (
                                <motion.div
                                    key={coupon._id || index}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className={`bg-white rounded-3xl p-5 border shadow-sm relative overflow-hidden group transition-all ${isApplicable ? 'border-gray-100 hover:border-red-200 hover:shadow-md' : 'border-gray-100 opacity-90'}`}
                                >
                                    {/* Coupon UI Design */}
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <span className="px-3 py-1 bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-red-100">
                                                    {coupon.code}
                                                </span>
                                                {isApplicable && (
                                                    <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 uppercase">
                                                        <CheckCircle2 size={10} />
                                                        Applicable
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="text-[15px] font-bold text-gray-900 mt-2">
                                                {coupon.type === 'percentage' ? `${coupon.value}% OFF` : `₹${coupon.value} OFF`}
                                            </h3>
                                            <p className="text-[12px] text-gray-500 font-medium">
                                                {coupon.name || `Save ${coupon.type === 'percentage' ? `${coupon.value}%` : `₹${coupon.value}`} on this order`}
                                            </p>
                                        </div>

                                        <button
                                            onClick={() => {
                                                if (isApplicable) {
                                                    onApply(coupon.code);
                                                } else {
                                                    toast.error(`Minimum order value of ₹${coupon.minOrderValue || 0} required to apply this coupon.`);
                                                }
                                            }}
                                            className={`px-5 py-2 rounded-xl text-[11px] font-bold uppercase transition-all ${isApplicable ? 'bg-black text-white hover:bg-gray-800 active:scale-95 shadow-lg' : 'bg-black/90 text-white hover:bg-black active:scale-95 shadow-md'}`}
                                        >
                                            Apply
                                        </button>
                                    </div>

                                    <div className="h-px bg-gray-100 mb-3 border-dashed border-t" />

                                    <div className="flex items-center justify-between text-[11px] font-bold uppercase">
                                        <div className="flex items-center gap-4 text-gray-400">
                                            <div className="flex items-center gap-1.5">
                                                <Clock size={12} />
                                                <span>Exp: {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Never'}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Ticket size={12} />
                                                <span>Min Order: ₹{coupon.minOrderValue || 0}</span>
                                            </div>
                                        </div>
                                        {coupon.maxDiscount && (
                                            <span className="text-red-500">Up to ₹{coupon.maxDiscount}</span>
                                        )}
                                    </div>

                                    {/* Left and Right "Ticket" notches */}
                                    <div className="absolute top-1/2 -left-2 w-4 h-4 rounded-full bg-gray-50 border-r border-gray-200 -translate-y-1/2" />
                                    <div className="absolute top-1/2 -right-2 w-4 h-4 rounded-full bg-gray-50 border-l border-gray-200 -translate-y-1/2" />
                                </motion.div>
                            );
                        })
                    )}
                </div>

                {/* Footer Message */}
                <div className="p-4 bg-white border-t border-gray-50 text-center">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Premium Shopping Experience</p>
                </div>
            </motion.div>
        </div>,
        document.body
    );
};

export default CouponsModal;

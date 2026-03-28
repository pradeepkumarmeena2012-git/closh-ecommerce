import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPackage, FiClock, FiX, FiNavigation, FiZap, FiTarget, FiImage, FiShoppingBag } from 'react-icons/fi';
import { formatPrice } from '../../../shared/utils/helpers';
import { createPortal } from 'react-dom';

const getFullImageUrl = (image) => {
    if (!image) return null;
    if (image.startsWith('http')) return image;
    const baseUrl = import.meta.env.VITE_IMAGE_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000';
    return `${baseUrl}${image.startsWith('/') ? '' : '/'}${image}`;
};

const NewOrderModal = ({ order, isOpen, onClose, onAccept, isAccepting }) => {
    const buzzerRef = useRef(null);

    // Play buzzer sound when modal opens, stop when it closes
    useEffect(() => {
        // Note: Buzzer is now centrally managed by Dashboard for better control
        return () => {
            if (buzzerRef.current) {
                try {
                    buzzerRef.current.pause();
                    buzzerRef.current.currentTime = 0;
                } catch (e) {}
                buzzerRef.current = null;
            }
        };
    }, [isOpen, order]);

    if (!order && isOpen) return null;

    const firstItem = order?.items?.[0] || order?.vendorItems?.[0]?.items?.[0];
    const itemImage = getFullImageUrl(firstItem?.image || firstItem?.productId?.image);

    return createPortal(
        <AnimatePresence>
            {isOpen && order && (
                <div className="fixed inset-0 z-[9999] flex flex-col justify-end">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}
                        className="relative bg-white rounded-t-[40px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col z-[10000]"
                    >
                        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-4 mb-2 shrink-0" />

                        <div className="px-8 pt-4 pb-6 border-b border-slate-50 relative flex-shrink-0">
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-6 w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors z-10"
                            >
                                <FiX size={20} />
                            </button>
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="w-14 h-14 bg-indigo-600 shadow-indigo-200 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0">
                                    {itemImage ? (
                                        <img src={itemImage} className="w-full h-full object-cover rounded-2xl" alt="Order" />
                                    ) : (
                                        <FiShoppingBag size={28} />
                                    )}
                                </div>
                                <div>
                                    <p className="text-indigo-500 text-[10px] font-black uppercase tracking-[0.2em]">New Order Received</p>
                                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Order #{order.orderId || order.id?.slice(-8)}</h2>
                                </div>
                            </div>
                        </div>

                        <div className="px-8 py-6 overflow-y-auto">
                            <div className="bg-indigo-50 rounded-3xl p-6 mb-8 text-center border border-indigo-100">
                                <span className="text-indigo-400 text-[10px] font-black uppercase tracking-widest block mb-2">Order Value</span>
                                <span className="text-indigo-900 font-black text-4xl">{formatPrice(order.total || 0)}</span>
                            </div>

                            <div className="space-y-4 mb-8">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Order Summary</h3>
                                <div className="space-y-3">
                                    {order.items?.map((it, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 shadow-sm">
                                                    <FiPackage size={18} />
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-800 text-sm">{it.name}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase">Qty: {it.quantity}</p>
                                                </div>
                                            </div>
                                            <span className="font-black text-slate-900 text-sm">{formatPrice(it.price * (it.quantity || 1))}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 pb-12">
                                <button
                                    onClick={() => onAccept(order.orderId || order.id)}
                                    disabled={isAccepting}
                                    className="w-full bg-emerald-600 text-white py-5 rounded-3xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-emerald-200 active:scale-95 transition-all flex items-center justify-center gap-3"
                                >
                                    {isAccepting ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <><FiZap /> Accept & Start Preparing</>
                                    )}
                                </button>
                                
                                <p className="text-center text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-8">
                                    Swipe down to ignore
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default NewOrderModal;

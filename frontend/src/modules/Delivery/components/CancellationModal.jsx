import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiAlertTriangle, FiSend } from 'react-icons/fi';
import { createPortal } from 'react-dom';

const CancellationModal = ({ isOpen, onClose, onConfirm, isSubmitting }) => {
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = () => {
        if (!reason.trim()) {
            setError('Please provide a reason for cancellation');
            return;
        }
        onConfirm(reason.trim());
    };

    const commonReasons = [
        'Customer Refused',
        'Incorrect Address',
        'Customer Unreachable',
        'Item Damaged',
        'Payment Issue'
    ];

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl z-[10000] border border-white"
                    >
                        {/* Header */}
                        <div className="bg-rose-50 px-6 py-6 border-b border-rose-100/50 flex flex-col items-center text-center">
                            <div className="w-12 h-12 bg-rose-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-rose-200 mb-4">
                                <FiAlertTriangle size={24} />
                            </div>
                            <h2 className="text-lg font-black text-rose-900 uppercase tracking-tight">Serious Action Required</h2>
                            <p className="text-[10px] font-bold text-rose-600/70 uppercase tracking-widest mt-1">Order Cancellation Protocol</p>
                        </div>

                        {/* Body */}
                        <div className="p-6">
                            <p className="text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-4 px-1">Choose a reason or type below:</p>
                            
                            <div className="flex flex-wrap gap-2 mb-6">
                                {commonReasons.map((r) => (
                                    <button
                                        key={r}
                                        onClick={() => { setReason(r); setError(''); }}
                                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border ${
                                            reason === r 
                                            ? 'bg-rose-600 border-rose-600 text-white shadow-md' 
                                            : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'
                                        }`}
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>

                            <div className="relative group">
                                <textarea
                                    value={reason}
                                    onChange={(e) => { setReason(e.target.value); setError(''); }}
                                    placeholder="Type details for cancellation..."
                                    className={`w-full h-24 bg-slate-50 border ${error ? 'border-rose-300' : 'border-slate-100'} rounded-2xl p-4 text-xs font-medium text-slate-800 outline-none focus:border-rose-400 focus:bg-white transition-all resize-none shadow-inner`}
                                />
                                {error && <p className="text-[9px] font-bold text-rose-500 mt-2 ml-1 uppercase">{error}</p>}
                            </div>

                            <div className="mt-8 flex gap-3">
                                <button
                                    onClick={onClose}
                                    disabled={isSubmitting}
                                    className="flex-1 h-12 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-slate-200 active:scale-95 transition-all"
                                >
                                    Go Back
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    className="flex-1 h-12 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-rose-200 active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <><FiSend size={14} /> Confirm</>
                                    )}
                                </button>
                            </div>

                            <p className="text-center text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-6 italic">
                                Note: This action cannot be undone.
                            </p>
                        </div>

                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"
                        >
                            <FiX size={16} />
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default CancellationModal;

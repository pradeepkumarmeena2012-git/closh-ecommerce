import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiInfo, FiCreditCard, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../../shared/utils/api';
import { formatPrice } from '../../../shared/utils/helpers';

const CashSettlementModal = ({ isOpen, onClose, cashInHand, onSettlementComplete }) => {
  const [amount, setAmount] = useState(cashInHand || 0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState('input'); // input, processing, success

  const handleSettlement = async () => {
    if (amount <= 0) return toast.error('Please enter a valid amount');
    if (amount > cashInHand) return toast.error('Amount exceeds cash in hand');

    try {
      setIsProcessing(true);
      
      // 1. Create Settlement Order
      const res = await api.post('/delivery/settlements', { amount });
      const { orderId, keyId } = res.data;

      // 2. Open Razorpay Checkout
      const options = {
        key: keyId,
        amount: amount * 100,
        currency: 'INR',
        name: 'CLOSH',
        description: 'Cash Collection Settlement',
        order_id: orderId,
        handler: async (response) => {
          try {
            // 3. Verify Payment
            await api.post('/delivery/settlements/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
            
            setStep('success');
            toast.success('Cash settled successfully!');
            setTimeout(() => {
                onSettlementComplete();
                onClose();
            }, 2000);
          } catch (error) {
            toast.error(error.response?.data?.message || 'Verification failed');
            setIsProcessing(false);
          }
        },
        prefill: {
          name: '',
          email: '',
          contact: ''
        },
        theme: {
          color: '#4F46E5'
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to initialize settlement');
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
           onClick={onClose}
           className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-sm bg-white rounded-[32px] overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="p-6 pb-0 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Settle Cash</h2>
            <button 
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
            >
                <FiX size={18} />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {step === 'input' ? (
              <>
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3 text-amber-700">
                    <FiInfo className="shrink-0 mt-0.5" size={16} />
                    <p className="text-[11px] font-medium leading-relaxed">
                        Settle your collected cash by paying online. This amount will be deducted from your "In Hand" balance.
                    </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Amount to Settle</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</div>
                      <input 
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(Number(e.target.value))}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 pl-8 pr-4 text-xl font-bold text-slate-800 focus:border-indigo-500 focus:outline-none transition-all"
                        placeholder="0.00"
                        max={cashInHand}
                      />
                    </div>
                    <div className="mt-2 flex justify-between px-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Max: {formatPrice(cashInHand)}</p>
                        <button 
                            onClick={() => setAmount(cashInHand)}
                            className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                        >
                            Set Full Amount
                        </button>
                    </div>
                  </div>

                  <button
                    onClick={handleSettlement}
                    disabled={isProcessing || amount <= 0 || amount > cashInHand}
                    className="w-full py-4 bg-[#1E293B] text-white rounded-2xl font-bold text-sm uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Processing...</span>
                        </>
                    ) : (
                        <>
                            <FiCreditCard size={18} />
                            <span>Pay Now via Razorpay</span>
                        </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <div className="py-8 flex flex-col items-center text-center space-y-4">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 shadow-inner">
                    <FiCheckCircle size={40} />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-slate-800">Settlement Successful</h3>
                    <p className="text-xs text-slate-500 mt-1 font-medium italic">₹{amount} has been settled from your account</p>
                </div>
              </div>
            )}
          </div>
          
          {step === 'input' && (
            <div className="px-6 pb-6 pt-2 border-t border-slate-50">
               <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest justify-center opacity-60">
                 <FiAlertTriangle />
                 <span>Official settlement protocol</span>
               </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CashSettlementModal;

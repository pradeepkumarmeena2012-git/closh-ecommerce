import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiDollarSign, 
  FiClock, 
  FiCheckCircle, 
  FiXCircle, 
  FiAlertCircle,
  FiRefreshCw,
  FiFilter,
  FiChevronRight,
  FiInfo
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import PageTransition from '../../../shared/components/PageTransition';
import WithdrawalModal from '../components/WithdrawalModal';
import { useDeliveryAuthStore } from '../store/deliveryStore';
import api from '../../../shared/utils/api';
import toast from 'react-hot-toast';
import { formatPrice } from '../../../shared/utils/helpers';

const Payouts = () => {
  const navigate = useNavigate();
  const { deliveryBoy, fetchProfile } = useDeliveryAuthStore();
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [withdrawalHistory, setWithdrawalHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, approved, rejected, completed
  const [nextAvailableDate, setNextAvailableDate] = useState(null);
  const [canRequestPayout, setCanRequestPayout] = useState(true);
  const [showPolicy, setShowPolicy] = useState(false);

  const loadWithdrawalHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/delivery/withdrawals');
      const history = response.data?.data || [];
      setWithdrawalHistory(history);

      const lastNonRejectedRequest = history.find(
        (req) => req.status !== 'rejected'
      );
      
      if (lastNonRejectedRequest) {
        const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
        const lastRequestDate = new Date(lastNonRejectedRequest.createdAt);
        const nextDate = new Date(lastRequestDate.getTime() + SEVEN_DAYS_MS);
        const now = new Date();
        
        if (nextDate > now) {
          setNextAvailableDate(nextDate);
          setCanRequestPayout(false);
        } else {
          setNextAvailableDate(null);
          setCanRequestPayout(true);
        }
      }
    } catch (error) {
      toast.error('Failed to load payout history');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWithdrawalHistory();
    const syncProfile = async () => {
      await fetchProfile();
      if (useDeliveryAuthStore.getState().fetchProfileSummary) {
        await useDeliveryAuthStore.getState().fetchProfileSummary();
      }
    };
    syncProfile();
  }, [loadWithdrawalHistory, fetchProfile]);

  const handleWithdrawalRequested = () => {
    setShowWithdrawalModal(false);
    loadWithdrawalHistory();
    fetchProfile();
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <FiClock size={16} className="text-amber-500" />;
      case 'approved': return <FiCheckCircle size={16} className="text-blue-500" />;
      case 'completed': return <FiCheckCircle size={16} className="text-emerald-500" />;
      case 'rejected': return <FiXCircle size={16} className="text-rose-500" />;
      default: return <FiAlertCircle size={16} className="text-slate-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'approved': return 'bg-blue-100 text-blue-700';
      case 'completed': return 'bg-emerald-100 text-emerald-700';
      case 'rejected': return 'bg-rose-100 text-rose-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const filteredHistory = withdrawalHistory.filter((item) => {
    if (filter === 'all') return true;
    return item.status === filter;
  });

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#F8FAFC]">
        {/* Proper Logistics Header */}
        <div className="bg-[#1E293B] pt-6 pb-12 px-5 relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Financial Hub</h1>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Earnings & Transfers</p>
            </div>
            <button
              onClick={() => { loadWithdrawalHistory(); fetchProfile(); }}
              className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-white active:rotate-180 transition-all duration-500 shadow-sm"
            >
              <FiRefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="px-4 -mt-8 relative z-20 space-y-3 pb-24 max-w-lg mx-auto">
          {/* Balance Card - Solid Professionalism */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[24px] p-5 shadow-xl shadow-slate-200/50 relative overflow-hidden border border-slate-100"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100 shadow-sm">
                  <FiDollarSign className="text-indigo-600" size={20} />
                </div>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Available Funds</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-slate-900 tracking-tighter tabular-nums">{formatPrice(deliveryBoy?.availableBalance || 0)}</p>
                <div className="flex items-center justify-end gap-1.5 mt-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${deliveryBoy?.kycStatus === 'verified' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <p className="text-[8px] font-bold uppercase text-slate-400 tracking-widest">{deliveryBoy?.kycStatus === 'verified' ? 'Verified Partner' : 'Pending KYC'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {!canRequestPayout ? (
                <div className="bg-slate-50 rounded-2xl p-3 text-center border border-slate-100">
                  <p className="text-slate-400 text-[8px] font-bold uppercase tracking-widest mb-1">Next Eligibility</p>
                  <p className="text-[13px] font-bold text-slate-700 tracking-tight">
                    {nextAvailableDate?.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              ) : (
                <button
                  onClick={() => setShowWithdrawalModal(true)}
                  disabled={!deliveryBoy?.availableBalance || deliveryBoy?.availableBalance <= 0 || deliveryBoy?.kycStatus !== 'verified'}
                  className="w-full py-4 bg-[#1E293B] text-white rounded-[18px] font-bold text-[12px] uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all disabled:opacity-20"
                >
                   Request Withdrawal
                </button>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 flex flex-col items-center justify-center">
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Earned</p>
                  <p className="text-sm font-bold text-slate-800">{formatPrice(deliveryBoy?.totalEarnings || 0)}</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 flex flex-col items-center justify-center">
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">In Hand</p>
                  <p className="text-sm font-bold text-slate-800">{formatPrice(deliveryBoy?.cashInHand || 0)}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Policy Toggle */}
           <button 
            onClick={() => setShowPolicy(!showPolicy)}
            className="w-full flex items-center justify-between px-4 py-2 bg-white border border-slate-100 rounded-xl group active:bg-slate-50 transition-colors shadow-sm"
          >
            <div className="flex items-center gap-2">
              <FiInfo className="text-slate-400 group-hover:text-indigo-600 transition-colors" size={14} />
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Payout Policy</span>
            </div>
            <FiChevronRight className={`text-slate-400 transition-transform ${showPolicy ? 'rotate-90' : ''}`} size={14} />
          </button>
          
          <AnimatePresence>
            {showPolicy && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 bg-white rounded-2xl border border-slate-100 space-y-2 shadow-inner">
                  {[
                    'Processed within 24-48 hours',
                    'One request every 7 days',
                    'Minimum amount: ₹1',
                    'Transferred to bank account'
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2.5">
                       <div className="w-1 h-1 bg-indigo-400 rounded-full" />
                       <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{item}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Filter Bar */}
          <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl overflow-x-auto no-scrollbar border border-slate-200/50">
            {['all', 'pending', 'completed', 'approved', 'rejected'].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-5 py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${filter === s ? 'bg-[#1E293B] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Transaction Feed */}
          <div className="space-y-2 pb-4">
            <div className="flex items-center gap-2 px-1 mb-3">
              <div className="w-0.5 h-3 bg-indigo-600 rounded-full" />
              <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Transfer History</h2>
            </div>

            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <FiRefreshCw className="text-indigo-600 animate-spin" size={20} />
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Verifying Ledger...</p>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="py-12 bg-white rounded-2xl border border-slate-100 text-center space-y-2 shadow-sm">
                <FiDollarSign className="text-slate-200 mx-auto" size={32} />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No Activity Recorded</p>
              </div>
            ) : (
              filteredHistory.map((item, idx) => (
                <motion.div
                  key={item._id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${getStatusColor(item.status).replace('bg-', 'border-').split(' ')[0]} bg-slate-50 shrink-0`}>
                      {getStatusIcon(item.status)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[16px] font-bold text-slate-800 tracking-tight leading-none mb-1.5">{formatPrice(item.amount)}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight tabular-nums opacity-80">
                        {formatDate(item.createdAt)} • {new Date(item.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-1.5">
                    <span className={`px-2.5 py-1 rounded-lg text-[7px] font-bold uppercase tracking-widest border ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                    {item.transactionId && <p className="text-[8px] font-mono text-slate-400 tracking-tighter opacity-60">#{item.transactionId.slice(-6).toUpperCase()}</p>}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>

      <WithdrawalModal
        isOpen={showWithdrawalModal}
        onClose={() => setShowWithdrawalModal(false)}
        balance={deliveryBoy?.availableBalance || 0}
        onWithdrawalRequested={handleWithdrawalRequested}
      />
    </PageTransition>
  );
};

export default Payouts;

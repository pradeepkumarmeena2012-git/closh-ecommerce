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
    fetchProfile();
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
      <div className="px-4 pt-3 pb-24 space-y-3 max-w-lg mx-auto flex flex-col h-[calc(100vh-80px)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none">Payouts</h1>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Earnings Management</p>
          </div>
          <button
            onClick={() => { loadWithdrawalHistory(); fetchProfile(); }}
            className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 active:rotate-180 transition-all duration-500 shadow-sm"
          >
            <FiRefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Balance Card - Premium Gradient */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-[#4f46e5] via-[#4338ca] to-[#3730a3] rounded-[32px] p-5 text-white shadow-2xl relative overflow-hidden shrink-0 border border-white/10"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-12 -mt-12 blur-3xl opacity-60" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-400/20 rounded-full -ml-8 -mb-8 blur-2xl" />
          
          <div className="flex items-center justify-between mb-5 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/20 shadow-inner">
                <FiDollarSign className="text-white" size={20} />
              </div>
              <p className="text-indigo-100 text-[9px] font-black uppercase tracking-[0.2em] opacity-80">Available Funds</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-black tracking-tighter leading-none">{formatPrice(deliveryBoy?.availableBalance || 0)}</p>
              <div className="flex items-center justify-end gap-1 mt-1">
                <div className={`w-1.5 h-1.5 rounded-full ${deliveryBoy?.kycStatus === 'verified' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-amber-400'}`} />
                <p className="text-[7px] font-black uppercase tracking-widest opacity-60">{deliveryBoy?.kycStatus === 'verified' ? 'Verified' : 'Pending KYC'}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3 relative z-10">
            {!canRequestPayout ? (
              <div className="bg-black/10 backdrop-blur-md rounded-2xl p-3 text-center border border-white/10">
                <p className="text-primary-100 text-[7px] font-black uppercase tracking-[0.2em] mb-0.5">Next Eligibility</p>
                <p className="text-sm font-black tracking-tight">
                  {nextAvailableDate?.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            ) : (
              <button
                onClick={() => setShowWithdrawalModal(true)}
                disabled={!deliveryBoy?.availableBalance || deliveryBoy?.availableBalance <= 0 || deliveryBoy?.kycStatus !== 'verified'}
                className="w-full py-4 bg-white text-indigo-700 rounded-[22px] font-black text-[11px] uppercase tracking-[0.15em] shadow-xl active:scale-[0.98] transition-all disabled:opacity-30 disabled:bg-indigo-300/20 disabled:text-white/50 disabled:shadow-none"
              >
                {deliveryBoy?.kycStatus !== 'verified' ? 'KYC Verification Required' : 'Request Withdrawal'}
              </button>
            )}

            {deliveryBoy?.kycStatus !== 'verified' && (
              <div 
                onClick={() => navigate('/delivery/profile')}
                className="bg-white/5 backdrop-blur-md border border-white/10 rounded-[20px] p-3 flex items-center justify-between cursor-pointer group hover:bg-white/10 transition-all shadow-inner"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center">
                    <FiAlertCircle size={14} className="text-indigo-200 shrink-0" />
                  </div>
                  <p className="text-[8px] font-black text-indigo-100 leading-tight uppercase tracking-widest italic opacity-80">Setup KYC to enable payouts</p>
                </div>
                <FiChevronRight size={14} className="text-white/40 group-hover:text-white transition-all group-hover:translate-x-1" />
              </div>
            )}
          </div>
        </motion.div>

        {/* Mini Payout Policy */}
        <div className="shrink-0">
          <button 
            onClick={() => setShowPolicy(!showPolicy)}
            className="w-full flex items-center justify-between px-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl group active:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <FiInfo className="text-slate-400 group-hover:text-primary-500 transition-colors" size={14} />
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Payout Policy</span>
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
                <div className="p-3 mt-1 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  {[
                    'Processed within 24-48 hours',
                    'One request every 7 days',
                    'Minimum amount: ₹1',
                    'Transferred to bank account'
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                       <div className="w-1 h-1 bg-primary-400 rounded-full" />
                       <p className="text-[9px] font-black text-slate-500 uppercase tracking-tight">{item}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Tab Filters */}
        <div className="flex gap-2 p-1.5 bg-slate-100 rounded-[24px] shrink-0 overflow-x-auto no-scrollbar border border-slate-200/50">
          {['all', 'pending', 'approved', 'completed', 'rejected'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-5 py-2.5 rounded-[18px] text-[9px] font-black uppercase tracking-[0.15em] transition-all whitespace-nowrap ${filter === s ? 'bg-white text-indigo-600 shadow-lg shadow-indigo-100/50 scale-[1.02]' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Payout History */}
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 pb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-3 bg-primary-600 rounded-full" />
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Transfer History</h2>
          </div>

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <FiRefreshCw className="text-primary-600 animate-spin" size={24} />
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Fetching Transfers...</p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="py-12 bg-white rounded-[28px] border border-slate-100 text-center space-y-2 shadow-sm">
              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                <FiDollarSign className="text-slate-300" size={24} />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No Transfers Found</p>
            </div>
          ) : (
            filteredHistory.map((item, idx) => (
              <motion.div
                key={item._id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white rounded-[26px] p-4 border border-slate-200/50 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all hover:border-indigo-100 hover:shadow-md"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border-2 ${getStatusColor(item.status).replace('bg-', 'border-').split(' ')[0]} shrink-0 shadow-xl bg-slate-50`}>
                    {getStatusIcon(item.status)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg font-black text-slate-800 tracking-tighter leading-none mb-1">{formatPrice(item.amount)}</p>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none opacity-80 italic">
                      {formatDate(item.createdAt)} • {new Date(item.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-1.5">
                  <span className={`px-2.5 py-1 rounded-xl text-[8px] font-black uppercase tracking-widest shadow-sm ${getStatusColor(item.status)}`}>
                    {item.status}
                  </span>
                  {item.transactionId && <p className="text-[8px] font-mono text-slate-300 leading-none tracking-tighter">#{item.transactionId.slice(-6).toUpperCase()}</p>}
                </div>
              </motion.div>
            ))
          )}
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

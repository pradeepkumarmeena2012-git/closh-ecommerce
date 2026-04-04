import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  FiDollarSign, 
  FiClock, 
  FiCheckCircle, 
  FiXCircle, 
  FiAlertCircle,
  FiRefreshCw,
  FiFilter
} from 'react-icons/fi';
import PageTransition from '../../../shared/components/PageTransition';
import WithdrawalModal from '../components/WithdrawalModal';
import { useDeliveryAuthStore } from '../store/deliveryStore';
import api from '../../../shared/utils/api';
import toast from 'react-hot-toast';
import { formatPrice } from '../../../shared/utils/helpers';

const Payouts = () => {
  const { deliveryBoy, fetchProfile } = useDeliveryAuthStore();
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [withdrawalHistory, setWithdrawalHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, approved, rejected, completed
  const [nextAvailableDate, setNextAvailableDate] = useState(null);
  const [canRequestPayout, setCanRequestPayout] = useState(true);

  const loadWithdrawalHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/delivery/withdrawals');
      const history = response.data?.data || [];
      setWithdrawalHistory(history);

      // Calculate next available date based on 7-day cooldown
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
      console.error(error);
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
      case 'pending':
        return <FiClock className="text-yellow-500" />;
      case 'approved':
        return <FiCheckCircle className="text-blue-500" />;
      case 'completed':
        return <FiCheckCircle className="text-green-500" />;
      case 'rejected':
        return <FiXCircle className="text-red-500" />;
      default:
        return <FiAlertCircle className="text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'approved':
        return 'bg-blue-100 text-blue-700';
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredHistory = withdrawalHistory.filter((item) => {
    if (filter === 'all') return true;
    return item.status === filter;
  });

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <PageTransition>
      <div className="px-4 pt-4 pb-24 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="text-left">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Payouts</h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Earnings Manager</p>
          </div>
          <button
            onClick={() => fetchProfile()}
            className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-all shadow-sm active:rotate-180 duration-500"
          >
            <FiRefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </motion.div>

        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-indigo-600 rounded-2xl p-4 text-white shadow-xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl opacity-50" />
          <div className="relative z-10 flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md shadow-inner border border-white/20">
              <FiDollarSign size={20} />
            </div>
            <div>
              <p className="text-indigo-100 text-[10px] font-black uppercase tracking-[0.2em]">Available Balance</p>
              <p className="text-2xl font-black tracking-tight mt-0.5">
                {formatPrice(deliveryBoy?.availableBalance || 0)}
              </p>
            </div>
          </div>

          {/* Request Payout Button */}
          {canRequestPayout ? (
            <div className="space-y-3 relative z-10">
              <button
                onClick={() => setShowWithdrawalModal(true)}
                disabled={
                  !deliveryBoy?.availableBalance || 
                  deliveryBoy?.availableBalance <= 0 || 
                  deliveryBoy?.kycStatus !== 'verified'
                }
                className="w-full py-3.5 bg-white text-indigo-600 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:shadow-2xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
              >
                {deliveryBoy?.kycStatus !== 'verified' ? 'KYC Verification Required' : 'Request Payout Now'}
              </button>
              
              {deliveryBoy?.kycStatus !== 'verified' && (
                <div 
                  onClick={() => navigate('/delivery/profile')}
                  className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:bg-white/20 transition-all"
                >
                  <FiAlertCircle className="text-white shrink-0" />
                  <p className="text-[10px] font-bold text-white leading-tight uppercase tracking-wider">
                    Complete your KYC and Bank Details in profile to enable payouts
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 text-center relative z-10 border border-white/20 shadow-inner">
              <p className="text-indigo-100 text-[10px] font-black uppercase tracking-[0.2em] mb-1">
                Next Payout Eligibility
              </p>
              <p className="text-lg font-black text-white">
                {nextAvailableDate?.toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          )}
        </motion.div>

        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-blue-50 rounded-2xl p-4 flex gap-3"
        >
          <FiAlertCircle className="text-blue-600 text-xl flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700">
            <p className="font-semibold mb-1">Payout Policy</p>
            <ul className="space-y-1 text-xs">
              <li>• Payouts are processed within 24-48 hours after admin approval</li>
              <li>• You can request one payout every 7 days</li>
              <li>• Minimum withdrawal amount is ₹1</li>
              <li>• Funds will be transferred to your registered bank account</li>
            </ul>
          </div>
        </motion.div>

        {/* Filter Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-2 shadow-sm"
        >
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <FiFilter className="text-gray-400 ml-2 flex-shrink-0" />
            {['all', 'pending', 'approved', 'completed', 'rejected'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap transition-all ${
                  filter === status
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Payout History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-3"
        >
          <h2 className="text-xl font-bold text-gray-800">Payout History</h2>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <FiRefreshCw className="text-4xl text-primary-600 animate-spin" />
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
              <FiDollarSign className="text-5xl text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-semibold">No payout requests found</p>
              <p className="text-gray-400 text-sm mt-1">
                {filter !== 'all' ? 'Try changing the filter' : 'Request your first payout above'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHistory.map((withdrawal, index) => (
                <motion.div
                  key={withdrawal._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
                        {getStatusIcon(withdrawal.status)}
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-800">
                          {formatPrice(withdrawal.amount)}
                        </p>
                        <p className="text-gray-500 text-sm mt-1">
                          {formatDate(withdrawal.createdAt)} • {formatTime(withdrawal.createdAt)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                        withdrawal.status
                      )}`}
                    >
                      {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                    </span>
                  </div>

                  {withdrawal.transactionId && (
                    <div className="bg-gray-50 rounded-xl p-3 mb-2">
                      <p className="text-xs text-gray-500 mb-1">Transaction ID</p>
                      <p className="text-sm font-mono text-gray-800">{withdrawal.transactionId}</p>
                    </div>
                  )}

                  {withdrawal.adminNotes && (
                    <div className="bg-blue-50 rounded-xl p-3">
                      <p className="text-xs text-blue-600 font-semibold mb-1">Admin Notes</p>
                      <p className="text-sm text-blue-700">{withdrawal.adminNotes}</p>
                    </div>
                  )}

                  {withdrawal.processedAt && (
                    <p className="text-xs text-gray-400 mt-2">
                      Processed on: {formatDate(withdrawal.processedAt)}
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Withdrawal Modal */}
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

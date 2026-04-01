import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDeliveryAuthStore } from '../store/deliveryStore';
import { FiPackage, FiCheckCircle, FiClock, FiTrendingUp, FiMapPin, FiTruck, FiNavigation, FiStar, FiZap, FiArrowRight, FiActivity, FiAlertCircle } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import PageTransition from '../../../shared/components/PageTransition';
import toast from 'react-hot-toast';
import { formatPrice } from '../../../shared/utils/helpers';
import NewOrderModal from '../components/NewOrderModal';
import WithdrawalModal from '../components/WithdrawalModal';
import socketService from '../../../shared/utils/socket';
import { useDeliveryTracking } from '../../../shared/hooks/useDeliveryTracking';

const DeliveryDashboard = () => {
  const { 
    deliveryBoy, updateStatus, fetchProfile, fetchDashboardSummary, 
    isUpdatingStatus, isUpdatingOrderStatus, acceptOrder, 
    fetchAvailableReturns, acceptReturn 
  } = useDeliveryAuthStore();

  const navigate = useNavigate();
  const [recentOrders, setRecentOrders] = useState([]);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [availableReturns, setAvailableReturns] = useState([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);
  const isOnline = deliveryBoy?.status === 'available';
  
  const [stats, setStats] = useState({
    totalOrders: 0,
    completedToday: 0,
    openOrders: 0,
    earnings: 0,
  });
  
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [selectedNewOrder, setSelectedNewOrder] = useState(null);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [isBuzzerActive, setIsBuzzerActive] = useState(false);
  const buzzerRef = useRef(null);

  const stopBuzzer = useCallback(() => {
    if (buzzerRef.current) {
        try {
            buzzerRef.current.pause();
            buzzerRef.current.currentTime = 0;
        } catch (e) {}
        buzzerRef.current = null;
    }
    setIsBuzzerActive(false);
  }, []);

  const startBuzzer = useCallback(() => {
    if (buzzerRef.current) return;
    try {
        const audio = new Audio('/sounds/mgs_codec.mp3');
        audio.loop = true;
        audio.volume = 0.6;
        audio.play().catch(err => {
            console.warn('Audio blocked:', err);
            toast.error('New Order! Unlock sound for alerts.');
        });
        buzzerRef.current = audio;
        setIsBuzzerActive(true);
        // Safety timeout
        setTimeout(() => { if (buzzerRef.current === audio) stopBuzzer(); }, 120000);
    } catch(e) {}
  }, [stopBuzzer]);

  // --- Real-time Delivery Tracking ---
  const activeOrdersForTracking = recentOrders.filter(o => 
    ['picked_up', 'out_for_delivery', 'picked-up', 'out-for-delivery'].includes(o.status?.toLowerCase())
  );
  useDeliveryTracking(deliveryBoy?.id, activeOrdersForTracking);

  const statCards = [
    {
      icon: FiPackage,
      label: 'Deliveries',
      value: deliveryBoy?.totalDeliveries ?? stats.totalOrders,
      color: 'from-blue-500 to-indigo-600',
      shadow: 'shadow-blue-200/50',
    },
    {
      icon: FiCheckCircle,
      label: 'Today',
      value: stats.completedToday,
      color: 'from-emerald-500 to-teal-600',
      shadow: 'shadow-emerald-200/50',
    },
    {
      icon: FiTrendingUp,
      label: 'Earnings',
      value: formatPrice(deliveryBoy?.availableBalance ?? stats.earnings),
      color: 'from-violet-500 to-purple-600',
      shadow: 'shadow-purple-200/50',
    },
    {
      icon: FiStar,
      label: 'Rating',
      value: '4.8',
      color: 'from-amber-400 to-orange-500',
      shadow: 'shadow-amber-200/50',
    },
  ];

  const loadDashboardData = async () => {
    try {
      setIsDashboardLoading(true);
      await fetchProfile();
      const summary = await fetchDashboardSummary();
      setRecentOrders(summary.recentOrders || []);
      setStats({
        totalOrders: Number(summary.totalOrders || 0),
        completedToday: Number(summary.completedToday || 0),
        openOrders: Number(summary.openOrders || 0),
        earnings: Number(summary.earnings || 0),
      });

      // Fetch available orders and returns
      const [available, returns] = await Promise.all([
        useDeliveryAuthStore.getState().fetchAvailableOrders({ limit: 5 }),
        useDeliveryAuthStore.getState().fetchAvailableReturns()
      ]);
      setAvailableOrders(available || []);
      setAvailableReturns(returns || []);
    } catch (err) {
      console.error('Dashboard load error:', err);
      setLoadFailed(true);
    } finally {
      setIsDashboardLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    // Socket listeners (connection managed by DeliveryLayout)
    socketService.on('order_ready_for_pickup', (data) => {
      const currentStatus = useDeliveryAuthStore.getState().deliveryBoy?.status;
      if (currentStatus !== 'available') return;
      startBuzzer();
      loadDashboardData();
      toast.success(`⚡ New Order #${data.id || data.orderId} available!`, { duration: 10000 });
      setSelectedNewOrder(data);
      setShowNewOrderModal(true);
    });

    socketService.on('return_ready_for_pickup', (data) => {
      const currentStatus = useDeliveryAuthStore.getState().deliveryBoy?.status;
      if (currentStatus !== 'available') return;
      startBuzzer();
      loadDashboardData();
      toast.success(`📦 New Return Pickup available for #${data.orderId || 'Order'}!`, { duration: 10000 });
      setSelectedNewOrder({ ...data, isReturn: true });
      setShowNewOrderModal(true);
    });

    return () => {
      socketService.off('order_ready_for_pickup');
      socketService.off('return_ready_for_pickup');
    };
  }, []);

  const handleAcceptOrder = async (orderId, isReturn = false) => {
    try {
      if (isReturn) {
        await acceptReturn(orderId);
      } else {
        await acceptOrder(orderId);
      }
      toast.success(isReturn ? 'Return assignment accepted' : 'Order accepted successfully');
      loadDashboardData();
    } catch (err) {
      console.error('Accept error:', err);
    }
  };

  const handleToggleOnline = async () => {
    if (isUpdatingStatus) return;
    const wasOnline = isOnline;
    const newStatus = wasOnline ? 'offline' : 'available';
    // Safety timeout — reset isUpdatingStatus after 10s no matter what
    const safetyTimer = setTimeout(() => {
      useDeliveryAuthStore.setState({ isUpdatingStatus: false });
    }, 10000);
    try {
      await updateStatus(newStatus);
      toast.success(wasOnline ? 'You are now Offline' : 'You are now Online!');
      if (!wasOnline) loadDashboardData();
    } catch (err) {
      console.error('Status update error:', err);
      const msg = err?.response?.data?.message || err?.message || 'Failed to update status';
      toast.error(msg);
    } finally {
      clearTimeout(safetyTimer);
    }
  };

  const getStatusColor = (status) => {
    const s = String(status).toLowerCase();
    switch (s) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
      case 'assigned': return 'bg-purple-100 text-purple-800';
      case 'picked_up':
      case 'picked-up':
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'out_for_delivery':
      case 'out-for-delivery': return 'bg-indigo-100 text-indigo-800';
      case 'delivered':
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled':
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#F8FAFC]">
        {/* Dynamic Header with Wave/Gradient */}
        <div className="relative overflow-hidden bg-[#0F172A] pb-20 pt-6 px-6">
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl"></div>
          
          <div className="relative z-10 flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <h1 className="text-lg font-black text-white tracking-tight">
                Hi, {deliveryBoy?.name?.split(' ')[0] || 'Partner'}! 👋
              </h1>
              <p className="text-slate-400 text-[10px] font-medium">
                Ready for some deliveries? 🚀
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative"
            >
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center p-0.5">
                 <img 
                   src={deliveryBoy?.avatar || `https://ui-avatars.com/api/?name=${deliveryBoy?.name}&background=6366f1&color=fff`} 
                   className="w-full h-full object-cover rounded-[8px] sm:rounded-[14px]"
                   alt="Profile"
                 />
              </div>
              <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 border-[#0F172A] ${isOnline ? 'bg-emerald-500' : 'bg-slate-500'}`} />
            </motion.div>
          </div>

          {/* Online/Offline Control Center Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`mt-3 sm:mt-4 rounded-2xl sm:rounded-3xl p-3 sm:p-4 border transition-all duration-500 ${isOnline
              ? 'bg-white/10 backdrop-blur-xl border-white/20'
              : 'bg-white/5 backdrop-blur-md border-white/10'
              }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 sm:gap-4">
                <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-colors ${isOnline ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700/50 text-slate-400'}`}>
                   {isOnline ? <FiZap size={18} /> : <FiActivity size={18} />}
                </div>
                <div>
                  <h2 className="text-white font-bold text-xs sm:text-base leading-tight">
                    {isOnline ? 'Status: Accepting' : 'You are Offline'}
                  </h2>
                  <div className="flex items-center gap-1 mt-0.5">
                    {isOnline && <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />}
                    <p className="text-slate-400 text-[9px] sm:text-[10px] font-medium leading-none">
                      {isOnline ? 'Live & Active' : 'Go online to start'}
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleToggleOnline}
                disabled={isUpdatingStatus}
                className={`relative group inline-flex h-8 w-14 sm:h-10 sm:w-20 flex-shrink-0 items-center rounded-full transition-all duration-500 focus:outline-none ${isOnline ? 'bg-emerald-500' : 'bg-slate-700'}`}
              >
                <motion.span
                  animate={{ x: isOnline ? (window.innerWidth < 640 ? 26 : 42) : 4 }}
                  className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-white shadow-md flex items-center justify-center"
                >
                  <div className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                </motion.span>
              </button>
            </div>
          </motion.div>
        </div>

        {/* Space re-calculation using negative margin */}
        <div className="px-4 sm:px-6 -mt-8 relative z-20 pb-8">
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-xl sm:rounded-3xl p-3 sm:p-5 shadow-sm border border-slate-100 group relative overflow-hidden flex flex-col justify-between min-h-[85px] sm:min-h-0"
                >
                  <div className="flex items-center gap-2 sm:block">
                    <div className={`w-7 h-7 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-gradient-to-br ${stat.color} ${stat.shadow} flex items-center justify-center text-white mb-0 sm:mb-4 shrink-0 shadow-lg`}>
                      <Icon size={14} className="sm:hidden" />
                      <Icon size={22} className="hidden sm:block" />
                    </div>
                    <div>
                      <p className="text-slate-500 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider mb-0.5">{stat.label}</p>
                      <div className="text-slate-900 text-sm sm:text-xl font-black leading-none">
                        {isDashboardLoading ? <div className="h-4 w-10 sm:h-7 sm:w-16 bg-slate-100 animate-pulse rounded" /> : stat.value}
                      </div>
                    </div>
                  </div>
                  {stat.label === 'Earnings' && !isDashboardLoading && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); setShowWithdrawalModal(true); }}
                      className="absolute bottom-2 right-2 bg-slate-50 hover:bg-indigo-50 p-1 rounded-md text-indigo-600 transition-colors sm:hidden"
                    >
                      <FiTrendingUp size={12} />
                    </button>
                  )}
                  {stat.label === 'Earnings' && !isDashboardLoading && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); setShowWithdrawalModal(true); }}
                      className="hidden sm:block absolute bottom-4 right-4 bg-slate-50 hover:bg-indigo-50 p-1.5 rounded-lg text-indigo-600 transition-colors"
                    >
                      <FiTrendingUp size={14} />
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>

          <div className="mt-6 sm:mt-8 space-y-6 sm:space-y-8">
            
            {/* Available Orders Section */}
            {isOnline && (
              <section>
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-5 sm:h-6 bg-indigo-500 rounded-full" />
                    <h2 className="text-base sm:text-lg font-black text-slate-800 tracking-tight">Available Near You</h2>
                  </div>
                  <button onClick={() => navigate('/delivery/orders')} className="text-indigo-600 text-[13px] font-bold flex items-center gap-1 hover:translate-x-1 transition-transform">
                    View Live Feed <FiArrowRight />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {isDashboardLoading ? (
                    <div className="h-32 sm:h-40 bg-white rounded-2xl sm:rounded-3xl animate-pulse" />
                  ) : (availableOrders.length === 0 && availableReturns.length === 0) ? (
                    <div className="col-span-full py-6 sm:py-10 text-center bg-indigo-50/50 rounded-2xl sm:rounded-3xl border border-dashed border-indigo-200">
                      <FiNavigation className="mx-auto text-indigo-300 mb-2 sm:mb-3" size={24} />
                      <p className="text-indigo-500 font-bold text-xs sm:text-sm">No new requests nearby</p>
                    </div>
                  ) : (
                    <>
                      {/* Show Returns First */}
                      {availableReturns.map((ret, index) => (
                        <motion.div 
                          key={ret.id || `ret-${index}`} 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-white rounded-3xl p-5 shadow-sm border border-orange-100 group hover:border-orange-200 transition-colors relative overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 bg-orange-500 text-white text-[10px] px-3 py-1 font-black rounded-bl-2xl uppercase tracking-wider">Return</div>
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <span className="text-[10px] font-black text-orange-500 bg-orange-50 px-2 py-1 rounded-md uppercase mb-2 block w-fit">#{ret.orderId || 'RET'}</span>
                              <div className="flex items-center gap-1 text-slate-900 font-bold">
                                <span className="text-lg">{formatPrice(ret.amount || 25)}</span>
                                <span className="text-[10px] text-slate-400 font-medium">Fee</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end pr-12">
                               <div className="flex items-center gap-1 text-orange-500 font-bold text-xs mb-1">
                                 <FiZap size={10} /> {ret.distance || '2.4km'}
                               </div>
                               <div className="text-[10px] text-slate-400 font-medium">Return Pickup</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl mb-4 border border-slate-100">
                            <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-orange-500 shadow-sm shrink-0">
                              <FiMapPin size={16} />
                            </div>
                            <p className="text-[11px] text-slate-600 leading-tight font-medium truncate flex-1">
                              {ret.address || 'Pickup from Customer'}
                            </p>
                          </div>

                          <button
                            onClick={() => { setSelectedNewOrder({ ...ret, isReturn: true }); setShowNewOrderModal(true); }}
                            className="w-full bg-orange-600 text-white py-3.5 rounded-2xl font-black text-[13px] uppercase tracking-wider hover:bg-orange-700 transition-all shadow-lg active:scale-95"
                          >
                            Accept Return
                          </button>
                        </motion.div>
                      ))}

                      {/* Show Orders */}
                      {availableOrders.map((order, index) => (
                        <motion.div 
                          key={order.id || `ord-${index}`} 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 group hover:border-indigo-200 transition-colors"
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-2 py-1 rounded-md uppercase mb-2 block w-fit">#{String(order.id || order.orderId || '').slice(-6)}</span>
                              <div className="flex items-center gap-1 text-slate-900 font-bold">
                                <span className="text-lg">{formatPrice(order.deliveryFee || 25)}</span>
                                <span className="text-[10px] text-slate-400 font-medium">Earning</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end">
                               <div className="flex items-center gap-1 text-amber-500 font-bold text-xs mb-1">
                                 <FiZap size={10} /> {order.distance || '2.4km'}
                               </div>
                               <div className="text-[10px] text-slate-400 font-medium">Est. 15 mins</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl mb-4 border border-slate-100">
                            <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-indigo-500 shadow-sm shrink-0">
                              <FiMapPin size={16} />
                            </div>
                            <p className="text-[11px] text-slate-600 leading-tight font-medium truncate flex-1">
                              {order.address || 'Pickup from Local Hub'}
                            </p>
                          </div>

                          <button
                            onClick={() => { setSelectedNewOrder(order); setShowNewOrderModal(true); }}
                            className="w-full bg-[#0F172A] text-white py-3.5 rounded-2xl font-black text-[13px] uppercase tracking-wider hover:bg-indigo-600 transition-all shadow-lg active:scale-95"
                          >
                            View Details
                          </button>
                        </motion.div>
                      ))}
                    </>
                  )}
                </div>
              </section>
            )}

            {/* Active/Assigned Work Section */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-slate-800 rounded-full" />
                  <h2 className="text-lg font-black text-slate-800 tracking-tight">My Active List</h2>
                </div>
              </div>

              <div className="space-y-4">
                {isDashboardLoading ? (
                  Array(2).fill(0).map((_, i) => <div key={i} className="h-24 bg-white rounded-3xl animate-pulse" />)
                ) : recentOrders.filter(o => o.status !== 'delivered').length === 0 ? (
                  <div className="py-8 text-center bg-white rounded-3xl border border-slate-100 shadow-sm">
                    <p className="text-slate-400 font-bold text-sm">No active tasks assigned.</p>
                  </div>
                ) : (
                  recentOrders
                    .filter(o => o.status !== 'delivered')
                    .map((order, index) => (
                      <motion.div
                        key={order.id || `act-${index}`}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                           const orderId = order.id || order.orderId || order._id;
                           if (orderId) {
                             navigate(`/delivery/orders/${orderId}`);
                           }
                        }}
                        className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow"
                      >
                        <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shadow-lg shrink-0">
                          <FiTruck className="text-white text-lg" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-black text-slate-900 text-[13px] truncate">#{String(order.id || order.orderId || '').slice(-8)}</h3>
                          <div className="flex items-center gap-1.5 mt-1">
                              <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter w-fit ${getStatusColor(order.status)}`}>
                                  {order.status.replace(/_/g, ' ')}
                              </div>
                          </div>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                           <FiArrowRight size={14} />
                        </div>
                      </motion.div>
                    ))
                )}
              </div>
            </section>
          </div>
        </div>

        <NewOrderModal
          isOpen={showNewOrderModal}
          order={selectedNewOrder}
          isAccepting={isUpdatingOrderStatus}
          onClose={() => { stopBuzzer(); !isUpdatingOrderStatus && setShowNewOrderModal(false); }}
          onAccept={async (id) => {
            stopBuzzer();
            await handleAcceptOrder(id, selectedNewOrder?.isReturn);
            setShowNewOrderModal(false);
          }}
        />

        {/* Floating Buzzer Control & Utility */}
        <div className="fixed bottom-24 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
            {isBuzzerActive && (
               <button 
                 onClick={stopBuzzer}
                 className="bg-red-500 text-white p-4 rounded-2xl shadow-2xl animate-bounce flex items-center gap-2 font-black uppercase text-xs tracking-widest border-2 border-white pointer-events-auto"
               >
                 <FiAlertCircle className="animate-pulse" /> 🛑 Stop Alarm
               </button>
            )}
            <button 
              onClick={() => {
                const audio = new Audio('/sounds/mgs_codec.mp3');
                audio.play().then(() => toast.success('Sound Active!', { icon: '🔊' }))
                     .catch(() => toast.error('Tap again to enable sound!'));
              }}
              className="bg-white text-slate-400 p-3 rounded-xl shadow-lg border border-slate-200 flex items-center gap-2 font-bold text-[10px] uppercase hover:bg-slate-50 transition-colors pointer-events-auto"
            >
              <FiZap size={14} /> Test Sound
            </button>
        </div>

        <WithdrawalModal
          isOpen={showWithdrawalModal}
          onClose={() => setShowWithdrawalModal(false)}
          balance={deliveryBoy?.availableBalance || 0}
          onWithdrawalRequested={() => { setShowWithdrawalModal(false); loadDashboardData(); }}
        />
      </div>
    </PageTransition>
  );
};

export default DeliveryDashboard;

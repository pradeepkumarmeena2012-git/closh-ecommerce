import { useState, useEffect, useRef, useCallback } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiTruck, FiNavigation, FiZap, FiArrowRight, FiActivity, FiAlertCircle, FiTrendingUp } from 'react-icons/fi';
import { useDeliveryAuthStore } from '../store/deliveryStore';
import PageTransition from '../../../shared/components/PageTransition';
import toast from 'react-hot-toast';
import WithdrawalModal from '../components/WithdrawalModal';
import socketService from '../../../shared/utils/socket';
import { useDeliveryTracking } from '../../../shared/hooks/useDeliveryTracking';
import DashboardMap from '../components/DashboardMap';
import NewOrderModal from '../components/NewOrderModal';

const DeliveryDashboard = () => {
  const { isLoaded } = useOutletContext();
  const {
    deliveryBoy, updateStatus, fetchProfile, fetchDashboardSummary,
    isUpdatingStatus
  } = useDeliveryAuthStore();

  const navigate = useNavigate();
  const [recentOrders, setRecentOrders] = useState([]);
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);
  const isOnline = deliveryBoy?.status === 'available';

  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [newOrderRequest, setNewOrderRequest] = useState(null);
  const [isAccepting, setIsAccepting] = useState(false);

  // --- Real-time Delivery Tracking ---
  const activeTasks = recentOrders.filter(o => 
    ['assigned', 'ready_for_pickup', 'picked_up', 'out_for_delivery', 'picked-up', 'out-for-delivery'].includes(o.status?.toLowerCase())
  );
  
  // Prioritize "on-going" tasks for the map focus
  const primaryOrder = activeTasks.find(o => ['picked_up', 'out_for_delivery', 'picked-up', 'out-for-delivery'].includes(o.status?.toLowerCase())) || activeTasks[0];

  // Capture current location and sync with backend
  const currentLocation = useDeliveryTracking(deliveryBoy?.id, activeTasks);

  const loadDashboardData = async () => {
    try {
      setIsDashboardLoading(true);
      await fetchProfile();
      const summary = await fetchDashboardSummary();
      setRecentOrders(summary.recentOrders || []);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setIsDashboardLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    if (deliveryBoy?.id) {
       socketService.connect();
       socketService.deliveryRegister(deliveryBoy.id);
    }

    const handleRefresh = () => {
      loadDashboardData();
    };
    window.addEventListener('delivery-dashboard-refresh', handleRefresh);

    const handleNewOrder = (data) => {
      console.log("🔔 [SOCKET] New Order Request Recieved:", data);
      
      // Play Buzzer Sound
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(() => {});
      } catch {}

      setNewOrderRequest(data);
    };

    socketService.on('order_ready_for_pickup', handleNewOrder);
    socketService.on('return_ready_for_pickup', handleNewOrder);
    
    socketService.on('order_assigned', () => {
      setNewOrderRequest(null);
      handleRefresh();
    });

    socketService.on('order_taken', (data) => {
       setNewOrderRequest(prev => {
          if (prev?.id === data.id || prev?.orderId === data.orderId) {
             toast('Order taken by another partner', { icon: 'ℹ️' });
             return null;
          }
          return prev;
       });
    });

    socketService.on('newOrder', handleRefresh);
    socketService.on('order_picked_up', handleRefresh);
    socketService.on('order_delivered', handleRefresh);

    const interval = setInterval(loadDashboardData, 30000); 

    return () => {
      window.removeEventListener('delivery-dashboard-refresh', handleRefresh);
      socketService.off('order_ready_for_pickup');
      socketService.off('return_ready_for_pickup');
      socketService.off('order_assigned');
      socketService.off('order_taken');
      socketService.off('newOrder');
      socketService.off('order_picked_up');
      socketService.off('order_delivered');
      clearInterval(interval);
    };
  }, [deliveryBoy?.id, newOrderRequest?.id]);

  const handleToggleOnline = async () => {
    if (isUpdatingStatus) return;
    const wasOnline = isOnline;
    const newStatus = wasOnline ? 'offline' : 'available';
    try {
      await updateStatus(newStatus);
      toast.success(wasOnline ? 'You are now Offline' : 'You are now Online!');
      if (!wasOnline) loadDashboardData();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to update status';
      toast.error(msg);
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
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <PageTransition>
      <div className="relative h-[calc(100vh-140px)] w-full overflow-hidden bg-slate-900 font-sans">
        
        {/* BACKGROUND MAP LAYER - FULL SCREEN */}
        <div className="absolute inset-0 z-0">
          <DashboardMap 
            currentLocation={currentLocation} 
            activeOrder={primaryOrder}
            isOnline={isOnline} 
            isLoaded={isLoaded}
            height="100%"
            hideHeader={true}
          />
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/50 to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
        </div>

        {/* TOP OVERLAYS */}
        <div className="absolute top-4 inset-x-4 z-10 space-y-3">
          <div className="flex items-center justify-between">
            <motion.div 
              initial={{ opacity: 0, x: -20 }} 
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <div className="w-12 h-12 rounded-2xl bg-white/95 backdrop-blur-md border border-white/20 shadow-xl p-0.5 relative">
                <img 
                  src={deliveryBoy?.avatar || `https://ui-avatars.com/api/?name=${deliveryBoy?.name}&background=6366f1&color=fff`} 
                  className="w-full h-full object-cover rounded-[14px]" 
                  alt="Profile" 
                />
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white shadow-sm flex items-center justify-center ${isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`}>
                  {isOnline && <div className="w-full h-full rounded-full bg-emerald-500 animate-ping opacity-40" />}
                </div>
              </div>
              <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 shadow-lg relative group overflow-hidden">
                <div className="relative z-10">
                  <h1 className="text-[14px] font-black text-slate-800 leading-none">Hi, {deliveryBoy?.name?.split(' ')[0] || 'Partner'}</h1>
                  <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${isOnline ? 'text-emerald-600' : 'text-slate-500'}`}>
                    {isOnline ? 'System Online' : 'Currently Offline'}
                  </p>
                </div>
                {isOnline && <div className="absolute top-0 right-0 w-8 h-8 bg-emerald-500/10 blur-xl rounded-full -mr-2 -mt-2" />}
              </div>
            </motion.div>
            
            <motion.button 
              initial={{ opacity: 0, scale: 0.8 }} 
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => navigate('/delivery/notifications')}
              className="w-12 h-12 rounded-2xl bg-white/95 backdrop-blur-md border border-white/20 shadow-xl flex items-center justify-center text-slate-700 active:scale-95 transition-transform"
            >
              <FiAlertCircle size={20} />
            </motion.button>
          </div>

        </div>

        {/* BOTTOM ACTIVE TASK OVERLAY */}
        <div className="absolute inset-x-0 bottom-4 z-10 pointer-events-none px-4">
          <AnimatePresence>
            {recentOrders.filter(o => ['pending', 'accepted', 'assigned', 'picked_up', 'out_for_delivery'].includes(o.status?.toLowerCase())).length > 0 ? (
              <motion.div 
                initial={{ y: 100, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="bg-white/95 backdrop-blur-xl rounded-[24px] p-3 shadow-2xl border border-white/30 pointer-events-auto max-w-sm mx-auto"
              >
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-4 bg-indigo-600 rounded-full" />
                    <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-widest leading-none">Active Task</h2>
                  </div>
                  <button 
                    onClick={() => navigate('/delivery/orders')}
                    className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center text-indigo-600 shadow-inner"
                  >
                    <FiArrowRight size={12} />
                  </button>
                </div>

                {recentOrders.filter(o => ['pending', 'accepted', 'assigned', 'picked_up', 'out_for_delivery'].includes(o.status?.toLowerCase())).slice(0, 1).map((order) => (
                  <motion.div 
                    key={order.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate(`/delivery/orders/${order.id}`)}
                    className="bg-slate-900 rounded-[18px] p-3 flex items-center gap-3 shadow-xl border border-white/5 cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg text-white shrink-0 transform group-hover:rotate-3 transition-transform">
                      <FiTruck size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h3 className="font-black text-white text-xs truncate">#{String(order.id).slice(-8)}</h3>
                        <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter ${getStatusColor(order.status)}`}>
                          {order.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <p className="text-[10px] text-slate-400 font-bold truncate tracking-tight">{order.address}</p>
                      </div>
                      <div className="flex items-center gap-3 mt-1 pt-1 border-t border-white/10">
                        <div className="flex items-center gap-1">
                          <FiTrendingUp size={10} className="text-emerald-400" />
                          <span className="text-[10px] font-black text-emerald-400 tracking-tighter">₹{order.deliveryEarnings || 0}</span>
                        </div>
                        <div className="flex items-center gap-1 text-indigo-300">
                          <FiNavigation size={10} />
                          <span className="text-[10px] font-black tracking-tighter">
                            {order.deliveryDistance ? `${Number(order.deliveryDistance).toFixed(1)} KM` : '0 KM'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            ) : isOnline ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center py-4 px-8 text-center bg-white/95 backdrop-blur-md rounded-full shadow-2xl border border-white/20 max-w-[280px] mx-auto pointer-events-auto"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse mr-3 shadow-lg shadow-emerald-200" />
                <p className="text-slate-800 font-black text-[11px] uppercase tracking-widest leading-none">Scanning for Deliveries...</p>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <WithdrawalModal
          isOpen={showWithdrawalModal}
          onClose={() => setShowWithdrawalModal(false)}
          balance={deliveryBoy?.availableBalance || 0}
          onWithdrawalRequested={() => { setShowWithdrawalModal(false); loadDashboardData(); }}
        />

        <NewOrderModal
          isOpen={!!newOrderRequest}
          order={newOrderRequest}
          onClose={() => setNewOrderRequest(null)}
          onAccept={async (id) => {
            setIsAccepting(true);
            try {
              if (newOrderRequest?.type === 'return') {
                 await useDeliveryAuthStore.getState().acceptReturn(id);
              } else {
                 await useDeliveryAuthStore.getState().acceptOrder(id);
              }
              toast.success('Order Accepted!');
              setNewOrderRequest(null);
              loadDashboardData();
              navigate(`/delivery/orders/${id}`);
            } catch (err) {
              toast.error(err?.response?.data?.message || 'Failed to accept order');
            } finally {
              setIsAccepting(false);
            }
          }}
          isAccepting={isAccepting}
          riderLocation={currentLocation}
        />
      </div>
    </PageTransition>
  );
};

export default DeliveryDashboard;

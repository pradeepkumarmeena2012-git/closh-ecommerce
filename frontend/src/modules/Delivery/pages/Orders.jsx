import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiPackage, 
  FiMapPin, 
  FiClock, 
  FiCheckCircle, 
  FiXCircle, 
  FiNavigation, 
  FiPhone, 
  FiCreditCard,
  FiChevronRight,
  FiSearch,
  FiFilter,
  FiActivity,
  FiTruck
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import PageTransition from '../../../shared/components/PageTransition';
import { formatPrice } from '../../../shared/utils/helpers';
import toast from 'react-hot-toast';
import { useDeliveryAuthStore } from '../store/deliveryStore';
import NewOrderModal from '../components/NewOrderModal';
import socketService from '../../../shared/utils/socket';
import OrderCardSkeleton from '../../../shared/components/Skeletons/OrderCardSkeleton';

const DeliveryOrders = () => {
  const navigate = useNavigate();
  const {
    orders,
    ordersPagination,
    isLoadingOrders,
    isUpdatingOrderStatus,
    fetchOrders,
    acceptOrder,
    completeOrder,
    deliveryBoy,
  } = useDeliveryAuthStore();
  
  const isOnline = deliveryBoy?.status === 'available';
  const [filter, setFilter] = useState(isOnline ? 'available' : 'pending');
  const [currentPage, setCurrentPage] = useState(1);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [selectedNewOrder, setSelectedNewOrder] = useState(null);
  const PAGE_SIZE = 20;

  const getBackendStatusFilter = (value) => {
    if (value === 'pending') return 'open';
    if (value === 'in-transit') return 'shipped';
    if (value === 'delivered') return 'delivered';
    return undefined;
  };

  const loadOrders = async (page = currentPage, activeFilter = filter) => {
    try {
      // Use unified fetchOrders for both tabs to prevent data mixing
      // 'open' now covers ALL running statuses assigned to the rider in the backend
      const statusParam = activeFilter === 'available' ? 'open' : 'delivered';

      await fetchOrders({
        page,
        limit: PAGE_SIZE,
        status: statusParam
      });
    } catch (err) {
      console.error("Order Load Error:", err);
    }
  };

  useEffect(() => {
    loadOrders(currentPage, filter);
    const interval = setInterval(() => loadOrders(currentPage, filter), 120000);

    // Socket listeners (connection managed by DeliveryLayout)
    socketService.on('order_ready_for_pickup', (data) => {
      const currentStatus = useDeliveryAuthStore.getState().deliveryBoy?.status;
      if (currentStatus === 'available') {
        // Show popup modal with the new order
        if (data && (data.orderId || data.id)) {
          setSelectedNewOrder({
            id: data.orderId || data.id,
            orderId: data.orderId || data.id,
            total: data.total || 0,
            deliveryFee: data.deliveryFee || 0,
            customer: data.pickupName || 'Vendor',
            address: data.address || 'Address available in details',
            distance: data.distance || '-',
            estimatedTime: data.estimatedTime || '15 min',
          });
          setShowNewOrderModal(true);
        }
        if (filter === 'available') loadOrders(currentPage, filter);
      }
    });

    socketService.on('order_taken', (data) => {
      // Remove the order from local state immediately if another rider took it
      if (filter === 'available') {
        const { orders } = useDeliveryAuthStore.getState();
        const updated = orders.filter(o => o.id !== data.id && o.orderId !== data.orderId);
        useDeliveryAuthStore.setState({ orders: updated });
      }
    });

    return () => {
      clearInterval(interval);
      socketService.off('order_ready_for_pickup');
      socketService.off('order_taken');
    };
  }, [currentPage, filter]);

  const getStatusStyle = (status) => {
    const s = String(status).toLowerCase();
    if (['delivered', 'completed'].includes(s)) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (['cancelled', 'failed'].includes(s)) return 'bg-rose-100 text-rose-700 border-rose-200';
    if (['in-transit', 'shipped', 'out_for_delivery'].includes(s)) return 'bg-blue-100 text-blue-700 border-blue-200';
    return 'bg-amber-100 text-amber-700 border-amber-200';
  };

  const handleAcceptOrder = async (orderId) => {
    try {
      await acceptOrder(orderId);
      toast.success('Order assigned! Head to pickup.');
      // Switch to Active Duty tab to see the new mission
      setFilter('available');
      setCurrentPage(1);
    } catch(err) {}
  };

  const handleCompleteOrder = async (orderId) => {
    const otp = window.prompt('Enter 6-digit delivery OTP:');
    if (!otp) return;
    if (!/^\d{6}$/.test(otp.trim())) {
      toast.error('Invalid OTP format');
      return;
    }

    try {
      await completeOrder(orderId, otp.trim());
      toast.success('Delivery confirmed! Earning added.');
    } catch(err) {}
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#F8FAFC]">
        {/* AI Elite Sub-Header (High-Trust) */}
        <div className="bg-[#0F172A] pt-6 pb-12 px-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative z-10 flex items-center justify-between">
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-600/20">
                 <FiActivity size={18} className="text-white" />
              </div>
              Mission History
            </h1>
            <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[9px] font-bold text-slate-400 uppercase tracking-widest">
               Platform Secure
            </div>
          </div>

          <div className="relative z-10 mt-6 flex gap-2 overflow-x-auto scrollbar-hide">
             {['available', 'delivered'].filter(t => t !== 'available' || isOnline).map((tab) => (
               <button
                 key={tab}
                 onClick={() => { setFilter(tab); setCurrentPage(1); }}
                 className={`px-5 py-2 rounded-xl text-[12px] font-bold tracking-tight transition-all duration-300 border ${
                   filter === tab 
                   ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/30' 
                   : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-800'
                 }`}
               >
                 {tab === 'available' ? 'Active Duty' : tab.charAt(0).toUpperCase() + String(tab || '').slice(1).replace('-', ' ')}
               </button>
             ))}
          </div>
        </div>

        {/* Task List Section */}
        <div className="px-4 sm:px-6 -mt-8 sm:-mt-12 relative z-20 pb-16 transition-all duration-500">
          <div className="space-y-3 sm:space-y-4">
            {isLoadingOrders ? (
              Array(6).fill(0).map((_, i) => <OrderCardSkeleton key={i} />)
            ) : orders.length === 0 ? (
              <div className="text-center py-12 sm:py-20 bg-white rounded-[32px] sm:rounded-[40px] border border-slate-100 shadow-sm">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                   <FiPackage size={30} className="text-slate-200 sm:hidden" />
                   <FiPackage size={40} className="text-slate-200 hidden sm:block" />
                </div>
                <p className="text-slate-500 font-black text-base sm:text-lg">Empty Queue</p>
                <p className="text-slate-400 text-[11px] sm:text-sm mt-1">No orders matched your filter.</p>
              </div>
            ) : (
              orders.map((order, index) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => navigate(`/delivery/orders/${order.id}`)}
                  className="bg-white rounded-xl p-3 shadow-md shadow-slate-200/50 border border-slate-100 hover:border-slate-300 transition-all cursor-pointer group relative overflow-hidden"
                >
                  {/* Human-Centered Line 1: ID, Customer & Earnings */}
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-[7.5px] font-bold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 uppercase tracking-tighter shrink-0">#{String(order.id || order.orderId || '').slice(-6)}</span>
                      <h3 className="font-bold text-slate-800 text-[13px] tracking-tight truncate">{order.customer || 'Guest User'}</h3>
                    </div>
                    <p className={`font-bold text-[13px] shrink-0 ml-2 ${order.status === 'delivered' ? 'text-emerald-600' : 'text-slate-900'}`}>
                      {order.status === 'delivered' ? `+ ${formatPrice(order.deliveryEarnings || 0)}` : formatPrice(order.total || 0)}
                    </p>
                  </div>

                  {/* Proper Status & Metrics */}
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                       <span className={`text-[6px] font-bold uppercase px-1.5 py-0.5 rounded border ${order.paymentMethod === 'cod' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-sky-50 text-sky-700 border-sky-200'}`}>
                          {order.paymentMethod?.toUpperCase()}
                       </span>
                       <span className={`text-[6px] font-bold uppercase px-1.5 py-0.5 rounded border ${getStatusStyle(order.status)}`}>
                         {order.status.replace(/_/g, ' ')}
                       </span>
                       <div className="h-3 w-[1px] bg-slate-200 mx-1" />
                       <div className="flex items-center gap-2.5 text-slate-500 text-[9px] font-bold shrink-0">
                          <span className="flex items-center gap-1"><FiPackage size={11} className="text-slate-400" /> {order.items?.length || 0}</span>
                          <span className="flex items-center gap-1"><FiNavigation size={11} className="text-sky-600" /> {order.distance || '2.4 km'}</span>
                       </div>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-500/10 relative">
                      <FiTruck size={16} />
                      {order.items?.length > 0 && (
                        <div className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[7px] font-black min-w-[14px] h-[14px] rounded-full flex items-center justify-center px-0.5 border border-white">
                          {order.items.length}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        <NewOrderModal
          isOpen={showNewOrderModal}
          order={selectedNewOrder}
          isAccepting={isUpdatingOrderStatus}
          onClose={() => !isUpdatingOrderStatus && setShowNewOrderModal(false)}
          onAccept={async (id) => { await handleAcceptOrder(id); setShowNewOrderModal(false); }}
        />
      </div>
    </PageTransition>
  );
};

export default DeliveryOrders;

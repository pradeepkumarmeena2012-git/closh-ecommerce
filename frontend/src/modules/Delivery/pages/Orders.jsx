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
  FiActivity
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import PageTransition from '../../../shared/components/PageTransition';
import { formatPrice } from '../../../shared/utils/helpers';
import toast from 'react-hot-toast';
import { useDeliveryAuthStore } from '../store/deliveryStore';
import NewOrderModal from '../components/NewOrderModal';
import socketService from '../../../shared/utils/socket';

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
      if (activeFilter === 'available') {
        const { fetchAvailableOrders } = useDeliveryAuthStore.getState();
        await fetchAvailableOrders({ page, limit: PAGE_SIZE });
      } else {
        await fetchOrders({
          page,
          limit: PAGE_SIZE,
          status: getBackendStatusFilter(activeFilter),
        });
      }
    } catch (err) {
      console.error("Order Load Error:", err);
    }
  };

  useEffect(() => {
    loadOrders(currentPage, filter);
    const interval = filter === 'available' ? setInterval(() => loadOrders(currentPage, filter), 30000) : null;

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

    return () => {
      if (interval) clearInterval(interval);
      socketService.off('order_ready_for_pickup');
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
      setFilter('pending');
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
        {/* Sleek Sub-Header */}
        <div className="bg-[#0F172A] pt-16 sm:pt-28 pb-14 sm:pb-24 px-5 sm:px-6 relative overflow-hidden transition-all duration-500">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative z-10 flex items-center justify-between">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-500 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                 <FiActivity size={16} className="text-white sm:hidden" />
                 <FiActivity size={20} className="text-white hidden sm:block" />
              </div>
              Job Board
            </h1>
            <div className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-full text-[9px] sm:text-[11px] font-black text-indigo-400 uppercase tracking-widest whitespace-nowrap">
               {filter === 'available' ? 'Searching Live...' : 'Management'}
            </div>
          </div>

          <div className="relative z-10 mt-5 sm:mt-8 flex gap-2 overflow-x-auto no-scrollbar pb-1">
             {['available', 'pending', 'in-transit', 'delivered'].filter(t => t !== 'available' || isOnline).map((tab) => (
               <button
                 key={tab}
                 onClick={() => { setFilter(tab); setCurrentPage(1); }}
                 className={`px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-[11px] sm:text-[13px] font-black tracking-tight whitespace-nowrap transition-all duration-300 ${
                   filter === tab 
                   ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
                   : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:bg-slate-800'
                 }`}
               >
                 {tab === 'available' ? 'Live Requests' : tab.charAt(0).toUpperCase() + String(tab || '').slice(1).replace('-', ' ')}
               </button>
             ))}
          </div>
        </div>

        {/* Task List Section */}
        <div className="px-4 sm:px-6 -mt-8 sm:-mt-12 relative z-20 pb-16 transition-all duration-500">
          <div className="space-y-3 sm:space-y-4">
            {isLoadingOrders ? (
              Array(3).fill(0).map((_, i) => <div key={i} className="h-40 bg-white rounded-[24px] sm:rounded-[32px] animate-pulse" />)
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
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => navigate(`/delivery/orders/${order.id}`)}
                  className="bg-white rounded-2xl sm:rounded-[32px] p-4 sm:p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow cursor-pointer group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                       <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-2.5 py-1 rounded-lg uppercase tracking-wider mb-2 block w-fit">#{String(order.id || order.orderId || '').slice(-6)}</span>
                       <h3 className="font-black text-slate-900 text-lg leading-tight mb-1">{order.customer || 'Guest User'}</h3>
                       <div className="flex gap-2 flex-wrap mt-2">
                           {order.paymentMethod === 'cod' ? (
                              <span className="text-[9px] font-black uppercase text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">COD</span>
                           ) : (
                              <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">PAID</span>
                           )}
                           <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${getStatusStyle(order.status)}`}>
                             {order.status.replace(/_/g, ' ')}
                           </span>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="font-black text-slate-900 text-lg">{formatPrice(order.total || 0)}</p>
                       <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Order Total</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl mb-5 group-hover:bg-indigo-50/50 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
                       <FiMapPin size={18} />
                    </div>
                    <p className="text-[12px] text-slate-600 font-bold leading-snug line-clamp-2">
                       {order.address || 'Navigation data loading...'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-4">
                       <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold">
                          <FiPackage size={14} className="text-indigo-500" /> {Array.isArray(order.items) ? order.items.length : 1}
                       </div>
                       <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold">
                          <FiNavigation size={14} className="text-emerald-500" /> {order.distance || '2.4 km'}
                       </div>
                    </div>

                    <div className="flex gap-2">
                       {(order.rawStatus === 'ready_for_delivery' && filter === 'available') && (
                          <button 
                             onClick={(e) => { e.stopPropagation(); setSelectedNewOrder(order); setShowNewOrderModal(true); }}
                             className="px-6 py-2.5 bg-[#0F172A] text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 shadow-lg"
                          >
                             Accept Job
                          </button>
                       )}
                       {order.status === 'in-transit' && (
                          <button 
                             onClick={(e) => { e.stopPropagation(); handleCompleteOrder(order.id); }}
                             className="px-6 py-2.5 bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-600 shadow-lg"
                          >
                             Complete
                          </button>
                       )}
                       <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                          <FiChevronRight size={20} />
                       </div>
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

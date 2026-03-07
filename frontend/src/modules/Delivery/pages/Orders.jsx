import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiPackage, FiMapPin, FiClock, FiCheckCircle, FiXCircle, FiNavigation, FiPhone, FiCreditCard } from 'react-icons/fi';
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
  const [filter, setFilter] = useState(isOnline ? 'available' : 'pending'); // available, pending(open), in-transit(shipped), completed(delivered)
  const [loadFailed, setLoadFailed] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [selectedNewOrder, setSelectedNewOrder] = useState(null);
  const PAGE_SIZE = 20;

  const getBackendStatusFilter = (value) => {
    if (value === 'all') return undefined; // No 'all' anymore, using available as default
    if (value === 'pending') return 'open';
    if (value === 'in-transit') return 'shipped';
    if (value === 'delivered') return 'delivered';
    return undefined;
  };

  const loadOrders = async (page = currentPage, activeFilter = filter) => {
    try {
      setLoadFailed(false);
      if (activeFilter === 'available') {
        const { fetchAvailableOrders } = useDeliveryAuthStore.getState();
        await fetchAvailableOrders({
          page,
          limit: PAGE_SIZE,
        });
      } else {
        await fetchOrders({
          page,
          limit: PAGE_SIZE,
          status: getBackendStatusFilter(activeFilter),
        });
      }
    } catch {
      setLoadFailed(true);
      // Error toast handled by API interceptor.
    }
  };

  useEffect(() => {
    loadOrders(currentPage, filter);
    // Refresh interval for available orders
    const interval = filter === 'available' ? setInterval(() => loadOrders(currentPage, filter), 30000) : null;

    // Real-time socket updates
    socketService.connect();
    socketService.joinRoom('delivery_partners');

    socketService.on('order_ready_for_pickup', () => {
      const currentStatus = useDeliveryAuthStore.getState().deliveryBoy?.status;
      if (filter === 'available' && currentStatus === 'available') loadOrders(currentPage, filter);
    });
    socketService.on('order_taken', () => {
      const currentStatus = useDeliveryAuthStore.getState().deliveryBoy?.status;
      if (filter === 'available' && currentStatus === 'available') loadOrders(currentPage, filter);
    });

    return () => {
      if (interval) clearInterval(interval);
      socketService.off('order_ready_for_pickup');
      socketService.off('order_taken');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, filter]);


  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'in-transit':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'delivered':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <FiClock className="text-yellow-600" />;
      case 'in-transit':
        return <FiNavigation className="text-blue-600" />;
      case 'delivered':
        return <FiCheckCircle className="text-green-600" />;
      case 'cancelled':
        return <FiXCircle className="text-red-600" />;
      default:
        return <FiPackage className="text-gray-600" />;
    }
  };

  const handleAcceptOrder = async (orderId) => {
    try {
      await acceptOrder(orderId);
      toast.success('Order accepted successfully');
      setFilter('pending'); // Switch to pending to show the accepted order
      setCurrentPage(1);
      loadOrders(1, 'pending');
    } catch {
      // Error toast handled by API interceptor.
    }
  };

  const handleCompleteOrder = async (orderId) => {
    const otp = window.prompt('Enter 6-digit delivery OTP shared by customer:');
    if (otp === null) return;
    if (!/^\d{6}$/.test(String(otp).trim())) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }

    try {
      await completeOrder(orderId, String(otp).trim());
      toast.success('Order marked as delivered');
    } catch {
      // Error toast handled by API interceptor.
    }
  };

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(Number(ordersPagination?.pages || 1), prev + 1));
  };

  return (
    <PageTransition>
      <div className="px-4 py-6 space-y-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <h1 className="text-2xl font-bold text-gray-800">Orders</h1>
          <span className="text-sm text-gray-600">
            {Number(ordersPagination?.total || orders.length)} orders
          </span>
        </motion.div>

        {/* Filter Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-2 overflow-x-auto pb-2"
        >
          {['available', 'pending', 'in-transit', 'delivered']
            .filter(tab => tab !== 'available' || isOnline)
            .map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setFilter(tab);
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${filter === tab
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                {tab === 'available' ? 'Available' : tab.charAt(0).toUpperCase() + tab.slice(1).replace('-', ' ')}
              </button>
            ))}
        </motion.div>

        {/* Orders List */}
        <div className="space-y-4">
          {isLoadingOrders ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <p className="text-gray-600">Loading orders...</p>
            </motion.div>
          ) : loadFailed ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <FiXCircle className="text-red-400 text-5xl mx-auto mb-4" />
              <p className="text-gray-700 mb-3">Could not load orders.</p>
              <button
                onClick={() => loadOrders(currentPage, filter)}
                className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-semibold"
              >
                Retry
              </button>
            </motion.div>
          ) : orders.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <FiPackage className="text-gray-400 text-5xl mx-auto mb-4" />
              <p className="text-gray-600">No {filter === 'available' ? 'available for acceptance' : filter} orders found</p>
            </motion.div>
          ) : (
            orders.map((order, index) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => navigate(`/delivery/orders/${order.id}`)}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
              >
                {/* Order Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(order.status === 'ready_for_delivery' ? 'pending' : (order.status === 'assigned' ? 'pending' : order.status))}
                      <p className="font-bold text-gray-800">{order.id}</p>
                    </div>
                    <p className="text-sm text-gray-800 font-semibold">{order.customer}</p>
                    <div className="flex flex-col gap-1.5 mt-1.5">
                      {order.phone && (
                        <div className="flex items-center gap-1.5 text-primary-700 font-bold text-sm bg-primary-50 px-2.5 py-1 rounded-md w-fit border border-primary-100">
                          <FiPhone size={12} />
                          <a href={`tel:${order.phone}`} onClick={(e) => e.stopPropagation()}>{order.phone}</a>
                        </div>
                      )}
                      <div className="flex items-center gap-2 flex-wrap mt-0.5">
                        {order.paymentMethod === 'cod' ? (
                          <span className="flex items-center gap-1 text-[10px] font-black uppercase text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                            <FiCreditCard size={10} /> Cash on Delivery (COD)
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <FiCreditCard size={10} /> Prepaid
                          </span>
                        )}
                        {order.deliveryType && order.deliveryType !== 'standard' && (
                          <span className="px-2 py-0.5 bg-primary-50 text-primary-700 text-[10px] font-black rounded border border-primary-100 uppercase tracking-tighter">
                            {order.deliveryType.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                      order.status === 'ready_for_delivery' ? 'pending' : (order.status === 'assigned' ? 'pending' : order.status)
                    )}`}
                  >
                    {order.status === 'ready_for_delivery' ? 'Ready' : (order.status === 'assigned' ? 'Assigned' : order.status.replace('-', ' '))}
                  </span>
                </div>

                {/* Address */}
                <div className="flex items-start gap-2 mb-3 p-3 bg-gray-50 rounded-xl">
                  <FiMapPin className="text-primary-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-700">{order.address || 'Address unavailable'}</p>
                </div>

                {/* Order Details */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <FiPackage />
                      <span>{Array.isArray(order.items) ? order.items.length : (typeof order.items === 'number' ? order.items : 0)} items</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FiClock />
                      <span>{order.estimatedTime || '-'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FiNavigation />
                      <span>{order.distance || '-'}</span>
                    </div>
                  </div>
                  <p className="font-bold text-primary-600">{formatPrice(order.total)}</p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {/* Show Accept button if order is ready_for_delivery (backend) AND in available list */}
                  {(order.rawStatus === 'ready_for_delivery' && filter === 'available') && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedNewOrder(order);
                        setShowNewOrderModal(true);
                      }}
                      disabled={isUpdatingOrderStatus}
                      className="flex-1 gradient-green text-white py-2.5 rounded-xl font-semibold text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isUpdatingOrderStatus ? 'Please wait...' : 'View & Accept'}
                    </button>
                  )}
                  {/* Show View/Pickup button if order is assigned to us or we have a pending pickup */}
                  {(order.rawStatus === 'assigned' || (order.rawStatus === 'ready_for_delivery' && filter === 'pending')) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/delivery/orders/${order.id}`);
                      }}
                      className="flex-1 gradient-primary text-white py-2.5 rounded-xl font-semibold text-sm"
                    >
                      Go to Pickup
                    </button>
                  )}

                  {order.status === 'in-transit' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCompleteOrder(order.id);
                      }}
                      disabled={isUpdatingOrderStatus}
                      className="flex-1 gradient-green text-white py-2.5 rounded-xl font-semibold text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isUpdatingOrderStatus ? 'Please wait...' : 'Mark Delivered'}
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/delivery/orders/${order.id}`);
                    }}
                    className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-200"
                  >
                    View Details
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {!isLoadingOrders && !loadFailed && Number(ordersPagination?.pages || 1) > 1 && (
          <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3">
            <button
              onClick={handlePreviousPage}
              disabled={currentPage <= 1}
              className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {currentPage} of {Number(ordersPagination?.pages || 1)}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage >= Number(ordersPagination?.pages || 1)}
              className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}

        <NewOrderModal
          isOpen={showNewOrderModal}
          order={selectedNewOrder}
          isAccepting={isUpdatingOrderStatus}
          onClose={() => {
            if (!isUpdatingOrderStatus) setShowNewOrderModal(false);
          }}
          onAccept={async (id) => {
            await handleAcceptOrder(id);
            setShowNewOrderModal(false);
          }}
        />

      </div>
    </PageTransition>
  );
};

export default DeliveryOrders;


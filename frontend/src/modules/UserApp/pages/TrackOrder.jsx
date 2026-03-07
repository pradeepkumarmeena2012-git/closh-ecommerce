import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiCheckCircle, FiClock, FiPackage, FiTruck, FiMapPin, FiArrowLeft } from 'react-icons/fi';
import MobileLayout from "../components/Layout/MobileLayout";
import { useOrderStore } from '../../../shared/store/orderStore';
import { formatPrice } from '../../../shared/utils/helpers';
import { formatVariantLabel } from '../../../shared/utils/variant';
import PageTransition from '../../../shared/components/PageTransition';
import Badge from '../../../shared/components/Badge';
import LazyImage from '../../../shared/components/LazyImage';
import { useAuthStore } from '../../../shared/store/authStore';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import socketService from '../../../shared/utils/socket';

// Fix for default marker icon issues in Leaflet with React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom delivery boy icon
const deliveryIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/2972/2972185.png',
  iconSize: [35, 35],
  iconAnchor: [17, 35],
  popupAnchor: [0, -35],
});

const ChangeView = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center && Array.isArray(center) && center.length === 2) {
      map.setView(center);
    }
  }, [center, map]);
  return null;
};

const MobileTrackOrder = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { getOrder, fetchOrderById, fetchPublicTrackingOrder, lastError } = useOrderStore();
  const { user } = useAuthStore();
  const [isResolving, setIsResolving] = useState(true);
  const order = getOrder(orderId);
  const shippingAddress = order?.shippingAddress || {};
  const orderItems = Array.isArray(order?.items) ? order.items : [];
  const normalizedStatus = String(order?.status || 'pending').toLowerCase();
  const displayOrderId = order?.id || order?.orderId || orderId;
  const hasShippingAddress = Boolean(
    shippingAddress?.name ||
    shippingAddress?.address ||
    shippingAddress?.city ||
    shippingAddress?.state ||
    shippingAddress?.zipCode
  );

  useEffect(() => {
    let mounted = true;
    const fetchOrder = async () => {
      if (orderId) {
        const privateOrder = await fetchOrderById(orderId);
        if (!privateOrder) {
          await fetchPublicTrackingOrder(orderId);
        }
      }
      if (mounted) setIsResolving(false);
    };

    fetchOrder();

    // Socket.io for real-time updates
    socketService.connect();
    if (user?.id) {
      socketService.joinRoom(`user_${user.id}`);
      socketService.on('order_status_updated', (data) => {
        if (data.orderId === displayOrderId) {
          fetchOrder();
        }
      });
      socketService.on('order_picked_up', (data) => {
        if (data.orderId === displayOrderId) fetchOrder();
      });
      socketService.on('order_out_for_delivery', (data) => {
        if (data.orderId === displayOrderId) fetchOrder();
      });
      socketService.on('order_delivered', (data) => {
        if (data.orderId === displayOrderId) fetchOrder();
      });
    }

    // Polling as fallback
    const pollingInterval = setInterval(() => {
      if (['accepted', 'ready_for_pickup', 'picked_up', 'out_for_delivery'].includes(normalizedStatus)) {
        fetchOrder();
      }
    }, 30000); // 30 seconds fallback

    return () => {
      mounted = false;
      clearInterval(pollingInterval);
      if (user?.id) {
        socketService.off('order_status_updated');
        socketService.off('order_picked_up');
        socketService.off('order_out_for_delivery');
        socketService.off('order_delivered');
      }
    };
  }, [orderId, fetchOrderById, fetchPublicTrackingOrder, normalizedStatus, user?.id, displayOrderId]);

  useEffect(() => {
    if (!isResolving && !order) {
      navigate(user?.id ? '/orders' : '/home');
    }
  }, [isResolving, order, navigate, user?.id]);

  const riderLocation = order?.deliveryBoyId?.currentLocation?.coordinates;
  const hasRiderLocation = Array.isArray(riderLocation) && riderLocation.length === 2;
  const riderPosition = hasRiderLocation ? [riderLocation[1], riderLocation[0]] : null; // [lat, lng]

  if (isResolving) {
    return (
      <PageTransition>
        <MobileLayout showBottomNav={false} showCartBar={false}>
          <div className="flex items-center justify-center min-h-[60vh] px-4">
            <p className="text-gray-600">Loading order...</p>
          </div>
        </MobileLayout>
      </PageTransition>
    );
  }

  if (!order) {
    return (
      <PageTransition>
        <MobileLayout showBottomNav={false} showCartBar={false}>
          <div className="flex items-center justify-center min-h-[60vh] px-4">
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Order Not Found</h2>
              {lastError ? (
                <p className="text-sm text-gray-500 mb-4">{lastError}</p>
              ) : null}
              <button
                onClick={() => navigate(user?.id ? '/orders' : '/home')}
                className="gradient-green text-white px-6 py-3 rounded-xl font-semibold"
              >
                {user?.id ? 'Back to Orders' : 'Go Home'}
              </button>
            </div>
          </div>
        </MobileLayout>
      </PageTransition>
    );
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getTrackingSteps = () => {
    const isCancelled = normalizedStatus === 'cancelled';
    const isAccepted = ['accepted', 'assigned', 'ready_for_pickup', 'picked_up', 'out_for_delivery', 'delivered'].includes(normalizedStatus);
    const isReady = ['assigned', 'ready_for_pickup', 'picked_up', 'out_for_delivery', 'delivered'].includes(normalizedStatus);
    const isPickedUp = ['picked_up', 'out_for_delivery', 'delivered'].includes(normalizedStatus);
    const isOut = ['out_for_delivery', 'delivered'].includes(normalizedStatus);
    const isDelivered = normalizedStatus === 'delivered';

    const steps = [
      {
        label: 'Order Placed',
        completed: true,
        date: order?.date || order?.createdAt,
        icon: FiCheckCircle,
      },
      {
        label: 'Accepted',
        completed: isAccepted,
        date: order?.acceptedAt || null,
        icon: FiCheckCircle,
      },
      {
        label: 'Ready for Pickup',
        completed: isReady,
        date: order?.readyAt || null,
        icon: FiPackage,
      },
      {
        label: 'Picked Up',
        completed: isPickedUp,
        date: order?.pickedUpAt || null,
        icon: FiTruck,
      },
      {
        label: 'Out for Delivery',
        completed: isOut,
        date: order?.outForDeliveryAt || null,
        icon: FiTruck,
      },
      {
        label: 'Delivered',
        completed: isDelivered,
        date: isDelivered ? (order?.deliveredAt) : null,
        icon: FiCheckCircle,
      },
    ];

    if (isCancelled) {
      steps.push({
        label: 'Cancelled',
        completed: true,
        date: order?.cancelledAt || order?.updatedAt,
        icon: FiClock,
      });
    }
    return steps;
  };

  const steps = getTrackingSteps();

  return (
    <PageTransition>
      <MobileLayout showBottomNav={false} showCartBar={true}>
        <div className="w-full pb-24">
          {/* Header */}
          <div className="px-4 py-4 bg-white border-b border-gray-200 sticky top-1 z-30">
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <FiArrowLeft className="text-xl text-gray-700" />
              </button>
              <div className="flex-1">
                <h1 className="text-xl font-bold text-gray-800">Track Order</h1>
                <p className="text-sm text-gray-600">Order #{displayOrderId}</p>
              </div>
              <Badge variant={normalizedStatus}>{normalizedStatus.toUpperCase()}</Badge>
            </div>
          </div>

          {/* Live Map Tracking */}
          {['assigned', 'picked_up', 'out_for_delivery'].includes(normalizedStatus) && (
            <div className="px-4 mb-4">
              <div className="h-64 rounded-2xl overflow-hidden shadow-lg border-2 border-white relative">
                {hasRiderLocation ? (
                  <MapContainer
                    center={riderPosition}
                    zoom={15}
                    style={{ height: '100%', width: '100%', zIndex: 10 }}
                    zoomControl={false}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; OpenStreetMap'
                    />
                    <Marker position={riderPosition} icon={deliveryIcon}>
                      <Popup>
                        <div className="text-center">
                          <p className="font-bold text-gray-800">{order?.deliveryBoyId?.name || 'Delivery Partner'}</p>
                          <p className="text-xs text-gray-600">On the way to you!</p>
                        </div>
                      </Popup>
                    </Marker>
                    <ChangeView center={riderPosition} />
                  </MapContainer>
                ) : (
                  <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center text-center p-6">
                    <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mb-3">
                      <FiTruck className="text-primary-600 text-2xl" />
                    </div>
                    <h3 className="font-bold text-gray-800">Rider Location</h3>
                    <p className="text-sm text-gray-500">Wait a moment, we're fetching the live location...</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="px-4 py-4 space-y-4">
            {/* Tracking Timeline */}
            <div className="glass-card rounded-2xl p-4">
              <h2 className="text-base font-bold text-gray-800 mb-4">Order Status</h2>
              <div className="space-y-4">
                {steps.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <div key={index} className="flex items-start gap-4">
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${step.completed
                        ? 'gradient-green text-white'
                        : 'bg-gray-200 text-gray-500'
                        }`}>
                        <Icon className="text-lg" />
                      </div>
                      <div className="flex-1">
                        <h3 className={`font-semibold text-sm mb-1 ${step.completed ? 'text-gray-800' : 'text-gray-500'
                          }`}>
                          {step.label}
                        </h3>
                        <p className="text-xs text-gray-500">{step.label === 'Delivered' && !step.completed ? 'Instant (60 Mins)' : formatDate(step.date)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tracking Number */}
            {order.trackingNumber && (
              <div className="glass-card rounded-2xl p-4">
                <h2 className="text-base font-bold text-gray-800 mb-2">Tracking Number</h2>
                <p className="text-lg font-bold text-primary-600">{order.trackingNumber}</p>
              </div>
            )}

            {/* Shipping Address */}
            {hasShippingAddress ? (
              <div className="glass-card rounded-2xl p-4">
                <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <FiMapPin className="text-primary-600" />
                  Shipping Address
                </h2>
                <div className="text-sm text-gray-600 space-y-1">
                  <p className="font-semibold text-gray-800">{shippingAddress.name || 'N/A'}</p>
                  <p>{shippingAddress.address || 'N/A'}</p>
                  <p>
                    {shippingAddress.city || 'N/A'}, {shippingAddress.state || 'N/A'}{' '}
                    {shippingAddress.zipCode || 'N/A'}
                  </p>
                </div>
              </div>
            ) : null}

            {/* Order Items */}
            <div className="glass-card rounded-2xl p-4">
              <h2 className="text-base font-bold text-gray-800 mb-3">Order Items</h2>
              <div className="space-y-3">
                {orderItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                      <LazyImage
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-800 text-sm mb-1">{item.name}</h3>
                      <p className="text-xs text-gray-600">
                        {formatPrice(item.price)} x {item.quantity}
                      </p>
                      {formatVariantLabel(item?.variant) && (
                        <p className="text-[11px] text-gray-500">
                          {formatVariantLabel(item?.variant)}
                        </p>
                      )}
                    </div>
                    <p className="font-bold text-gray-800 text-sm">
                      {formatPrice(item.price * item.quantity)}
                    </p>
                  </div>
                ))}
                {orderItems.length === 0 && (
                  <p className="text-sm text-gray-600">Item details are not available for this tracking view.</p>
                )}
              </div>
            </div>

            {/* Estimated Delivery */}
            <div className="glass-card rounded-2xl p-4 border border-primary-100 bg-primary-50">
              <h2 className="text-base font-bold text-gray-800 mb-2">Delivery Type</h2>
              <p className="text-lg font-semibold text-primary-600">
                Instant Delivery (60 Mins)
              </p>
            </div>

            {/* Actions */}
            {user?.id ? (
              <button
                onClick={() => navigate(`/orders/${displayOrderId}`)}
                className="w-full py-3 gradient-green text-white rounded-xl font-semibold hover:shadow-glow-green transition-all"
              >
                View Order Details
              </button>
            ) : (
              <button
                onClick={() => navigate('/home')}
                className="w-full py-3 gradient-green text-white rounded-xl font-semibold hover:shadow-glow-green transition-all"
              >
                Continue Shopping
              </button>
            )}
          </div>
        </div>
      </MobileLayout>
    </PageTransition>
  );
};

export default MobileTrackOrder;


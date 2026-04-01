import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiCheckCircle, FiClock, FiPackage, FiTruck, FiMapPin, FiArrowLeft, FiShield, FiRefreshCw } from 'react-icons/fi';
import MobileLayout from "../components/Layout/MobileLayout";
import { useOrderStore } from '../../../shared/store/orderStore';
import { formatPrice } from '../../../shared/utils/helpers';
import { formatVariantLabel } from '../../../shared/utils/variant';
import PageTransition from '../../../shared/components/PageTransition';
import Badge from '../../../shared/components/Badge';
import LazyImage from '../../../shared/components/LazyImage';
import { useAuthStore } from '../../../shared/store/authStore';
import socketService from '../../../shared/utils/socket';
import TrackingMap from '../components/TrackingMap';

// Google Maps Icons (Using URLs for markers)
const DELIVERY_ICON = "https://maps.google.com/mapfiles/ms/icons/cycling.png";
const CUSTOMER_ICON = "https://maps.google.com/mapfiles/ms/icons/red-pushpin.png";

const MobileTrackOrder = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { getOrder, fetchOrderById, fetchPublicTrackingOrder, lastError, resendDeliveryOtp } = useOrderStore();
  const { user } = useAuthStore();
  const [isResolving, setIsResolving] = useState(true);
  const [riderLiveLocation, setRiderLiveLocation] = useState(null);
  const [riderArrived, setRiderArrived] = useState(false);
  const [deliveryOtp, setDeliveryOtp] = useState(null);
  const [riderInfo, setRiderInfo] = useState(null);
  const arrivedAudioRef = useRef(null);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef(null);
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

  const startCooldown = useCallback((seconds = 60) => {
    setResendCooldown(seconds);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current);
          cooldownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handleResendDeliveryOtp = async () => {
    if (isResendingOtp || resendCooldown > 0) return;
    try {
      setIsResendingOtp(true);
      const result = await resendDeliveryOtp(order?.orderId || order?.id || orderId);
      if (result?.deliveryOtpDebug) {
        setDeliveryOtp(result.deliveryOtpDebug);
      }
      startCooldown(60);
    } catch (err) {
      console.error('[Resend OTP]', err?.response?.data?.message || err?.message);
    } finally {
      setIsResendingOtp(false);
    }
  };

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
    
    // Join order-specific room for tracking
    if (orderId) {
      socketService.joinRoom(`order_${orderId}`);
    }

    // Listen for events on this order
    const handleStatusUpdate = (data) => {
        if (data.orderId === displayOrderId || data.orderId === orderId) {
            fetchOrder();
        }
    };

    socketService.on('order_status_updated', handleStatusUpdate);
    socketService.on('order_picked_up', handleStatusUpdate);
    socketService.on('order_out_for_delivery', handleStatusUpdate);
    socketService.on('order_delivered', handleStatusUpdate);
    socketService.on('order_updated', handleStatusUpdate);
    socketService.on('order_assigned', handleStatusUpdate);

    if (user?.id) {
      socketService.joinRoom(`user_${user.id}`);
    }

    const handleLocationUpdate = (data) => {
        console.log('📍 Rider moved:', data);
        setRiderLiveLocation({ lat: data.lat, lng: data.lng });
    };

    // Listen for rider info when order is picked up
    const handlePickedUp = (data) => {
        if (data.orderId === displayOrderId || data.orderId === orderId) {
            if (data.deliveryBoy) {
                setRiderInfo(data.deliveryBoy);
            }
            if (data.otp) {
                setDeliveryOtp(data.otp);
            }
            fetchOrder();
        }
    };

    // Listen for rider arrival — show OTP prominently
    const handleRiderArrived = (data) => {
        if (data.orderId === displayOrderId || data.orderId === orderId) {
            setRiderArrived(true);
            if (data.deliveryBoy) setRiderInfo(data.deliveryBoy);
            // Play arrival sound
            try {
                const audio = new Audio('/sounds/mgs_codec.mp3');
                audio.play().catch(() => {});
                arrivedAudioRef.current = audio;
            } catch (e) {}
        }
    };

    socketService.on('order_picked_up', handlePickedUp);
    socketService.on('rider_arrived', handleRiderArrived);

    // Listen for live location updates from rider
    socketService.on('location_updated', handleLocationUpdate);

    const handleOtpResent = (data) => {
      if (data?.deliveryOtpDebug) {
        setDeliveryOtp(data.deliveryOtpDebug);
      }
    };
    socketService.on('delivery_otp_resent', handleOtpResent);

    // Polling as fallback
    const pollingInterval = setInterval(() => {
      if (['accepted', 'ready_for_pickup', 'picked_up', 'out_for_delivery', 'assigned'].includes(normalizedStatus)) {
        fetchOrder();
      }
    }, 30000); // 30 seconds fallback

    return () => {
      mounted = false;
      clearInterval(pollingInterval);
      if (cooldownRef.current) clearInterval(cooldownRef.current);
      socketService.off('order_status_updated', handleStatusUpdate);
      socketService.off('order_picked_up', handlePickedUp);
      socketService.off('order_out_for_delivery', handleStatusUpdate);
      socketService.off('order_delivered', handleStatusUpdate);
      socketService.off('order_updated', handleStatusUpdate);
      socketService.off('order_assigned', handleStatusUpdate);
      socketService.off('location_updated', handleLocationUpdate);
      socketService.off('rider_arrived', handleRiderArrived);
      socketService.off('delivery_otp_resent', handleOtpResent);
      if (arrivedAudioRef.current) {
        try { arrivedAudioRef.current.pause(); } catch(e) {}
      }
    };
  }, [orderId, fetchOrderById, fetchPublicTrackingOrder, normalizedStatus, user?.id, displayOrderId]);

  useEffect(() => {
    if (!isResolving && !order) {
      navigate(user?.id ? '/orders' : '/home');
    }
  }, [isResolving, order, navigate, user?.id]);

  const initialRiderLoc = order?.deliveryBoyId?.currentLocation?.coordinates;
  const deliveryLocation = riderLiveLocation || (Array.isArray(initialRiderLoc) && initialRiderLoc.length === 2 ? { lat: initialRiderLoc[1], lng: initialRiderLoc[0] } : null);
  
  const dropLoc = order?.dropoffLocation?.coordinates;
  const customerLocation = Array.isArray(dropLoc) && dropLoc.length === 2 && dropLoc[0] !== 0 ? { lat: dropLoc[1], lng: dropLoc[0] } : null;

  const vendorLoc = order?.pickupLocation?.coordinates;
  const vendorLocation = Array.isArray(vendorLoc) && vendorLoc.length === 2 && vendorLoc[0] !== 0 ? { lat: vendorLoc[1], lng: vendorLoc[0] } : null;


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
                {deliveryLocation ? (
                  <TrackingMap 
                    deliveryLocation={deliveryLocation}
                    customerLocation={customerLocation}
                    vendorLocation={vendorLocation}
                    followMode={true}
                  />
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

            {/* Rider Arrived + OTP Display */}
            {(riderArrived || normalizedStatus === 'out_for_delivery') && deliveryOtp && (
              <div className="glass-card rounded-2xl p-5 bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 shadow-lg animate-pulse-slow">
                <div className="text-center">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full mx-auto flex items-center justify-center mb-3">
                    <FiShield className="text-emerald-600 text-2xl" />
                  </div>
                  <h3 className="font-bold text-emerald-900 text-lg mb-1">
                    {riderArrived ? 'Rider Has Arrived!' : 'Your Delivery OTP'}
                  </h3>
                  <p className="text-sm text-emerald-700 mb-4">Share this OTP with the delivery partner to receive your order</p>
                  <div className="bg-white rounded-2xl py-4 px-6 inline-block shadow-inner border border-emerald-100">
                    <span className="text-4xl font-black tracking-[0.5em] text-emerald-600">{deliveryOtp}</span>
                  </div>
                  <p className="text-xs text-emerald-500 mt-3 font-semibold">Do NOT share with anyone except the delivery partner</p>
                  <button
                    onClick={handleResendDeliveryOtp}
                    disabled={isResendingOtp || resendCooldown > 0}
                    className={`mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      isResendingOtp || resendCooldown > 0
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 shadow-md'
                    }`}
                  >
                    <FiRefreshCw className={`text-base ${isResendingOtp ? 'animate-spin' : ''}`} />
                    {isResendingOtp ? 'Resending...' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                  </button>
                </div>
              </div>
            )}

            {/* Delivery Boy Info Card (after pickup) */}
            {riderInfo && ['picked_up', 'out_for_delivery'].includes(normalizedStatus) && (
              <div className="glass-card rounded-2xl p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <FiTruck className="text-blue-600 text-xl" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800">{riderInfo.name || 'Delivery Partner'}</h3>
                    <p className="text-sm text-gray-500">{riderInfo.phone || ''}</p>
                  </div>
                  {riderInfo.phone && (
                    <a href={`tel:${riderInfo.phone}`} className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-sm">
                      Call
                    </a>
                  )}
                </div>
              </div>
            )}

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

            {/* Rider Details */}
            {['assigned', 'picked_up', 'out_for_delivery', 'shipped', 'delivered'].includes(normalizedStatus) ? (
              <div className="glass-card rounded-2xl p-4 bg-gradient-to-br from-white to-primary-50 border border-primary-100 shadow-sm transition-all hover:shadow-md">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                    <FiTruck className="text-primary-600" />
                    Delivery Executive
                  </h2>
                </div>
                {order.deliveryBoyId ? (
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-primary-100 rounded-2xl flex items-center justify-center border-2 border-white shadow-sm overflow-hidden flex-shrink-0">
                      <FiTruck className="text-primary-600 text-2xl" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
                        {order.deliveryBoyId.name || 'Our Partner'}
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" title="Online" />
                      </h3>
                      <p className="text-sm text-gray-500 mb-2">{order.deliveryBoyId.phone || 'Contact provided soon'}</p>
                      
                      <div className="flex gap-2">
                        <a 
                          href={`tel:${order.deliveryBoyId.phone || '#'}`}
                          className="px-4 py-1.5 bg-primary-600 text-white text-xs font-bold rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
                        >
                          Call Now
                        </a>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 py-2 text-gray-500 italic">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <FiClock className="text-gray-400" />
                    </div>
                    <p className="text-sm font-medium">Assigning a partner for your delivery...</p>
                  </div>
                )}
              </div>
            ) : null}

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


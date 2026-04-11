import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiPackage, FiTruck, FiMapPin, FiCreditCard, FiRotateCw, FiArrowLeft, FiShoppingBag, FiX } from 'react-icons/fi';
import { motion } from 'framer-motion';
import MobileLayout from "../components/Layout/MobileLayout";
import { useOrderStore } from '../../../shared/store/orderStore';
import { useCartStore } from '../../../shared/store/useStore';
import { formatPrice } from '../../../shared/utils/helpers';
import { formatVariantLabel, getVariantSignature } from '../../../shared/utils/variant';
import toast from 'react-hot-toast';
import PageTransition from '../../../shared/components/PageTransition';
import Badge from '../../../shared/components/Badge';
import LazyImage from '../../../shared/components/LazyImage';
import socketService from '../../../shared/utils/socket';

const MobileOrderDetail = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { getOrder, cancelOrder, fetchOrderById, requestReturn } = useOrderStore();
  const { addItem } = useCartStore();
  const [isResolving, setIsResolving] = useState(true);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReason, setReturnReason] = useState('Product issue');
  const [returnVendorId, setReturnVendorId] = useState('');
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);
  const order = getOrder(orderId);
  const shippingAddress = order?.shippingAddress || {};
  const orderItems = Array.isArray(order?.items) ? order.items : [];
  const vendorOptions = Array.isArray(order?.vendorItems)
    ? order.vendorItems
      .map((group) => ({
        id: String(group?.vendorId || ''),
        name: group?.vendorName || 'Vendor',
      }))
      .filter((group) => group.id)
    : [];

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!order && orderId) {
        await fetchOrderById(orderId);
      }
      if (mounted) setIsResolving(false);
    })();
    return () => {
      mounted = false;
    };
  }, [order, orderId, fetchOrderById]);

  useEffect(() => {
    if (!orderId) return;

    socketService.connect();
    socketService.joinRoom(`order_${orderId}`);
    socketService.joinRoom(`guest_${orderId}`);

    const handleUpdate = (data) => {
      // For both orderRoom and direct user room messages
      if (!data.orderId || String(data.orderId) === String(orderId)) {
        console.log('📦 Order update received via socket:', data);
        fetchOrderById(orderId);
      }
    };

    socketService.on('order_status_updated', handleUpdate);
    socketService.on('rider_assigned', handleUpdate);
    socketService.on('delivery_otp_sent', (data) => {
        toast.success('🔐 New Delivery OTP received!', { id: `otp-${orderId}` });
        handleUpdate(data);
    });
    socketService.on('rider_nearby', (data) => {
        toast.success('🛵 Your rider is nearby!', { id: `nearby-${orderId}` });
        handleUpdate(data);
    });

    return () => {
      socketService.leaveRoom(`order_${orderId}`);
      socketService.leaveRoom(`guest_${orderId}`);
      socketService.off('order_status_updated');
      socketService.off('rider_assigned');
      socketService.off('delivery_otp_sent');
      socketService.off('rider_nearby');
    };
  }, [orderId, fetchOrderById]);

  useEffect(() => {
    if (!isResolving && !order) {
      navigate('/orders');
    }
  }, [isResolving, order, navigate]);

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
              <button
                onClick={() => navigate('/orders')}
                className="bg-black text-white px-6 py-3 rounded-xl font-bold uppercase"
              >
                Back to Orders
              </button>
            </div>
          </div>
        </MobileLayout>
      </PageTransition>
    );
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleReorder = () => {
    order.items.forEach((item) => {
      addItem({
        id: item.id,
        name: item.name,
        price: item.price,
        image: item.image,
        quantity: item.quantity,
        variant: item.variant || undefined,
      });
    });
    toast.success('Items added to cart!');
    navigate('/checkout');
  };

  const handleCancel = async () => {
    if (window.confirm('Are you sure you want to cancel this order?')) {
      if (['pending', 'processing'].includes(order.status)) {
        try {
          await cancelOrder(order.id);
          toast.success('Order cancelled successfully');
          navigate('/orders');
        } catch (error) {
          toast.error(error?.message || 'Failed to cancel order');
        }
      } else {
        toast.error('This order cannot be cancelled');
      }
    }
  };

  const openReturnModal = () => {
    if (order.status !== 'delivered') {
      toast.error('Return can only be requested for delivered orders');
      return;
    }
    if (vendorOptions.length === 1) {
      setReturnVendorId(vendorOptions[0].id);
    } else if (!vendorOptions.find((v) => v.id === returnVendorId)) {
      setReturnVendorId(vendorOptions[0]?.id || '');
    }
    setShowReturnModal(true);
  };

  const handleRequestReturn = async () => {
    if (isSubmittingReturn) return;

    const reason = String(returnReason || '').trim();
    if (reason.length < 5) {
      toast.error('Please enter a valid return reason');
      return;
    }

    if (vendorOptions.length > 1 && !returnVendorId) {
      toast.error('Please select a vendor for return request');
      return;
    }

    try {
      setIsSubmittingReturn(true);
      await requestReturn(order.id, {
        reason,
        ...(returnVendorId ? { vendorId: returnVendorId } : {}),
      });
      toast.success('Return request submitted successfully');
      setShowReturnModal(false);
      setReturnReason('Product issue');
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to submit return request');
    } finally {
      setIsSubmittingReturn(false);
    }
  };

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
                  <h1 className="text-xl font-bold text-gray-800">Order Details</h1>
                  <p className="text-sm text-gray-600">Order #{order.id}</p>
                </div>
                <Badge variant={order.status}>{order.status.toUpperCase()}</Badge>
              </div>
            </div>

            <div className="px-4 py-4 space-y-4">
              {/* Delivery OTP Card */}
              {['assigned', 'picked_up', 'out_for_delivery'].includes(order.status) && order.deliveryOtpDebug && (
                <div className="bg-indigo-600 rounded-2xl p-5 text-white shadow-lg overflow-hidden relative">
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-indigo-100 text-xs font-bold uppercase tracking-wider mb-1">Security Code</p>
                        <h3 className="text-lg font-bold">Delivery OTP</h3>
                      </div>
                      <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                        <FiPackage className="text-xl" />
                      </div>
                    </div>
                    <div className="flex gap-2 mb-4">
                      {order.deliveryOtpDebug.split('').map((digit, i) => (
                        <div key={i} className="flex-1 bg-white/10 border border-white/20 rounded-xl py-3 text-center text-2xl font-black backdrop-blur-sm">
                          {digit}
                        </div>
                      ))}
                    </div>
                    <p className="text-indigo-100 text-[10px] leading-tight">
                      Please share this code with the delivery partner only after you have received and verified your items.
                    </p>
                  </div>
                  {/* Decorative circles */}
                  <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
                  <div className="absolute -left-4 -top-4 w-16 h-16 bg-white/5 rounded-full blur-xl" />
                </div>
              )}
              {/* Order Items */}
              <div className="glass-card rounded-2xl p-4">
                <h2 className="text-base font-bold text-gray-800 mb-4">Order Items</h2>
                {order.vendorItems && order.vendorItems.length > 0 ? (
                  <div className="space-y-4">
                    {order.vendorItems.map((vendorGroup) => (
                      <div key={vendorGroup.vendorId} className="space-y-2">
                        {/* Vendor Header */}
                        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
                          <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center flex-shrink-0">
                            <FiShoppingBag className="text-white text-[10px]" />
                          </div>
                          <span className="text-sm font-bold text-gray-900 flex-1">
                            {vendorGroup.vendorName}
                          </span>
                          <span className="text-xs font-bold text-gray-900 bg-white px-2 py-0.5 rounded-md border border-gray-100">
                            {formatPrice(vendorGroup.subtotal)}
                          </span>
                        </div>
                        {/* Vendor Items */}
                        <div className="space-y-2 pl-2">
                          {vendorGroup.items.map((item, itemIndex) => (
                            <div key={`${item.id}-${itemIndex}-${getVariantSignature(item?.variant || {})}`} className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
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
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orderItems.map((item, itemIndex) => (
                      <div key={`${item.id}-${itemIndex}-${getVariantSignature(item?.variant || {})}`} className="flex items-center gap-3">
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
                  </div>
                )}
              </div>

              {/* Shipping Address */}
              <div className="glass-card rounded-2xl p-4">
                <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <FiMapPin className="text-black" />
                  Shipping Address
                </h2>
                <div className="text-sm text-gray-600 space-y-1">
                  <p className="font-semibold text-gray-800">{shippingAddress.name || 'N/A'}</p>
                  <p>{shippingAddress.address || 'N/A'}</p>
                  <p>
                    {shippingAddress.city || 'N/A'}, {shippingAddress.state || 'N/A'}{' '}
                    {shippingAddress.zipCode || 'N/A'}
                  </p>
                  <p>{shippingAddress.country || 'N/A'}</p>
                  <p className="mt-2">Phone: {shippingAddress.phone || 'N/A'}</p>
                </div>
              </div>

              {/* Payment Info */}
              <div className="glass-card rounded-2xl p-4">
                <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <FiCreditCard className="text-black" />
                  Payment Information
                </h2>
                <div className="text-sm text-gray-600 space-y-2">
                  <div className="flex justify-between">
                    <span>Payment Method:</span>
                    <span className="font-semibold text-gray-800 capitalize">
                      {order.paymentMethod}
                    </span>
                  </div>
                  {order.trackingNumber && (
                    <div className="flex justify-between">
                      <span>Tracking Number:</span>
                      <span className="font-semibold text-gray-800">{order.trackingNumber}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Order Date:</span>
                    <span className="font-semibold text-gray-800">{formatDate(order.date)}</span>
                  </div>
                </div>
              </div>

              {/* Order Summary */}
              <div className="glass-card rounded-2xl p-4">
                <h2 className="text-base font-bold text-gray-800 mb-3">Order Summary</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>{formatPrice(order.subtotal)}</span>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>-{formatPrice(order.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping</span>
                    <span>{formatPrice(order.shipping)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Tax</span>
                    <span>{formatPrice(order.tax)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-gray-800 pt-2 border-t border-gray-200">
                    <span>Total</span>
                    <span className="text-black">{formatPrice(order.total)}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                {['pending', 'processing'].includes(order.status) && (
                  <button
                    onClick={handleCancel}
                    className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-semibold hover:bg-red-100 transition-colors"
                  >
                    Cancel Order
                  </button>
                )}
                <button
                  onClick={handleReorder}
                  className="w-full py-3 bg-black text-white rounded-xl font-bold uppercase flex items-center justify-center gap-2 hover:bg-gray-800 shadow-md transition-all"
                >
                  <FiRotateCw className="text-lg" />
                  Reorder
                </button>
                {order.status === 'delivered' && (
                  <button
                    onClick={openReturnModal}
                    className="w-full py-3 bg-amber-50 text-amber-700 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-amber-100 transition-colors"
                  >
                    <FiPackage className="text-lg" />
                    Request Return
                  </button>
                )}
                <button
                  onClick={() => navigate(`/track-order/${order.id}`)}
                  className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
                >
                  <FiTruck className="text-lg" />
                  Track Order
                </button>
              </div>
            </div>
          </div>

          {showReturnModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-gray-100 z-50 flex items-end sm:items-center sm:justify-center"
              onClick={() => setShowReturnModal(false)}
            >
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-4 sm:p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-800">Request Return</h3>
                  <button
                    onClick={() => setShowReturnModal(false)}
                    className="p-2 rounded-full hover:bg-gray-100"
                  >
                    <FiX className="text-gray-600" />
                  </button>
                </div>

                {vendorOptions.length > 1 && (
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Select Vendor
                    </label>
                    <select
                      value={returnVendorId}
                      onChange={(e) => setReturnVendorId(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Choose vendor</option>
                      {vendorOptions.map((vendor) => (
                        <option key={vendor.id} value={vendor.id}>
                          {vendor.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Reason
                  </label>
                  <textarea
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Describe the issue briefly"
                  />
                </div>

                <button
                  onClick={handleRequestReturn}
                  disabled={isSubmittingReturn}
                  className="w-full py-3 bg-black text-white rounded-xl font-bold uppercase disabled:opacity-70"
                >
                  {isSubmittingReturn ? 'Submitting...' : 'Submit Return Request'}
                </button>
              </motion.div>
            </motion.div>
          )}
      </MobileLayout>
    </PageTransition>
  );
};

export default MobileOrderDetail;





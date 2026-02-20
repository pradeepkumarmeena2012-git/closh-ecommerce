import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiCheckCircle, FiClock, FiPackage, FiTruck, FiMapPin, FiArrowLeft } from 'react-icons/fi';
import { motion } from 'framer-motion';
import MobileLayout from "../components/Layout/MobileLayout";
import { useOrderStore } from '../../../shared/store/orderStore';
import { formatPrice } from '../../../shared/utils/helpers';
import PageTransition from '../../../shared/components/PageTransition';
import ProtectedRoute from '../../../shared/components/Auth/ProtectedRoute';
import Badge from '../../../shared/components/Badge';
import LazyImage from '../../../shared/components/LazyImage';

const MobileTrackOrder = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { getOrder, fetchOrderById } = useOrderStore();
  const [isResolving, setIsResolving] = useState(true);
  const order = getOrder(orderId);

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
                className="gradient-green text-white px-6 py-3 rounded-xl font-semibold"
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
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getTrackingSteps = () => {
    const steps = [
      {
        label: 'Order Placed',
        completed: true,
        date: order.date,
        icon: FiCheckCircle,
      },
      {
        label: 'Processing',
        completed: ['processing', 'shipped', 'delivered'].includes(order.status),
        date: order.status !== 'pending' ? new Date(new Date(order.date).getTime() + 24 * 60 * 60 * 1000).toISOString() : null,
        icon: FiPackage,
      },
      {
        label: 'Shipped',
        completed: ['shipped', 'delivered'].includes(order.status),
        date: order.status === 'shipped' || order.status === 'delivered'
          ? new Date(new Date(order.date).getTime() + 2 * 24 * 60 * 60 * 1000).toISOString()
          : null,
        icon: FiTruck,
      },
      {
        label: 'Delivered',
        completed: order.status === 'delivered',
        date: order.status === 'delivered' ? order.estimatedDelivery : null,
        icon: FiCheckCircle,
      },
    ];
    return steps;
  };

  const steps = getTrackingSteps();

  return (
    <ProtectedRoute>
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
                  <p className="text-sm text-gray-600">Order #{order.id}</p>
                </div>
                <Badge variant={order.status}>{order.status.toUpperCase()}</Badge>
              </div>
            </div>

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
                          <p className="text-xs text-gray-500">{formatDate(step.date)}</p>
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
              <div className="glass-card rounded-2xl p-4">
                <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <FiMapPin className="text-primary-600" />
                  Shipping Address
                </h2>
                <div className="text-sm text-gray-600 space-y-1">
                  <p className="font-semibold text-gray-800">{order.shippingAddress.name}</p>
                  <p>{order.shippingAddress.address}</p>
                  <p>
                    {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                    {order.shippingAddress.zipCode}
                  </p>
                </div>
              </div>

              {/* Order Items */}
              <div className="glass-card rounded-2xl p-4">
                <h2 className="text-base font-bold text-gray-800 mb-3">Order Items</h2>
                <div className="space-y-3">
                  {order.items.map((item) => (
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
                          {formatPrice(item.price)} × {item.quantity}
                        </p>
                      </div>
                      <p className="font-bold text-gray-800 text-sm">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Estimated Delivery */}
              {order.estimatedDelivery && (
                <div className="glass-card rounded-2xl p-4">
                  <h2 className="text-base font-bold text-gray-800 mb-2">Estimated Delivery</h2>
                  <p className="text-lg font-semibold text-primary-600">
                    {formatDate(order.estimatedDelivery)}
                  </p>
                </div>
              )}

              {/* Actions */}
              <button
                onClick={() => navigate(`/app/orders/${order.id}`)}
                className="w-full py-3 gradient-green text-white rounded-xl font-semibold hover:shadow-glow-green transition-all"
              >
                View Order Details
              </button>
            </div>
          </div>
        </MobileLayout>
      </PageTransition>
    </ProtectedRoute>
  );
};

export default MobileTrackOrder;


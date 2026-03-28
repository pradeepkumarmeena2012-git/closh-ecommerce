import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  FiPackage,
  FiShoppingBag,
  FiTrendingUp,
  FiArrowRight,
} from "react-icons/fi";
import { IndianRupee } from 'lucide-react';
import { useVendorAuthStore } from "../store/vendorAuthStore";
import { useVendorProductStore } from "../store/vendorProductStore";
import { getVendorOrders, getVendorEarnings } from "../services/vendorService";
import { formatPrice } from "../../../shared/utils/helpers";
import { FiMapPin, FiAlertCircle } from "react-icons/fi";
import toast from "react-hot-toast";
import SwipeOrderCard from "../components/SwipeOrderCard";
import NewOrderModal from "../components/NewOrderModal";
import socketService from "../../../shared/utils/socket";

const VendorDashboard = () => {
  const navigate = useNavigate();
  const { vendor, updateLocation } = useVendorAuthStore();
  const [locationLoading, setLocationLoading] = useState(false);
  const { products, total: totalProductsCount, fetchProducts } = useVendorProductStore();
  const [isBuzzerActive, setIsBuzzerActive] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isAcceptingOrder, setIsAcceptingOrder] = useState(false);
  const { updateOrderStatus } = useVendorAuthStore();
  const buzzerRef = useRef(null);

  const [stats, setStats] = useState({
    totalProducts: 0,
    inStockProducts: 0,
    totalOrders: 0,
    pendingOrders: 0,
    totalEarnings: 0,
    pendingEarnings: 0,
  });

  const [recentOrders, setRecentOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const startBuzzer = useCallback(() => {
    if (buzzerRef.current) return;
    try {
      const audio = new Audio('/sounds/mgs_codec.mp3');
      audio.loop = true;
      audio.volume = 0.6;
      
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.warn('Buzzer playback blocked by browser:', err);
          toast.error('New Order! Tap anywhere to enable sound alert.');
        });
      }
      
      buzzerRef.current = audio;
      setIsBuzzerActive(true);

      // Auto-stop after 2 minutes to prevent infinite noise if vendor is away
      setTimeout(() => {
        if (buzzerRef.current === audio) {
          audio.pause();
          audio.currentTime = 0;
          setIsBuzzerActive(false);
          buzzerRef.current = null;
        }
      }, 120000);

    } catch (err) {
      console.error('Failed to initialize buzzer:', err);
    }
  }, []);

  const stopBuzzer = useCallback(() => {
    if (buzzerRef.current) {
      try {
        buzzerRef.current.pause();
        buzzerRef.current.currentTime = 0;
      } catch (e) { }
      buzzerRef.current = null;
    }
    setIsBuzzerActive(false);
  }, []);

  const vendorId = vendor?.id || vendor?._id;

  const handleSetLocation = async () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await updateLocation(latitude, longitude);
          if (res.success) {
            toast.success("Shop location updated successfully!");
          }
        } catch (error) {
          toast.error("Failed to update location. Please try again.");
        } finally {
          setLocationLoading(false);
        }
      },
      (error) => {
        setLocationLoading(false);
        toast.error("Please allow location access to set your shop location.");
      },
      { enableHighAccuracy: true }
    );
  };

  const isLocationSet = useMemo(() => {
    return (
      vendor?.shopLocation?.coordinates?.[0] !== 0 ||
      vendor?.shopLocation?.coordinates?.[1] !== 0
    );
  }, [vendor]);

  const loadDashboardData = useCallback(async () => {
    if (!vendorId) return;
    setIsLoading(true);
    try {
      // Fetch orders and earnings in parallel
      const [ordersRes, earningsRes, pendingRes, acceptedRes, processingRes] = await Promise.all([
        getVendorOrders({ page: 1, limit: 5 }),
        getVendorEarnings(),
        getVendorOrders({ page: 1, limit: 1, status: "pending" }),
        getVendorOrders({ page: 1, limit: 1, status: "accepted" }),
        getVendorOrders({ page: 1, limit: 1, status: "processing" }),
      ]);

      const ordersData = ordersRes?.data ?? ordersRes;
      const earningsData = earningsRes?.data ?? earningsRes;
      const pendingData = pendingRes?.data ?? pendingRes;
      const acceptedData = acceptedRes?.data ?? acceptedRes;
      const processingData = processingRes?.data ?? processingRes;

      const orders = ordersData?.orders ?? [];
      const summary = earningsData?.summary ?? {};
      const pendingCount =
        Number(pendingData?.total || 0) +
        Number(acceptedData?.total || 0) +
        Number(processingData?.total || 0);

      setStats((prev) => ({
        ...prev,
        totalOrders: ordersData?.total ?? orders.length,
        pendingOrders: pendingCount,
        totalEarnings: summary.totalEarnings ?? 0,
        pendingEarnings: summary.pendingEarnings ?? 0,
      }));

      setRecentOrders(orders);
    } catch {
      // errors handled by api.js toast
    } finally {
      setIsLoading(false);
    }
  }, [vendorId]);

  useEffect(() => {
    if (!vendorId) return;

    if (products.length === 0) {
      fetchProducts();
    }

    loadDashboardData();

    socketService.connect();
    socketService.joinRoom(`vendor_${vendorId}`);

    socketService.on("order_created", (newOrder) => {
      startBuzzer();
      setSelectedOrder(newOrder);
      setShowOrderModal(true);
      
      // Auto-join order room for real-time status sync
      const orderIdForRoom = newOrder.orderId || newOrder.id;
      if (orderIdForRoom) {
          socketService.joinRoom(`order_${orderIdForRoom}`);
      }
      
      toast.success(`🎉 New Order #${newOrder.orderId} received!`, { 
        duration: 10000,
        icon: '🔔',
      });
      loadDashboardData();
    });
    socketService.on("order_picked_up", () => loadDashboardData());
    socketService.on("order_delivered", () => loadDashboardData());
    socketService.on("order_updated", () => loadDashboardData());

    // Fallback Polling (Every 30 seconds) for environments where Sockets might be unstable (like Vercel)
    const pollInterval = setInterval(() => {
      console.log("🔄 Polling dashboard data...");
      loadDashboardData();
    }, 30000);

    return () => {
      clearInterval(pollInterval);
      socketService.off("order_created");
      socketService.off("order_picked_up");
      socketService.off("order_delivered");
      socketService.off("order_updated");
    };
  }, [vendorId, fetchProducts, loadDashboardData, products.length]);

  // Sync product counts whenever the product store updates
  useEffect(() => {
    const inStock = products.filter((p) => p.stock === "in_stock").length;
    setStats((prev) => ({
      ...prev,
      totalProducts: Number(totalProductsCount || 0),
      inStockProducts: inStock,
    }));
  }, [products, totalProductsCount]);

  const handleAcceptNewOrder = async (orderId) => {
      setIsAcceptingOrder(true);
      try {
          const res = await updateOrderStatus(orderId, 'accepted', {});
          if (res.success) {
              stopBuzzer();
              setShowOrderModal(false);
              loadDashboardData();
              toast.success(`Accepted successfully! Order #${orderId}`);
          }
      } catch (err) {
          toast.error(err?.response?.data?.message || 'Failed to accept order');
      } finally {
          setIsAcceptingOrder(false);
      }
  };

  const statCards = [
    {
      icon: FiPackage,
      label: "Total Products",
      value: stats.totalProducts,
      color: "bg-blue-500",
      bgColor: "bg-blue-50",
      textColor: "text-blue-700",
      link: "/vendor/products",
    },
    {
      icon: FiShoppingBag,
      label: "Total Orders",
      value: stats.totalOrders,
      color: "bg-green-500",
      bgColor: "bg-green-50",
      textColor: "text-green-700",
      link: "/vendor/orders",
    },
    {
      icon: FiTrendingUp,
      label: "Pending Orders",
      value: stats.pendingOrders,
      color: "bg-orange-500",
      bgColor: "bg-orange-50",
      textColor: "text-orange-700",
      link: "/vendor/orders",
    },
    {
      icon: IndianRupee,
      label: "Total Earnings",
      value: formatPrice(stats.totalEarnings || 0),
      color: "bg-purple-500",
      bgColor: "bg-purple-50",
      textColor: "text-purple-700",
      link: "/vendor/earnings",
    },
  ];

  const topProducts = useMemo(() => products.slice(0, 5), [products]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="lg:hidden flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
              Dashboard
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              Welcome back, {vendor?.storeName || vendor?.name}!
            </p>
          </div>
          <button 
            onClick={() => {
              const audio = new Audio('/sounds/mgs_codec.mp3');
              audio.volume = 0.3;
              audio.play().then(() => toast.success('Sound is working!', { icon: '🔊' }))
                   .catch(e => toast.error('Click again to unblock sound!'));
            }}
            className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-all"
            title="Test Buzzer"
          >
            <FiPackage className="animate-pulse" />
          </button>
        </div>
        <div className="hidden lg:flex items-center justify-between">
           <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-1">Store Overview</h1>
              <p className="text-gray-600">Managing {vendor?.storeName || 'your shop'} performance.</p>
           </div>
           <button 
                onClick={() => {
                  const audio = new Audio('/sounds/mgs_codec.mp3');
                  audio.volume = 0.3;
                  audio.play().then(() => toast.success('Sound Active!', { icon: '🔊' }))
                       .catch(e => toast.error('Unblock sound!'));
                }}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-500 hover:border-primary-500 hover:text-primary-600 transition-all shadow-sm"
              >
                <FiPackage className="text-lg" />
                Test Order Buzzer
           </button>
        </div>
      </div>

      {/* Location Warning */}
      {!isLocationSet && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="bg-orange-500 p-2 rounded-lg">
              <FiAlertCircle className="text-white text-xl" />
            </div>
            <div>
              <h3 className="font-bold text-orange-800">
                Shop Location Not Set
              </h3>
              <p className="text-sm text-orange-700">
                Please set your shop's GPS location to help customers find you
                and for accurate delivery.
              </p>
            </div>
          </div>
          <button
            onClick={handleSetLocation}
            disabled={locationLoading}
            className="w-full sm:w-auto px-6 py-2 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center gap-2"
          >
            {locationLoading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <FiMapPin />
            )}
            Set Current Location
          </button>
        </motion.div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => stat.link && navigate(stat.link)}
            className={`${stat.bgColor} rounded-xl p-4 cursor-pointer hover:shadow-lg transition-shadow`}>
            <div className="flex items-center justify-between mb-2">
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="text-white text-xl" />
              </div>
              <FiArrowRight className={`${stat.textColor} text-lg`} />
            </div>
            <h3 className={`${stat.textColor} text-sm font-medium mb-1`}>
              {stat.label}
            </h3>
            <p className={`${stat.textColor} text-2xl font-bold`}>
              {isLoading ? "—" : stat.value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => navigate("/vendor/products/add-product")}
            className="flex items-center gap-3 p-4 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors text-left">
            <div className="bg-primary-500 p-2 rounded-lg">
              <FiPackage className="text-white text-xl" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Add New Product</h3>
              <p className="text-sm text-gray-600">
                Create a new product listing
              </p>
            </div>
          </button>

          <button
            onClick={() => navigate("/vendor/orders")}
            className="flex items-center gap-3 p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors text-left">
            <div className="bg-green-500 p-2 rounded-lg">
              <FiShoppingBag className="text-white text-xl" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">View Orders</h3>
              <p className="text-sm text-gray-600">Manage your orders</p>
            </div>
          </button>

          <button
            onClick={() => navigate("/vendor/earnings")}
            className="flex items-center gap-3 p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors text-left">
            <div className="bg-purple-500 p-2 rounded-lg">
              <IndianRupee className="text-white text-xl" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">View Earnings</h3>
              <p className="text-sm text-gray-600">Check your earnings</p>
            </div>
          </button>

          <button
            onClick={handleSetLocation}
            disabled={locationLoading}
            className="flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-left">
            <div className="bg-blue-500 p-2 rounded-lg">
              {locationLoading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <FiMapPin className="text-white text-xl" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Set Shop Location</h3>
              <p className="text-sm text-gray-600">Update your GPS coordinates</p>
            </div>
          </button>
        </div>
      </div>

      {/* Recent Orders & Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">Recent Orders</h2>
            <button
              onClick={() => navigate("/vendor/orders")}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              View All
            </button>
          </div>
          {isLoading ? (
            <p className="text-gray-400 text-center py-8">Loading orders...</p>
          ) : recentOrders.length > 0 ? (
            <div className="space-y-4">
              {recentOrders.map((order) => {
                const currentVendorId = vendorId?.toString();
                const vendorItem = order.vendorItems?.find(
                  (vi) => (vi.vendorId?.toString() === currentVendorId) || (vi.vendorId === currentVendorId)
                );
                const displayStatus = (vendorItem?.status || order.status || 'pending').toLowerCase();

                // If it's an actionable order, show the swipe card
                if (['pending', 'accepted', 'processing'].includes(displayStatus)) {
                  return (
                    <SwipeOrderCard
                      key={order._id ?? order.orderId}
                      order={order}
                    onStatusUpdate={() => {
                        stopBuzzer();
                        loadDashboardData();
                      }}
                    />
                  );
                }

                const displayAmount =
                  vendorItem?.subtotal ?? order.totalAmount ?? order.total ?? 0;

                return (
                  <div
                    key={order._id ?? order.orderId}
                    onClick={() =>
                      navigate(`/vendor/orders/${order.orderId ?? order._id}`)
                    }
                    className="flex items-center justify-between p-3 bg-white hover:bg-gray-100 rounded-lg cursor-pointer transition-colors border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="bg-white p-2 rounded-lg shadow-sm">
                        <FiPackage className="text-gray-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">
                          {order.orderId ?? order._id}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-800 text-sm">
                        {formatPrice(displayAmount)}
                      </p>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase  ${displayStatus === "delivered"
                          ? "bg-green-100 text-green-700"
                          : displayStatus === "ready_for_delivery"
                            ? "bg-indigo-100 text-indigo-700"
                            : "bg-blue-100 text-blue-700"
                          }`}>
                        {displayStatus === "ready_for_delivery" ? "Ready" : displayStatus}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No orders yet</p>
          )}
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">Your Products</h2>
            <button
              onClick={() => navigate("/vendor/products")}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              View All
            </button>
          </div>
          {topProducts.length > 0 ? (
            <div className="space-y-3">
              {topProducts.map((product) => (
                <div
                  key={product._id ?? product.id}
                  onClick={() =>
                    navigate(`/vendor/products/${product._id ?? product.id}`)
                  }
                  className="flex items-center gap-3 p-3 bg-white hover:bg-gray-100 rounded-lg cursor-pointer transition-colors">
                  <img
                    src={product.image || product.images?.[0]}
                    alt={product.name}
                    className="w-12 h-12 object-cover rounded-lg"
                    onError={(e) => {
                      e.target.src =
                        "https://via.placeholder.com/48x48?text=P";
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate">
                      {product.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {formatPrice(product.price || 0)}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${product.stock === "in_stock"
                      ? "bg-green-100 text-green-700"
                      : product.stock === "low_stock"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                      }`}>
                    {product.stock === "in_stock"
                      ? "In Stock"
                      : product.stock === "low_stock"
                        ? "Low Stock"
                        : "Out of Stock"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No products yet</p>
          )}
        </div>
      </div>

      {/* Floating Buzzer Control */}
      {isBuzzerActive && (
        <div 
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border-2 border-white/20"
        >
          <div className="w-3 h-3 bg-white rounded-full animate-ping" />
          <span className="font-black uppercase tracking-widest text-sm text-white">New Order Alert!</span>
          <button 
            onClick={stopBuzzer}
            className="bg-white text-red-600 px-4 py-1.5 rounded-xl font-black text-xs uppercase hover:bg-red-50 transition-colors"
          >
            Stop Alarm
          </button>
        </div>
      )}
      {/* New Order Alarm Modal */}
      <NewOrderModal 
        isOpen={showOrderModal}
        order={selectedOrder}
        isAccepting={isAcceptingOrder}
        onAccept={handleAcceptNewOrder}
        onClose={() => { stopBuzzer(); setShowOrderModal(false); }}
      />
    </motion.div>
  );
};

export default VendorDashboard;

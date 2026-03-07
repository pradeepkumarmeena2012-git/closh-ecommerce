import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  FiPackage,
  FiShoppingBag,
  FiDollarSign,
  FiTrendingUp,
  FiArrowRight,
} from "react-icons/fi";
import { useVendorAuthStore } from "../store/vendorAuthStore";
import { useVendorProductStore } from "../store/vendorProductStore";
import { getVendorOrders, getVendorEarnings } from "../services/vendorService";
import { formatPrice } from "../../../shared/utils/helpers";
import { FiMapPin, FiAlertCircle } from "react-icons/fi";
import toast from "react-hot-toast";
import SwipeOrderCard from "../components/SwipeOrderCard";
import socketService from "../../../shared/utils/socket";

const VendorDashboard = () => {
  const navigate = useNavigate();
  const { vendor, updateLocation } = useVendorAuthStore();
  const [locationLoading, setLocationLoading] = useState(false);
  const { products, total: totalProductsCount, fetchProducts } = useVendorProductStore();

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

  useEffect(() => {
    if (!vendorId) return;

    // Load products into the product store (reuse if already fetched)
    if (products.length === 0) {
      fetchProducts();
    }

    const loadDashboardData = async () => {
      setIsLoading(true);
      try {
        // Fetch orders and earnings in parallel
        const [ordersRes, earningsRes, pendingRes, processingRes] = await Promise.all([
          getVendorOrders({ page: 1, limit: 5 }),
          getVendorEarnings(),
          getVendorOrders({ page: 1, limit: 1, status: "pending" }),
          getVendorOrders({ page: 1, limit: 1, status: "accepted" }), // Changed from processing to accepted
        ]);

        const ordersData = ordersRes?.data ?? ordersRes;
        const earningsData = earningsRes?.data ?? earningsRes;
        const pendingData = pendingRes?.data ?? pendingRes;
        const processingData = processingRes?.data ?? processingRes;

        const orders = ordersData?.orders ?? [];
        const summary = earningsData?.summary ?? {};
        const pending =
          Number(pendingData?.total || 0) + Number(processingData?.total || 0);

        setStats((prev) => ({
          ...prev,
          totalOrders: ordersData?.total ?? orders.length,
          pendingOrders: pending,
          totalEarnings: summary.totalEarnings ?? 0,
          pendingEarnings: summary.pendingEarnings ?? 0,
        }));

        setRecentOrders(orders);
      } catch {
        // errors handled by api.js toast
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();

    // Socket implementation
    if (vendorId) {
      socketService.connect();
      socketService.joinRoom(`vendor_${vendorId}`);
      socketService.on("order_created", (newOrder) => {
        toast.success(`🎉 New Order #${newOrder.orderId} received!`, { duration: 5000 });
        loadDashboardData();
        // Play notification sound if desired
      });
      socketService.on("order_picked_up", () => loadDashboardData());
      socketService.on("order_delivered", () => loadDashboardData());
    }

    return () => {
      socketService.off("order_created");
      socketService.off("order_picked_up");
      socketService.off("order_delivered");
    };
  }, [vendorId, fetchProducts, products.length]);

  // Sync product counts whenever the product store updates
  useEffect(() => {
    const inStock = products.filter((p) => p.stock === "in_stock").length;
    setStats((prev) => ({
      ...prev,
      totalProducts: Number(totalProductsCount || 0),
      inStockProducts: inStock,
    }));
  }, [products, totalProductsCount]);

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
      icon: FiDollarSign,
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
        <div className="lg:hidden">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
            Dashboard
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Welcome back, {vendor?.storeName || vendor?.name}! Here's your store
            overview.
          </p>
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
              <FiDollarSign className="text-white text-xl" />
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
                if (['pending', 'processing'].includes(displayStatus)) {
                  return (
                    <SwipeOrderCard
                      key={order._id ?? order.orderId}
                      order={order}
                      onStatusUpdate={() => {
                        // Refresh dashboard data after update
                        // We could also manually update the local state but reload is safer for stats
                        // loadDashboardData(); 
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
                    className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors border border-gray-100">
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
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tight ${displayStatus === "delivered"
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
                  className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors">
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
    </motion.div>
  );
};

export default VendorDashboard;

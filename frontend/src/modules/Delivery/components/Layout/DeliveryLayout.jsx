import { useState, useRef } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { FiLogOut, FiTruck, FiPackage, FiHome, FiUser, FiMenu, FiBell } from "react-icons/fi";
import { useDeliveryAuthStore } from "../../store/deliveryStore";
import { useDeliveryNotificationStore } from "../../store/deliveryNotificationStore";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import DeliveryBottomNav from "./DeliveryBottomNav";
import { appLogo } from "../../../../data/logos";
import { useEffect } from "react";

const DeliveryLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { deliveryBoy, logout, isAuthenticated, updateLocation } = useDeliveryAuthStore();
  const { unreadCount, fetchNotifications } = useDeliveryNotificationStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetchNotifications(1);
    const interval = setInterval(() => fetchNotifications(1), 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Use refs to avoid re-registering the geolocation watcher on every store update
  const deliveryBoyRef = useRef(deliveryBoy);
  const updateLocationRef = useRef(updateLocation);
  deliveryBoyRef.current = deliveryBoy;
  updateLocationRef.current = updateLocation;

  useEffect(() => {
    if (!isAuthenticated) return;
    const boy = deliveryBoyRef.current;
    if (!boy || boy.status === 'offline') return;

    let watchId;
    let lastUpdateTime = 0;
    let lastLat = null;
    let lastLng = null;
    const MIN_INTERVAL_MS = 30000; // send at most every 30 seconds
    const MIN_DISTANCE_M = 20;    // only update if moved more than 20 meters

    const calcDistance = (lat1, lng1, lat2, lng2) => {
      const R = 6371000; // Earth radius in meters
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    if ("geolocation" in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const now = Date.now();
          const timePassed = now - lastUpdateTime >= MIN_INTERVAL_MS;
          const movedEnough = lastLat === null ||
            calcDistance(lastLat, lastLng, latitude, longitude) >= MIN_DISTANCE_M;

          if (timePassed && movedEnough) {
            lastUpdateTime = now;
            lastLat = latitude;
            lastLng = longitude;
            updateLocationRef.current(latitude, longitude);
          }
        },
        (error) => {
          console.error("Location tracking error:", error);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 30000,
        }
      );
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [isAuthenticated]);

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    navigate("/delivery/login");
  };

  const menuItems = [
    { icon: FiHome, label: "Dashboard", path: "/delivery/dashboard" },
    { icon: FiPackage, label: "Orders", path: "/delivery/orders" },
    { icon: FiBell, label: "Notifications", path: "/delivery/notifications" },
    { icon: FiUser, label: "Profile", path: "/delivery/profile" },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case "available":
        return "bg-green-500";
      case "busy":
        return "bg-yellow-500";
      case "offline":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo */}
          <Link
            to="/delivery/dashboard"
            className="flex items-center flex-shrink-0 relative z-10">
            <span className="text-primary-600 font-bold text-lg sm:text-xl tracking-tight">
              CLOUSE
            </span>
          </Link>

          <div
            className="flex items-center gap-2"
            style={{ marginLeft: "30px" }}>
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-100"
              aria-label="Open menu">
              <FiMenu className="text-gray-700 text-xl" />
            </button>
            <FiTruck className="text-primary-600 text-xl" />
            <h1 className="text-lg font-bold text-gray-800">Clouse Delivery Partner</h1>
          </div>
        </div>
      </header>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[100]"
            />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-64 bg-white shadow-xl z-[110] overflow-y-auto">
              {/* Sidebar Header */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 gradient-green rounded-full flex items-center justify-center">
                    <FiTruck className="text-white text-xl" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-800">
                      {deliveryBoy?.name || "Delivery Boy"}
                    </h2>
                    <p className="text-xs text-gray-600">
                      {deliveryBoy?.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${getStatusColor(
                      deliveryBoy?.status
                    )}`}></div>
                  <span className="text-xs text-gray-600 capitalize">
                    {deliveryBoy?.status || "offline"}
                  </span>
                </div>
              </div>

              {/* Navigation Menu */}
              <nav className="p-2">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <button
                      key={item.path}
                      onClick={() => {
                        navigate(item.path);
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-colors ${isActive
                        ? "bg-primary-50 text-primary-700"
                        : "text-gray-700 hover:bg-gray-100"
                        }`}>
                      <Icon className="text-xl" />
                      <span className="font-medium">{item.label}</span>
                      {item.path === "/delivery/notifications" && unreadCount > 0 && (
                        <span className="ml-auto min-w-[20px] px-1.5 py-0.5 rounded-full bg-red-500 text-white text-xs font-semibold text-center">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              {/* Logout Button */}
              <div className="p-2 border-t border-gray-200 mt-auto">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-colors">
                  <FiLogOut className="text-xl" />
                  <span className="font-medium">Logout</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="pt-16 pb-20">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <DeliveryBottomNav />
    </div>
  );
};

export default DeliveryLayout;

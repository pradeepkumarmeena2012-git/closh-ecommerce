import { useState, useRef } from "react";
import logo from "../../../../assets/animations/lottie/logo-removebg.png";
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
        return "bg-white0";
      default:
        return "bg-white0";
    }
  };

  return (
    <div id="delivery-layout-root" className="flex flex-col h-screen overflow-hidden bg-white">
      {/* Mobile Header */}
      <header className="sticky top-0 left-0 z-50 bg-[#0f172a] backdrop-blur-lg border-b border-white/5 shadow-none shrink-0">
        <div className="flex items-center gap-3 px-4 py-2">
          {/* Hamburger Icon */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all active:scale-95 border border-white/5"
            aria-label="Open menu">
            <FiMenu className="text-white text-xl" />
          </button>

          {/* Logo */}
          <Link
            to="/delivery/dashboard"
            className="flex items-center gap-0.5 no-underline group shrink-0">
            <img src={logo} alt="CLOSH" className="h-9 w-auto object-contain" />
            <span className="text-[20px] font-black text-white tracking-tighter">CLOSH</span>
          </Link>

          {/* Partner Info */}
          <div className="flex items-center gap-2 ml-auto">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg transform rotate-3 active:rotate-0 transition-transform">
              <FiTruck className="text-white text-lg" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-[13px] font-black text-white leading-none">Delivery</h1>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">Partner</span>
            </div>
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
      <main id="delivery-scroll-container" className="flex-1 overflow-y-auto pb-20 scrollbar-responsive">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <DeliveryBottomNav />
    </div>
  );
};

export default DeliveryLayout;

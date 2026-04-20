import { useEffect, useState } from "react";
import { FiMenu, FiBell, FiLogOut, FiShoppingBag, FiPower, FiLoader } from "react-icons/fi";
import { useLocation, useNavigate } from "react-router-dom";
import { useVendorAuthStore } from "../../store/vendorAuthStore";
import { useVendorNotificationStore } from "../../store/vendorNotificationStore";
import toast from "react-hot-toast";
import Button from "../../../Admin/components/Button";
import VendorNotificationWindow from "./VendorNotificationWindow";

import socketService from "@shared/utils/socket";

const VendorHeader = ({ onMenuClick }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { vendor, logout, toggleOnlineStatus, isLoading: isAuthLoading } = useVendorAuthStore();
  const { unreadCount, fetchNotifications, pushNotification } = useVendorNotificationStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const vendorId = vendor?.id || vendor?._id;
  const isOnline = vendor?.isOnline !== false; // Default to true if undefined

  useEffect(() => {
    if (vendorId) {
      fetchNotifications();

      // Connect to Vendor socket room
      socketService.connect();
      socketService.joinRoom(`vendor_${vendorId}`);

      const handleNewNotification = (notification) => {
        pushNotification(notification);
        toast.success(`Notification: ${notification.title}`, {
          duration: 4000,
          icon: '🔔'
        });
      };

      socketService.on('new_notification', handleNewNotification);

      return () => {
        socketService.off('new_notification', handleNewNotification);
      };
    }
  }, [fetchNotifications, vendorId, pushNotification]);

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    navigate("/vendor/login");
  };

  const handleToggleOnline = async () => {
    if (isToggling) return;
    setIsToggling(true);
    try {
      const result = await toggleOnlineStatus();
      if (result.success) {
        toast.success(`Store is now ${result.isOnline ? "Online" : "Offline"}`, {
          icon: result.isOnline ? "🟢" : "🔴",
        });
      }
    } catch (error) {
      toast.error(error.message || "Failed to update status");
    } finally {
      setIsToggling(false);
    }
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };

  // Get page name from pathname
  const getPageName = (pathname) => {
    const path = pathname.split("/").pop() || "dashboard";
    const pageNames = {
      dashboard: "Dashboard",
      products: "Products",
      orders: "Orders",
      analytics: "Analytics",
      earnings: "Earnings",
      settings: "Settings",
      profile: "Profile",
    };
    return pageNames[path] || path.charAt(0).toUpperCase() + path.slice(1);
  };

  const pageName = getPageName(location.pathname);
  const storeName = vendor?.storeName || vendor?.name || "Vendor Store";

  return (
    <header
      className="bg-white border-b border-gray-200 fixed top-0 left-0 lg:left-64 right-0 z-30"
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
      }}>
      <div className="flex items-center justify-between px-4 lg:px-6 py-4">
        {/* Left: Menu Button */}
        <div className="flex items-center gap-4">
          <Button
            onClick={onMenuClick}
            variant="icon"
            className="lg:hidden text-gray-700"
            icon={FiMenu}
          />

          {/* Page Heading - Desktop Only */}
          <div className="hidden lg:block">
            <h1 className="text-2xl font-bold text-gray-800 mb-1">
              {pageName}
            </h1>
            <p className="text-sm text-gray-600 flex items-center gap-2">
              <FiShoppingBag className="text-primary-500" />
              {storeName}
            </p>
          </div>
        </div>

        {/* Right: Notifications, Toggle & Logout */}
        <div className="flex items-center gap-2 lg:gap-4">
          {/* Online/Offline Toggle */}
          <button
            onClick={handleToggleOnline}
            disabled={isToggling}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 border ${
              isOnline
                ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
            } ${isToggling ? "opacity-70 cursor-not-allowed" : ""}`}>
            {isToggling ? (
              <FiLoader className="animate-spin" />
            ) : (
              <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-500" : "bg-red-500"}`} />
            )}
            <span className="hidden sm:inline">{isOnline ? "Store Online" : "Store Offline"}</span>
            <span className="sm:hidden">{isOnline ? "Online" : "Offline"}</span>
          </button>

          {/* Notifications */}
          {/* Notifications */}
          <div className="relative">
            <Button
              data-notification-button
              onClick={toggleNotifications}
              variant="icon"
              className="text-gray-700"
              icon={FiBell}
            />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}

            {/* Notification Window - positioned relative to this container */}
            <VendorNotificationWindow
              isOpen={showNotifications}
              onClose={() => setShowNotifications(false)}
              position="right"
            />
          </div>

          {/* Logout Button */}
          <Button
            onClick={handleLogout}
            variant="ghost"
            icon={FiLogOut}
            size="sm"
            className="text-gray-700 hover:bg-red-600 hover:text-white hover:border-red-600 border border-gray-300">
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
};

export default VendorHeader;

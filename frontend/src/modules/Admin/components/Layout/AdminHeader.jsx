import { useState } from 'react';
import { FiMenu, FiBell, FiLogOut } from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAdminAuthStore } from '../../store/adminStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useEffect } from 'react';
import toast from 'react-hot-toast';
import Button from '../Button';
import NotificationWindow from './NotificationWindow';

import socketService from '@shared/utils/socket';

const AdminHeader = ({ onMenuClick }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { admin, logout } = useAdminAuthStore();
  const { notifications, unreadCount, fetchNotifications, pushNotification } = useNotificationStore();
  const [showNotifications, setShowNotifications] = useState(false);

  // Only fetch notifications if user has the notifications_manage permission
  // (the backend endpoint requires this specific permission)
  const canViewNotifications = admin?.role === 'superadmin' ||
    admin?.role === 'admin' ||
    admin?.permissions?.includes('notifications_manage') ||
    admin?.permissions?.includes('support_manage');

  // Socket connection for real-time events (support staff can still get live events)
  const canReceiveEvents = canViewNotifications ||
    admin?.permissions?.includes('support_manage');

  useEffect(() => {
    if (canViewNotifications) {
      fetchNotifications();
    }

    if (canReceiveEvents) {
      socketService.connect();
      socketService.joinRoom('admin');

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
  }, [fetchNotifications, admin, pushNotification, canViewNotifications, canReceiveEvents]);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/admin/login');
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };

  // Get page name from pathname
  const getPageName = (pathname) => {
    const path = pathname.split('/').pop() || 'dashboard';
    const pageNames = {
      dashboard: 'Dashboard',
      products: 'Products',
      categories: 'Categories',
      brands: 'Brands',
      orders: 'Orders',
      'return-requests': 'Return Requests',
      customers: 'Customers',
      inventory: 'Inventory',
      campaigns: 'Campaigns',
      banners: 'Banners',
      reviews: 'Reviews',
      analytics: 'Analytics',
      content: 'Content',
      settings: 'Settings',
      more: 'More',
      staff: 'Staff Management',
      'live-chat': 'Live Chat',
      tickets: 'Tickets',
      'customer-support': 'Customer Support',
      'vendor-support': 'Vendor Support',
      'chat-support': 'Chat Support',
      support: 'Support',
      notifications: 'Notifications',
      promocodes: 'Promo Codes',
      delivery: 'Delivery Management',
      'delivery-boys': 'Delivery Boys',
      'cash-collection': 'Cash Collection',
      'assign-delivery': 'Assign Delivery',
      vendors: 'Vendors',
      'manage-vendors': 'Manage Vendors',
      'pending-approvals': 'Pending Approvals',
      attributes: 'Attribute Management',
      reports: 'Reports',
      finance: 'Finance',
      policies: 'Policies',
      firebase: 'Firebase',
    };
    return pageNames[path] || path.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const pageName = getPageName(location.pathname);

  return (
    <header
      className="bg-white border-b border-gray-200 fixed top-0 left-0 lg:left-64 right-0 z-30"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}
    >
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
            <h1 className="text-2xl font-bold text-gray-800 mb-1">{pageName}</h1>
            <p className="text-sm text-gray-600">Welcome back! Here's your business overview.</p>
          </div>
        </div>

        {/* Right: Notifications & Logout */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          {canViewNotifications && (
            <div className="relative">
              <Button
                data-notification-button
                onClick={toggleNotifications}
                variant="icon"
                className="text-gray-700"
                icon={FiBell}
              />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              )}

              {/* Notification Window - positioned relative to this container */}
              <NotificationWindow
                isOpen={showNotifications}
                onClose={() => setShowNotifications(false)}
                position="right"
              />
            </div>
          )}

          {/* Logout Button */}
          <Button
            onClick={handleLogout}
            variant="ghost"
            icon={FiLogOut}
            size="sm"
            className="text-gray-700 hover:bg-red-600 hover:text-white hover:border-red-600 border border-gray-300"
          >
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;


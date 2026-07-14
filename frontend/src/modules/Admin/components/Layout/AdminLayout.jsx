import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import AdminBottomNav from './AdminBottomNav';
import AdminPermissionGuard from '../AdminPermissionGuard';
import useAdminHeaderHeight from '../../hooks/useAdminHeaderHeight';
import socketService from '../../../../shared/utils/socket';

const AdminLayout = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const headerHeight = useAdminHeaderHeight();

  // Listen for urgent rider alerts globally
  useEffect(() => {
    socketService.connect();
    socketService.joinRoom('admin');

    const handleUrgentAlert = (data) => {
      // Play a loud buzzer/alarm sound
      try {
        const audio = new Audio('/sounds/buzzer.mp3');
        audio.play().catch(e => console.log('Audio play blocked by browser:', e));
      } catch (err) {
        console.error("Audio error:", err);
      }

      // Show native browser notification
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification('🚨 Urgent: No Delivery Partner', {
            body: `Order #${data.orderId} is stuck in searching for ${data.searchingFor}. Manual assignment required!`,
            icon: '/favicon.ico'
          });
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              new Notification('🚨 Urgent: No Delivery Partner', {
                body: `Order #${data.orderId} is stuck in searching for ${data.searchingFor}. Manual assignment required!`,
                icon: '/favicon.ico'
              });
            }
          });
        }
      }

      toast((t) => (
        <div className="flex flex-col gap-2 p-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🚨</span>
            <span className="font-bold text-red-600">Urgent: No Delivery Partner</span>
          </div>
          <p className="text-sm font-medium">Order #{data.orderId} is stuck in searching for {data.searchingFor}.</p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                navigate(`/admin/orders/${data.orderObjectId}`);
              }}
              className="flex-1 bg-red-600 text-white py-1.5 rounded-lg text-xs font-bold hover:bg-red-700"
            >
              Assign Manually
            </button>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="flex-1 bg-gray-100 text-gray-700 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-200"
            >
              Dismiss
            </button>
          </div>
        </div>
      ), {
        duration: 20000,
        position: 'top-center',
        style: { border: '2px solid #ef4444', padding: 0 }
      });
    };

    socketService.on('admin_no_rider_alert', handleUrgentAlert);
    return () => {
      socketService.off('admin_no_rider_alert', handleUrgentAlert);
    };
  }, [navigate]);
  
  // Bottom nav height is 64px (h-16)
  const bottomNavHeight = 64;
  
  // Add small buffer to prevent content overlap (8px)
  const topPadding = headerHeight + 8;
  const bottomPadding = bottomNavHeight + 8;

  return (
    <div className="min-h-screen bg-white flex">
      {/* Sidebar */}
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-64 min-w-0 max-w-full overflow-x-hidden">
        {/* Header */}
        <AdminHeader onMenuClick={() => setSidebarOpen(true)} />

        {/* Page Content - with dynamic padding to account for fixed header and bottom nav */}
        <main 
          className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto overflow-x-hidden lg:pb-6 scrollbar-admin w-full min-w-0"
          style={{
            // Mobile: Use calculated heights with safe area support
            // Desktop: use the same computed top spacing for consistency
            paddingTop: `${Math.max(topPadding, 80)}px`, // Use calculated height or 80px, whichever is larger
            paddingBottom: `calc(${Math.max(bottomPadding, 80)}px + env(safe-area-inset-bottom, 0px))`, // Use calculated height + safe area or 80px + safe area, whichever is larger
          }}
        >
          <div className="w-full max-w-full overflow-x-hidden min-w-0">
            <AdminPermissionGuard>
              <Outlet />
            </AdminPermissionGuard>
          </div>
        </main>
      </div>

      {/* Bottom Navigation - Mobile Only */}
      <AdminBottomNav />
    </div>
  );
};

export default AdminLayout;


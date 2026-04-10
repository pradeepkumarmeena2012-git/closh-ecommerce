import { useState, useEffect, useCallback, useRef } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiAlertCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import VendorSidebar from './VendorSidebar';
import VendorHeader from './VendorHeader';
import VendorBottomNav from './VendorBottomNav';
import useAdminHeaderHeight from '@modules/Admin/hooks/useAdminHeaderHeight';
import socketService from '@shared/utils/socket';
import { useVendorAuthStore } from '../../store/vendorAuthStore';
import NewOrderModal from '../NewOrderModal';

const VendorLayout = () => {
  const navigate = useNavigate();
  const { vendor, updateOrderStatus } = useVendorAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const headerHeight = useAdminHeaderHeight();
  const audioUnlockedRef = useRef(false);

  // Audio Policy Unlock: User interaction required
  
  // Audio Notification State
  const [isBuzzerActive, setIsBuzzerActive] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isAcceptingOrder, setIsAcceptingOrder] = useState(false);
  const buzzerRef = useRef(null);

  // Initialize Buzzer on first interaction to bypass browser policies
  const initBuzzer = useCallback(() => {
    if (buzzerRef.current) return;
    try {
        const audio = new Audio('/sounds/buzzer.mp3');
        audio.loop = true;
        audio.volume = 0.8;
        // Pre-load but don't play yet
        audio.load();
        buzzerRef.current = audio;
        console.log('🔊 Buzzer audio initialized and ready.');
    } catch (err) {
        console.error('Failed to init buzzer:', err);
    }
  }, []);

  useEffect(() => {
    const unlock = () => {
        if (audioUnlockedRef.current) return;
        initBuzzer();
        // Play and immediately pause to "unlock" the audio stream
        if (buzzerRef.current) {
            buzzerRef.current.play().then(() => {
                buzzerRef.current.pause();
                buzzerRef.current.currentTime = 0;
            }).catch(() => {});
        }
        audioUnlockedRef.current = true;
        window.removeEventListener('click', unlock);
        window.removeEventListener('touchstart', unlock);
    };
    window.addEventListener('click', unlock);
    window.addEventListener('touchstart', unlock);
    return () => {
        window.removeEventListener('click', unlock);
        window.removeEventListener('touchstart', unlock);
    };
  }, [initBuzzer]);

  const startBuzzer = useCallback(() => {
    if (!buzzerRef.current) {
        initBuzzer();
    }
    
    if (buzzerRef.current) {
        buzzerRef.current.play().catch(err => {
            console.warn('Buzzer playback blocked:', err);
            toast.error('New Order! Please tap the screen to hear the alert.', { id: 'buzzer-block' });
        });
        setIsBuzzerActive(true);
    }
  }, [initBuzzer]);

  const stopBuzzer = useCallback(() => {
    if (buzzerRef.current) {
        buzzerRef.current.pause();
        buzzerRef.current.currentTime = 0;
    }
    setIsBuzzerActive(false);
  }, []);

  useEffect(() => {
    const vendorId = vendor?.id || vendor?._id;
    if (!vendorId) return;

    // Connect socket if not already
    socketService.connect();

    const registerVendor = () => {
      console.log(`🔌 Registering Vendor Socket for ID: ${vendorId}`);
      socketService.socket?.emit('vendor_register', vendorId);
    };

    if (socketService.socket?.connected) {
      registerVendor();
    }
    socketService.socket?.on('connect', registerVendor);

    // Listen for new orders globally
    const handleNewOrder = (newOrder) => {
      console.log('🍕 New order received via socket:', newOrder);
      startBuzzer();
      setSelectedOrder(newOrder);
      setShowOrderModal(true);
      
      const orderIdForRoom = newOrder.orderId || newOrder.id;
      if (orderIdForRoom) {
          socketService.joinRoom(`order_${orderIdForRoom}`);
      }
      
      toast.success(`🎉 New Order received!`, { 
        duration: 10000,
        icon: '🔔',
      });
      
      // Dispatch event so sub-pages (like Dashboard) can refresh
      window.dispatchEvent(new CustomEvent('vendor-new-order', { detail: newOrder }));
    };

    socketService.on("order_created", handleNewOrder);
    socketService.on("order_status_updated", (data) => {
        window.dispatchEvent(new CustomEvent('vendor-order-updated', { detail: data }));
    });
    
    return () => {
      socketService.socket?.off('connect', registerVendor);
      socketService.off("order_created", handleNewOrder);
      socketService.off("order_status_updated");
      stopBuzzer();
    };
  }, [vendor?.id, vendor?._id, startBuzzer, stopBuzzer]);

  const handleAcceptNewOrder = async (orderId) => {
      setIsAcceptingOrder(true);
      try {
          const res = await updateOrderStatus(orderId, 'accepted', {});
          if (res.success) {
              stopBuzzer();
              setShowOrderModal(false);
              toast.success(`Accepted successfully!`);
              window.dispatchEvent(new CustomEvent('vendor-order-updated'));
          }
      } catch (err) {
          toast.error(err?.response?.data?.message || 'Failed to accept order');
      } finally {
          setIsAcceptingOrder(false);
      }
  };

  const bottomNavHeight = 64;
  const topPadding = headerHeight + 8;
  const bottomPadding = bottomNavHeight + 8;

  return (
    <div className="min-h-screen bg-white flex">
      <VendorSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col lg:ml-64 min-w-0 max-w-full overflow-x-hidden">
        <VendorHeader onMenuClick={() => setSidebarOpen(true)} />

        <main
          className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto overflow-x-hidden lg:pb-6 scrollbar-admin w-full min-w-0"
          style={{
            paddingTop: `${Math.max(topPadding, 80)}px`,
            paddingBottom: `calc(${Math.max(bottomPadding, 80)}px + env(safe-area-inset-bottom, 0px))`,
          }}
        >
          <div className="w-full max-w-full overflow-x-hidden min-w-0">
            <Outlet />
          </div>
        </main>
      </div>

      <VendorBottomNav />

      {/* Global Notifications Layer */}
      <AnimatePresence>
        {isBuzzerActive && (
          <motion.div 
            initial={{ y: 100, x: '-50%', opacity: 0 }}
            animate={{ y: 0, x: '-50%', opacity: 1 }}
            exit={{ y: 100, x: '-50%', opacity: 0 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[1000] bg-red-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border-2 border-white/20 whitespace-nowrap"
          >
            <div className="w-3 h-3 bg-white rounded-full animate-ping shrink-0" />
            <span className="font-black uppercase tracking-widest text-xs sm:text-sm text-white">New Order Alert!</span>
            <button 
              onClick={stopBuzzer}
              className="bg-white text-red-600 px-4 py-2 rounded-xl font-black text-xs uppercase hover:bg-red-50 transition-colors shadow-sm"
            >
              Stop Alarm
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <NewOrderModal 
        isOpen={showOrderModal}
        order={selectedOrder}
        isAccepting={isAcceptingOrder}
        onAccept={handleAcceptNewOrder}
        onClose={() => { stopBuzzer(); setShowOrderModal(false); }}
        isBuzzerActive={isBuzzerActive}
        onStopBuzzer={stopBuzzer}
      />
    </div>
  );
};

export default VendorLayout;

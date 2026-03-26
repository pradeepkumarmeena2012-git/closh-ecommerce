import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiArrowLeft,
  FiMapPin,
  FiPhone,
  FiClock,
  FiPackage,
  FiNavigation,
  FiCheckCircle,
  FiUser,
  FiTrendingUp,
  FiCreditCard,
  FiDollarSign,
  FiCamera,
  FiRefreshCw,
  FiShield,
  FiMap,
  FiTarget,
  FiXCircle,
  FiImage,
  FiToggleLeft,
  FiToggleRight
} from 'react-icons/fi';
import PageTransition from '../../../shared/components/PageTransition';
import { formatPrice } from '../../../shared/utils/helpers';
import toast from 'react-hot-toast';
import { useDeliveryAuthStore } from '../store/deliveryStore';
import socketService from '../../../shared/utils/socket';
import TrackingMap from '../../../shared/components/TrackingMap';

const DeliveryOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    fetchOrderById,
    acceptOrder,
    completeOrder,
    resendDeliveryOtp,
    isLoadingOrder,
    isUpdatingOrderStatus,
    updateOrderStatus,
    acceptReturn,
    updateReturnStatus,
    markArrivedAtCustomer,
    getCompanyQR,
    deliveryBoy,
  } = useDeliveryAuthStore();
  
  const [order, setOrder] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [deliveryOtp, setDeliveryOtp] = useState('');
  const [deliveryPhoto, setDeliveryPhoto] = useState(null);
  const [openBoxPhoto, setOpenBoxPhoto] = useState(null);
  const [pickupPhoto, setPickupPhoto] = useState(null);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [hasArrived, setHasArrived] = useState(false);
  const [codMethod, setCodMethod] = useState(null); // 'cash' | 'qr'
  const [companyQR, setCompanyQR] = useState(null);
  const [isLoadingQR, setIsLoadingQR] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const openBoxInputRef = useRef(null);
  const deliveryPhotoInputRef = useRef(null);
  const pickupPhotoInputRef = useRef(null);

  const isReturn = order?.type === 'return';
  const isCod = order?.paymentMethod === 'cod' || order?.paymentMethod === 'cash';

  // Determine tracking phase
  const getTrackingPhase = () => {
    if (!order) return null;
    const s = order.status;
    if (s === 'assigned' || s === 'accepted') return 'to_vendor';
    if (s === 'picked-up' || s === 'picked_up' || s === 'out-for-delivery' || s === 'out_for_delivery') return 'to_customer';
    return null;
  };

  const trackingPhase = getTrackingPhase();

  const loadOrder = useCallback(async () => {
    try {
      setLoadFailed(false);
      const response = await fetchOrderById(id);
      // Only update if state is different to prevent loops
      setOrder(prev => JSON.stringify(prev) === JSON.stringify(response) ? prev : response);
    } catch {
      setLoadFailed(true);
      setOrder(null);
    }
  }, [id, fetchOrderById]);

  // Watch current location for live tracking
  useEffect(() => {
    if (!deliveryBoy?.id || !order) return;
    let watchId = null;
    let lastEmit = 0;
    
    if (trackingPhase) {
      watchId = navigator.geolocation?.watchPosition(
        (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          setCurrentLocation({ lat, lng });

          // Throttle socket emits to every 3 seconds to save memory/data
          const now = Date.now();
          if (now - lastEmit > 3000 && socketService.socket) {
            lastEmit = now;
            socketService.socket.emit('update_location', {
              lat, lng,
              deliveryBoyId: deliveryBoy.id,
              orderId: order.orderId || order.id,
              phase: trackingPhase,
            });
          }
        },
        (err) => console.warn('Geolocation error:', err.message),
        { enableHighAccuracy: true, maximumAge: 10000 }
      );
    }

    return () => {
      if (watchId !== null) navigator.geolocation?.clearWatch(watchId);
    };
  }, [deliveryBoy?.id, order?.id, trackingPhase]);

  useEffect(() => {
    loadOrder();
    socketService.connect();
    socketService.joinRoom('delivery_partners');

    // Join order-specific socket room
    if (id) {
      socketService.joinRoom(`order_${id}`);
    }

    const handleUpdate = (data) => {
      if (String(data.orderId || data.id) === String(id)) {
        loadOrder();
      }
    };

    socketService.on('order_status_updated', handleUpdate);
    socketService.on('return_status_updated', handleUpdate);
    socketService.on('order_taken', (data) => {
      if (String(data.orderId || data.id) === String(id)) {
        toast.error('This task has been taken by another partner');
        navigate('/delivery/orders');
      }
    });

    return () => {
      socketService.off('order_status_updated');
      socketService.off('return_status_updated');
      socketService.off('order_taken');
      if (id) socketService.leaveRoom?.(`order_${id}`);
    };
  }, [id]);

  const getStatusColor = (status) => {
    const s = String(status).toLowerCase();
    switch (s) {
      case 'pending':
      case 'approved':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'assigned':
      case 'processing':
      case 'accepted':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'picked-up':
      case 'picked_up':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'out-for-delivery':
      case 'out_for_delivery':
      case 'in-transit':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'delivered':
      case 'completed':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleAcceptTask = async () => {
    if (!order) return;
    try {
      if (isReturn) {
        const updated = await acceptReturn(order.id);
        setOrder(updated);
        toast.success('Return assignment accepted');
      } else {
        const updated = await acceptOrder(order.id);
        setOrder(updated);
        toast.success('Order assigned to you');
      }
    } catch {}
  };

  const handleUpdateStatus = async (newBackendStatus, successMessage, options = {}) => {
    try {
      let updated;
      
      const combinedOptions = { ...options };
      if (newBackendStatus === 'picked_up' && pickupPhoto) {
        combinedOptions.pickupPhoto = pickupPhoto;
      }

      if (isReturn) {
        updated = await updateReturnStatus(order.id, newBackendStatus, combinedOptions);
      } else {
        updated = await updateOrderStatus(order.id, newBackendStatus, combinedOptions);
      }
      setOrder(updated);
      toast.success(successMessage);
    } catch {}
  };

  const handleCompleteReturn = async () => {
    await handleUpdateStatus('completed', 'Return delivered to vendor!');
  };

  const handleCompleteOrder = async () => {
    if (!order || !/^\d{6}$/.test(deliveryOtp.trim())) {
      toast.error('Please enter valid 6-digit OTP');
      return;
    }

    // For COD, require either cash or qr method selected
    if (isCod && !codMethod) {
      toast.error('Please select payment collection method (Cash or QR)');
      return;
    }

    try {
      const options = {};
      if (openBoxPhoto) options.openBoxPhoto = openBoxPhoto;
      if (deliveryPhoto) options.deliveryPhoto = deliveryPhoto;
      if (isCod && codMethod) options.codCollectionMethod = codMethod;

      const updated = await completeOrder(order.id, deliveryOtp.trim(), options);
      setOrder(updated);
      setDeliveryOtp('');
      toast.success('Done! Earning credited to your wallet.');
    } catch(err) {}
  };

  const handleMarkArrived = async () => {
    if (!order) return;
    try {
      const updated = await markArrivedAtCustomer(order.id);
      setOrder(updated);
      setHasArrived(true);
      toast.success('Arrival marked! Customer has been notified with OTP.');
    } catch(err) {
      toast.error('Failed to mark arrival');
    }
  };

  const handleLoadCompanyQR = async () => {
    if (companyQR) return; // Already loaded
    setIsLoadingQR(true);
    try {
      const data = await getCompanyQR(order.id);
      setCompanyQR(data);
    } catch(err) {
      toast.error('Company QR not available. Please collect cash.');
    } finally {
      setIsLoadingQR(false);
    }
  };

  const handleOpenBoxCapture = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setOpenBoxPhoto(reader.result);
    reader.readAsDataURL(file);
  };

  const handleDeliveryPhotoCapture = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setDeliveryPhoto(reader.result);
    reader.readAsDataURL(file);
  };

  const handlePickupPhotoCapture = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPickupPhoto(reader.result);
    reader.readAsDataURL(file);
  };

  const handleResendOtp = async () => {
    if (isResendingOtp) return;
    try {
      setIsResendingOtp(true);
      await resendDeliveryOtp(order.id);
      toast.success('New OTP sent to customer');
    } catch(err) {} finally {
      setIsResendingOtp(false);
    }
  };

  const openInGoogleMaps = (lat, lng) => {
    let destLat, destLng;
    
    if (lat && lng) {
      destLat = lat;
      destLng = lng;
    } else if (trackingPhase === 'to_vendor') {
      // Navigate to vendor/pickup location
      const pickupCoords = order?.pickupLocation?.coordinates;
      if (Array.isArray(pickupCoords) && pickupCoords.length === 2 && pickupCoords[0] !== 0) {
        destLat = pickupCoords[1];
        destLng = pickupCoords[0];
      }
    } else {
      // Navigate to customer/dropoff location
      destLat = order.latitude;
      destLng = order.longitude;
    }
    
    if (!destLat || !destLng) {
      toast.error('Destination coordinates not available');
      return;
    }
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`, '_blank');
  };

  if (isLoadingOrder) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-10">
           <div className="w-16 h-16 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin mb-4" />
           <p className="text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">Syncing Job Details...</p>
        </div>
      </PageTransition>
    );
  }

  if (!order) {
    return (
      <PageTransition>
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
          <FiXCircle size={64} className="text-slate-200 mb-4" />
          <h2 className="text-xl font-black text-slate-900 mb-2">Task Not Found</h2>
          <p className="text-slate-500 text-sm mb-6">Either this task was taken or you don't have access.</p>
          <button onClick={() => navigate('/delivery/orders')} className="bg-[#0F172A] text-white px-8 py-3 rounded-2xl font-black text-sm uppercase">Back to Board</button>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="h-screen w-full bg-[#F8FAFC] flex flex-col relative overflow-hidden">
        
        {/* TOP LAYER: Immersive Map / Route Backdrop */}
        <div className="absolute inset-x-0 top-0 h-[60%] z-0">
           {(() => {
                  const pickupCoords = order.pickupLocation?.coordinates;
                  // Use static references where possible
                  const vendorLoc = order._vendorLocMemo || (Array.isArray(pickupCoords) && pickupCoords.length === 2 && pickupCoords[0] !== 0
                    ? { lat: pickupCoords[1], lng: pickupCoords[0] } : null);
                  if (vendorLoc && !order._vendorLocMemo) order._vendorLocMemo = vendorLoc;
                  
                  const customerLoc = order._customerLocMemo || (order.latitude && order.longitude 
                    ? { lat: Number(order.latitude), lng: Number(order.longitude) } : null);
                  if (customerLoc && !order._customerLocMemo) order._customerLocMemo = customerLoc;
                  
                  const riderLoc = currentLocation 
                    ? { lat: currentLocation.lat, lng: currentLocation.lng }
                    : order.deliveryBoyId?.currentLocation?.coordinates 
                      ? { lat: order.deliveryBoyId.currentLocation.coordinates[1], lng: order.deliveryBoyId.currentLocation.coordinates[0] } 
                      : null;
                  
                  return (
                    <TrackingMap 
                       deliveryLocation={riderLoc}
                       customerLocation={customerLoc}
                       vendorLocation={vendorLoc}
                       followMode={true}
                    />
                  );
           })()}
           
           {/* Dark Gradient Overlay for the top */}
           <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/50 to-transparent pointer-events-none" />
           
           {/* Floating Map Controls */}
           <div className="absolute top-6 left-6 right-6 z-[1001] flex justify-between items-center">
              <button 
                onClick={() => navigate('/delivery/orders')} 
                className="w-12 h-12 rounded-2xl bg-white/90 backdrop-blur shadow-2xl flex items-center justify-center text-slate-800 hover:scale-105 active:scale-95 transition-transform"
              >
                 <FiArrowLeft size={20} />
              </button>
              
              <div className="flex flex-col items-end gap-2">
                 <div className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg backdrop-blur bg-white/90 border-2 ${getStatusColor(order.status)}`}>
                    {order.status.replace(/-/g, ' ')}
                 </div>
                 {trackingPhase && (
                    <div className="bg-indigo-600/90 text-white px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1.5">
                       <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                       {trackingPhase === 'to_vendor' ? 'En route to store' : 'Delivering to customer'}
                    </div>
                 )}
              </div>
           </div>

           {/* Floating Navigation Button */}
           <div className="absolute bottom-32 right-6 z-[1001]">
              <button 
                onClick={() => openInGoogleMaps()}
                className="w-14 h-14 rounded-2xl bg-[#0F172A] text-white shadow-2xl flex items-center justify-center hover:scale-110 active:scale-90 transition-transform"
                title="Google Maps Navigation"
              >
                 <FiNavigation size={24} />
              </button>
           </div>
        </div>

        {/* BOTTOM LAYER: Draggable / Scrollable Detail Sheet */}
        <motion.div 
           initial={{ y: '30%' }}
           animate={{ y: 0 }}
           className="mt-[50%] h-[50%] flex-1 bg-white rounded-t-[40px] shadow-[0_-15px_60px_-15px_rgba(0,0,0,0.1)] z-10 flex flex-col border-t border-slate-100 overflow-hidden"
        >
           {/* Draggable Handle Indicator */}
           <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-4 shrink-0 shadow-inner" />

           {/* Scrollable Content Container */}
           <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-hide">
              
              {/* Primary Interaction Area */}
              <div className="mb-8">
                 <div className="flex items-center justify-between mb-6">
                    <div>
                       <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                          {isReturn ? `Return #${order.id.slice(-6)}` : `Order #${order.id.slice(-6)}`}
                       </h2>
                       <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Assignment Details</p>
                    </div>
                    {order.phone && (
                       <button onClick={() => window.open(`tel:${order.phone}`, '_self')} className="w-14 h-14 rounded-2xl bg-emerald-500 shadow-xl shadow-emerald-200 flex items-center justify-center text-white active:scale-90 transition-transform">
                          <FiPhone size={24} />
                       </button>
                    )}
                 </div>

                 {/* Role Switch: Target Info */}
                 <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                       <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-indigo-500 shadow-sm mb-3">
                          <FiUser size={16} />
                       </div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{isReturn ? 'Deliver to' : 'Pick from'}</p>
                       <p className="text-sm font-black text-slate-900 truncate">{isReturn ? (order.vendorName || 'Vendor') : 'Store'}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                       <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-emerald-500 shadow-sm mb-3">
                          <FiTarget size={16} />
                       </div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{isReturn ? 'Pickup from' : 'Deliver to'}</p>
                       <p className="text-sm font-black text-slate-900 truncate">{order.customer || 'Customer'}</p>
                    </div>
                 </div>

                 {/* Status Action Buttons (Floating Panel Style) */}
                 <div className="space-y-4">
                    {/* Accept Order */}
                    {(order.status === 'pending' || order.status === 'approved') && (
                       <button 
                         onClick={handleAcceptTask} 
                         disabled={isUpdatingOrderStatus} 
                         className={`w-full ${isReturn ? 'bg-orange-600' : 'bg-[#0F172A]'} text-white py-5 rounded-3xl font-black text-sm uppercase tracking-widest shadow-2xl active:scale-95 transition-all`}
                       >
                          {isUpdatingOrderStatus ? 'Accepting...' : 'Accept Assignment'}
                       </button>
                    )}

                    {/* Navigation Phase: To Store/Customer with Pickup Photo */}
                    {(order.status === 'assigned' || order.status === 'accepted' || (isReturn && order.status === 'processing')) && (
                       <div className="space-y-4">
                          <div className="p-4 bg-white border-2 border-dashed border-slate-200 rounded-[32px] text-center">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Proof of Items Check</p>
                             <input type="file" ref={pickupPhotoInputRef} className="hidden" accept="image/*" capture="environment" onChange={handlePickupPhotoCapture} />
                             <button onClick={() => pickupPhotoInputRef.current?.click()} className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 border-2 transition-all ${pickupPhoto ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-slate-100 bg-slate-50 text-slate-400'}`}>
                                {pickupPhoto ? <FiImage size={20} /> : <FiCamera size={20} />}
                                <span className="font-black uppercase text-[10px]">{pickupPhoto ? 'Item Photo Captured' : 'Take Item Photo'}</span>
                             </button>
                             <p className="text-[8px] font-black text-slate-300 uppercase mt-2">Required to proceed with pickup</p>
                          </div>

                          <button 
                            onClick={() => handleUpdateStatus('picked_up', 'Items Verified & Picked Up!')}
                            disabled={isUpdatingOrderStatus || !pickupPhoto}
                            className="w-full flex items-center justify-between p-2 pl-4 bg-emerald-500 text-white rounded-[24px] shadow-xl shadow-emerald-200 active:scale-[0.98] disabled:opacity-30 transition-all group"
                          >
                             <div className="text-left">
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Arrival at Pickup</p>
                                <p className="text-sm font-black">Confirm Picked Up</p>
                             </div>
                             <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform">
                                <FiCheckCircle size={24} />
                             </div>
                          </button>
                       </div>
                    )}

                    {/* Out for Delivery Phase */}
                    {!isReturn && order.status === 'picked-up' && !hasArrived && (
                       <button 
                         onClick={() => handleUpdateStatus('out_for_delivery', 'Live Tracking Active!')} 
                         className="w-full bg-indigo-600 text-white py-5 rounded-[24px] font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 active:scale-[0.98]"
                       >
                          <FiNavigation size={20} /> Start Delivery Route
                       </button>
                    )}

                    {/* Completion Phase: OTP & Photos */}
                    {!isReturn && (order.status === 'out-for-delivery' || (order.status === 'picked-up' && hasArrived)) && (
                       <div className="space-y-6">
                            {!hasArrived && (
                              <button onClick={handleMarkArrived} className="w-full bg-amber-500 text-white py-5 rounded-[24px] font-black text-sm uppercase tracking-widest shadow-xl flex items-center justify-center gap-3">
                                 <FiTarget size={20} /> I have Arrived
                              </button>
                           )}

                           {hasArrived && (
                             <div className="space-y-6 animate-in slide-in-from-bottom duration-500">
                                {/* OTP Input Panel */}
                                <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 text-center">
                                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Verification Code from Customer</p>
                                   <input 
                                      type="numeric" maxLength={6} value={deliveryOtp}
                                      onChange={(e) => setDeliveryOtp(e.target.value.replace(/\D/g, ''))}
                                      placeholder="••••••"
                                      className="w-full h-20 bg-white border-2 border-slate-100 rounded-3xl text-center text-4xl font-black tracking-[0.5em] text-indigo-600 focus:border-indigo-500 focus:outline-none shadow-inner"
                                   />
                                    <button onClick={handleResendOtp} disabled={isResendingOtp} className="mt-4 text-[10px] font-black text-indigo-500 uppercase tracking-widest hover:underline px-4 py-2">
                                       Resend OTP
                                    </button>
                                    
                                    {/* Debug OTP for local testing */}
                                    {String(import.meta.env.NODE_ENV || '').toLowerCase() !== 'production' && order.deliveryOtpDebug && (
                                       <div className="mt-4 p-2 bg-amber-50 border border-amber-200 rounded-xl">
                                          <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Test Mode: Customer OTP</p>
                                          <p className="text-lg font-black text-amber-900">{order.deliveryOtpDebug}</p>
                                       </div>
                                    )}
                                 </div>
                                {/* Delivery Photos Section */}
                                 <div className="grid grid-cols-2 gap-4 bg-white border-2 border-dashed border-slate-200 p-4 rounded-[32px]">
                                    <div className="text-center">
                                       <input type="file" ref={deliveryPhotoInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleDeliveryPhotoCapture} />
                                       <button onClick={() => deliveryPhotoInputRef.current?.click()} className={`w-full aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 border-2 transition-all ${deliveryPhoto ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-slate-100 bg-slate-50 text-slate-400'}`}>
                                          {deliveryPhoto ? <FiImage size={24} /> : <FiCamera size={24} />}
                                          <span className="text-[9px] font-black uppercase">Package Photo</span>
                                       </button>
                                    </div>
                                    <div className="text-center">
                                       <input type="file" ref={openBoxInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleOpenBoxCapture} />
                                       <button onClick={() => openBoxInputRef.current?.click()} className={`w-full aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 border-2 transition-all ${openBoxPhoto ? 'border-indigo-500 bg-indigo-50 text-indigo-600' : 'border-slate-100 bg-slate-50 text-slate-400'}`}>
                                          {openBoxPhoto ? <FiImage size={24} /> : <FiCamera size={24} />}
                                          <span className="text-[9px] font-black uppercase">Open Box Photo</span>
                                       </button>
                                    </div>
                                    <p className="col-span-2 text-[8px] font-black text-slate-400 uppercase tracking-widest text-center mt-1">Take photos of closed package and opened state</p>
                                 </div>

                                 {/* COD & Method Selector */}
                                 {isCod && (
                                    <div className="bg-emerald-50 p-6 rounded-[32px] border-2 border-emerald-100">
                                       <p className="text-[10px] font-black text-emerald-600 uppercase mb-2 text-center">Collection Amount</p>
                                       <h2 className="text-4xl font-black text-emerald-900 text-center mb-6">{formatPrice(order.total)}</h2>
                                       <div className="grid grid-cols-2 gap-4">
                                          <button onClick={() => setCodMethod('cash')} className={`py-4 rounded-2xl flex flex-col items-center gap-2 font-black uppercase text-[10px] transition-all border-2 ${codMethod === 'cash' ? 'bg-emerald-600 text-white border-emerald-600 scale-105 shadow-xl shadow-emerald-200' : 'bg-white text-emerald-600 border-emerald-100'}`}>
                                             <FiDollarSign size={20} /> Direct Cash
                                          </button>
                                          <button onClick={() => {setCodMethod('qr'); handleLoadCompanyQR();}} className={`py-4 rounded-2xl flex flex-col items-center gap-2 font-black uppercase text-[10px] transition-all border-2 ${codMethod === 'qr' ? 'bg-indigo-600 text-white border-indigo-600 scale-105 shadow-xl shadow-indigo-100' : 'bg-white text-indigo-600 border-indigo-100'}`}>
                                             <FiCreditCard size={20} /> Show QR
                                          </button>
                                       </div>
                                    </div>
                                 )}

                                 <button onClick={handleCompleteOrder} disabled={deliveryOtp.length !== 6 || isUpdatingOrderStatus || (isCod && !codMethod) || !deliveryPhoto || !openBoxPhoto} className="w-full bg-[#0F172A] text-white py-6 rounded-[24px] font-black text-base uppercase tracking-widest shadow-2xl disabled:opacity-30 disabled:scale-100 transition-all">
                                    Finish & Credit Earning
                                 </button>
                             </div>
                           )}
                       </div>
                    )}
                 </div>
              </div>

              {/* Information Manifest */}
              <div className="space-y-4">
                 <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100">
                    <h3 className="text-slate-900 font-black text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                       <FiMapPin className="text-indigo-500" /> Delivery Spot
                    </h3>
                    <p className="text-sm text-slate-700 font-bold leading-relaxed">{order.address}</p>
                 </div>

                 <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                       <h3 className="text-slate-900 font-black text-sm uppercase tracking-widest flex items-center gap-2">
                          <FiPackage className="text-indigo-500" /> Manifest
                       </h3>
                       <span className="text-[10px] font-black text-slate-400">{order.items?.length} ITEMS</span>
                    </div>
                    <div className="space-y-3">
                       {order.items?.map((it, i) => (
                          <div key={i} className="flex justify-between items-center text-sm font-bold text-slate-800">
                             <span className="truncate max-w-[70%]">{it.name} <span className="text-slate-400 font-medium">x{it.quantity}</span></span>
                             <span>{formatPrice(it.price * it.quantity)}</span>
                          </div>
                       ))}
                    </div>
                    <div className="mt-6 pt-6 border-t border-slate-200 flex justify-between items-center">
                       <span className="text-[11px] font-black text-slate-400 uppercase">Grand Total</span>
                       <span className="text-xl font-black text-indigo-600">{formatPrice(order.total)}</span>
                    </div>
                 </div>
              </div>

           </div>
        </motion.div>
      </div>
    </PageTransition>
  );
};

export default DeliveryOrderDetail;

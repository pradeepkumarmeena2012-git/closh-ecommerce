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
import { useDeliveryTracking } from '../../../shared/hooks/useDeliveryTracking';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import socketService from '../../../shared/utils/socket';

// Fix for default marker icon issues in Leaflet with React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons
const riderIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/2972/2972185.png',
  iconSize: [35, 35],
  iconAnchor: [17, 35],
  popupAnchor: [0, -35],
});

const customerIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/1275/1275210.png',
  iconSize: [35, 35],
  iconAnchor: [17, 35],
  popupAnchor: [0, -35],
});

const ChangeView = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center && Array.isArray(center) && center.length === 2 && center[0] !== null && center[1] !== null) {
      try {
        map.setView(center);
      } catch (err) {
        console.warn("Map view update failed:", err);
      }
    }
  }, [center, map]);
  return null;
};

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
  const isOnline = deliveryBoy?.status === 'available';

  // Determine tracking phase
  const getTrackingPhase = () => {
    if (!order) return null;
    const s = order.status;
    if (s === 'assigned' || s === 'accepted') return 'to_vendor';
    if (s === 'picked-up' || s === 'picked_up' || s === 'out-for-delivery' || s === 'out_for_delivery') return 'to_customer';
    return null;
  };

  const trackingPhase = getTrackingPhase();

  // Unified Tracking Hook
  const liveLocation = useDeliveryTracking(deliveryBoy?.id, order ? [order] : []);
  
  // Sync liveLocation to local state for Map rendering if needed, 
  // though useDeliveryTracking handles the emissions.
  useEffect(() => {
    if (liveLocation) setCurrentLocation(liveLocation);
  }, [liveLocation]);

  const loadOrder = useCallback(async () => {
    try {
      setLoadFailed(false);
      const response = await fetchOrderById(id);
      setOrder(response);
    } catch {
      setLoadFailed(true);
      setOrder(null);
    }
  }, [id, fetchOrderById]);

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
      if (isReturn) {
        updated = await updateReturnStatus(order.id, newBackendStatus, options);
      } else {
        updated = await updateOrderStatus(order.id, newBackendStatus, options);
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

  const handlePickupPhotoCapture = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPickupPhoto(reader.result);
    reader.readAsDataURL(file);
  };

  const handleDeliveryPhotoCapture = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setDeliveryPhoto(reader.result);
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
    let fallbackAddress = '';

    if (lat && lng) {
      destLat = lat;
      destLng = lng;
    } else if (trackingPhase === 'to_vendor') {
      const pickupCoords = order?.pickupLocation?.coordinates;
      if (Array.isArray(pickupCoords) && pickupCoords.length === 2 && pickupCoords[0] !== 0) {
        destLat = pickupCoords[1];
        destLng = pickupCoords[0];
      }
      fallbackAddress = order.vendorAddress;
    } else {
      destLat = order.latitude;
      destLng = order.longitude;
      fallbackAddress = order.address;
    }

    if (destLat && destLng) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`, '_blank');
    } else if (fallbackAddress) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fallbackAddress)}`, '_blank');
    } else {
      toast.error('Destination location not available');
    }
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
      <div className="min-h-screen bg-[#F8FAFC] pb-20">
        {/* Premium Header */}
        {/* Phase-awareness Label */}
        <div className="bg-[#0F172A] pt-28 pb-32 px-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10 flex items-center gap-4">
             <button onClick={() => navigate('/delivery/orders')} className="w-10 h-10 rounded-xl bg-slate-800/50 border border-slate-700 flex items-center justify-center text-white hover:bg-slate-800 transition-colors">
                <FiArrowLeft size={20} />
             </button>
             <div className="flex-1">
                <span className="text-indigo-400 text-[10px] font-black uppercase tracking-widest block mb-1">
                    {order.status === 'assigned' || order.status === 'accepted' ? 'Leg 1: Heading to Pickup' : 
                     order.status === 'picked_up' || order.status === 'out_for_delivery' ? 'Leg 2: Heading to Delivery' : 'Job Details'}
                </span>
                <h1 className="text-xl font-black text-white tracking-tight">{isReturn ? 'Return' : 'Order'} #{order.id.slice(-8)}</h1>
             </div>
             <div className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter border ${getStatusColor(order.status)} pb-1`}>
                {order.status.replace(/-/g, ' ')}
             </div>
          </div>
        </div>

        {/* Floating Content Body */}
        <div className="px-6 -mt-16 relative z-20 space-y-4">
          
          {(trackingPhase || (isOnline && order.status === 'available')) && (
            <div className="bg-white rounded-[32px] overflow-hidden shadow-2xl border border-slate-100 h-64 relative">
              <MapContainer 
                center={currentLocation ? [currentLocation.lat, currentLocation.lng] : [20.5937, 78.9629]} 
                zoom={14} 
                scrollWheelZoom={false}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                
                {/* Rider Marker */}
                {currentLocation && (
                  <Marker 
                    position={[currentLocation.lat, currentLocation.lng]}
                    icon={L.icon({
                      iconUrl: 'https://cdn-icons-png.flaticon.com/512/5717/5717464.png',
                      iconSize: [40, 40],
                      iconAnchor: [20, 40]
                    })}
                  >
                    <Popup>You are here (Live)</Popup>
                  </Marker>
                )}

                {/* Target Marker (Vendor or Customer) */}
                {(() => {
                  let targetLat, targetLng, targetType;
                  const pickupCoords = order?.pickupLocation?.coordinates;
                  if (trackingPhase === 'to_vendor' && Array.isArray(pickupCoords) && pickupCoords[0] !== 0) {
                    targetLat = pickupCoords[1];
                    targetLng = pickupCoords[0];
                    targetType = 'Vendor';
                  } else if (order.latitude && order.longitude) {
                    targetLat = order.latitude;
                    targetLng = order.longitude;
                    targetType = 'Customer';
                  }

                  if (targetLat && targetLng) {
                    return (
                      <Marker 
                        position={[targetLat, targetLng]}
                        icon={L.icon({
                          iconUrl: targetType === 'Vendor' 
                            ? 'https://cdn-icons-png.flaticon.com/512/1177/1177119.png' 
                            : 'https://cdn-icons-png.flaticon.com/512/1275/1275211.png',
                          iconSize: [35, 35],
                          iconAnchor: [17, 35]
                        })}
                      >
                        <Popup>{targetType}: {targetType === 'Vendor' ? order.vendorName : order.customer}</Popup>
                      </Marker>
                    );
                  }
                  return null;
                })()}
              </MapContainer>
              
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none">
                <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-lg border border-slate-100 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest leading-none">Live tracking active</span>
                </div>
                <button 
                  onClick={() => openInGoogleMaps()}
                  className="w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center text-indigo-600 border border-slate-100 pointer-events-auto"
                >
                  <FiMap size={24} />
                </button>
              </div>
            </div>
          )}

          {/* Action Hub */}
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[32px] p-6 shadow-xl border border-slate-100">
             {/* Pending Status — Accept */}
             {(order.status === 'pending' || order.status === 'approved') && (
                <button 
                  onClick={handleAcceptTask} 
                  disabled={isUpdatingOrderStatus} 
                  className={`w-full ${isReturn ? 'bg-orange-600' : 'bg-[#0F172A]'} text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-slate-200`}
                >
                   {isUpdatingOrderStatus ? 'Accepting...' : isReturn ? 'Accept Return Pickup' : 'Start Acceptance'}
                </button>
             )}

             {/* Phase 1: Go to Vendor (Assigned/Accepted) — Navigate to vendor, pickup items */}
             {(order.status === 'assigned' || order.status === 'accepted' || (isReturn && order.status === 'processing')) && (
                <div className="space-y-4">
                   <div className={`flex items-center gap-2 mb-2 p-3 ${isReturn ? 'bg-orange-50 border-orange-100 text-orange-700' : 'bg-blue-50 border-blue-100 text-blue-700'} rounded-2xl border`}>
                      <FiNavigation className={isReturn ? 'text-orange-500' : 'text-blue-500'} />
                      <p className="text-[11px] font-black uppercase tracking-tighter">Phase 1: Navigate to {isReturn ? 'Customer' : 'Vendor'} for Pickup</p>
                   </div>
                   
                   {/* Navigate to Vendor Button */}
                   <button onClick={() => openInGoogleMaps()} className="w-full bg-[#0F172A] text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg flex items-center justify-center gap-3">
                      <FiMap size={18} /> Navigate to {isReturn ? 'Customer' : 'Store'}
                   </button>
                    
                    {/* Pickup Photo Capture */}
                   <div className="bg-emerald-50 rounded-3xl p-5 border-2 border-dashed border-emerald-200">
                      <p className="text-[10px] font-black text-emerald-600 uppercase mb-3 text-center">Pickup Proof Required</p>
                      
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment"
                        ref={pickupPhotoInputRef}
                        onChange={handlePickupPhotoCapture}
                        className="hidden"
                      />
                      
                      {pickupPhoto ? (
                        <div className="relative">
                          <img src={pickupPhoto} alt="Pickup proof" className="w-full h-40 object-cover rounded-2xl border-2 border-emerald-300 shadow-sm" />
                          <button onClick={() => { setPickupPhoto(null); pickupPhotoInputRef.current?.click(); }} className="absolute top-2 right-2 bg-white/80 p-2 rounded-full shadow-md">
                            <FiCamera size={16} className="text-emerald-600" />
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => pickupPhotoInputRef.current?.click()}
                          className="w-full py-8 border-2 border-dashed border-emerald-300 rounded-2xl flex flex-col items-center gap-2 text-emerald-600 hover:bg-emerald-100/50 transition-all bg-white"
                        >
                          <FiCamera size={32} />
                          <span className="text-xs font-black uppercase">Capture Product Photo</span>
                          <span className="text-[9px] text-emerald-500 font-bold">REQUIRED TO CONFIRM PICKUP</span>
                        </button>
                      )}
                   </div>
                    
                   <button 
                     onClick={() => handleUpdateStatus('picked_up', 'Items Verified & Picked Up!', { pickupPhoto })}
                     disabled={isUpdatingOrderStatus || !pickupPhoto}
                     className="w-full flex items-center justify-center gap-3 p-5 bg-emerald-500 text-white rounded-2xl transition-all shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                   >
                      <FiCheckCircle size={24} className={pickupPhoto ? 'text-white' : 'text-slate-400'} />
                      <div className="text-left">
                         <p className="text-sm font-black">{isUpdatingOrderStatus ? 'Updating...' : 'Confirm Items Pickup'}</p>
                         {!pickupPhoto && <p className="text-[9px] font-bold uppercase opacity-80 mt-0.5">Please take a photo first</p>}
                      </div>
                   </button>
                </div>
             )}

             {/* Return Completion Mode (No OTP for returns, just photo) */}
             {isReturn && order.status === 'picked_up' && (
                <div className="space-y-5">
                   <div className="bg-emerald-50 rounded-3xl p-5 border-2 border-emerald-200 text-center">
                      <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">Return to Vendor</p>
                      <h2 className="text-lg font-black text-emerald-900">Deliver to Store</h2>
                   </div>

                   <button 
                     onClick={handleCompleteReturn} 
                     disabled={isUpdatingOrderStatus} 
                     className="w-full h-14 bg-emerald-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-emerald-200"
                   >
                     {isUpdatingOrderStatus ? 'Finishing...' : 'Complete Return'}
                   </button>
                </div>
             )}

             {/* Phase 2: Picked Up → Navigate to Customer */}
             {!isReturn && order.status === 'picked-up' && !hasArrived && (
                <div className="space-y-4">
                   <div className="flex items-center gap-2 mb-2 p-3 bg-indigo-50 border-indigo-100 text-indigo-700 rounded-2xl border">
                     <FiNavigation className="text-indigo-500" />
                     <p className="text-[11px] font-black uppercase tracking-tighter">Phase 2: Navigate to Customer</p>
                   </div>
                   
                   <button onClick={() => openInGoogleMaps()} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-indigo-200 flex items-center justify-center gap-3">
                      <FiMap size={18} /> Navigate to Customer
                   </button>

                   <button onClick={() => handleUpdateStatus('out_for_delivery', 'Live Tracking Active!')} className="w-full bg-[#0F172A] text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg flex items-center justify-center gap-3">
                      <FiNavigation /> Set Out For Delivery
                   </button>
                </div>
             )}

             {/* Phase 3: Out for Delivery → Arrived Toggle + OTP + COD Collection */}
             {!isReturn && (order.status === 'out-for-delivery' || (order.status === 'picked-up' && hasArrived)) && (
                <div className="space-y-5">
                   
                   {/* Arrived at Customer Toggle */}
                   {!hasArrived && (
                     <button 
                       onClick={handleMarkArrived}
                       disabled={isUpdatingOrderStatus}
                       className="w-full bg-amber-500 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-amber-200 flex items-center justify-center gap-3"
                     >
                       <FiTarget size={18} /> {isUpdatingOrderStatus ? 'Marking...' : 'I Have Arrived at Customer'}
                     </button>
                   )}

                   {/* After Arrival: Open Box Delivery + COD + OTP */}
                   {(hasArrived || order.status === 'out-for-delivery') && (
                     <>
                       {/* Open Box Delivery Photo */}
                       {isCod && (
                         <div className="bg-amber-50 rounded-3xl p-5 border-2 border-amber-200">
                            <p className="text-[10px] font-black text-amber-600 uppercase mb-3 text-center">Open Box Delivery</p>
                            <p className="text-xs text-amber-700 text-center mb-4">Take a photo of the opened box with items visible</p>
                            
                            <input 
                              type="file" 
                              accept="image/*" 
                              capture="environment"
                              ref={openBoxInputRef}
                              onChange={handleOpenBoxCapture}
                              className="hidden"
                            />
                            
                            {openBoxPhoto ? (
                              <div className="relative">
                                <img src={openBoxPhoto} alt="Open box" className="w-full h-40 object-cover rounded-2xl border-2 border-amber-300" />
                                <button onClick={() => { setOpenBoxPhoto(null); openBoxInputRef.current?.click(); }} className="absolute top-2 right-2 bg-white/80 p-2 rounded-full">
                                  <FiCamera size={16} className="text-amber-600" />
                                </button>
                              </div>
                            ) : (
                              <button 
                                onClick={() => openBoxInputRef.current?.click()}
                                className="w-full py-8 border-2 border-dashed border-amber-300 rounded-2xl flex flex-col items-center gap-2 text-amber-600 hover:bg-amber-100/50 transition-colors"
                              >
                                <FiCamera size={32} />
                                <span className="text-xs font-black uppercase">Capture Open Box Photo</span>
                              </button>
                            )}
                         </div>
                       )}

                       {/* Delivery Proof Photo */}
                       <div className="bg-slate-50 rounded-3xl p-5 border border-slate-200">
                          <p className="text-[10px] font-black text-slate-500 uppercase mb-3 text-center">Delivery Proof Photo</p>
                          
                          <input 
                            type="file" 
                            accept="image/*" 
                            capture="environment"
                            ref={deliveryPhotoInputRef}
                            onChange={handleDeliveryPhotoCapture}
                            className="hidden"
                          />
                          
                          {deliveryPhoto ? (
                            <div className="relative">
                              <img src={deliveryPhoto} alt="Delivery proof" className="w-full h-32 object-cover rounded-2xl border border-slate-200" />
                              <button onClick={() => { setDeliveryPhoto(null); deliveryPhotoInputRef.current?.click(); }} className="absolute top-2 right-2 bg-white/80 p-2 rounded-full">
                                <FiCamera size={16} className="text-slate-600" />
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => deliveryPhotoInputRef.current?.click()}
                              className="w-full py-6 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center gap-2 text-slate-400 hover:bg-slate-100 transition-colors"
                            >
                              <FiImage size={24} />
                              <span className="text-xs font-bold uppercase">Capture Delivery Photo</span>
                            </button>
                          )}
                       </div>

                       {/* COD Payment Collection */}
                       {isCod && (
                         <div className="bg-emerald-50 rounded-3xl p-5 border-2 border-emerald-200">
                            <p className="text-[10px] font-black text-emerald-600 uppercase mb-1 text-center">Cash Collection Required</p>
                            <h2 className="text-3xl font-black text-emerald-900 text-center">{formatPrice(order.total)}</h2>
                            <div className="flex items-center justify-center gap-2 mt-2 mb-4 text-[10px] font-bold text-emerald-700">
                               <FiShield /> SECURE CASH ON DELIVERY
                            </div>

                            {/* COD Method Selection */}
                            <div className="grid grid-cols-2 gap-3">
                              <button 
                                onClick={() => setCodMethod('cash')}
                                className={`py-4 rounded-2xl font-black text-sm uppercase tracking-wider border-2 transition-all flex flex-col items-center gap-2 ${
                                  codMethod === 'cash' 
                                    ? 'border-emerald-500 bg-emerald-500 text-white shadow-lg shadow-emerald-200' 
                                    : 'border-emerald-200 bg-white text-emerald-700 hover:border-emerald-400'
                                }`}
                              >
                                <FiDollarSign size={24} />
                                <span className="text-xs">Direct Cash</span>
                              </button>
                              <button 
                                onClick={() => { setCodMethod('qr'); handleLoadCompanyQR(); }}
                                className={`py-4 rounded-2xl font-black text-sm uppercase tracking-wider border-2 transition-all flex flex-col items-center gap-2 ${
                                  codMethod === 'qr' 
                                    ? 'border-indigo-500 bg-indigo-500 text-white shadow-lg shadow-indigo-200' 
                                    : 'border-indigo-200 bg-white text-indigo-700 hover:border-indigo-400'
                                }`}
                              >
                                <FiCreditCard size={24} />
                                <span className="text-xs">Pay via QR</span>
                              </button>
                            </div>

                            {/* QR Code Display */}
                            {codMethod === 'qr' && (
                              <div className="mt-4">
                                {isLoadingQR ? (
                                  <div className="flex items-center justify-center py-8">
                                    <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
                                  </div>
                                ) : companyQR?.qrImage ? (
                                  <div className="text-center">
                                    <img src={companyQR.qrImage} alt="Company Payment QR" className="w-56 h-56 mx-auto rounded-2xl border-2 border-indigo-200 shadow-lg" />
                                    {companyQR.upiId && (
                                      <p className="mt-2 text-sm font-bold text-indigo-700">UPI: {companyQR.upiId}</p>
                                    )}
                                    <p className="mt-1 text-xs text-slate-500">Amount: {formatPrice(companyQR.amount || order.total)}</p>
                                    <p className="mt-2 text-[10px] text-indigo-500 font-bold uppercase">Ask customer to scan & pay</p>
                                  </div>
                                ) : (
                                  <div className="text-center py-4 text-slate-400 text-sm">
                                    QR code not available. Please collect cash instead.
                                  </div>
                                )}
                              </div>
                            )}
                         </div>
                       )}

                       {/* Non-COD — simple display */}
                       {!isCod && (
                         <div className="bg-emerald-50 rounded-3xl p-4 border border-emerald-200 text-center">
                            <p className="text-[10px] font-black text-emerald-600 uppercase">Payment: Online (Already Paid)</p>
                         </div>
                       )}

                       {/* OTP Entry */}
                       <div className="relative">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-center">Enter Customer OTP</p>
                          <input 
                             type="numeric" maxLength={6} value={deliveryOtp}
                             onChange={(e) => setDeliveryOtp(e.target.value.replace(/\D/g, ''))}
                             placeholder="••••••"
                             className="w-full h-16 bg-slate-50 border-2 border-slate-100 rounded-2xl text-center text-3xl font-black tracking-[0.5em] text-indigo-600 focus:border-indigo-500 focus:outline-none placeholder:text-slate-200"
                          />
                       </div>

                       <div className="grid grid-cols-2 gap-3 pt-2">
                           <button onClick={handleResendOtp} disabled={isResendingOtp} className="h-14 bg-slate-100 rounded-2xl text-[10px] font-black uppercase text-slate-500 hover:bg-slate-200 tracking-widest">
                             {isResendingOtp ? 'Sending...' : 'Resend OTP'}
                           </button>
                           <button 
                             onClick={handleCompleteOrder} 
                             disabled={deliveryOtp.length !== 6 || isUpdatingOrderStatus || (isCod && !codMethod)} 
                             className="h-14 bg-emerald-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-emerald-200 disabled:opacity-50"
                           >
                             {isUpdatingOrderStatus ? 'Finishing...' : 'Complete Delivery'}
                           </button>
                       </div>
                     </>
                   )}
                </div>
             )}

             {/* Delivered Status */}
             {order.status === 'delivered' && (
               <div className="text-center py-4">
                 <div className="w-16 h-16 bg-emerald-100 rounded-full mx-auto flex items-center justify-center mb-3">
                   <FiCheckCircle size={32} className="text-emerald-600" />
                 </div>
                 <h3 className="font-black text-emerald-900 text-lg">Delivery Completed!</h3>
                 <p className="text-slate-500 text-sm mt-1">Earnings have been added to your wallet.</p>
               </div>
             )}
          </motion.div>

          {/* Contact & Map Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
             {/* Main Contact Card (Customer for orders, Customer for return pickup) */}
             <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100">
                <div className="flex items-center gap-4 mb-6">
                   <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm">
                      <FiUser size={28} />
                   </div>
                   <div className="flex-1">
                      <h3 className="font-black text-slate-900 text-lg">{order.customer || 'Client'}</h3>
                      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Customer</p>
                   </div>
                   {order.phone && (
                      <button onClick={() => window.open(`tel:${order.phone}`, '_self')} className="w-12 h-12 rounded-full bg-emerald-500 shadow-lg shadow-emerald-200 flex items-center justify-center text-white">
                         <FiPhone size={20} />
                      </button>
                   )}
                </div>
                
                <div className="space-y-4">
                   <div className="flex items-start gap-3">
                      <div className="mt-1 text-indigo-500"><FiMapPin size={18} /></div>
                      <div className="flex-1">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Destination Address</p>
                         <p className="text-sm text-slate-800 font-bold leading-relaxed">{order.address || 'Address unavailable'}</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-6 pt-2">
                      <div className="flex items-center gap-2">
                         <FiNavigation className="text-emerald-500" />
                         <span className="text-sm font-black text-slate-900">{order.distance || '2.4 km'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                         <FiClock className="text-amber-500" />
                         <span className="text-sm font-black text-slate-900">{order.estimatedTime || '15 min'}</span>
                      </div>
                   </div>
                </div>
             </div>

             {/* Live Track / Map Card */}
             <div className="bg-white rounded-[32px] p-4 shadow-sm border border-slate-100 h-[300px] overflow-hidden relative">
                {(() => {
                  // Determine map destination based on phase
                  const pickupCoords = order.pickupLocation?.coordinates;
                  const vendorLoc = Array.isArray(pickupCoords) && pickupCoords.length === 2 && pickupCoords[0] !== 0
                    ? [pickupCoords[1], pickupCoords[0]] : null;
                  const customerLoc = order.latitude && order.longitude 
                    ? [order.latitude, order.longitude] : null;
                  const riderLoc = currentLocation 
                    ? [currentLocation.lat, currentLocation.lng]
                    : order.deliveryBoyId?.currentLocation?.coordinates 
                      ? [order.deliveryBoyId.currentLocation.coordinates[1], order.deliveryBoyId.currentLocation.coordinates[0]] 
                      : null;
                  
                  const destinationLoc = trackingPhase === 'to_vendor' ? vendorLoc : customerLoc;
                  const mapCenter = riderLoc || destinationLoc || [20.5937, 78.9629];

                  return (
                    <MapContainer
                      center={mapCenter}
                      zoom={14}
                      style={{ height: '100%', width: '100%', borderRadius: '24px' }}
                      zoomControl={false}
                    >
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      {/* Rider Location */}
                      {riderLoc && (
                        <Marker position={riderLoc} icon={riderIcon}>
                          <Popup>You are here</Popup>
                        </Marker>
                      )}
                      {/* Destination Marker */}
                      {destinationLoc && (
                        <Marker position={destinationLoc} icon={customerIcon}>
                          <Popup>{trackingPhase === 'to_vendor' ? 'Vendor Location' : 'Customer Location'}</Popup>
                        </Marker>
                      )}
                      <ChangeView center={riderLoc || destinationLoc || mapCenter} />
                    </MapContainer>
                  );
                })()}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[80%] z-[1000]">
                   <button onClick={() => openInGoogleMaps()} className="w-full bg-[#0F172A] text-white py-3 rounded-2xl shadow-xl font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-2">
                      <FiMap size={14} /> {trackingPhase === 'to_vendor' ? 'Navigate to Store' : 'Navigate to Customer'}
                   </button>
                </div>
                {/* Phase indicator overlay */}
                {trackingPhase && (
                  <div className="absolute top-4 left-4 z-[1000]">
                    <div className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                      trackingPhase === 'to_vendor' ? 'bg-blue-500 text-white' : 'bg-indigo-500 text-white'
                    }`}>
                      {trackingPhase === 'to_vendor' ? '→ To Vendor' : '→ To Customer'}
                    </div>
                  </div>
                )}
             </div>
          </div>

          {/* Try & Buy / Check & Buy Mode Instructions */}
          {order.orderType && order.orderType !== 'standard' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#0F172A] rounded-[32px] p-6 text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
              <div className="relative z-10 flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center shadow-lg">
                  <FiPackage size={24} />
                </div>
                <div>
                  <h3 className="font-black text-lg uppercase tracking-tight">{order.orderType.replace(/_/g, ' ')} MODE</h3>
                  <p className="text-indigo-300 text-[10px] font-bold uppercase tracking-widest">Special Handling Required</p>
                </div>
              </div>
              <div className="relative z-10 bg-white/10 rounded-2xl p-4 border border-white/10 backdrop-blur-sm">
                {order.orderType === 'try_and_buy' ? (
                  <p className="text-sm text-slate-200 leading-relaxed font-medium">
                    Please allow the customer to <span className="text-indigo-300 font-black">TRY</span> the products. Wait for 5-10 mins for their final decision before confirming delivery.
                  </p>
                ) : (
                  <p className="text-sm text-slate-200 leading-relaxed font-medium">
                    Please allow the customer to <span className="text-indigo-300 font-black">INSPECT</span> items. Confirm physical quality satisfaction before completion.
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {/* Item List / Manifest Card */}
          <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100">
             <div className="flex items-center justify-between mb-6">
                <h3 className="text-slate-900 font-black text-lg flex items-center gap-2">
                   <FiPackage className="text-indigo-500" /> Manifest
                </h3>
                <span className="px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-black text-slate-500 uppercase tracking-widest">
                   {order.items?.length || 0} Products
                </span>
             </div>
             
             <div className="space-y-4">
                {(order.items || []).map((item, i) => (
                   <div key={i} className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div>
                         <p className="font-black text-slate-800 text-sm">{item.name || 'Fashion Pack'}</p>
                         <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Qty: {item.quantity || 1}</p>
                      </div>
                      <p className="font-black text-slate-900 text-sm">{formatPrice(item.price || 0)}</p>
                   </div>
                ))}
             </div>

             <div className="mt-8 space-y-3 pt-6 border-t border-slate-100">
                <div className="flex justify-between items-center text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                   <span>Fee & Tax</span>
                   <span>{formatPrice((order.deliveryFee || 0) + (order.tax || 0))}</span>
                </div>
                {order.discount > 0 && (
                   <div className="flex justify-between items-center text-red-500 font-bold text-[10px] uppercase tracking-widest">
                      <span>Discount</span>
                      <span>-{formatPrice(order.discount)}</span>
                   </div>
                )}
                <div className="flex justify-between items-center text-slate-900 font-black text-xl">
                   <span>Final Checkout</span>
                   <span className="text-indigo-600 underline underline-offset-4 decoration-2">{formatPrice(order.total)}</span>
                </div>
             </div>
          </div>

        </div>
      </div>
    </PageTransition>
  );
};

export default DeliveryOrderDetail;

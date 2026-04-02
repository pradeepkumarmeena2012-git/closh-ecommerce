import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
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
  FiShield,
  FiMap,
  FiTarget,
  FiXCircle,
  FiImage
} from 'react-icons/fi';
import { GoogleMap, Marker, Polyline, InfoWindow } from '@react-google-maps/api';
import PageTransition from '../../../shared/components/PageTransition';
import { formatPrice } from '../../../shared/utils/helpers';
import toast from 'react-hot-toast';
import { useDeliveryAuthStore } from '../store/deliveryStore';
import { useDeliveryTracking } from '../../../shared/hooks/useDeliveryTracking';
import socketService from '../../../shared/utils/socket';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '24px'
};

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: false,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }]
    }
  ]
};

const DeliveryOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isLoaded } = useOutletContext();
  const {
    fetchOrderById,
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
  const [deliveryOtp, setDeliveryOtp] = useState('');
  const [deliveryPhoto, setDeliveryPhoto] = useState(null);
  const [openBoxPhoto, setOpenBoxPhoto] = useState(null);
  const [pickupPhoto, setPickupPhoto] = useState(null);
  const [reachedPhoto, setReachedPhoto] = useState(null);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [hasArrived, setHasArrived] = useState(false);
  const [codMethod, setCodMethod] = useState(null); 
  const [companyQR, setCompanyQR] = useState(null);
  const [isLoadingQR, setIsLoadingQR] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [showDeliverySuccess, setShowDeliverySuccess] = useState(false);
  
  const openBoxInputRef = useRef(null);
  const deliveryPhotoInputRef = useRef(null);
  const pickupPhotoInputRef = useRef(null);
  const reachedPhotoInputRef = useRef(null);
  const [map, setMap] = useState(null);

  const isReturn = order?.type === 'return';
  const isCod = order?.paymentMethod === 'cod' || order?.paymentMethod === 'cash';

  const getTrackingPhase = () => {
    if (!order) return null;
    const s = order.status;
    if (s === 'assigned' || s === 'accepted') return 'to_vendor';
    if (['picked-up', 'picked_up', 'out-for-delivery', 'out_for_delivery'].includes(s)) return 'to_customer';
    return null;
  };

  const trackingPhase = getTrackingPhase();
  const liveLocation = useDeliveryTracking(deliveryBoy?.id, order ? [order] : []);
  
  useEffect(() => {
    if (liveLocation) {
        setCurrentLocation(liveLocation);
        if (map) {
            map.panTo(liveLocation);
        }
    }
  }, [liveLocation, map]);

  const loadOrder = useCallback(async () => {
    try {
      const response = await fetchOrderById(id);
      setOrder(response);
      if (response?.arrivedAt || response?.deliveryFlow?.arrivedAt) {
        setHasArrived(true);
      }
      if (response.batchId) {
        navigate(`/delivery/batch/${response.batchId}`, { replace: true });
      }
    } catch (err) {
      setOrder(null);
    }
  }, [id, fetchOrderById]);

  useEffect(() => {
    loadOrder();
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
        toast.error('Task taken by another partner');
        navigate('/delivery/orders');
      }
    });

    return () => {
      socketService.off('order_status_updated');
      socketService.off('return_status_updated');
      socketService.off('order_taken');
      if (id) socketService.leaveRoom?.(`order_${id}`);
    };
  }, [id, loadOrder]);

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

  const handleMarkArrived = async () => {
    if (!order || !reachedPhoto) {
        toast.error('Please capture arrival proof photo first');
        return;
    }
    try {
      const updated = await markArrivedAtCustomer(order.id, { reachedPhoto });
      setOrder(updated);
      setHasArrived(true);
      toast.success('Arrival marked! Customer notified.');
    } catch(err) {
      toast.error('Failed to mark arrival');
    }
  };

  const handleCompleteOrder = async () => {
    if (!order || !/^\d{6}$/.test(deliveryOtp.trim())) {
      toast.error('Please enter valid 6-digit OTP');
      return;
    }
    if (isCod && !codMethod) {
      toast.error('Please select payment method');
      return;
    }
    try {
      const options = {
        openBoxPhoto,
        deliveryPhoto,
        codCollectionMethod: codMethod
      };
      const updated = await completeOrder(order.id, deliveryOtp.trim(), options);
      setOrder(updated);
      setShowDeliverySuccess(true);
    } catch(err) {
      toast.error(err?.response?.data?.message || 'Delivery failed');
    }
  };

  const openInGoogleMaps = () => {
    let destLat, destLng;
    const pickupCoords = order?.pickupLocation?.coordinates;
    if (trackingPhase === 'to_vendor' && Array.isArray(pickupCoords)) {
      destLat = pickupCoords[1];
      destLng = pickupCoords[0];
    } else {
      destLat = order.latitude;
      destLng = order.longitude;
    }
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`, '_blank');
  };

  if (isLoadingOrder || !isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
         <div className="w-12 h-12 border-4 border-white/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) return <div className="p-10 text-center">Order not found</div>;

  if (showDeliverySuccess || order.status === 'delivered') {
    return (
        <PageTransition>
          <div className="min-h-screen bg-emerald-50 flex flex-col items-center justify-center p-6">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center text-white mb-6">
              <FiCheckCircle size={48} />
            </motion.div>
            <h1 className="text-2xl font-black text-slate-900 mb-2">Success!</h1>
            <p className="text-slate-500 mb-8">Order has been delivered.</p>
            <button onClick={() => navigate('/delivery/dashboard')} className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold uppercase text-xs">Home</button>
          </div>
        </PageTransition>
    );
  }

  const pickupCoords = order?.pickupLocation?.coordinates;
  const destination = trackingPhase === 'to_vendor' 
    ? { lat: pickupCoords?.[1], lng: pickupCoords?.[0] } 
    : { lat: order.latitude, lng: order.longitude };

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#F8FAFC] pb-24">
        {/* Header Overlay */}
        <div className="fixed top-0 left-0 right-0 z-40 bg-slate-900/90 backdrop-blur-md px-6 pt-12 pb-6 border-b border-white/5">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
                    <FiArrowLeft size={20} />
                </button>
                <div className="flex-1">
                    <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest">Active Task</p>
                    <h1 className="text-white font-black text-lg leading-tight">Order #{String(order.id).slice(-8)}</h1>
                </div>
                <div className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider bg-indigo-500 text-white`}>
                    {order.status.replace(/_/g, ' ')}
                </div>
            </div>
        </div>

        {/* MAP SECTION */}
        <div className="h-[50vh] w-full pt-28">
            <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={currentLocation || destination}
                zoom={14}
                options={mapOptions}
                onLoad={setMap}
            >
                {currentLocation && (
                    <Marker 
                        position={currentLocation}
                        icon={{
                            path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                            fillColor: '#6366f1',
                            fillOpacity: 1,
                            strokeColor: '#fff',
                            strokeWeight: 2,
                            scale: 6,
                            rotation: 0
                        }}
                    />
                )}
                {destination.lat && (
                    <Marker 
                        position={destination}
                        label={{ text: trackingPhase === 'to_vendor' ? '📦' : '🏠', fontSize: '20px' }}
                    />
                )}
                {currentLocation && destination.lat && (
                    <Polyline 
                        path={[currentLocation, destination]}
                        options={{ strokeColor: '#6366f1', strokeWeight: 4, strokeOpacity: 0.8, icons: [{ icon: { path: 'M 0,-1 1,1 -1,1 z', fillOpacity: 0.7, scale: 3 }, offset: '100%', repeat: '20px' }] }}
                    />
                )}
            </GoogleMap>
        </div>

        {/* ACTION PANEL */}
        <div className="px-6 -mt-10 relative z-50 space-y-4">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white rounded-[32px] p-6 shadow-2xl border border-slate-100">
                {/* Leg Info */}
                <div className="flex items-center gap-3 mb-6 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg">
                        <FiNavigation size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Next Step</p>
                        <p className="text-sm font-black text-slate-900">
                            {trackingPhase === 'to_vendor' ? 'Pickup from Vendor' : 'Deliver to Customer'}
                        </p>
                    </div>
                    <button onClick={openInGoogleMaps} className="ml-auto w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600">
                        <FiMap size={18} />
                    </button>
                </div>

                {/* PHASE 1: AT VENDOR */}
                {trackingPhase === 'to_vendor' && (
                    <div className="space-y-4">
                        <div className="bg-blue-50 border-2 border-dashed border-blue-200 rounded-3xl p-6 text-center">
                            <p className="text-[11px] font-black text-blue-600 uppercase mb-4 tracking-widest">Store Verification</p>
                            
                            <input type="file" accept="image/*" capture="environment" ref={pickupPhotoInputRef} onChange={(e) => {
                                const f = e.target.files[0];
                                if(f){ const r = new FileReader(); r.onload=()=>setPickupPhoto(r.result); r.readAsDataURL(f); }
                            }} className="hidden" />

                            {pickupPhoto ? (
                                <img src={pickupPhoto} className="w-full h-40 object-cover rounded-2xl border-2 border-white shadow-lg mb-4" />
                            ) : (
                                <button onClick={() => pickupPhotoInputRef.current.click()} className="w-full py-10 bg-white border-2 border-dashed border-blue-300 rounded-2xl flex flex-col items-center gap-2 text-blue-500">
                                    <FiCamera size={32} />
                                    <span className="text-xs font-black uppercase tracking-wider">Capture Store Pickup</span>
                                </button>
                            )}

                            <button 
                                onClick={() => handleUpdateStatus('picked_up', 'Picked Up!', { pickupPhoto })}
                                disabled={!pickupPhoto || isUpdatingOrderStatus}
                                className="w-full mt-4 bg-[#0F172A] text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl disabled:opacity-50"
                            >
                                Confirm Pickup
                            </button>
                        </div>
                    </div>
                )}

                {/* PHASE 2: TOWARDS CUSTOMER (REACHED FLOW) */}
                {trackingPhase === 'to_customer' && (
                    <div className="space-y-4">
                        {!hasArrived ? (
                            <div className="bg-amber-50 border-2 border-dashed border-amber-200 rounded-3xl p-6">
                                <p className="text-[11px] font-black text-amber-600 uppercase mb-4 tracking-widest text-center">Arrival Verification</p>
                                
                                <input type="file" accept="image/*" capture="environment" ref={reachedPhotoInputRef} onChange={(e) => {
                                    const f = e.target.files[0];
                                    if(f){ const r = new FileReader(); r.onload=()=>setReachedPhoto(r.result); r.readAsDataURL(f); }
                                }} className="hidden" />

                                {reachedPhoto ? (
                                    <img src={reachedPhoto} className="w-full h-40 object-cover rounded-2xl border-2 border-white shadow-lg mb-4" />
                                ) : (
                                    <button onClick={() => reachedPhotoInputRef.current.click()} className="w-full py-10 bg-white border-2 border-dashed border-amber-300 rounded-2xl flex flex-col items-center gap-2 text-amber-500">
                                        <FiCamera size={32} />
                                        <span className="text-xs font-black uppercase tracking-wider">Take Photo at Door</span>
                                    </button>
                                )}

                                <button 
                                    onClick={handleMarkArrived}
                                    disabled={!reachedPhoto || isUpdatingOrderStatus}
                                    className="w-full mt-4 bg-amber-500 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl disabled:opacity-50"
                                >
                                    I Am Reached
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4">
                                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex items-center gap-3">
                                    <FiCheckCircle className="text-emerald-500" />
                                    <span className="text-xs font-black text-emerald-700 uppercase">Reached Successfully</span>
                                </div>

                                <div className="relative">
                                    <input 
                                        type="numeric" maxLength={6} value={deliveryOtp}
                                        onChange={(e) => setDeliveryOtp(e.target.value.replace(/\D/g, ''))}
                                        placeholder="Enter Customer OTP"
                                        className="w-full h-16 bg-slate-50 border-2 border-slate-100 rounded-2xl text-center text-2xl font-black tracking-[0.4em] text-indigo-600 focus:border-indigo-500 focus:outline-none"
                                    />
                                    <button onClick={resendDeliveryOtp} className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-500 font-bold text-[10px] uppercase">Resend</button>
                                </div>

                                {isCod && (
                                    <div className="bg-emerald-100/50 p-5 rounded-3xl border border-emerald-200">
                                        <p className="text-[10px] font-black text-emerald-700 uppercase mb-3 text-center tracking-widest">Collect {formatPrice(order.total)}</p>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button onClick={()=>setCodMethod('cash')} className={`py-4 rounded-2xl font-black text-[10px] uppercase border-2 transition-all ${codMethod==='cash' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-emerald-600 border-emerald-200'}`}>Direct Cash</button>
                                            <button onClick={()=>setCodMethod('qr')} className={`py-4 rounded-2xl font-black text-[10px] uppercase border-2 transition-all ${codMethod==='qr' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-indigo-600 border-indigo-200'}`}>Pay via QR</button>
                                        </div>
                                    </div>
                                )}

                                <button 
                                    onClick={handleCompleteOrder}
                                    disabled={deliveryOtp.length < 6 || isUpdatingOrderStatus}
                                    className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl disabled:opacity-50"
                                >
                                    Confirm Delivery
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </motion.div>

            {/* Details Cards */}
            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100">
                <h3 className="font-black text-slate-900 text-base mb-4 uppercase tracking-widest">Customer Details</h3>
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                        <FiUser size={24} />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-black text-slate-900">{order.customer}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{order.phone}</p>
                    </div>
                    <button onClick={()=>window.open(`tel:${order.phone}`)} className="w-11 h-11 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg"><FiPhone /></button>
                </div>
                <div className="space-y-4 border-t border-slate-50 pt-4">
                    <div className="flex gap-3">
                        <FiMapPin className="text-indigo-500 shrink-0 mt-1" />
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Destination</p>
                            <p className="text-xs font-bold text-slate-700 leading-relaxed">{order.address}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default DeliveryOrderDetail;

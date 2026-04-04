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
  FiCamera,
  FiShield,
  FiImage,
  FiInfo,
  FiChevronRight
} from 'react-icons/fi';
import TrackingMap from '../../../shared/components/TrackingMap';
import PageTransition from '../../../shared/components/PageTransition';
import { formatPrice } from '../../../shared/utils/helpers';
import toast from 'react-hot-toast';
import { useDeliveryAuthStore } from '../store/deliveryStore';
import { useDeliveryTracking } from '../../../shared/hooks/useDeliveryTracking';
import socketService from '../../../shared/utils/socket';

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
  const [hasArrived, setHasArrived] = useState(false);
  const [codMethod, setCodMethod] = useState(null); 
  const [companyQR, setCompanyQR] = useState(null);
  const [isLoadingQR, setIsLoadingQR] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [showDeliverySuccess, setShowDeliverySuccess] = useState(false);
  const [activeInputType, setActiveInputType] = useState(null); // 'camera' or 'gallery'
  
  const openBoxInputRef = useRef(null);
  const deliveryPhotoInputRef = useRef(null);
  const pickupPhotoInputRef = useRef(null);
  const reachedPhotoInputRef = useRef(null);

  // Gallery Refs
  const pickupGalleryRef = useRef(null);
  const deliveryGalleryRef = useRef(null);
  const openBoxGalleryRef = useRef(null);

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
    if (liveLocation) setCurrentLocation(liveLocation);
  }, [liveLocation]);
  
  const loadOrder = useCallback(async () => {
    try {
      const response = await fetchOrderById(id);
      setOrder(response);
      if (response?.arrivedAt || response?.deliveryFlow?.arrivedAt) {
        setHasArrived(true);
      }
    } catch (err) {
      setOrder(null);
    }
  }, [id, fetchOrderById]);

  useEffect(() => {
    loadOrder();
    if (id) socketService.joinRoom(`order_${id}`);
    
    const handleUpdate = () => loadOrder();
    socketService.on('order_status_updated', handleUpdate);
    socketService.on('return_status_updated', handleUpdate);

    return () => {
      socketService.off('order_status_updated');
      socketService.off('return_status_updated');
      if (id) socketService.leaveRoom?.(`order_${id}`);
    };
  }, [id, loadOrder]);

  const handleUpdateStatus = async (newBackendStatus, successMessage, options = {}) => {
    try {
      let updated;
      if (isReturn) updated = await updateReturnStatus(order.id, newBackendStatus, options);
      else updated = await updateOrderStatus(order.id, newBackendStatus, options);
      setOrder(updated);
      toast.success(successMessage);
    } catch {}
  };

  const handleMarkArrived = async () => {
    try {
      const updated = await markArrivedAtCustomer(order.id, { reachedPhoto: null });
      setOrder(updated);
      setHasArrived(true);
    } catch {
      toast.error('Failed to mark arrival');
    }
  };

  const handleCompleteOrder = async () => {
    if (!order || !/^\d{6}$/.test(deliveryOtp.trim())) return toast.error('Enter valid 6-digit OTP');
    if (isCod && !codMethod) return toast.error('Select payment method');
    try {
      const updated = await completeOrder(order.id, deliveryOtp.trim(), { openBoxPhoto, deliveryPhoto, codCollectionMethod: codMethod });
      setOrder(updated);
      setShowDeliverySuccess(true);
    } catch(err) {
      toast.error(err?.response?.data?.message || 'Delivery failed');
    }
  };

  const openInGoogleMaps = () => {
    let destLat = trackingPhase === 'to_vendor' ? order.vendorLatitude : order.latitude;
    let destLng = trackingPhase === 'to_vendor' ? order.vendorLongitude : order.longitude;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`, '_blank');
  };

  const handleImageSelect = (file, setter) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setter(reader.result);
    reader.readAsDataURL(file);
  };

  if (isLoadingOrder || !isLoaded) {
    return <div className="min-h-screen flex items-center justify-center bg-white"><div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" /></div>;
  }

  if (!order) return <div className="p-10 text-center text-slate-500 font-medium">Order not found</div>;

  if (showDeliverySuccess || order.status === 'delivered') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center text-white mb-6 shadow-xl shadow-emerald-100">
          <FiCheckCircle size={40} />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Delivery Success!</h1>
        <p className="text-sm text-slate-500 mt-2 mb-10">Earnings updated in your wallet.</p>
        <button onClick={() => navigate('/delivery/dashboard')} className="w-full bg-slate-900 text-white h-14 rounded-xl font-bold uppercase text-xs tracking-widest">Back to Dashboard</button>
      </div>
    );
  }

  const vendorLocation = order.vendorLatitude ? { lat: Number(order.vendorLatitude), lng: Number(order.vendorLongitude) } : null;
  const customerLocation = order.latitude ? { lat: Number(order.latitude), lng: Number(order.longitude) } : null;

  return (
    <PageTransition>
      <div className="relative min-h-screen w-full bg-slate-50 font-sans text-slate-900 select-none overflow-x-hidden">
        
        {/* APP HEADER */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-100 flex items-center h-16 px-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-900"><FiArrowLeft size={24} /></button>
          <div className="flex-1 ml-2">
            <h2 className="text-lg font-bold text-slate-900 leading-tight">#{String(order.id).slice(-8)}</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {trackingPhase === 'to_vendor' ? 'Pickup Task' : 'Delivery Task'}
            </p>
          </div>
          <button onClick={()=>window.open(`tel:${order.phone}`)} className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center"><FiPhone size={20}/></button>
        </header>

        <main className="pt-16 pb-32">
          {(!hasArrived && trackingPhase === 'to_customer') || (trackingPhase === 'to_vendor' && !pickupPhoto) ? (
            /* --- TRANSIT VIEW: MAP + MINIMAL BOTTOM CARD --- */
            <div className="relative h-[calc(100vh-64px)] w-full">
              <TrackingMap 
                deliveryLocation={currentLocation} 
                vendorLocation={vendorLocation} 
                customerLocation={customerLocation} 
                status={order.rawStatus || order.status} 
                customerAddress={order.address}
                vendorAddress={order.vendorAddress}
                followMode={true} 
              />
              
              {/* Floating Bottom Strip (Native App Feel) */}
              <div className="absolute bottom-0 left-0 right-0 p-4 pb-8 bg-gradient-to-t from-slate-900/10 to-transparent">
                 <div className="bg-white rounded-2xl p-4 shadow-2xl border border-slate-100">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400"><FiMapPin size={24}/></div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">On the route to</p>
                            <h3 className="text-base font-bold text-slate-900 truncate">{trackingPhase === 'to_vendor' ? order.vendorName : order.customer}</h3>
                        </div>
                        {/* Focus / Re-center Button (No more external Tabs) */}
                        <button onClick={() => { if(currentLocation) navigate(0); }} className="w-11 h-11 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg"><FiNavigation size={20}/></button>
                    </div>

                    {trackingPhase === 'to_vendor' ? (
                        <button onClick={() => pickupPhotoInputRef.current.click()} className="w-full h-14 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2">
                            <FiCamera size={18} /> Take Pickup Photo
                        </button>
                    ) : (
                        <button onClick={handleMarkArrived} className="w-full h-14 bg-[#F59E0B] text-white rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2">
                             I Have Reached
                        </button>
                    )}
                 </div>
              </div>
            </div>
          ) : (
            /* --- FULFILLMENT VIEW: DEDICATED TASKS (NATIVE LIST FEEL) --- */
            <div className="p-4 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                
                {/* Information Card */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">{trackingPhase === 'to_vendor' ? order.vendorName : order.customer}</h3>
                            <p className="text-xs text-slate-500 font-medium mt-1">{trackingPhase === 'to_vendor' ? order.vendorAddress : order.address}</p>
                        </div>
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
                            {trackingPhase === 'to_vendor' ? <FiPackage size={24}/> : <FiUser size={24}/>}
                        </div>
                    </div>
                    {/* Check & Buy Banner */}
                    {(order?.isTryAndBuy || order?.orderType?.includes('buy')) && trackingPhase === 'to_customer' && (
                        <div className="mt-4 p-3 bg-indigo-600 rounded-xl text-white flex items-center gap-3">
                            <div className="w-2 h-2 bg-white rounded-full animate-ping shrink-0" />
                            <p className="text-[11px] font-bold leading-tight">CHECK & BUY ORDER: Wait for customer confirmation before finishing.</p>
                        </div>
                    )}
                </div>

                {/* Package Checklist Section */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Items ({order.items?.length})</p>
                        <p className="text-sm font-bold text-slate-900">{formatPrice(order.total)}</p>
                    </div>
                    <div className="space-y-3">
                        {order.items?.map((item, idx) => (
                            <div key={idx} className="flex gap-4 items-center py-2 border-b border-slate-50 last:border-0">
                                <div className="w-10 h-10 bg-slate-50 rounded-lg overflow-hidden border border-slate-100 shrink-0">
                                    {item.image ? <img src={item.image} className="w-full h-full object-cover" /> : <FiPackage size={16} className="text-slate-300 mx-auto mt-3" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-slate-900 truncate">{item.productName || item.name}</p>
                                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-tighter">Qty: {item.quantity}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Task Checklist (Proofs) */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
                     <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Required Proofs</p>
                     
                     {/* 1. Main Photo Task */}
                     <div className="space-y-2">
                        <p className="text-xs font-bold text-slate-700">{trackingPhase === 'to_vendor' ? '1. Take Photo of pickup package' : '1. Take Photo of delivery package'}</p>
                        <div className="flex gap-2">
                            <button onClick={() => (trackingPhase === 'to_vendor' ? pickupPhotoInputRef : deliveryPhotoInputRef).current.click()} className={`flex-1 h-14 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-widest transition-all ${ (trackingPhase === 'to_vendor' ? pickupPhoto : deliveryPhoto) ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                                <FiCamera size={18} /> Camera
                            </button>
                            <button onClick={() => (trackingPhase === 'to_vendor' ? pickupGalleryRef : deliveryGalleryRef).current.click()} className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center transition-all ${ (trackingPhase === 'to_vendor' ? pickupPhoto : deliveryPhoto) ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'bg-white border-slate-200 text-slate-400'}`}>
                                <FiImage size={20} />
                            </button>
                        </div>
                     </div>

                     {/* 2. Open Box Check (Only for Customer Delivery) */}
                     {trackingPhase === 'to_customer' && (
                        <div className="space-y-2">
                            <p className="text-xs font-bold text-slate-700">2. Proof of item verification (Open Box)</p>
                            <div className="flex gap-2">
                                <button onClick={() => openBoxInputRef.current.click()} className={`flex-1 h-14 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-widest transition-all ${openBoxPhoto ? 'bg-emerald-50 border-emerald-400 text-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                                    <FiShield size={18} /> Camera
                                </button>
                                <button onClick={() => openBoxGalleryRef.current.click()} className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center transition-all ${openBoxPhoto ? 'bg-emerald-50 border-emerald-400 text-emerald-600' : 'bg-white border-slate-200 text-slate-400'}`}>
                                    <FiImage size={20} />
                                </button>
                            </div>
                        </div>
                     )}
                </div>

                {/* Verification & Payment Section (Only for Customer Delivery) */}
                {trackingPhase === 'to_customer' && (
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-6">
                        <div className="space-y-4">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">Customer Verification OTP</p>
                            <input 
                                type="numeric" maxLength={6} value={deliveryOtp}
                                onChange={(e) => setDeliveryOtp(e.target.value.replace(/\D/g, ''))}
                                placeholder="------"
                                className="w-full h-16 bg-slate-50 border-none rounded-2xl text-center text-4xl font-bold tracking-[0.3em] text-slate-900 placeholder:text-slate-200 outline-none"
                            />
                            <button onClick={resendDeliveryOtp} className="w-full text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Resend Code</button>
                        </div>

                        {isCod && (
                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-bold text-slate-500 uppercase">Collect Cash</p>
                                    <p className="text-xl font-black text-slate-900">{formatPrice(order.total)}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={()=>setCodMethod('cash')} className={`h-12 rounded-xl font-bold text-[10px] uppercase border-2 transition-all ${codMethod==='cash' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-100'}`}>Cash</button>
                                    <button onClick={async ()=>{
                                        setCodMethod('qr');
                                        if(!companyQR) { setIsLoadingQR(true); const qr = await getCompanyQR(); setCompanyQR(qr); setIsLoadingQR(false); }
                                    }} className={`h-12 rounded-xl font-bold text-[10px] uppercase border-2 transition-all ${codMethod==='qr' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400 border-slate-100'}`}>Pay via QR</button>
                                </div>
                                {codMethod === 'qr' && (
                                    <div className="p-4 bg-slate-50 rounded-2xl flex flex-col items-center gap-3">
                                        {isLoadingQR ? <div className="w-40 h-40 bg-white rounded-xl animate-pulse" /> : <img src={companyQR} className="w-40 h-40 mix-blend-multiply" alt="QR" />}
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Scan to Pay securely</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
          )}
        </main>

        {/* STICKY ACTION BUTTON (Native App Style) */}
        {((trackingPhase === 'to_vendor' && pickupPhoto) || hasArrived) && (
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 z-50">
                <button 
                    onClick={trackingPhase === 'to_vendor' ? ()=>handleUpdateStatus('picked_up', 'Items Picked Up!', { pickupPhoto }) : handleCompleteOrder}
                    disabled={isUpdatingOrderStatus || (!pickupPhoto && trackingPhase === 'to_vendor') || (trackingPhase === 'to_customer' && (deliveryOtp.length < 6 || !deliveryPhoto || (isCod && (!codMethod || !openBoxPhoto))))}
                    className={`w-full h-14 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg transition-all active:scale-[0.98] ${trackingPhase === 'to_vendor' ? 'bg-slate-900 text-white' : 'bg-[#EF4444] text-white shadow-red-100'} disabled:opacity-20`}
                >
                    {isUpdatingOrderStatus ? 'UPDATING...' : (trackingPhase === 'to_vendor' ? 'Finish Pickup Task' : 'Confirm Delivered')}
                </button>
            </div>
        )}

        {/* --- HIDDEN FILE INPUTS (CAMERA) --- */}
        <input type="file" accept="image/*" capture="environment" ref={pickupPhotoInputRef} onChange={(e) => handleImageSelect(e.target.files[0], setPickupPhoto)} className="hidden" />
        <input type="file" accept="image/*" capture="environment" ref={deliveryPhotoInputRef} onChange={(e) => handleImageSelect(e.target.files[0], setDeliveryPhoto)} className="hidden" />
        <input type="file" accept="image/*" capture="environment" ref={openBoxInputRef} onChange={(e) => handleImageSelect(e.target.files[0], setOpenBoxPhoto)} className="hidden" />

        {/* --- HIDDEN FILE INPUTS (GALLERY) --- */}
        <input type="file" accept="image/*" ref={pickupGalleryRef} onChange={(e) => handleImageSelect(e.target.files[0], setPickupPhoto)} className="hidden" />
        <input type="file" accept="image/*" ref={deliveryGalleryRef} onChange={(e) => handleImageSelect(e.target.files[0], setDeliveryPhoto)} className="hidden" />
        <input type="file" accept="image/*" ref={openBoxGalleryRef} onChange={(e) => handleImageSelect(e.target.files[0], setOpenBoxPhoto)} className="hidden" />

      </div>
    </PageTransition>
  );
};

export default DeliveryOrderDetail;

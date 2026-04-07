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
  FiCreditCard,
  FiSend,
  FiX,
  FiMaximize,
  FiImage,
  FiPlus,
  FiZap
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
    resendDeliveryOtp,
    isLoadingOrder,
    isUpdatingOrderStatus,
    updateOrderStatus,
    markArrivedAtCustomer,
    submitTryAndBuy,
    setPaymentMethod,
    completeDeliveryFlow,
    deliveryBoy,
  } = useDeliveryAuthStore();
  
  const [order, setOrder] = useState(null);
  const [otpValue, setOtpValue] = useState('');
  const [deliveryPhoto, setDeliveryPhoto] = useState(null);
  const [openBoxPhoto, setOpenBoxPhoto] = useState(null);
  const [pickupPhoto, setPickupPhoto] = useState(null);
  const [hasArrived, setHasArrived] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState(new Set());
  const [paymentSelection, setPaymentSelection] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  const pickupInputRef = useRef(null);
  const pickupGalleryRef = useRef(null);
  const deliveryInputRef = useRef(null);
  const deliveryGalleryRef = useRef(null);
  const openBoxInputRef = useRef(null);
  const openBoxGalleryRef = useRef(null);
  
  const isReturn = order?.type === 'return';
  const isCod = order?.paymentMethod === 'cod' || order?.paymentMethod === 'cash';

  const getPhase = () => {
    if (!order) return null;
    const s = String(order.status || '').toLowerCase();
    const rawS = String(order.rawStatus || order.status || '').toLowerCase();
    
    // Pickup phase includes newly available, assigned, or accepted orders
    if (['pending', 'ready_for_pickup', 'assigned', 'accepted'].includes(s) || 
        ['ready_for_pickup', 'assigned', 'accepted'].includes(rawS)) return 'pickup';
        
    // Delivery phase includes anything picked up or out for delivery
    if (['picked-up', 'picked_up', 'out-for-delivery', 'out_for_delivery', 'shipped'].includes(s) ||
        ['picked_up', 'out_for_delivery'].includes(rawS)) return 'delivery';
        
    return null;
  };

  const currentPhase = getPhase();
  const liveLocation = useDeliveryTracking(deliveryBoy?.id, order ? [order] : []);

  // Check if this order is actually assigned to the current rider
  const isAssignedToMe = order && (
    (typeof order.deliveryBoyId === 'string' && order.deliveryBoyId === deliveryBoy?.id) ||
    (order.deliveryBoyId?._id === deliveryBoy?.id) ||
    (order.deliveryBoyId === deliveryBoy?._id)
  );

  const isAvailableTask = order && !order.deliveryBoyId && (order.rawStatus === 'ready_for_pickup' || order.status === 'pending');
  
  useEffect(() => {
    if (liveLocation) setCurrentLocation(liveLocation);
  }, [liveLocation]);
  
  const loadOrder = useCallback(async () => {
    try {
      const response = await fetchOrderById(id);
      setOrder(response || null);
      if (response?.arrivedAt || response?.deliveryFlow?.arrivedAt) {
        setHasArrived(true);
        const accepted = (response.deliveryFlow?.tryAndBuyItems || response.items || [])
          .filter(i => i.decision !== 'rejected')
          .map(i => i.productId || i._id);
        setSelectedItemIds(new Set(accepted));
        setPaymentSelection(response.paymentMethod);
      } else if (response?.items) {
        setSelectedItemIds(new Set(response.items.map(i => i.productId || i._id)));
      }
    } catch (err) {
      setOrder(null);
    }
  }, [id, fetchOrderById]);

  useEffect(() => {
    loadOrder();
    const handleUpdate = () => loadOrder();
    socketService.on('order_status_updated', handleUpdate);
    socketService.on('order_taken', (data) => {
      if (data.id === id || data.orderId === id) {
        toast.error('Mission taken by another partner');
        navigate('/delivery/dashboard');
      }
    });

    if (id) socketService.joinRoom(`order_${id}`);
    return () => {
       socketService.off('order_status_updated');
       socketService.off('order_taken');
    };
  }, [id, loadOrder, navigate]);

  const handleAcceptMission = async () => {
    try {
      // Use stable id from useParams
      const updated = await useDeliveryAuthStore.getState().acceptOrder(id);
      setOrder(updated);
      toast.success('MISSION ACCEPTED! GO TO PICKUP');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to accept mission');
      navigate('/delivery/dashboard');
    }
  };

  const handleUpdateStatus = async (status, msg, options = {}) => {
    try {
      // Use stable id from useParams
      const updated = await updateOrderStatus(id, status, options);
      setOrder(updated);
      toast.success(msg);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Update failed');
    }
  };

  const handleArrival = async () => {
    if (!id) return;
    try {
      // Use stable id from useParams
      const updated = await markArrivedAtCustomer(id);
      setOrder(updated);
      setHasArrived(true);
      toast.success('Arrival marked. OTP sent.');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to mark arrival');
    }
  };

  const handleOtpResend = async () => {
    if (isResending || !id) return;
    try {
      setIsResending(true);
      await resendDeliveryOtp(id);
      toast.success('OTP sent to customer');
    } catch {
      toast.error('Failed to resend OTP');
    } finally {
      setIsResending(false);
    }
  };

  const toggleItem = (pid) => {
    if (!order.isTryAndBuy) return;
    const next = new Set(selectedItemIds);
    if (next.has(pid)) {
      if (next.size <= 1) return toast.error('Min 1 item required');
      next.delete(pid);
    } else {
      next.add(pid);
    }
    setSelectedItemIds(next);
  };

  const handleItemConfirmation = async () => {
    try {
      const items = order.items.map(it => ({
        productId: it.productId || it._id,
        decision: selectedItemIds.has(it.productId || it._id) ? 'accepted' : 'rejected'
      }));
      // Use stable id from useParams
      const updated = await submitTryAndBuy(id, items);
      setOrder(updated);
      toast.success('Items selection confirmed');
    } catch {
      toast.error('Failed to confirm selection');
    }
  };

  const handlePaymentMethod = async (method) => {
    try {
      // Use stable id from useParams
      const res = await setPaymentMethod(id, method);
      setOrder(res.order || res);
      setPaymentSelection(method);
      if (method === 'qr') setShowQRModal(true);
      toast.success(`Method: ${method.toUpperCase()}`);
    } catch {
      toast.error('Failed to update payment');
    }
  };

  const calculatedTotal = order?.isTryAndBuy 
    ? order.items.reduce((sum, item) => selectedItemIds.has(item.productId || item._id) ? sum + (item.price * item.quantity) : sum, 0)
    : order?.total;

  const handleFinalize = async () => {
    if (!/^\d{6}$/.test(otpValue.trim())) return toast.error('Enter 6-digit OTP');
    if (isCod && !paymentSelection) return toast.error('Select payment method');
    if (!deliveryPhoto) return toast.error('Delivery photo required');
    if (isCod && !openBoxPhoto) return toast.error('Open box photo required');

    try {
      // Use stable id from useParams
      const updated = await completeDeliveryFlow(id, { 
        otp: otpValue.trim(), 
        openBoxPhoto, 
        deliveryProofPhoto: deliveryPhoto 
      });
      setOrder(updated);
      setShowSuccess(true);
    } catch(err) {
      toast.error(err?.response?.data?.message || 'Delivery failed');
    }
  };

  const handleImage = (file, setter) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setter(reader.result);
    reader.readAsDataURL(file);
  };

  if (isLoadingOrder || !isLoaded) {
    return <div className="min-h-screen flex items-center justify-center bg-white"><div className="w-8 h-8 border-3 border-slate-100 border-t-indigo-600 rounded-full animate-spin" /></div>;
  }

  if (!order) return <div className="p-8 text-center text-slate-500 text-sm">Order not found</div>;

  if (showSuccess || order.status === 'delivered') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center text-white mb-4 border-4 border-emerald-50">
          <FiCheckCircle size={32} />
        </motion.div>
        <h1 className="text-xl font-bold text-slate-800">Job Complete</h1>
        <p className="text-slate-500 text-[10px] mt-2 mb-8 max-w-[240px] leading-relaxed uppercase tracking-widest font-bold">Delivery recorded successfully. <br/> Records have been updated.</p>
        <button onClick={() => navigate('/delivery/dashboard')} className="w-full max-w-[200px] h-12 bg-slate-900 text-white rounded-2xl text-[11px] font-bold uppercase tracking-widest">Back to Home</button>
      </div>
    );
  }

  const getOrderTypeBadge = () => {
    if (order.isCheckAndBuy) return <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full text-[8.5px] font-black border border-indigo-100 uppercase tracking-tighter">Check & Buy</span>;
    if (order.isTryAndBuy) return <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full text-[8.5px] font-black border border-amber-100 uppercase tracking-tighter">Try & Buy</span>;
    return <span className="bg-slate-50 text-slate-700 px-2 py-0.5 rounded-full text-[8.5px] font-black border border-slate-100 uppercase tracking-tighter">Standard</span>;
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-slate-50 pb-32 relative">
        {/* HEADER - FLOATING ON TOP */}
        <header className="absolute top-0 left-0 right-0 z-50 px-3 py-3 flex items-center gap-3 bg-white/60 backdrop-blur-md border-b border-white/20">
          <button onClick={() => navigate(-1)} className="p-2 bg-white/80 shadow-sm rounded-lg shrink-0 border border-white/50"><FiArrowLeft size={18}/></button>
          <div className="flex-1 min-w-0">
            <h2 className="text-[11px] font-black text-slate-900 truncate leading-none mb-1">
               {/* Use id from params as final fallback, and hunt for names in all possible places */}
               #{String(order.orderId || order.id || id).slice(-8).toUpperCase()} • {currentPhase === 'pickup' ? (order.vendorItems?.[0]?.vendorId?.storeName || order.vendorName || 'Pickup Location') : (order.customer || order.shippingAddress?.name || order.guestInfo?.name || 'Customer')}
            </h2>
            <div className="flex items-center gap-1 overflow-hidden">
               {getOrderTypeBadge()}
               <span className="text-[7px] font-black text-slate-500 uppercase tracking-tighter">• {String(order.status).toUpperCase()}</span>
            </div>
          </div>
          <a href={`tel:${currentPhase === 'pickup' ? (order.vendorItems?.[0]?.vendorId?.phone || order.vendorPhone) : (order.phone || order.shippingAddress?.phone)}`} className="w-9 h-9 bg-indigo-600/90 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200/50 shrink-0"><FiPhone size={18}/></a>
        </header>

        <div className="max-w-md mx-auto">
          {/* HERO MAP SECTION - AT TRUE TOP */}
          {(!hasArrived && currentPhase) && (
             <div className="w-full h-[540px] bg-white relative">
                <TrackingMap 
                  deliveryLocation={currentLocation} 
                  vendorLocation={order.vendorLatitude ? { lat: Number(order.vendorLatitude), lng: Number(order.vendorLongitude) } : (order.vendorItems?.[0]?.vendorId?.shopLocation?.coordinates ? { lat: order.vendorItems[0].vendorId.shopLocation.coordinates[1], lng: order.vendorItems[0].vendorId.shopLocation.coordinates[0] } : null)} 
                  customerLocation={order.latitude ? { lat: Number(order.latitude), lng: Number(order.longitude) } : (order.dropoffLocation?.coordinates ? { lat: order.dropoffLocation.coordinates[1], lng: order.dropoffLocation.coordinates[0] } : null)} 
                  status={order.rawStatus || order.status} 
                  customerAddress={order.address || order.shippingAddress?.address}
                  vendorAddress={order.vendorAddress || order.vendorItems?.[0]?.vendorId?.shopAddress}
                  followMode={true} 
                  isLoaded={isLoaded}
                />
                <button 
                  onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${currentPhase === 'pickup' ? (order.vendorLatitude || order.vendorItems?.[0]?.vendorId?.shopLocation?.coordinates?.[1]) : (order.latitude || order.dropoffLocation?.coordinates?.[1])},${currentPhase === 'pickup' ? (order.vendorLongitude || order.vendorItems?.[0]?.vendorId?.shopLocation?.coordinates?.[0]) : (order.longitude || order.dropoffLocation?.coordinates?.[0])}`, '_blank')}
                  className="absolute bottom-6 right-4 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 font-black text-xs uppercase tracking-widest active:scale-95 transition-all z-10"
                >
                  <FiNavigation size={18}/> Navigation
                </button>
             </div>
          )}

          <div className="p-4 space-y-4">
            {/* ACTIONS SECTION */}
            {(!hasArrived && currentPhase === 'delivery') || (currentPhase === 'pickup' && !pickupPhoto) ? (
              <div className="space-y-3">
               {currentPhase === 'pickup' ? (
                  <div className="flex gap-2">
                    <div className="flex-1 flex flex-col gap-2">
                        <button onClick={() => pickupInputRef.current.click()} className="w-full h-12 bg-indigo-600 text-white rounded-2xl text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-indigo-50"><FiCamera size={16}/> TAKE PHOTO</button>
                        <button onClick={() => pickupGalleryRef.current.click()} className="w-full h-10 bg-slate-100 text-slate-600 rounded-xl text-[9px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 border border-slate-200"><FiImage size={14}/> GALLERY</button>
                    </div>
                    <input type="file" accept="image/*" capture="environment" ref={pickupInputRef} onChange={(e) => handleImage(e.target.files[0], setPickupPhoto)} className="hidden" />
                    <input type="file" accept="image/*" ref={pickupGalleryRef} onChange={(e) => handleImage(e.target.files[0], setPickupPhoto)} className="hidden" />
                  </div>
               ) : (
                  <button onClick={handleArrival} className="w-full h-12 bg-emerald-600 text-white rounded-2xl text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-50 active:scale-95 transition-transform">
                    <FiZap size={16} className="animate-pulse" /> GENERATE OTP (I HAVE ARRIVED)
                  </button>
               )}
            </div>
          ) : (
            <>
              {/* ADDRESS & DETAILS */}
              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                <div className="flex items-start justify-between gap-3 mb-4">
                   <div className="min-w-0">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">{currentPhase === 'pickup' ? 'PICKUP FROM' : 'DELIVER TO'}</p>
                      <h3 className="text-base font-bold text-slate-800 truncate">{currentPhase === 'pickup' ? order.vendorName : order.customer}</h3>
                      <div className="flex items-start gap-1.5 mt-2 text-slate-500">
                        <FiMapPin className="shrink-0 mt-0.5" size={12}/>
                        <p className="text-[11px] font-medium leading-relaxed">{currentPhase === 'pickup' ? order.vendorAddress : order.address}</p>
                      </div>
                   </div>
                   <div className="w-10 h-10 bg-slate-50 text-indigo-600 rounded-2xl flex items-center justify-center border border-slate-100 shrink-0">
                      {currentPhase === 'pickup' ? <FiPackage size={20}/> : <FiUser size={20}/>}
                   </div>
                </div>

                {/* ITEMS LIST */}
                <div className="border-t border-slate-50 pt-4 mt-1">
                   <div className="flex items-center justify-between mb-3">
                      <p className="text-[9px] font-bold text-slate-800 uppercase tracking-widest leading-none">MANIFEST ({order.items?.length})</p>
                      <p className="text-xs font-bold text-indigo-600">{formatPrice(order.isTryAndBuy && hasArrived ? calculatedTotal : order.total)}</p>
                   </div>
                   <div className="space-y-2">
                      {order.items?.map((item, idx) => {
                        const isPicked = selectedItemIds.has(item.productId || item._id);
                        const isTryMode = order.isTryAndBuy && hasArrived;
                        return (
                          <div 
                            key={idx} 
                            onClick={() => isTryMode && toggleItem(item.productId || item._id)}
                            className={`flex gap-3 p-2 rounded-xl border transition-all ${isTryMode ? (isPicked ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-transparent opacity-60') : 'bg-slate-50 border-transparent'}`}
                          >
                             <div className="w-10 h-10 bg-white rounded-lg overflow-hidden border border-slate-100 shrink-0">
                                {item.image ? <img src={item.image} className="w-full h-full object-cover" /> : <FiPackage className="text-slate-200 mt-2.5 mx-auto" size={16} />}
                             </div>
                             <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <p className="text-[11px] font-bold text-slate-800 truncate">{item.productName || item.name}</p>
                                <p className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase tracking-tighter">Qty: {item.quantity} • {formatPrice(item.price)}</p>
                             </div>
                             {isTryMode && (
                               <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 my-auto ${isPicked ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-200'}`}>
                                  {isPicked ? <FiCheckCircle size={12}/> : <div className="w-2.5 h-2.5 border border-slate-300 rounded-full" />}
                               </div>
                             )}
                          </div>
                        );
                      })}
                   </div>
                   {order.isTryAndBuy && hasArrived && !order.tryAndBuyCompleted && (
                     <button onClick={handleItemConfirmation} className="w-full mt-4 h-10 bg-slate-900 text-white font-bold rounded-2xl text-[10px] uppercase tracking-[0.1em]">Confirm Selection</button>
                   )}
                </div>
              </div>

              {/* ACTION & PROOF */}
              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-4">
                 <div>
                    <div className="flex items-center justify-between mb-3">
                       <p className="text-[9px] font-bold text-slate-800 uppercase tracking-widest">Verification Proof</p>
                       <span className="text-[8px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded leading-none uppercase">{currentPhase.toUpperCase()}</span>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                        <div className="relative aspect-[16/9] bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 flex items-center justify-center group shadow-inner">
                           {(currentPhase === 'pickup' ? pickupPhoto : deliveryPhoto) ? (
                              <>
                                <img src={currentPhase === 'pickup' ? pickupPhoto : deliveryPhoto} className="w-full h-full object-cover" />
                                <button onClick={() => currentPhase === 'pickup' ? setPickupPhoto(null) : setDeliveryPhoto(null)} className="absolute top-2 right-2 w-7 h-7 bg-black/70 text-white rounded-full flex items-center justify-center backdrop-blur-md shadow-lg text-sm leading-none">×</button>
                              </>
                           ) : (
                              <div className="flex flex-col items-center gap-3">
                                 <button onClick={() => deliveryInputRef.current.click()} className="flex flex-col items-center gap-1.5 text-indigo-600 active:scale-95 transition-transform">
                                    <FiCamera size={28}/>
                                    <span className="text-[9px] font-black uppercase tracking-tight">CAMERA</span>
                                 </button>
                                 <div className="w-12 h-px bg-slate-200" />
                                 <button onClick={() => deliveryGalleryRef.current.click()} className="flex flex-col items-center gap-1.5 text-slate-400 active:scale-95 transition-transform">
                                    <FiImage size={24}/>
                                    <span className="text-[8px] font-black uppercase tracking-tight">GALLERY</span>
                                 </button>
                              </div>
                           )}
                           <input type="file" accept="image/*" capture="environment" ref={deliveryInputRef} onChange={(e) => handleImage(e.target.files[0], currentPhase === 'pickup' ? setPickupPhoto : setDeliveryPhoto)} className="hidden" />
                           <input type="file" accept="image/*" ref={deliveryGalleryRef} onChange={(e) => handleImage(e.target.files[0], currentPhase === 'pickup' ? setPickupPhoto : setDeliveryPhoto)} className="hidden" />
                        </div>

                        {currentPhase === 'delivery' && (
                           <div className="space-y-3 pt-3 border-t border-slate-50">
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter italic opacity-60">Optional: Item Inspection Photo</p>
                              <div className="relative aspect-[16/9] bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 flex items-center justify-center group shadow-inner">
                                 {openBoxPhoto ? (
                                    <>
                                      <img src={openBoxPhoto} className="w-full h-full object-cover" />
                                      <button onClick={() => setOpenBoxPhoto(null)} className="absolute top-2 right-2 w-7 h-7 bg-black/70 text-white rounded-full flex items-center justify-center backdrop-blur-md shadow-lg text-sm leading-none">×</button>
                                    </>
                                 ) : (
                                    <div className="flex items-center gap-8">
                                        <button onClick={() => openBoxInputRef.current.click()} className="flex flex-col items-center gap-1.5 text-indigo-600 active:scale-95 transition-transform">
                                            <FiCamera size={26}/>
                                            <span className="text-[8px] font-black uppercase tracking-tight leading-none">CAMERA</span>
                                        </button>
                                        <button onClick={() => openBoxGalleryRef.current.click()} className="flex flex-col items-center gap-1.5 text-slate-400 active:scale-95 transition-transform">
                                            <FiImage size={24}/>
                                            <span className="text-[8px] font-black uppercase tracking-tight leading-none">GALLERY</span>
                                        </button>
                                    </div>
                                 )}
                                 <input type="file" accept="image/*" capture="environment" ref={openBoxInputRef} onChange={(e) => handleImage(e.target.files[0], setOpenBoxPhoto)} className="hidden" />
                                 <input type="file" accept="image/*" ref={openBoxGalleryRef} onChange={(e) => handleImage(e.target.files[0], setOpenBoxPhoto)} className="hidden" />
                              </div>
                           </div>
                        )}
                    </div>
                 </div>

                 {/* OTP AREA */}
                 {currentPhase === 'delivery' && (
                   <div className="pt-4 border-t border-slate-100/50 text-center">
                      <p className="text-[9px] font-bold text-slate-800 uppercase tracking-[0.2em] mb-4">Security Terminal</p>
                      
                      <div className="max-w-[210px] mx-auto space-y-3">
                        <div className="relative group">
                            <input 
                            type="tel" maxLength={6} value={otpValue}
                            onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ''))}
                            placeholder="Enter 6-digit OTP"
                            className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xl font-black tracking-[0.2em] text-slate-800 placeholder:text-slate-300 placeholder:text-[10px] placeholder:tracking-normal outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner"
                            />
                            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none opacity-20">
                                <FiShield size={18}/>
                            </div>
                        </div>
                        <button 
                          onClick={handleOtpResend} 
                          disabled={isResending}
                          className="w-full flex items-center justify-center gap-2 py-2.5 text-[9px] font-bold text-indigo-600 bg-indigo-50/50 rounded-xl active:bg-indigo-50 transition-colors uppercase tracking-[0.1em] shadow-sm active:scale-95"
                        >
                           {isResending ? 'GENERATING NEW OTP...' : <><FiSend size={12}/> RE-GENERATE & RESEND OTP</>}
                        </button>
                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tight leading-none px-2 mt-2 opacity-60">OTP is sent only during active arrival session.</p>
                      </div>

                      {/* PAYMENT OPTIONS */}
                      {isCod && (
                        <div className="mt-6 pt-5 border-t border-slate-50 text-left">
                           <div className="flex items-center justify-between mb-4">
                              <div className="min-w-0">
                                 <p className="text-[9px] font-bold text-slate-400 uppercase leading-none mb-1 tracking-tighter">Amount Due</p>
                                 <p className="text-xl font-black text-slate-900 leading-none">{formatPrice(calculatedTotal)}</p>
                              </div>
                              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                                 <FiCreditCard size={18} className="text-indigo-600"/>
                              </div>
                           </div>
                           <div className="grid grid-cols-2 gap-2">
                              <button 
                                onClick={()=>handlePaymentMethod('cash')} 
                                disabled={isUpdatingOrderStatus}
                                className={`h-11 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all active:scale-95 ${paymentSelection==='cash' ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-500 border-slate-100'}`}
                              >
                                {isUpdatingOrderStatus && paymentSelection==='cash' ? 'SELECTING...' : 'CASH'}
                              </button>
                              <button 
                                onClick={()=>handlePaymentMethod('qr')} 
                                disabled={isUpdatingOrderStatus}
                                className={`h-11 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all active:scale-95 ${paymentSelection==='qr' ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-100' : 'bg-white text-slate-500 border-slate-100'}`}
                              >
                                {isUpdatingOrderStatus && paymentSelection==='qr' ? 'GENERATING...' : 'UPI QR'}
                              </button>
                           </div>
                        </div>
                      )}
                   </div>
                 )}
              </div>
            </>
          )}
        </div>
      </div>

        {/* BOTTOM ACTION BUTTON */}
        <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-slate-100 z-50">
          {isAvailableTask ? (
            <button 
                onClick={handleAcceptMission}
                disabled={isUpdatingOrderStatus}
                className="w-full h-12 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-200 active:scale-95 transition-all"
            >
                {isUpdatingOrderStatus ? 'ACCEPTING MISSION...' : 'ACCEPT TASK TO START'}
            </button>
          ) : isAssignedToMe ? (
            ((currentPhase === 'pickup' && pickupPhoto) || (currentPhase === 'delivery' && hasArrived)) ? (
              <button 
                  onClick={currentPhase === 'pickup' ? () => handleUpdateStatus('picked_up', 'Items picked up!', { pickupPhoto }) : handleFinalize}
                  disabled={isUpdatingOrderStatus || (currentPhase === 'delivery' && (otpValue.length < 6 || !deliveryPhoto || (isCod && (!paymentSelection))))}
                  className="w-full h-12 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-200 disabled:opacity-20 active:scale-95 transition-all"
              >
                  {isUpdatingOrderStatus ? 'WAITING...' : (currentPhase === 'pickup' ? 'MARk AS PICKED UP' : 'DELIVERED SUCCESSFULLY')}
              </button>
            ) : (
              <div className="text-center py-2">
                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Mission Active</p>
                 <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight">Complete {currentPhase === 'pickup' ? 'Pickup Verification' : 'Arrival & OTP'} to Finish</p>
              </div>
            )
          ) : (
            <div className="text-center py-2 px-4 bg-rose-50 rounded-xl border border-rose-100">
               <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-0.5">UNAUTHORIZED ACCESS</p>
               <p className="text-[8px] font-bold text-rose-400 uppercase leading-none">This task is assigned to another partner.</p>
            </div>
          )}
        </div>

        {/* QR MODAL */}
        <AnimatePresence>
          {showQRModal && (
            <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
            >
               <motion.div 
                  initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                  className="bg-white w-full max-w-xs rounded-[2.5rem] p-6 shadow-2xl relative border-b-[10px] border-indigo-600 overflow-hidden"
               >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 opacity-50" />
                  <button onClick={() => setShowQRModal(false)} className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 transition-colors bg-slate-50 rounded-full z-10"><FiX size={18}/></button>
                  
                  <div className="text-center relative">
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-1">UPI Payment Gateway</p>
                    <h4 className="text-sm font-black text-slate-800 mb-6 font-mono border-b border-slate-100 pb-4">{formatPrice(calculatedTotal)}</h4>
                    
                    <div className="aspect-square bg-white border-2 border-slate-50 rounded-[1.5rem] flex items-center justify-center p-5 mb-6 shadow-xl relative group">
                       <img src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi://pay?pa=closh@upi&pn=Closh&am=${calculatedTotal}&cu=INR`} alt="Payment QR" className="w-full h-full" />
                       <div className="absolute inset-0 border-4 border-white rounded-[1.5rem]" />
                    </div>

                    <p className="text-[9px] font-bold text-slate-400 px-2 leading-tight uppercase tracking-tighter mb-8">Scan QR with any UPI app.</p>
                    <button onClick={() => setShowQRModal(false)} className="w-full h-12 bg-indigo-600 text-white rounded-2xl text-[11px] font-black shadow-lg shadow-indigo-100 uppercase tracking-[0.1em] flex items-center justify-center gap-2">
                       <FiCheckCircle size={16}/> PAYMENT CONFIRMED
                    </button>
                  </div>
               </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </PageTransition>
  );
};

export default DeliveryOrderDetail;

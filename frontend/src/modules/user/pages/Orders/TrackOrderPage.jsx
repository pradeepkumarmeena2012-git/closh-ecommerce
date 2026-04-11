import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CheckCircle, Package, Truck, MapPin, Clock, Shield, Phone, ChevronUp, ChevronDown, Store, Navigation, RefreshCw } from 'lucide-react';
import { useOrderStore } from '../../../../shared/store/orderStore';
import socketService from '../../../../shared/utils/socket';
import TrackingMap from '../../../../shared/components/TrackingMap';

const TrackOrderPage = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const { fetchOrderById, fetchPublicTrackingOrder, resendDeliveryOtp } = useOrderStore();
    const [order, setOrder] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [riderLiveLocation, setRiderLiveLocation] = useState(null);
    const [riderArrived, setRiderArrived] = useState(false);
    const [cardExpanded, setCardExpanded] = useState(false);
    const [isResendingOtp, setIsResendingOtp] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const cooldownRef = useRef(null);

    const startCooldown = useCallback((seconds = 60) => {
        setResendCooldown(seconds);
        if (cooldownRef.current) clearInterval(cooldownRef.current);
        cooldownRef.current = setInterval(() => {
            setResendCooldown(prev => {
                if (prev <= 1) {
                    clearInterval(cooldownRef.current);
                    cooldownRef.current = null;
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, []);

    const handleResendDeliveryOtp = async () => {
        if (isResendingOtp || resendCooldown > 0 || !order) return;
        try {
            setIsResendingOtp(true);
            const result = await resendDeliveryOtp(order.orderId || order.id);
            if (result?.deliveryOtpDebug) {
                setOrder(prev => ({ ...prev, deliveryOtpDebug: result.deliveryOtpDebug }));
            }
            startCooldown(60);
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || 'Failed to resend OTP';
            console.error('[Resend OTP]', msg);
        } finally {
            setIsResendingOtp(false);
        }
    };

    const loadOrder = async () => {
        if (!orderId) return;
        try {
            let foundOrder = await fetchOrderById(orderId).catch(() => null);
            if (!foundOrder) {
                foundOrder = await fetchPublicTrackingOrder(orderId).catch(() => null);
            }

            if (foundOrder) {
                setOrder(foundOrder);
            }
        } catch (error) {
            console.error("Failed to load order for tracking:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadOrder();

        // Socket.io for real-time tracking
        socketService.connect();
        if (orderId) {
            socketService.joinRoom(`order_${orderId}`);
        }

        const handleLocationUpdate = (data) => {
            console.log('📍 Live Rider Update:', data);
            setRiderLiveLocation({ lat: data.lat, lng: data.lng });
        };

        const handleStatusUpdate = (data) => {
            console.log('📦 Order Status updated:', data);
            loadOrder();
        };

        const handleRiderArrived = () => {
            setRiderArrived(true);
            loadOrder();
        };

        socketService.on('location_updated', handleLocationUpdate);
        socketService.on('order_status_updated', handleStatusUpdate);
        socketService.on('rider_assigned', handleStatusUpdate);
        socketService.on('rider_arrived', handleRiderArrived);

        const handleOtpSent = (data) => {
            console.log('🔐 OTP Sent/Updated:', data);
            loadOrder();
        };
        socketService.on('delivery_otp_sent', handleOtpSent);
        socketService.on('delivery_otp_resent', handleOtpSent);

        // Fallback polling (every 30 seconds)
        const interval = setInterval(loadOrder, 30000);

        return () => {
            clearInterval(interval);
            if (cooldownRef.current) clearInterval(cooldownRef.current);
            socketService.off('location_updated', handleLocationUpdate);
            socketService.off('order_status_updated', handleStatusUpdate);
            socketService.off('rider_arrived', handleRiderArrived);
            socketService.off('delivery_otp_resent', handleOtpResent);
        };
    }, [orderId]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white font-sans">
                <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
                <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Locating Order...</p>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white p-6 text-center">
                <div>
                  <h2 className="text-xl font-black text-gray-900 mb-2">Order Not Found</h2>
                  <p className="text-sm text-gray-500 mb-6">We couldn't find the order details for tracking.</p>
                  <button onClick={() => navigate('/home')} className="bg-black text-white px-8 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest">Go Home</button>
                </div>
            </div>
        );
    }

    const status = order?.status?.toLowerCase() || 'pending';
    const trackingNumber = order.trackingNumber || `TRK${String(order.orderId || orderId).slice(-8).toUpperCase()}`;
    const address = order.shippingAddress;

    // Determine current step
    let currentStep = 1;
    if (['processing', 'ready_for_pickup', 'accepted'].includes(status)) currentStep = 2;
    if (['shipped', 'out_for_delivery', 'picked_up', 'assigned'].includes(status)) currentStep = 3;
    if (status === 'delivered') currentStep = 4;
    if (status === 'cancelled') currentStep = 0;

    const steps = [
        { label: 'Order Placed', date: order.createdAt, icon: CheckCircle },
        { label: 'Processing', date: currentStep >= 2 ? 'Completed' : 'Pending', icon: Package },
        { label: 'Out for Delivery', date: currentStep >= 3 ? 'In Transit' : 'Pending', icon: Truck },
        { label: 'Delivered', date: status === 'delivered' ? order.deliveredAt : 'Pending', icon: MapPin },
    ];

    const getStatusColor = () => {
        if (status === 'delivered') return 'bg-emerald-100 text-emerald-800';
        if (status === 'cancelled') return 'bg-red-100 text-red-800';
        if (['shipped', 'out_for_delivery', 'picked_up', 'assigned'].includes(status)) return 'bg-blue-100 text-blue-800';
        return 'bg-amber-100 text-amber-800';
    };

    // Locations for map
    const initialRiderLoc = order?.deliveryBoyId?.currentLocation?.coordinates;
    const deliveryLocation = riderLiveLocation || (Array.isArray(initialRiderLoc) && initialRiderLoc.length === 2 ? { lat: initialRiderLoc[1], lng: initialRiderLoc[0] } : null);
    
    // Convert GeoJSON [lng, lat] to {lat, lng}
    const dropLoc = order?.dropoffLocation?.coordinates;
    const customerLocation = Array.isArray(dropLoc) && dropLoc.length === 2 && dropLoc[0] !== 0 ? { lat: dropLoc[1], lng: dropLoc[0] } : null;

    const vLoc = order?.pickupLocation?.coordinates;
    const vendorLocation = Array.isArray(vLoc) && vLoc.length === 2 && vLoc[0] !== 0 ? { lat: vLoc[1], lng: vLoc[0] } : null;

    const formatDate = (date) => {
        if (!date) return 'Pending';
        if (date === 'Completed' || date === 'In Transit') return date;
        const d = new Date(date);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const hasRider = !!(order.deliveryBoyId || order.assignedDeliveryBoy);
    const riderName = order.deliveryBoyId?.name || order.assignedDeliveryBoy?.name;
    const riderPhone = order.deliveryBoyId?.phone || order.assignedDeliveryBoy?.phone;
    const isActiveDelivery = ['picked_up', 'out_for_delivery', 'assigned'].includes(status);
    const showOtp = (riderArrived || status === 'out_for_delivery' || status === 'picked_up') && order.deliveryOtpDebug;

    return (
        <div className="h-screen w-full bg-[#F8FAFC] flex flex-col relative overflow-hidden font-sans">
            
            {/* FULL-SCREEN LIVE MAP */}
            <div className="absolute inset-0 z-0">
                <TrackingMap 
                    deliveryLocation={deliveryLocation}
                    customerLocation={customerLocation}
                    vendorLocation={vendorLocation}
                    followMode={true}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50 pointer-events-none" />
            </div>

            {/* TOP BAR */}
            <div className="absolute top-0 inset-x-0 px-4 pt-[env(safe-area-inset-top,12px)] pb-3 z-50 flex items-center justify-between pointer-events-none">
                <button 
                  onClick={() => navigate(-1)} 
                  className="w-11 h-11 rounded-2xl bg-white/90 backdrop-blur-xl shadow-lg flex items-center justify-center text-slate-800 pointer-events-auto active:scale-95 transition-transform"
                >
                    <ArrowLeft size={18} />
                </button>
                
                <div className="flex items-center gap-2 pointer-events-auto">
                    {/* Live indicator when tracking */}
                    {isActiveDelivery && deliveryLocation && (
                        <div className="flex items-center gap-1.5 bg-red-500/90 backdrop-blur text-white px-3 py-1.5 rounded-full shadow-lg">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                            <span className="text-[9px] font-black uppercase tracking-widest">Live</span>
                        </div>
                    )}
                    <div className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg backdrop-blur-xl bg-white/90 ${getStatusColor()}`}>
                        {status.replace(/_/g, ' ')}
                    </div>
                </div>
            </div>

            {/* VENDOR LOCATION INFO (shown when no rider yet) */}
            {!hasRider && vendorLocation && (
                <motion.div 
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="absolute top-20 left-4 right-4 z-30"
                >
                    <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-3 shadow-lg flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500 shrink-0">
                            <Store size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Vendor Location</p>
                            <p className="text-xs font-bold text-gray-800 truncate">{order.vendorItems?.[0]?.vendorName || 'Store'}</p>
                        </div>
                        <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                            <Navigation size={14} className="text-orange-600" />
                        </div>
                    </div>
                </motion.div>
            )}

            {/* BOTTOM SHEET */}
            <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col pointer-events-none">
                
                {/* OTP Banner (above bottom card) */}
                <AnimatePresence>
                    {showOtp && (
                        <motion.div
                            initial={{ y: 30, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 30, opacity: 0 }}
                            className="mx-4 mb-3 pointer-events-auto"
                        >
                            <div className="bg-indigo-600 rounded-2xl px-4 py-3 text-white shadow-xl shadow-indigo-300/40 relative overflow-hidden">
                                <div className="absolute -top-8 -right-8 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                                        <Shield size={16} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[9px] font-bold text-indigo-200 uppercase tracking-widest">Delivery OTP</p>
                                        <p className="text-[10px] text-indigo-100">Share with rider to confirm</p>
                                    </div>
                                    <div className="bg-white rounded-xl px-3 py-1.5 shadow-md">
                                        <span className="text-xl font-black tracking-[0.15em] text-indigo-600">{order.deliveryOtpDebug}</span>
                                    </div>
                                </div>
                                {/* Resend OTP button */}
                                <button
                                    onClick={handleResendDeliveryOtp}
                                    disabled={isResendingOtp || resendCooldown > 0}
                                    className="mt-2.5 w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-white/15 hover:bg-white/25 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <RefreshCw size={12} className={isResendingOtp ? 'animate-spin' : ''} />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">
                                        {isResendingOtp ? 'Sending...' : resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : "Didn't receive? Resend OTP"}
                                    </span>
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Main Bottom Card */}
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="bg-white rounded-t-[28px] sm:rounded-t-[36px] shadow-2xl shadow-slate-900/20 border-t border-slate-100 pointer-events-auto"
                >
                    {/* Drag Handle */}
                    <button
                        onClick={() => setCardExpanded(!cardExpanded)}
                        className="w-full flex flex-col items-center pt-3 pb-2"
                    >
                        <div className="w-10 h-1 bg-slate-200 rounded-full mb-1" />
                        {cardExpanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronUp size={16} className="text-slate-400" />}
                    </button>

                    <div className="px-4 sm:px-6 pb-[env(safe-area-inset-bottom,16px)]">
                        {/* Rider Info */}
                        {hasRider ? (
                            <div className="flex items-center gap-3 mb-4">
                                <div className="relative shrink-0">
                                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100 overflow-hidden">
                                        {order.deliveryBoyId?.avatar ? (
                                            <img src={order.deliveryBoyId.avatar} className="w-full h-full object-cover" alt="Rider" />
                                        ) : <Truck size={24} />}
                                    </div>
                                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Your Delivery Partner</p>
                                    <h3 className="text-base font-black text-slate-900 leading-tight truncate">{riderName}</h3>
                                    {riderArrived && <span className="text-[9px] font-black text-emerald-500 uppercase">At your location!</span>}
                                </div>
                                <button 
                                    onClick={() => window.open(`tel:${riderPhone}`, '_self')}
                                    className="w-11 h-11 rounded-full bg-emerald-500 shadow-lg shadow-emerald-200 flex items-center justify-center text-white active:scale-90 transition-transform shrink-0"
                                >
                                    <Phone size={18} />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 shrink-0">
                                    <Clock size={22} className="animate-[spin_3s_linear_infinite]" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-black text-sm text-slate-900">Finding Delivery Partner</h3>
                                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">Looking for the nearest rider...</p>
                                </div>
                            </div>
                        )}

                        {/* Compact Progress Steps */}
                        <div className="flex items-center gap-1 sm:gap-2 mb-4 overflow-x-auto scrollbar-hide py-1">
                            {steps.map((step, index) => {
                                const isCompleted = index < currentStep;
                                const isCurrent = index === currentStep;
                                const Icon = step.icon;
                                return (
                                    <React.Fragment key={index}>
                                        <div className="flex flex-col items-center shrink-0">
                                            <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all duration-500 ${
                                                isCompleted ? 'bg-emerald-500 text-white' 
                                                : isCurrent ? 'bg-indigo-600 text-white scale-105 shadow-md shadow-indigo-200' 
                                                : 'bg-slate-100 text-slate-300'}`}>
                                                <Icon size={14} />
                                            </div>
                                            <p className={`text-[8px] sm:text-[9px] font-black uppercase mt-1.5 tracking-tighter text-center leading-tight ${
                                                isCompleted ? 'text-emerald-500' : isCurrent ? 'text-indigo-600' : 'text-slate-300'}`}>
                                                {step.label}
                                            </p>
                                        </div>
                                        {index < steps.length - 1 && (
                                            <div className={`flex-1 h-[2px] rounded-full min-w-[16px] mt-[-16px] ${isCompleted ? 'bg-emerald-400' : 'bg-slate-100'}`} />
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </div>

                        {/* Expanded Details */}
                        <AnimatePresence>
                            {cardExpanded && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                >
                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Destination</p>
                                            <p className="text-xs font-bold text-slate-800 truncate">{address?.city || address?.address || 'Your City'}</p>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center justify-between">
                                            <div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Items</p>
                                                <p className="text-xs font-bold text-slate-800">{order.items?.length || 0} Products</p>
                                            </div>
                                            <Package size={18} className="text-indigo-300" />
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => navigate(`/orders/${order.orderId || orderId}`)}
                                        className="w-full py-3.5 bg-[#0F172A] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-[0.98] transition-all mb-2"
                                    >
                                        View Full Order Details
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default TrackOrderPage;

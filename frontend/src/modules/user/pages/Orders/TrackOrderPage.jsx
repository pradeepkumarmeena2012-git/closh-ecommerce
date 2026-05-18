import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { ArrowLeft, CheckCircle, Package, Truck, MapPin, Clock, Shield, Phone, ChevronUp, ChevronDown, Store, Navigation, RefreshCw } from 'lucide-react';
import { useOrderStore } from '../../../../shared/store/orderStore';
import socketService from '../../../../shared/utils/socket';
import TrackingMap from '../../../../shared/components/TrackingMap';

const TrackOrderPage = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const dragControls = useDragControls();
    const { fetchOrderById, fetchPublicTrackingOrder, resendDeliveryOtp } = useOrderStore();
    const [order, setOrder] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [riderLiveLocation, setRiderLiveLocation] = useState(null);
    const [riderArrived, setRiderArrived] = useState(false);
    const [cardExpanded, setCardExpanded] = useState(false);
    const cooldownRef = useRef(null);



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
            socketService.off('rider_assigned', handleStatusUpdate);
            socketService.off('rider_arrived', handleRiderArrived);
            socketService.off('delivery_otp_sent', handleOtpSent);
            socketService.off('delivery_otp_resent', handleOtpSent);
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

    const isCancelled = status === 'cancelled' || status === 'canceled';

    const getStepState = (stepIndex) => {
        if (isCancelled) return 'pending';
        const statusRank = {
            'pending': 0,
            'accepted': 1,
            'searching': 1,
            'assigned': 1,
            'ready_for_pickup': 2,
            'picked_up': 3,
            'out_for_delivery': 4,
            'delivered': 5
        };
        const currentRank = statusRank[status] ?? 0;
        if (currentRank >= stepIndex) return 'completed';
        if (currentRank === stepIndex - 1) return 'active';
        return 'pending';
    };

    const steps = [
        {
            label: 'Confirm',
            subtitle: 'Vendor confirmed',
            icon: CheckCircle,
            date: order.vendorAcceptedAt || order.createdAt,
            state: getStepState(1)
        },
        {
            label: 'Ready for Pickup',
            subtitle: 'Prepared at shop',
            icon: Package,
            date: order.readyAt,
            state: getStepState(2)
        },
        {
            label: 'Picked Up',
            subtitle: 'Collected by rider',
            icon: Store,
            date: order.pickedUpAt,
            state: getStepState(3)
        },
        {
            label: 'Out for Delivery',
            subtitle: 'On the way to you',
            icon: Truck,
            date: (status === 'out_for_delivery' || status === 'delivered') ? (order.updatedAt || order.pickedUpAt) : null,
            state: getStepState(4)
        },
        {
            label: 'Delivered',
            subtitle: 'Arrived safely',
            icon: MapPin,
            date: order.deliveredAt,
            state: getStepState(5)
        }
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
        if (!date || date === 'Pending') return 'Pending';
        if (date === 'Completed' || date === 'In Transit') return date;
        const d = new Date(date);
        if (isNaN(d.getTime())) return date; // Return as is if not a valid date
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const hasRider = !!(order.deliveryBoyId || order.assignedDeliveryBoy);
    const riderName = order.deliveryBoyId?.name || order.assignedDeliveryBoy?.name;
    const riderPhone = order.deliveryBoyId?.phone || order.assignedDeliveryBoy?.phone;
    const isActiveDelivery = ['picked_up', 'out_for_delivery', 'assigned'].includes(status);
    const showOtp = (riderArrived || status === 'out_for_delivery' || status === 'picked_up') && order.deliveryOtpDebug;


    return (
        <div className="h-screen w-full bg-[#F8FAFC] flex flex-col relative overflow-hidden font-sans select-none">
            
            {/* FULL-SCREEN LIVE MAP (Background) */}
            <div className="absolute inset-0 z-0">
                <TrackingMap 
                    deliveryLocation={deliveryLocation}
                    customerLocation={customerLocation}
                    vendorLocation={vendorLocation}
                    followMode={true}
                    status={status}
                />
            </div>

            {/* FLOATING TOP HEADER */}
            <div className="absolute top-0 inset-x-0 p-4 z-50 pointer-events-none">
                <div className="bg-white/90 backdrop-blur-xl px-5 py-4 rounded-3xl shadow-xl shadow-slate-900/5 border border-white/50 flex items-center justify-between pointer-events-auto">
                    <button 
                        onClick={() => navigate(-1)} 
                        className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 active:scale-95 transition-transform"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="text-center">
                        <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Tracking Order</p>
                        <h2 className="text-sm md:text-base font-black text-slate-900">#{order.orderId || orderId}</h2>
                    </div>
                    <div className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm ${status === 'delivered' ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white'}`}>
                        {status === 'assigned' ? 'assigned to pickup' : status.replace(/_/g, ' ')}
                    </div>
                </div>
            </div>

            {/* DRAGGABLE BOTTOM SHEET */}
            <motion.div
                drag="y"
                dragControls={dragControls}
                dragListener={false}
                dragConstraints={{ top: 0, bottom: 550 }}
                dragElastic={0.05}
                initial={{ y: 450 }}
                animate={{ y: 450 }}
                className="absolute inset-0 z-30 bg-white rounded-t-[32px] shadow-[0_-15px_40px_rgba(0,0,0,0.1)] border-t border-slate-100 flex flex-col overflow-hidden"
                style={{ top: '80px' }}
            >
                {/* Drag Handle Area */}
                <div 
                    onPointerDown={(e) => dragControls.start(e)}
                    className="w-full flex flex-col items-center py-5 shrink-0 cursor-grab active:cursor-grabbing touch-none"
                >
                    <div className="w-12 h-1.5 bg-slate-200 rounded-full mb-2" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Swipe up for details</p>
                </div>

                <div className="flex-1 overflow-y-auto px-6 pb-12 scrollbar-hide">
                    {/* Live Status Banner */}
                    {isActiveDelivery && deliveryLocation && (
                        <div className="mb-6 flex items-center justify-between bg-red-50 p-4 rounded-2xl border border-red-100 shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center text-white animate-pulse shadow-lg shadow-red-100">
                                    <Navigation size={20} />
                                </div>
                                <div>
                                    <h4 className="text-[12px] font-bold text-red-900 uppercase tracking-tight">Rider is Moving</h4>
                                    <p className="text-[11px] text-red-700 font-medium leading-tight">Heading to your location</p>
                                </div>
                            </div>
                            <div className="bg-white px-3 py-1 rounded-full shadow-sm">
                                <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest animate-pulse">Live</span>
                            </div>
                        </div>
                    )}

                    {/* OTP Section */}
                    {showOtp && (
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="mb-6 bg-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl" />
                            <div className="flex items-center justify-between relative z-10">
                                <div>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Delivery OTP</p>
                                    <p className="text-[12px] text-white leading-tight">Share this with your rider</p>
                                </div>
                                <div className="bg-white rounded-xl px-5 py-3 shadow-inner">
                                    <span className="text-2xl font-black tracking-[0.2em] text-slate-900">{order.deliveryOtpDebug}</span>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Rider Card */}
                    <div className="mb-8">
                        {hasRider ? (
                            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
                                <div className="relative shrink-0">
                                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-indigo-500 border border-slate-100 overflow-hidden">
                                        {order.deliveryBoyId?.avatar ? (
                                            <img src={order.deliveryBoyId.avatar} className="w-full h-full object-cover" alt="Rider" />
                                        ) : <Truck size={32} />}
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-4 border-white shadow-sm" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">Your Rider</p>
                                    <h3 className="text-base font-bold text-slate-900 leading-tight truncate">{riderName}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="flex items-center text-amber-500 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">
                                            <span className="text-[11px] font-bold">4.9</span>
                                            <svg className="w-3 h-3 fill-current ml-0.5" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                                        </div>
                                        <span className="text-[11px] text-slate-400 font-bold uppercase tracking-tight">Verified</span>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => window.open(`tel:${riderPhone}`, '_self')}
                                    className="w-12 h-12 rounded-2xl bg-emerald-500 shadow-lg shadow-emerald-50 flex items-center justify-center text-white active:scale-90 transition-transform shrink-0"
                                >
                                    <Phone size={20} />
                                </button>
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl p-6 border border-amber-100 shadow-sm flex items-center gap-5">
                                <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 shrink-0">
                                    <RefreshCw size={32} className="animate-spin-slow" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm text-slate-900 uppercase tracking-tight">Assigning Partner</h3>
                                    <p className="text-[12px] text-slate-500 font-medium mt-1 leading-tight">Finding the best delivery partner for your order...</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Journey Timeline */}
                    <div className="mb-10">
                        <div className="flex items-center justify-between mb-6">
                            <h4 className="text-[12px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Package size={16} />
                                Order Journey
                            </h4>
                        </div>
                        
                        <div className="space-y-8 px-2">
                            {steps.map((step, idx) => {
                                const Icon = step.icon;
                                const isCompleted = step.state === 'completed';
                                const isActive = step.state === 'active';
                                return (
                                    <div key={idx} className="flex gap-5 relative">
                                        {idx !== steps.length - 1 && (
                                            <div className={`absolute left-[21px] top-12 w-[2px] h-10 ${isCompleted ? 'bg-emerald-500' : 'bg-slate-100'}`} />
                                        )}
                                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 z-10 transition-all duration-300 relative ${
                                            isCompleted ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/10' 
                                            : isActive ? 'bg-slate-900 text-white shadow-lg' 
                                            : 'bg-slate-50 text-slate-300 border border-slate-100'}`}>
                                            <Icon size={20} />
                                            {isActive && (
                                                <div className="absolute inset-0 rounded-xl border border-slate-900 animate-ping opacity-60" />
                                            )}
                                        </div>
                                        <div className="flex-1 pt-1.5">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h4 className={`text-[13px] font-black uppercase tracking-wider ${
                                                        isActive ? 'text-slate-900' : isCompleted ? 'text-slate-700' : 'text-slate-400'
                                                    }`}>
                                                        {step.label}
                                                    </h4>
                                                    <p className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">{step.subtitle}</p>
                                                </div>
                                                {step.date && (
                                                    <span className={`text-[10px] font-bold ${isActive ? 'text-slate-900' : 'text-slate-400'} bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-md`}>
                                                        {formatDate(step.date)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>


                </div>
            </motion.div>
            
            <style dangerouslySetInnerHTML={{ __html: `
                .animate-spin-slow {
                    animation: spin 4s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                .touch-none {
                    touch-action: none;
                }
            `}} />
        </div>
    );


};

export default TrackOrderPage;

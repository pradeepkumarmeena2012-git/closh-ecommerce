import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMapPin, FiPackage, FiClock, FiX, FiNavigation, FiZap, FiTarget } from 'react-icons/fi';
import { formatPrice } from '../../../shared/utils/helpers';
import SwipeToAccept from './SwipeToAccept';
import { createPortal } from 'react-dom';

const NewOrderModal = ({ order, isOpen, onClose, onAccept, isAccepting }) => {
    const buzzerRef = useRef(null);

    // Play buzzer sound when modal opens, stop when it closes
    useEffect(() => {
        if (isOpen && order) {
            try {
                const audio = new Audio('/sounds/mgs_codec.mp3');
                audio.loop = true;
                audio.play().catch(e => console.warn('Buzzer playback blocked:', e.message));
                buzzerRef.current = audio;
            } catch (e) {
                console.warn('Buzzer init failed:', e);
            }
        }
        return () => {
            if (buzzerRef.current) {
                try {
                    buzzerRef.current.pause();
                    buzzerRef.current.currentTime = 0;
                } catch (e) {}
                buzzerRef.current = null;
            }
        };
    }, [isOpen, order]);

    // Safety guard
    if (!order && isOpen) return null;

    const isReturn = !!order?.isReturn;
    
    const safeString = (val, fallback = '') => {
        if (typeof val === 'string') return val;
        if (val && typeof val === 'object') return val.address || val.name || JSON.stringify(val);
        return String(val || fallback);
    };

    // For standard: Pickup from Vendor, Deliver to Customer
    // For returns: Pickup from Customer, Deliver to Vendor
    const pickupTitle = isReturn ? 'Pickup From Customer' : 'Pickup From Vendor';
    const pickupNameRaw = isReturn ? (order?.customer) : (order?.vendorName);
    const pickupAddressRaw = isReturn ? (order?.address) : (order?.vendorAddress);
    
    const pickupName = safeString(pickupNameRaw, isReturn ? 'Customer' : 'Vendor');
    const pickupAddress = safeString(pickupAddressRaw, isReturn ? 'Customer Address' : 'Vendor Address');
    
    const deliverTitle = isReturn ? 'Deliver To Vendor' : 'Deliver To Customer';
    const deliverNameRaw = isReturn ? (order?.vendorName) : (order?.customer);
    const deliverAddressRaw = isReturn ? (order?.vendorAddress) : (order?.address);

    const deliverName = safeString(deliverNameRaw, isReturn ? 'Vendor' : 'Customer');
    const deliverAddress = safeString(deliverAddressRaw, 'Address unavailable');

    const themeColor = isReturn ? 'from-orange-600 to-orange-700' : 'from-green-600 to-green-700';
    const badgeColor = isReturn ? 'bg-orange-50 border-orange-100 text-orange-800' : 'bg-green-50 border-green-100 text-green-800';
    const accentColor = isReturn ? 'text-orange-600' : 'text-green-600';

    return createPortal(
        <AnimatePresence>
            {isOpen && order && (
                <div className="fixed inset-0 z-[9999] flex flex-col justify-end">
                    {/* Premium Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-md"
                        onClick={onClose}
                    />

                    {/* Bottom Sheet Modal Content */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}
                        className="relative bg-white rounded-t-[40px] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col z-[10000]"
                    >
                        {/* Drag Handle / Indicator */}
                        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-4 mb-2 shrink-0" />

                        {/* Header Area */}
                        <div className="px-8 pt-4 pb-6 border-b border-slate-50 relative flex-shrink-0">
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-6 w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"
                            >
                                <FiX size={20} />
                            </button>
                            <div className="flex items-center gap-4">
                                <div className={`w-14 h-14 ${isReturn ? 'bg-orange-500 shadow-orange-200' : 'bg-indigo-600 shadow-indigo-200'} rounded-2xl flex items-center justify-center text-white shadow-lg`}>
                                    <FiPackage size={28} />
                                </div>
                                <div>
                                    <p className={`${isReturn ? 'text-orange-500' : 'text-indigo-500'} text-[10px] font-black uppercase tracking-[0.2em]`}>Incoming {isReturn ? 'Return' : 'Request'}</p>
                                    <h2 className="text-xl font-black text-slate-900 tracking-tight">{isReturn ? `Ref: #${order.orderId || order.id.slice(-6)}` : `Order #${order.id.slice(-6)}`}</h2>
                                </div>
                            </div>
                        </div>

                        {/* Content Scroll Area */}
                        <div className="px-8 py-6 overflow-y-auto overflow-x-hidden">

                            {/* Key Stats: Earnings, Time, Distance */}
                            <div className="grid grid-cols-3 gap-3 mb-8">
                                {[
                                    { label: 'Earnings', value: formatPrice(order.deliveryFee || 0), icon: <FiZap className={`${isReturn ? 'text-orange-500' : 'text-amber-500'}`} />, bg: isReturn ? 'bg-orange-50' : 'bg-amber-50' },
                                    { label: 'Est. Time', value: order.estimatedTime || '15 min', icon: <FiClock className="text-blue-500" />, bg: 'bg-blue-50' },
                                    { label: 'Distance', value: order.distance || '2.4 km', icon: <FiTarget className="text-emerald-500" />, bg: 'bg-emerald-50' }
                                ].map((stat) => (
                                    <div key={stat.label} className={`${stat.bg} rounded-3xl p-4 flex flex-col items-center text-center border border-white`}>
                                        <div className="mb-2">{stat.icon}</div>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">{stat.label}</span>
                                        <span className="font-black text-slate-800 text-sm whitespace-nowrap">{stat.value}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Delivery Route Visualization */}
                            <div className="relative pl-10">
                                {/* Connector Line */}
                                <div className="absolute left-[19px] top-6 bottom-6 w-[2px] bg-slate-100 border-l-2 border-dashed border-slate-200" />

                                {/* Pickup Location */}
                                <div className="relative mb-10">
                                    <div className="absolute -left-[35px] top-0 w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center border border-orange-200">
                                        <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                                    </div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{pickupTitle}</p>
                                    <h3 className="font-black text-slate-900 text-base mb-1">{pickupName}</h3>
                                    <p className="text-slate-500 text-xs font-medium leading-relaxed">{pickupAddress}</p>
                                </div>

                                {/* Dropoff Location */}
                                <div className="relative">
                                    <div className="absolute -left-[35px] top-0 w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-200">
                                        <FiNavigation size={14} className="text-indigo-600" />
                                    </div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{deliverTitle}</p>
                                    <h3 className="font-black text-slate-900 text-base mb-1">{deliverName}</h3>
                                    <p className="text-slate-500 text-xs font-medium leading-relaxed">{deliverAddress}</p>
                                </div>
                            </div>

                            {/* Order Total Info */}
                            <div className="mt-10 py-4 border-y border-slate-50 flex justify-between items-center px-2">
                                <span className="text-slate-400 text-sm font-bold">Total Order Value</span>
                                <span className="text-slate-900 font-black text-lg">{formatPrice(order.total || 0)}</span>
                            </div>

                            {/* Action Section */}
                            <div className="pt-10 pb-12">
                                <SwipeToAccept
                                    onAccept={() => onAccept(order?.id)}
                                    isLoading={isAccepting}
                                    color={isReturn ? '#f97316' : '#16a34a'}
                                />
                                <p className="text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-6">
                                    Scroll down to reject or wait for timer
                                </p>
                            </div>

                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default NewOrderModal;

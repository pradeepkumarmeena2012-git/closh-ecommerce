import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle, Package, Truck, MapPin, Clock } from 'lucide-react';
import { useOrderStore } from '../../../../shared/store/orderStore';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix for default marker icon issues in Leaflet with React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom delivery boy icon
const deliveryIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/2972/2972185.png',
    iconSize: [35, 35],
    iconAnchor: [17, 35],
    popupAnchor: [0, -35],
});

const ChangeView = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        if (center && Array.isArray(center) && center.length === 2) {
            map.setView(center);
        }
    }, [center, map]);
    return null;
};

const TrackOrderPage = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const { fetchOrderById, fetchPublicTrackingOrder, getOrder } = useOrderStore();
    const [order, setOrder] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const loadOrder = async () => {
        if (!orderId) return;
        try {
            let foundOrder = await fetchOrderById(orderId).catch(() => null);
            if (!foundOrder) {
                const response = await fetchPublicTrackingOrder(orderId).catch(() => null);
                foundOrder = response;
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
    }, [orderId]);

    const status = order?.status?.toLowerCase() || 'pending';

    // Polling for live location if order is shipped/out_for_delivery
    useEffect(() => {
        let interval;
        if (status === 'shipped' || status === 'out_for_delivery') {
            interval = setInterval(loadOrder, 10000); // Poll every 10 seconds
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [status, orderId]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
                <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
                <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Updating Status...</p>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <p className="text-gray-500 font-bold">Order not found</p>
            </div>
        );
    }

    const trackingNumber = order.trackingNumber || `TRK${orderId.slice(-8).toUpperCase()}`;
    const address = order.address || order.shippingAddress;

    // Determine current step based on count of COMPLETED steps
    let currentStep = 1;
    if (status === 'processing') currentStep = 2;
    if (status === 'ready_for_pickup') currentStep = 2;
    if (status === 'shipped' || status === 'out_for_delivery') currentStep = 3;
    if (status === 'delivered') currentStep = 4;
    if (status === 'cancelled') currentStep = 0;

    const steps = [
        { label: 'Order Placed', date: order.date || order.createdAt, icon: CheckCircle },
        { label: 'Processing', date: currentStep >= 2 ? 'Completed' : 'Pending', icon: Package },
        { label: 'Shipped', date: order.shippedDate || (currentStep >= 3 ? 'Completed' : 'Pending'), icon: Truck },
        { label: 'Delivered', date: order.deliveredDate || (currentStep >= 4 ? 'Completed' : 'Pending'), icon: MapPin },
    ];

    const getStatusColor = () => {
        if (status === 'delivered') return 'bg-green-100 text-green-800';
        if (status === 'cancelled') return 'bg-red-100 text-red-800';
        if (status === 'shipped' || status === 'out_for_delivery') return 'bg-blue-100 text-blue-800';
        return 'bg-amber-100 text-amber-800';
    };

    const riderLocation = order?.deliveryBoyId?.currentLocation?.coordinates;
    const hasRiderLocation = Array.isArray(riderLocation) && riderLocation.length === 2;
    const riderPosition = hasRiderLocation ? [riderLocation[1], riderLocation[0]] : null;

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white p-4 flex items-center gap-4 border-b border-gray-100 sticky top-0 z-50">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-lg font-black uppercase tracking-tight">Track Order</h1>
                    <p className="text-[10px] text-gray-400 font-bold">Order #{order.orderId || orderId}</p>
                </div>
                <div className={`ml-auto px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getStatusColor()}`}>
                    {status.replace('_', ' ')}
                </div>
            </div>

            <div className="p-4 max-w-2xl mx-auto space-y-6">
                {/* Live Map Tracking */}
                {(status === 'shipped' || status === 'out_for_delivery') && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 h-64 relative z-10"
                    >
                        {hasRiderLocation ? (
                            <MapContainer
                                center={riderPosition}
                                zoom={15}
                                style={{ height: '100%', width: '100%' }}
                                zoomControl={false}
                            >
                                <TileLayer
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    attribution='&copy; OpenStreetMap'
                                />
                                <Marker position={riderPosition} icon={deliveryIcon}>
                                    <Popup>
                                        <div className="text-center">
                                            <p className="font-bold text-gray-900">{order?.deliveryBoyId?.name || 'Delivery Partner'}</p>
                                            <p className="text-[10px] text-gray-500 uppercase font-black">Out for Delivery</p>
                                        </div>
                                    </Popup>
                                </Marker>
                                <ChangeView center={riderPosition} />
                            </MapContainer>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-emerald-50/30">
                                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-3">
                                    <Truck className="text-emerald-600" size={24} />
                                </div>
                                <h3 className="font-bold text-gray-900">Tracking Active</h3>
                                <p className="text-[10px] text-gray-400 font-black uppercase mt-1">Waiting for live signal...</p>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* Status Timeline */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100"
                >
                    <h2 className="text-sm font-black uppercase tracking-widest mb-6 text-gray-400">Order Status</h2>
                    <div className="relative pl-8 border-l-2 border-gray-100 space-y-8">
                        {steps.map((step, index) => {
                            const isCompleted = index < currentStep;
                            const isCurrent = index === currentStep;
                            const Icon = step.icon;

                            return (
                                <div key={index} className="relative">
                                    <div className={`absolute -left-[41px] top-0 w-8 h-8 rounded-full flex items-center justify-center border-4 border-white ${isCompleted ? 'bg-emerald-500 text-white' : isCurrent ? 'bg-emerald-100 text-emerald-600 ring-4 ring-emerald-50' : 'bg-gray-100 text-gray-400'}`}>
                                        <Icon size={14} />
                                    </div>
                                    <div className={`${isCompleted || isCurrent ? 'opacity-100' : 'opacity-40'}`}>
                                        <p className="text-sm font-bold text-gray-900">{step.label}</p>
                                        <p className={`text-[10px] uppercase font-bold tracking-wide mt-1 ${isCompleted ? 'text-emerald-500' : 'text-gray-400'}`}>
                                            {step.label === 'Delivered' && !isCompleted ? 'Instant (60 Mins)' : step.date}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>

                {/* Delivery Partner Info */}
                {(order.deliveryBoyId || order.assignedDeliveryBoy) && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100"
                    >
                        <h2 className="text-sm font-black uppercase tracking-widest mb-4 text-gray-400">Delivery Partner</h2>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                                <Truck size={24} />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-gray-900">{order.deliveryBoyId?.name || order.assignedDeliveryBoy?.name}</p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase">
                                    {order.deliveryBoyId?.phone || order.assignedDeliveryBoy?.phone || 'Contact Partner'}
                                </p>
                            </div>
                            {(order.deliveryBoyId?.phone || order.assignedDeliveryBoy?.phone) && (
                                <a
                                    href={`tel:${order.deliveryBoyId?.phone || order.assignedDeliveryBoy?.phone}`}
                                    className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-black uppercase tracking-tight hover:bg-emerald-100 transition-colors"
                                >
                                    Call
                                </a>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* Tracking Number */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                    <h2 className="text-sm font-black uppercase tracking-widest mb-4 text-gray-400">Tracking Number</h2>
                    <div className="bg-purple-50 rounded-2xl p-4">
                        <p className="text-xl font-black text-purple-900 tracking-widest">{trackingNumber}</p>
                    </div>
                </div>

                {/* Shipping Address */}
                {address && (
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                        <h2 className="text-sm font-black uppercase tracking-widest mb-4 text-gray-400 flex items-center gap-2">
                            <MapPin size={16} /> Shipping Address
                        </h2>
                        <div className="bg-gray-50 rounded-2xl p-4">
                            <p className="text-sm font-bold text-gray-900">{address.name}</p>
                            <p className="text-xs font-medium text-gray-500 mt-1 leading-relaxed">
                                {address.address}{address.locality ? `, ${address.locality}` : ''} <br />
                                {[address.city, address.state, address.pincode || address.zipCode].filter(Boolean).join(', ')}
                            </p>
                        </div>
                    </div>
                )}

                {/* Order Items */}
                {Array.isArray(order.items) && order.items.length > 0 && (
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                        <h2 className="text-sm font-black uppercase tracking-widest mb-4 text-gray-400">Order Items</h2>
                        <div className="space-y-4">
                            {order.items.map((item, idx) => (
                                <div key={idx} className="flex gap-4 items-center bg-gray-50 p-3 rounded-2xl">
                                    <div className="w-16 h-16 bg-white rounded-xl overflow-hidden shrink-0 border border-gray-100">
                                        <img src={item.image} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-xs font-black text-gray-900 line-clamp-1">{item.name}</h4>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mt-1">
                                            Qty: {item.quantity}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Delivery Info */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">Delivery Type</p>
                        <p className="text-lg font-black text-emerald-600">Instant Delivery (60 Mins)</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-500">
                        <Clock size={24} />
                    </div>
                </div>

                <button
                    onClick={() => navigate(`/orders/${order.orderId || orderId}`)}
                    className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-600 shadow-lg shadow-emerald-200"
                >
                    View Order Details
                </button>
            </div>
        </div>
    );
};

export default TrackOrderPage;

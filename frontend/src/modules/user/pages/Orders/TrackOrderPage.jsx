import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle, Package, Truck, MapPin, Clock } from 'lucide-react';
import { useOrderStore } from '../../../../shared/store/orderStore';

const TrackOrderPage = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const { getOrderById, orders: allOrders } = useOrderStore();
    const [order, setOrder] = useState(null);

    useEffect(() => {
        if (orderId) {
            const foundOrder = getOrderById(orderId);
            if (foundOrder) {
                setOrder(foundOrder);
            }
        }
    }, [orderId, allOrders, getOrderById]);

    if (!order) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <p className="text-gray-500 font-bold">Order not found</p>
            </div>
        );
    }

    const trackingNumber = order.trackingNumber || `TRK${orderId.slice(-8).toUpperCase()}`;
    const status = order.status?.toLowerCase() || 'pending';

    // Resolve address from either user order or admin order format
    const address = order.address || order.shippingAddress;

    // Determine current step based on count of COMPLETED steps
    let currentStep = 1; // Default: Order Placed is completed

    if (status === 'processing') currentStep = 2; // Placed + Processing completed
    if (status === 'ready_for_pickup') currentStep = 2; // Still in processing phase
    if (status === 'shipped') currentStep = 3;     // Placed + Processing + Shipped completed
    if (status === 'delivered') currentStep = 4;    // All completed
    if (status === 'cancelled' || status === 'canceled') currentStep = 0;

    const steps = [
        { label: 'Order Placed', date: order.date, icon: CheckCircle },
        { label: 'Processing', date: currentStep >= 2 ? 'Completed' : 'Pending', icon: Package },
        { label: 'Shipped', date: order.shippedDate || (currentStep >= 3 ? 'Completed' : 'Pending'), icon: Truck },
        { label: 'Delivered', date: order.deliveredDate || (currentStep >= 4 ? 'Completed' : 'Pending'), icon: MapPin },
    ];

    // Status badge color
    const getStatusColor = () => {
        if (status === 'delivered') return 'bg-green-100 text-green-800';
        if (status === 'cancelled' || status === 'canceled') return 'bg-red-100 text-red-800';
        if (status === 'shipped') return 'bg-blue-100 text-blue-800';
        return 'bg-amber-100 text-amber-800';
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white p-4 flex items-center gap-4 border-b border-gray-100 sticky top-0 z-50">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-lg font-black uppercase tracking-tight">Track Order</h1>
                    <p className="text-[10px] text-gray-400 font-bold">Order #{orderId}</p>
                </div>
                <div className={`ml-auto px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getStatusColor()}`}>
                    {order.status}
                </div>
            </div>

            <div className="p-4 max-w-2xl mx-auto space-y-6">

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
                                        <p className={`text-[10px] uppercase font-bold tracking-wide mt-1 ${isCompleted ? 'text-emerald-500' : 'text-gray-400'}`}>{step.date}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>

                {/* Delivery Partner Info */}
                {order.assignedDeliveryBoy && (
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
                                <p className="text-sm font-bold text-gray-900">{order.assignedDeliveryBoy.name}</p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase">
                                    {order.assignedDeliveryBoy.vehicleType} • {order.assignedDeliveryBoy.vehicleNumber}
                                </p>
                            </div>
                            <a
                                href={`tel:${order.assignedDeliveryBoy.phone}`}
                                className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-black uppercase tracking-tight hover:bg-emerald-100 transition-colors"
                            >
                                Call
                            </a>
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
                            {(address.mobile || address.phone) && (
                                <p className="text-xs font-bold text-gray-900 mt-2">Mobile: {address.mobile || address.phone}</p>
                            )}
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
                                            Qty: {item.quantity} × ₹{item.discountedPrice || item.price}
                                        </p>
                                    </div>
                                    <p className="text-sm font-black text-emerald-600">₹{(item.discountedPrice || item.price) * item.quantity}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Estimated Delivery */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">Estimated Delivery</p>
                        <p className="text-lg font-black text-emerald-600">{new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-500">
                        <Clock size={24} />
                    </div>
                </div>

                <button
                    onClick={() => navigate(`/orders/${orderId}`)}
                    className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-600 shadow-lg shadow-emerald-200"
                >
                    View Order Details
                </button>

            </div>
        </div>
    );
};

export default TrackOrderPage;

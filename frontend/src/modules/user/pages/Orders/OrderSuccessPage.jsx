import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle, Package, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const OrderSuccessPage = () => {
    const navigate = useNavigate();
    const { orderId } = useParams();

    // Get order details from local storage for basic info display
    const userOrders = JSON.parse(localStorage.getItem('userOrders') || '[]');
    const order = userOrders.find(o => String(o.id) === String(orderId));

    if (!order) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <p className="text-gray-500 font-bold">Order not found</p>
            </div>
        );
    }

    // Generate a mock tracking number if not present
    const trackingNumber = order.trackingNumber || `TRK${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center"
            >
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="text-green-500 w-12 h-12" />
                </div>

                <h1 className="text-2xl font-black text-gray-900 mb-2">Order Confirmed!</h1>
                <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                    Thank you for your purchase. Your order has been received and is being processed.
                </p>

                <div className="bg-gray-50 rounded-2xl p-6 mb-8 text-left space-y-4">
                    <div className="text-center mb-6">
                        <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">Order Number</p>
                        <p className="text-lg font-black text-gray-900">{order.id}</p>
                    </div>

                    <div className="text-center">
                        <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">Tracking Number</p>
                        <p className="text-lg font-black text-purple-600 tracking-widest">{trackingNumber}</p>
                    </div>

                    <div className="border-t border-gray-200 pt-4 flex justify-between items-end">
                        <div>
                            <p className="text-[10px] text-gray-400 font-bold mb-1">Order Date</p>
                            <p className="text-xs font-bold text-gray-900">{order.date}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] text-gray-400 font-bold mb-1">Total Amount</p>
                            <p className="text-xl font-black text-purple-600">₹{order.total}</p>
                        </div>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                        <p className="text-[10px] text-gray-400 font-bold">Payment Method</p>
                        <p className="text-xs font-bold text-gray-900 uppercase">{order.paymentMethod || 'Card'}</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <button
                        onClick={() => navigate(`/orders/${orderId}`)}
                        className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-600 shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        <Package size={18} /> View Order Details
                    </button>

                    <button
                        onClick={() => navigate(`/track-order/${orderId}`)}
                        className="w-full py-4 bg-white border-2 border-gray-100 text-gray-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-50 flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        <ArrowRight size={18} /> Track Order
                    </button>

                    <button
                        onClick={() => navigate('/')}
                        className="w-full py-3 text-gray-400 text-[10px] font-bold uppercase tracking-widest hover:text-gray-600"
                    >
                        Continue Shopping
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default OrderSuccessPage;

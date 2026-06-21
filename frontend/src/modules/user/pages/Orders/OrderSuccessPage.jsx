import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle, Package, ArrowRight, AlertTriangle, Store, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useOrderStore } from '../../../../shared/store/orderStore';

const OrderSuccessPage = () => {
    const navigate = useNavigate();
    const { orderId } = useParams();
    const [searchParams] = useSearchParams();
    const { fetchOrderById } = useOrderStore();

    const [order, setOrder] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState(false);

    const paymentWarning = searchParams.get('warning');
    const paymentFailed = searchParams.get('payment') === 'failed';

    useEffect(() => {
        let cancelled = false;

        const loadOrder = async () => {
            if (!orderId) {
                setIsLoading(false);
                return;
            }
            try {
                // Always bypass cache to get fresh data from the server
                const fetched = await fetchOrderById(orderId, true);
                if (!cancelled) {
                    setOrder(fetched);
                    setIsLoading(false);
                }
            } catch (err) {
                console.error('[OrderSuccessPage] Failed to fetch order:', err);
                if (!cancelled) {
                    setFetchError(true);
                    setIsLoading(false);
                }
            }
        };

        loadOrder();

        return () => {
            cancelled = true;
        };
    }, [orderId, fetchOrderById]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4">
                <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                <p className="text-gray-400 text-sm font-medium">Loading order details...</p>
            </div>
        );
    }

    if (fetchError || !order) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6 text-center">
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle className="text-emerald-500 w-10 h-10" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Placed!</h1>
                <p className="text-gray-500 text-sm mb-2">Order ID: <span className="font-bold">{orderId}</span></p>
                <p className="text-gray-400 text-xs mb-8">Your order has been placed successfully. You can view details in your orders.</p>
                <div className="space-y-3 w-full max-w-xs">
                    <button
                        onClick={() => navigate(`/orders/${orderId}`)}
                        className="w-full py-4 bg-black text-white rounded-2xl font-bold text-xs uppercase hover:bg-gray-800 shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        <Package size={18} /> View Order
                    </button>
                    <button
                        onClick={() => navigate('/')}
                        className="w-full py-3 text-gray-400 text-[10px] font-bold uppercase hover:text-gray-600"
                    >
                        Continue Shopping
                    </button>
                </div>
            </div>
        );
    }

    // Extract multi-vendor info
    const vendorGroups = order?.vendorItems || [];
    const isMultiVendor = vendorGroups.length > 1;

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center"
            >
                {/* Warning banners */}
                {paymentWarning && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex items-center gap-3 text-left">
                        <AlertTriangle className="text-amber-500 shrink-0" size={20} />
                        <p className="text-xs text-amber-700 font-medium">
                            Payment gateway could not be initialized. Your order was recorded as COD. Please contact support if needed.
                        </p>
                    </div>
                )}
                {paymentFailed && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 flex items-center gap-3 text-left">
                        <AlertTriangle className="text-red-500 shrink-0" size={20} />
                        <p className="text-xs text-red-700 font-medium">
                            Payment verification failed. Your order has been placed but payment is pending. Please contact support.
                        </p>
                    </div>
                )}

                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="text-green-500 w-12 h-12" />
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
                <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                    Thank you for your purchase. Your order has been received and is being processed.
                </p>

                <div className="bg-white rounded-2xl p-6 mb-8 text-left space-y-4">
                    <div className="text-center mb-6">
                        <p className="text-[10px] uppercase font-bold text-gray-400  mb-1">Order Number</p>
                        <p className="text-lg font-bold text-gray-900">{order.orderId || order.id}</p>
                    </div>

                    {order.trackingNumber && (
                        <div className="text-center">
                            <p className="text-[10px] uppercase font-bold text-gray-400  mb-1">Tracking Number</p>
                            <p className="text-lg font-bold text-purple-600 ">{order.trackingNumber}</p>
                        </div>
                    )}

                    {/* Multi-vendor breakdown */}
                    {isMultiVendor && (
                        <div className="border-t border-gray-100 pt-4 space-y-3">
                            <p className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1.5">
                                <Store size={12} /> Items from {vendorGroups.length} stores
                            </p>
                            {vendorGroups.map((group, idx) => (
                                <div key={group.vendorId || idx} className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-gray-900">{`Closh ${idx + 1} Store`}</p>
                                        <p className="text-[10px] text-gray-400 font-medium">
                                            {group.items?.length || 0} item{(group.items?.length || 0) !== 1 ? 's' : ''} · ₹{Number(group.subtotal || 0).toLocaleString()}
                                        </p>
                                    </div>
                                    <span className={`text-[9px] font-bold uppercase px-2 py-1 rounded-lg ${
                                        group.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                        group.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                                        'bg-gray-100 text-gray-600'
                                    }`}>
                                        {group.status || 'Pending'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="border-t border-gray-200 pt-4 flex justify-between items-end">
                        <div>
                            <p className="text-[10px] text-gray-400 font-bold mb-1">Order Date</p>
                            <p className="text-xs font-bold text-gray-900">
                                {order.date
                                    ? new Date(order.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                                    : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                                }
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] text-gray-400 font-bold mb-1">Total Amount</p>
                            <p className="text-xl font-bold text-purple-600">₹{Number(order.total || 0).toLocaleString()}</p>
                        </div>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                        <p className="text-[10px] text-gray-400 font-bold">Payment Method</p>
                        <p className="text-xs font-bold text-gray-900 uppercase">{order.paymentMethod || 'COD'}</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <button
                        onClick={() => navigate(`/orders/${orderId}`)}
                        className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold text-xs uppercase  hover:bg-emerald-600 shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        <Package size={18} /> View Order Details
                    </button>

                    <button
                        onClick={() => navigate(`/track-order/${orderId}`)}
                        className="w-full py-4 bg-white border-2 border-gray-100 text-gray-900 rounded-2xl font-bold text-xs uppercase  hover:bg-white hover:text-black flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        <ArrowRight size={18} /> Track Order
                    </button>

                    <button
                        onClick={() => navigate('/')}
                        className="w-full py-3 text-gray-400 text-[10px] font-bold uppercase  hover:text-gray-600"
                    >
                        Continue Shopping
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default OrderSuccessPage;

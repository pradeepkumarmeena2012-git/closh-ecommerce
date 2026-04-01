import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AccountLayout from '../../components/Profile/AccountLayout';
import { ArrowLeft, Package, Clock, MapPin, Phone, CreditCard, ChevronRight, Printer, AlertTriangle, RefreshCcw, X, ShieldCheck, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useOrderStore } from '../../../../shared/store/orderStore';

const OrderDetailsPage = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { fetchOrderById, getOrder, resendDeliveryOtp } = useOrderStore();
    const [order, setOrder] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [returnReason, setReturnReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
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
            console.error('[Resend OTP]', err?.response?.data?.message || err?.message);
        } finally {
            setIsResendingOtp(false);
        }
    };

    const RETURN_REASONS = [
        "Wrong size delivered",
        "Item is defective or damaged",
        "Item not as described",
        "Changed my mind",
        "Quality not as expected",
        "Received wrong item"
    ];

    useEffect(() => {
        const loadOrder = async () => {
            if (!orderId) return;
            setIsLoading(true);
            try {
                // Try cache first
                let foundOrder = getOrder(orderId);
                // Always refresh from API to get latest status
                foundOrder = await fetchOrderById(orderId);
                if (foundOrder) setOrder(foundOrder);
            } catch (error) {
                console.error("Failed to load order details:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadOrder();
    }, [orderId, fetchOrderById, getOrder]);

    // Cleanup cooldown timer on unmount
    useEffect(() => {
        return () => {
            if (cooldownRef.current) clearInterval(cooldownRef.current);
        };
    }, []);

    const handleViewInvoice = () => {
        if (!order) return;

        const invoiceWindow = window.open('', '_blank');

        if (!invoiceWindow) {
            alert("Please allow popups to view the invoice.");
            return;
        }

        const invoiceContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Invoice #${order.id}</title>
                <style>
                    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; max-width: 800px; mx-auto; }
                    .header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
                    .company-name { font-size: 24px; font-weight: bold; }
                    .invoice-title { font-size: 32px; font-weight: bold; color: #333; }
                    .section-title { font-size: 14px; font-weight: bold; uppercase; margin-bottom: 10px; color: #666; letter-spacing: 1px; }
                    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
                    .table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
                    .table th { text-align: left; border-bottom: 2px solid #eee; padding: 10px; font-size: 12px; uppercase; }
                    .table td { border-bottom: 1px solid #eee; padding: 10px; font-size: 14px; }
                    .total-section { text-align: right; }
                    .total-row { font-size: 18px; font-weight: bold; margin-top: 10px; }
                    .footer { margin-top: 60px; text-align: center; color: #999; font-size: 12px; }
                    @media print {
                        body { padding: 0; }
                        button { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <div class="company-name">Clothify</div>
                        <div style="color: #666; font-size: 12px; margin-top: 5px;">Your Fashion Store</div>
                    </div>
                    <div style="text-align: right;">
                        <div class="invoice-title">INVOICE</div>
                        <div style="color: #666; margin-top: 5px;">#${order.id}</div>
                        <div style="color: #666;">Date: ${order.date}</div>
                    </div>
                </div>

                <div class="info-grid">
                    <div>
                        <div class="section-title">BILLED TO</div>
                        ${order.address ? `
                            <div style="font-weight: bold;">${order.address.name}</div>
                            <div>${order.address.address}</div>
                            <div>${order.address.locality}</div>
                            <div>${order.address.city}, ${order.address.state} - ${order.address.pincode}</div>
                            <div style="margin-top: 5px;">Phone: ${order.address.mobile || order.address.phone || 'N/A'}</div>
                        ` : 'Address not available'}
                    </div>
                    <div>
                        <div class="section-title">PAYMENT METHOD</div>
                        <div style="font-weight: bold; text-transform: uppercase;">${order.paymentMethod || 'Pay on Delivery'}</div>
                        <div style="margin-top: 20px;">
                            <div class="section-title">ORDER STATUS</div>
                            <div style="font-weight: bold; text-transform: uppercase;">${order.status}</div>
                        </div>
                    </div>
                </div>

                <table class="table">
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Size</th>
                            <th>Qty</th>
                            <th style="text-align: right;">Price</th>
                            <th style="text-align: right;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${order.items.map(item => `
                            <tr>
                                <td>
                                    <div style="font-weight: bold;">${item.name}</div>
                                    <div style="color: #666; font-size: 12px;">${item.brand}</div>
                                </td>
                                <td>${item.selectedSize}</td>
                                <td>${item.quantity}</td>
                                <td style="text-align: right;">₹${item.discountedPrice}</td>
                                <td style="text-align: right;">₹${item.discountedPrice * item.quantity}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="total-section">
                    <div style="display: inline-block; text-align: right; min-width: 200px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                            <span style="color: #666;">Subtotal:</span>
                            <span>₹${order.total}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                            <span style="color: #666;">Shipping:</span>
                            <span style="color: green;">FREE</span>
                        </div>
                        <div class="total-row" style="display: flex; justify-content: space-between; border-top: 2px solid #eee; padding-top: 10px;">
                            <span>Total:</span>
                            <span>₹${order.total}</span>
                        </div>
                    </div>
                </div>

                <div class="footer">
                    <p>Thank you for shopping with Clothify!</p>
                    <p>For any queries, please contact support@clothify.com</p>
                </div>

                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `;

        invoiceWindow.document.write(invoiceContent);
        invoiceWindow.document.close();
    };

    const handleReturnSubmit = async () => {
        if (!returnReason) {
            alert("Please select a reason for return");
            return;
        }

        setIsSubmitting(true);
        try {
            // Call the real backend API through the order store
            // We pass the orderId (which could be the ORD-xxx or mongo _id)
            // and the reason. The store helper will POST to /api/user/orders/:id/returns
            await useOrderStore.getState().requestReturn(orderId, {
                reason: returnReason,
                // If the backend requires specific items, we could pass them here
                // but currently createReturnRequest defaults to all items if not specified
            });

            // Refresh order details to reflect the new status
            const updatedOrder = await fetchOrderById(orderId);
            if (updatedOrder) setOrder(updatedOrder);

            setShowReturnModal(false);
            alert("Return request submitted successfully. Our team will review it shortly.");
        } catch (error) {
            console.error("Return request failed:", error);
            alert(error.message || "Failed to submit return request. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <AccountLayout hideHeader={true}>
                <div className="flex flex-col items-center justify-center min-h-[400px]">
                    <div className="w-10 h-10 border-4 border-black/10 border-t-black rounded-full animate-spin mb-4" />
                    <p className="text-[10px] font-bold uppercase  text-gray-400">Fetching Details...</p>
                </div>
            </AccountLayout>
        );
    }

    if (!order) {
        return (
            <AccountLayout hideHeader={true}>
                <div className="flex flex-col items-center justify-center min-h-[400px]">
                    <p className="text-gray-500 font-bold">Order not found</p>
                    <button
                        onClick={() => navigate('/orders')}
                        className="mt-4 px-6 py-2 bg-black text-white rounded-xl text-sm font-bold uppercase"
                    >
                        Back to Orders
                    </button>
                </div>
            </AccountLayout>
        );
    }

    return (
        <AccountLayout hideHeader={true}>
            <div className="max-w-4xl mx-auto px-4 md:px-0 pb-10">
                {/* Responsive Header */}
                <div className="flex flex-wrap items-center gap-3 md:gap-4 mb-6 pt-2">
                    <button
                        onClick={() => navigate('/orders')}
                        className="p-2 hover:bg-white hover:text-black rounded-full transition-colors order-1"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex-1 order-2 min-w-[150px]">
                        <h2 className="text-lg md:text-xl font-bold uppercase ">Order Details</h2>
                        <p className="text-[10px] md:text-xs text-gray-500 font-bold">#{order.id}</p>
                    </div>
                    <div className="flex items-center gap-2 order-3 w-full sm:w-auto sm:order-2 justify-between sm:justify-end">
                        <button
                            onClick={handleViewInvoice}
                            className="flex items-center gap-2 px-3 md:px-4 py-2 bg-gray-100 hover:bg-gray-200 text-black rounded-xl transition-colors"
                        >
                            <Printer size={16} />
                            <span className="text-[10px] font-bold uppercase  hidden xs:inline">Invoice</span>
                        </button>
                        <span className="text-[9px] md:text-[10px] font-bold bg-black text-white px-3 py-1.5 rounded-full uppercase ">
                            {order.status}
                        </span>
                    </div>
                </div>

                <div className="space-y-4 md:space-y-6">
                    {/* Items Section */}
                    <div className="bg-white rounded-2xl md:rounded-3xl border border-gray-100 p-4 md:p-6 shadow-sm font-bold">
                        <h3 className="text-[11px] md:text-sm font-bold uppercase  mb-4 flex items-center gap-2 text-gray-400">
                            <Package size={16} /> Items in Order
                        </h3>
                        <div className="space-y-4 md:space-y-6">
                            {order.items.map((item, idx) => (
                                <div key={idx} className="flex gap-3 md:gap-4 border-b border-gray-50 last:border-0 pb-4 last:pb-0">
                                    <div className="w-16 h-20 md:w-20 md:h-24 bg-white rounded-xl overflow-hidden shrink-0 border border-gray-100">
                                        <img src={item.image} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0 py-0.5 md:py-1">
                                        <h4 className="text-[13px] md:text-sm font-bold text-gray-900 line-clamp-1">{item.name}</h4>
                                        <p className="text-[9px] md:text-[11px] font-bold text-gray-400 uppercase mt-0.5 md:mt-1">
                                            {item.brand}
                                        </p>
                                        <div className="flex flex-wrap gap-2 md:gap-4 mt-1.5 md:mt-2">
                                            <div className="bg-white px-2 py-0.5 md:py-1 rounded text-[9px] md:text-[10px] font-bold text-gray-600 uppercase">
                                                Size: {item.selectedSize}
                                            </div>
                                            <div className="bg-white px-2 py-0.5 md:py-1 rounded text-[9px] md:text-[10px] font-bold text-gray-600 uppercase">
                                                Qty: {item.quantity}
                                            </div>
                                        </div>
                                        <p className="text-[13px] md:text-sm font-bold text-black mt-1.5 md:mt-2">₹{item.discountedPrice}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Delivery & Payment Info Grid */}
                    <div className="grid md:grid-cols-2 gap-4 md:gap-6 font-bold">
                        {/* Delivery Address */}
                        <div className="bg-white rounded-2xl md:rounded-3xl border border-gray-100 p-4 md:p-6 shadow-sm">
                            <h3 className="text-[11px] md:text-sm font-bold uppercase  mb-4 flex items-center gap-2 text-gray-400">
                                <MapPin size={16} /> Delivery Address
                            </h3>
                            {order.address ? (
                                <div className="space-y-1.5 md:space-y-2">
                                    <p className="text-sm font-bold text-gray-900">{order.address.name}</p>
                                    <p className="text-[11px] md:text-xs text-gray-500 font-medium leading-relaxed">
                                        {order.address.address}, {order.address.locality} <br />
                                        {order.address.city}, {order.address.state} - {order.address.pincode || order.address.zipCode || 'N/A'}
                                    </p>
                                    <p className="text-[11px] md:text-xs font-bold text-gray-900 flex items-center gap-2 mt-2">
                                        <Phone size={12} className="text-gray-400" /> {
                                            (order.address.mobile === "0000000000" || order.address.phone === "0000000000")
                                                ? 'N/A'
                                                : (order.address.mobile || order.address.phone || 'N/A')
                                        }
                                    </p>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-400">Address details not available</p>
                            )}
                        </div>

                        {/* Payment Info */}
                        <div className="bg-white rounded-2xl md:rounded-3xl border border-gray-100 p-4 md:p-6 shadow-sm">
                            <h3 className="text-[11px] md:text-sm font-bold uppercase  mb-4 flex items-center gap-2 text-gray-400">
                                <CreditCard size={16} /> Payment Summary
                            </h3>
                            <div className="space-y-2.5 md:space-y-3">
                                <div className="flex justify-between text-[11px] md:text-xs font-bold text-gray-500">
                                    <span>Subtotal</span>
                                    <span>₹{order.total}</span>
                                </div>
                                <div className="flex justify-between text-[11px] md:text-xs font-bold text-gray-500">
                                    <span>Shipping</span>
                                    <span className="text-green-600">FREE</span>
                                </div>
                                <div className="flex justify-between text-[13px] md:text-sm font-bold text-black pt-2 md:pt-3 border-t border-gray-50">
                                    <span>Total Amount</span>
                                    <span>₹{order.total}</span>
                                </div>
                                <div className="mt-3 md:mt-4 bg-white p-2.5 md:p-3 rounded-xl flex items-center justify-between">
                                    <span className="text-[9px] md:text-[10px] font-bold uppercase  text-gray-400">Payment Method</span>
                                    <span className="text-[11px] md:text-xs font-bold text-gray-900 uppercase">
                                        {order.paymentMethod || 'Pay on Delivery'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Order Timeline */}
                    <div className="bg-white rounded-2xl md:rounded-3xl border border-gray-100 p-4 md:p-6 shadow-sm font-bold">
                        <h3 className="text-[11px] md:text-sm font-bold uppercase  mb-6 flex items-center gap-2 text-gray-400">
                            <Clock size={16} /> Order Status
                        </h3>

                        {(() => {
                            const status = order.status?.toLowerCase() || 'pending';
                            const isCancelled = status === 'cancelled' || status === 'canceled';

                            let step = 1; // Default to Ordered (1)
                            if (status === 'shipped') step = 2;
                            if (status === 'delivered') step = 3;
                            if (isCancelled) step = 0; // Special case

                            return (
                                <div className="px-2">
                                    {isCancelled ? (
                                        <div className="text-center py-4">
                                            <p className="text-red-500 font-bold uppercase ">Order Cancelled</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center relative">
                                                {/* Progress Line Background */}
                                                <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-100 -translate-y-1/2 z-0 rounded-full"></div>

                                                {/* Active Progress Line */}
                                                <div
                                                    className="absolute top-1/2 left-0 h-1 bg-green-500 -translate-y-1/2 z-0 rounded-full transition-all duration-500"
                                                    style={{ width: step === 3 ? '100%' : step === 2 ? '50%' : '0%' }}
                                                ></div>

                                                {/* Step 1: Ordered */}
                                                <div className={`relative z-10 w-8 h-8 flex items-center justify-center rounded-full transition-colors duration-300 ${step >= 1 ? 'bg-green-500 text-white shadow-lg shadow-green-200' : 'bg-gray-100 text-gray-400'}`}>
                                                    <Package size={14} />
                                                </div>

                                                {/* Spacer */}
                                                <div className="flex-1"></div>

                                                {/* Step 2: Shipped */}
                                                <div className={`relative z-10 w-8 h-8 flex items-center justify-center rounded-full transition-colors duration-300 ${step >= 2 ? 'bg-green-500 text-white shadow-lg shadow-green-200' : 'bg-gray-100 text-gray-400'}`}>
                                                    <CreditCard size={14} />
                                                </div>

                                                {/* Spacer */}
                                                <div className="flex-1"></div>

                                                {/* Step 3: Delivered */}
                                                <div className={`relative z-10 w-8 h-8 flex items-center justify-center rounded-full transition-colors duration-300 ${step >= 3 ? 'bg-green-500 text-white shadow-lg shadow-green-200' : 'bg-gray-100 text-gray-400'}`}>
                                                    <Package size={14} />
                                                </div>
                                            </div>

                                            <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase  mt-2 overflow-hidden">
                                                <span className={step >= 1 ? 'text-green-600' : ''}>Ordered</span>
                                                <span className={step >= 2 ? 'text-green-600 text-center' : 'text-center'}>Shipped</span>
                                                <span className={step >= 3 ? 'text-green-600 text-right' : 'text-right'}>Delivered</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })()}

                        {(order.orderType || order.deliveryType) && (
                            <div className="flex items-center justify-center gap-2 mt-4 px-3 py-1.5 bg-white rounded-full w-fit mx-auto border border-gray-100">
                                <ShieldCheck size={14} className="text-black" />
                                <span className="text-[10px] font-bold uppercase  text-black">
                                    Delivery Type: <span className="text-[#ffcc00]">{(order.orderType || order.deliveryType).replace(/_/g, ' ')}</span>
                                </span>
                            </div>
                        )}

                        <p className="text-[11px] md:text-xs font-bold text-gray-500 mt-6 text-center">
                            Fast Delivery: <span className="text-emerald-600 font-bold">Instant Delivery (60 Mins)</span>
                        </p>

                        {order.deliveryOtpDebug && user && (
                            <div className="mt-6 p-4 bg-emerald-50 rounded-2xl border-2 border-emerald-100 border-dashed text-center">
                                <p className="text-[10px] font-bold uppercase  text-emerald-600 mb-1">Share this OTP with delivery partner</p>
                                <p className="text-2xl font-bold text-emerald-700">{order.deliveryOtpDebug}</p>
                                {['picked_up', 'out_for_delivery'].includes(order.status?.toLowerCase()) && (
                                    <button
                                        onClick={handleResendDeliveryOtp}
                                        disabled={isResendingOtp || resendCooldown > 0}
                                        className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <RefreshCw size={12} className={isResendingOtp ? 'animate-spin' : ''} />
                                        {isResendingOtp ? 'Sending...' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Didn't receive? Resend OTP"}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 mt-6">
                        <button
                            onClick={() => navigate(`/track-order/${orderId}`)}
                            className="flex-1 py-3 bg-black text-white rounded-xl font-bold text-[11px] uppercase hover:bg-gray-800 transition-all active:scale-95 shadow-md shadow-gray-200"
                        >
                            Track Order
                        </button>

                        {(order.status?.toLowerCase() === 'delivered') && (
                            <button
                                onClick={() => setShowReturnModal(true)}
                                className="flex-1 py-3 bg-white text-black border-2 border-black rounded-xl font-bold text-[11px] uppercase  hover:bg-white hover:text-black transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <RefreshCcw size={14} />
                                Return Items
                            </button>
                        )}

                        {order.status?.toLowerCase() === 'return requested' && (
                            <div className="flex-1 py-3 bg-amber-50 text-amber-700 rounded-xl font-bold text-[11px] uppercase  border border-amber-200 flex items-center justify-center gap-2">
                                <Clock size={14} />
                                Return Under Review
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Return Request Modal */}
            {showReturnModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
                                    <AlertTriangle size={20} />
                                </div>
                                <h3 className="text-lg font-bold uppercase ">Return Request</h3>
                            </div>
                            <button
                                onClick={() => setShowReturnModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <p className="text-sm font-bold text-gray-500">
                                Please select a reason for returning the items in order <span className="text-black">#{order.id}</span>.
                            </p>

                            <div className="space-y-2">
                                {RETURN_REASONS.map((reason, idx) => (
                                    <label
                                        key={idx}
                                        className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all cursor-pointer ${returnReason === reason ? 'border-black bg-white' : 'border-gray-100 hover:border-gray-200'}`}
                                    >
                                        <input
                                            type="radio"
                                            name="returnReason"
                                            value={reason}
                                            checked={returnReason === reason}
                                            onChange={(e) => setReturnReason(e.target.value)}
                                            className="w-4 h-4 accent-black"
                                        />
                                        <span className="text-xs font-bold text-gray-700">{reason}</span>
                                    </label>
                                ))}
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    onClick={() => setShowReturnModal(false)}
                                    className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold text-[11px] uppercase hover:bg-gray-200 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleReturnSubmit}
                                    disabled={!returnReason || isSubmitting}
                                    className={`flex-1 py-3 rounded-xl font-bold text-[11px] uppercase  transition-all shadow-lg ${!returnReason || isSubmitting ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-black text-white hover:bg-gray-800 shadow-gray-200'}`}
                                >
                                    {isSubmitting ? 'Submitting...' : 'Submit Request'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AccountLayout>
    );
};

export default OrderDetailsPage;

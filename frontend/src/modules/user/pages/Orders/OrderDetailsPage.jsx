import React, { useEffect, useState, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useParams, useNavigate } from 'react-router-dom';
import AccountLayout from '../../components/Profile/AccountLayout';
import { ArrowLeft, Package, Clock, MapPin, Phone, CreditCard, ChevronRight, Printer, AlertTriangle, RefreshCcw, X, ShieldCheck, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useOrderStore } from '../../../../shared/store/orderStore';
import socketService from '../../../../shared/utils/socket';

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
    const [userUpiId, setUserUpiId] = useState('');
    const [isSubmittingUpi, setIsSubmittingUpi] = useState(false);
    const cooldownRef = useRef(null);



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
                foundOrder = await fetchOrderById(orderId, true);
                if (foundOrder) setOrder(foundOrder);
            } catch (error) {
                console.error("Failed to load order details:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadOrder();
    }, [orderId, fetchOrderById, getOrder]);

    // Socket.io for real-time updates
    useEffect(() => {
        if (!orderId) return;

        socketService.connect();
        socketService.joinRoom(`order_${orderId}`);
        socketService.joinRoom(`guest_${orderId}`);

        const loadLatest = () => {
            console.log('🔄 Fetching latest order data via socket signal...');
            fetchOrderById(orderId, true).then(updated => {
                if (updated) {
                    setOrder(prev => {
                        // Deep merge to ensure we don't lose local state like temporary animations
                        // but strictly update critical data from server
                        return {
                            ...prev,
                            ...updated,
                            deliveryOtpDebug: updated.deliveryOtpDebug || prev?.deliveryOtpDebug
                        };
                    });
                }
            }).catch(err => console.error('Socket refresh failed:', err));
        };

        const handleUpdate = (data) => {
            if (!data.orderId || String(data.orderId) === String(orderId)) {
                console.log('📦 Real-time update received:', data);
                loadLatest();
            }
        };

        socketService.on('order_status_updated', handleUpdate);
        socketService.on('rider_assigned', handleUpdate);
        socketService.on('delivery_otp_sent', (data) => {
            toast.success('🔐 Delivery OTP Updated!', { id: `otp-sock-${orderId}` });
            loadLatest();
        });
        socketService.on('delivery_otp_resent', (data) => {
            toast.success('🔐 New Delivery OTP received!', { id: `otp-sock-${orderId}` });
            loadLatest();
        });

        return () => {
            socketService.leaveRoom(`order_${orderId}`);
            socketService.leaveRoom(`guest_${orderId}`);
            socketService.off('order_status_updated', handleUpdate);
            socketService.off('rider_assigned', handleUpdate);
            socketService.off('delivery_otp_sent');
            socketService.off('delivery_otp_resent');
        };
    }, [orderId, fetchOrderById]);

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
            toast.error('Please allow popups to view the invoice.');
            return;
        }

        // Format the date for the invoice
        const invoiceDate = new Date(order.date).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const invoiceContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Invoice #${order.id}</title>
                <style>
                    * { box-sizing: border-box; }
                    body { font-family: 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #1a1a1a; line-height: 1.5; }
                    .header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid #f0f0f0; padding-bottom: 25px; }
                    .company-name { font-size: 28px; font-weight: 900; letter-spacing: -0.5px; }
                    .company-name span { color: #ffcc00; }
                    .invoice-title { font-size: 36px; font-weight: 800; color: #000; letter-spacing: -1px; }
                    .section-title { font-size: 11px; font-weight: 900; text-transform: uppercase; margin-bottom: 15px; color: #999; letter-spacing: 1.5px; }
                    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 50px; }
                    .table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
                    .table th { text-align: left; border-bottom: 2px solid #000; padding: 12px 10px; font-size: 11px; text-transform: uppercase; font-weight: 900; color: #666; }
                    .table td { border-bottom: 1px solid #f5f5f5; padding: 15px 10px; font-size: 14px; vertical-align: top; }
                    .total-section { display: flex; justify-content: flex-end; }
                    .total-box { width: 250px; }
                    .total-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
                    .total-row.final { font-size: 20px; font-weight: 900; border-top: 2px solid #000; padding-top: 15px; margin-top: 10px; }
                    .footer { margin-top: 80px; text-align: center; border-top: 1px solid #eee; padding-top: 30px; color: #999; font-size: 12px; }
                    .badge { display: inline-block; padding: 4px 12px; border-radius: 50px; background: #000; color: #fff; font-size: 10px; font-weight: 900; text-transform: uppercase; }
                    @media print {
                        body { padding: 20px; }
                        button { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <div class="company-name">CLOUSE<span>.</span></div>
                        <div style="color: #666; font-size: 12px; margin-top: 4px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Premium Fashion Collection</div>
                    </div>
                    <div style="text-align: right;">
                        <div class="invoice-title">INVOICE</div>
                        <div style="color: #111; margin-top: 4px; font-weight: 800;">Order #${order.id}</div>
                        <div style="color: #666; font-size: 13px; margin-top: 2px;">Date: ${invoiceDate}</div>
                    </div>
                </div>

                <div class="info-grid">
                    <div>
                        <div class="section-title">BILLED TO</div>
                        ${order.address ? `
                            <div style="font-weight: 800; font-size: 16px; margin-bottom: 5px;">${order.address.name}</div>
                            <div style="color: #444;">${order.address.address}</div>
                            <div style="color: #444;">${order.address.locality}</div>
                            <div style="color: #444;">${order.address.city}, ${order.address.state} - ${order.address.pincode}</div>
                            <div style="margin-top: 8px; font-weight: 700; color: #222;">Phone: ${order.address.mobile || order.address.phone || 'N/A'}</div>
                        ` : '<div style="color: #ff0000; font-weight: 700;">Address details missing</div>'}
                    </div>
                    <div style="text-align: right;">
                        <div class="section-title">PAYMENT & STATUS</div>
                        <div style="font-weight: 800; text-transform: uppercase; color: #000;">${order.paymentMethod || 'Pay on Delivery'}</div>
                        <div style="margin-top: 25px;">
                            <div class="section-title">ORDER STATUS</div>
                            <div class="badge">${order.status}</div>
                        </div>
                    </div>
                </div>

                <table class="table">
                    <thead>
                        <tr>
                            <th>Item Description</th>
                            <th>Size</th>
                            <th style="text-align: center;">Qty</th>
                            <th style="text-align: right;">Price</th>
                            <th style="text-align: right;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${order.items.map(item => {
                            const price = item.discountedPrice || item.price || 0;
                            const qty = item.quantity || 1;
                            const total = price * qty;
                            return `
                                <tr>
                                    <td>
                                        <div style="font-weight: 800; font-size: 15px;">${item.name}</div>
                                        <div style="color: #888; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-top: 2px;">${item.brand || 'Premium Collection'}</div>
                                    </td>
                                    <td style="font-weight: 700;">${item.selectedSize || 'N/A'}</td>
                                    <td style="text-align: center; font-weight: 700;">${qty}</td>
                                    <td style="text-align: right; font-weight: 700;">₹${price}</td>
                                    <td style="text-align: right; font-weight: 800;">₹${total}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>

                <div class="total-section">
                    <div class="total-box">
                        <div class="total-row">
                            <span style="color: #888; font-weight: 700;">Subtotal:</span>
                            <span style="font-weight: 800;">₹${order.total}</span>
                        </div>
                        <div class="total-row">
                            <span style="color: #888; font-weight: 700;">Shipping:</span>
                            <span style="color: #008000; font-weight: 900;">FREE</span>
                        </div>
                        <div class="total-row final">
                            <span>TOTAL:</span>
                            <span>₹${order.total}</span>
                        </div>
                    </div>
                </div>

                <div class="footer">
                    <p style="font-weight: 800; color: #000; margin-bottom: 5px;">Thank you for shopping with Clouse Fashion!</p>
                    <p>For any queries or returns, please visit your account dashboard or contact support@clouse.com</p>
                    <p style="margin-top: 20px; font-size: 10px;">This is a computer-generated invoice and doesn't require a signature.</p>
                </div>

                <script>
                    window.onload = function() { 
                        setTimeout(function() {
                            window.print();
                        }, 500); 
                    }
                </script>
            </body>
            </html>
        `;

        invoiceWindow.document.open();
        invoiceWindow.document.write(invoiceContent);
        invoiceWindow.document.close();
    };

    const handleReturnSubmit = async () => {
        if (!returnReason) {
            toast.error('Please select a reason for return');
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
            toast.success('Return request submitted successfully. Our team will review it shortly.');
        } catch (error) {
            console.error("Return request failed:", error);
            toast.error(error.message || 'Failed to submit return request. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmitUpi = async () => {
        if (!userUpiId) {
            toast.error('Please enter a valid UPI ID');
            return;
        }
        setIsSubmittingUpi(true);
        try {
            await useOrderStore.getState().submitReturnUPI(order.returnRequest._id, userUpiId);
            toast.success('UPI ID submitted successfully!');
            const updatedOrder = await fetchOrderById(orderId, true);
            if (updatedOrder) setOrder(updatedOrder);
        } catch (error) {
            console.error("UPI submission failed:", error);
            toast.error(error.message || 'Failed to submit UPI ID');
        } finally {
            setIsSubmittingUpi(false);
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
            <div className="max-w-6xl mx-auto px-0.5 md:px-0 pb-10">
                {/* Responsive Header */}
                <div className="flex flex-wrap items-center gap-2 md:gap-4 mb-4 pt-1">
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

                <div className="space-y-3 md:space-y-6">
                    {/* Items Section */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-3 md:p-6 shadow-sm font-bold">
                        <h3 className="text-[10px] md:text-sm font-bold uppercase mb-3 flex items-center gap-2 text-gray-400">
                            <Package size={14} /> Items in Order
                        </h3>
                        <div className="space-y-3">
                            {order.items.map((item, idx) => (
                                <div key={idx} className="flex gap-3 border-b border-gray-50 last:border-0 pb-3 last:pb-0">
                                    <div className="w-14 h-18 md:w-20 md:h-24 bg-white rounded-lg overflow-hidden shrink-0 border border-gray-100">
                                        <img src={item.image} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0 py-0">
                                        <h4 className="text-[12px] md:text-sm font-bold text-gray-900 line-clamp-1">{item.name}</h4>
                                        <p className="text-[8px] md:text-[11px] font-bold text-gray-400 uppercase">
                                            {item.brand || 'Premium Piece'}
                                        </p>
                                        <div className="flex gap-2 mt-1">
                                            <span className="bg-gray-50 px-2 py-0.5 rounded text-[8px] md:text-[10px] font-bold text-gray-600 border border-gray-100 uppercase">
                                                Size: {item.selectedSize || item.variant?.size || 'N/A'}
                                            </span>
                                            {(item.selectedColor || item.variant?.color) && (
                                                <span className="bg-gray-50 px-2 py-0.5 rounded text-[8px] md:text-[10px] font-bold text-gray-600 border border-gray-100 uppercase">
                                                    Color: {item.selectedColor || item.variant?.color}
                                                </span>
                                            )}
                                            <span className="bg-gray-50 px-2 py-0.5 rounded text-[8px] md:text-[10px] font-bold text-gray-600 border border-gray-100 uppercase">
                                                Qty: {item.quantity}
                                            </span>
                                        </div>
                                        <p className="text-[12px] md:text-base font-bold text-black mt-1">₹{item.discountedPrice || item.price}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Delivery & Payment Info Grid */}
                    <div className="grid md:grid-cols-2 gap-3 md:gap-6 font-bold">
                        {/* Delivery Address */}
                        <div className="bg-white rounded-2xl border border-gray-100 p-3 md:p-6 shadow-sm">
                            <h3 className="text-[10px] md:text-sm font-bold uppercase mb-3 flex items-center gap-2 text-gray-400">
                                <MapPin size={14} /> Delivery
                            </h3>
                            {order.address ? (
                                <div className="space-y-1">
                                    <p className="text-[13px] font-bold text-gray-900">{order.address.name}</p>
                                    <p className="text-[10px] md:text-xs text-gray-500 font-medium leading-tight">
                                        {order.address.address}, {order.address.locality} <br />
                                        {order.address.city} - {order.address.pincode || 'N/A'}
                                    </p>
                                    <p className="text-[10px] font-bold text-gray-900 flex items-center gap-2 mt-1">
                                        <Phone size={10} className="text-gray-400" /> {order.address.mobile || 'N/A'}
                                    </p>
                                </div>
                            ) : (
                                <p className="text-[10px] text-gray-400">N/A</p>
                            )}
                        </div>

                        {/* Payment Info */}
                        <div className="bg-white rounded-2xl border border-gray-100 p-3 md:p-6 shadow-sm">
                            <h3 className="text-[10px] md:text-sm font-bold uppercase mb-3 flex items-center gap-2 text-gray-400">
                                <CreditCard size={14} /> Summary
                            </h3>
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-[10px] font-bold text-gray-500">
                                    <span>Subtotal</span>
                                    <span>₹{order.subtotal}</span>
                                </div>
                                {order.discount > 0 && (
                                    <div className="flex justify-between text-[10px] font-bold text-emerald-600">
                                        <span>Discount</span>
                                        <span>-₹{order.discount}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-[10px] font-bold text-gray-500">
                                    <span>Shipping</span>
                                    <span>{order.shipping > 0 ? `₹${order.shipping}` : 'FREE'}</span>
                                </div>
                                {order.tax > 0 && (
                                    <div className="flex justify-between text-[10px] font-bold text-gray-500">
                                        <span>Tax</span>
                                        <span>₹{order.tax}</span>
                                    </div>
                                )}
                                {order.platformFee > 0 && (
                                    <div className="flex justify-between text-[10px] font-bold text-gray-500">
                                        <span>Platform Fee</span>
                                        <span>₹{order.platformFee}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-[10px] font-black text-black pt-1.5 border-t border-gray-50">
                                    <span>Paid via {order.paymentMethod?.toUpperCase() || 'COD'}</span>
                                    <span>₹{order.total}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Order Timeline */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-3 md:p-6 shadow-sm font-bold">
                        <h3 className="text-[10px] md:text-sm font-bold uppercase mb-4 flex items-center gap-2 text-gray-400">
                            <Clock size={14} /> Tracking
                        </h3>

                        {(() => {
                            const status = order.status?.toLowerCase() || 'pending';
                            const isCancelled = status === 'cancelled' || status === 'canceled';

                            let step = 1; // Default to Ordered (1)
                            const midStatuses = ['processing', 'ready_for_pickup', 'accepted', 'assigned', 'picked_up', 'out_for_delivery', 'shipped'];
                            if (midStatuses.includes(status)) step = 2;
                            if (status === 'delivered') step = 3;
                            if (isCancelled) step = 0; // Special case

                            return (
                                <div className="px-1">
                                    {isCancelled ? (
                                        <div className="text-center py-2">
                                            <p className="text-red-500 text-[10px] font-bold uppercase">Order Cancelled</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center relative">
                                                {/* Progress Line Background */}
                                                <div className="absolute top-1/2 left-0 w-full h-[3px] bg-gray-100 -translate-y-1/2 z-0 rounded-full"></div>

                                                {/* Active Progress Line */}
                                                <div
                                                    className="absolute top-1/2 left-0 h-[3px] bg-green-500 -translate-y-1/2 z-0 rounded-full transition-all duration-500"
                                                    style={{ width: step === 3 ? '100%' : step === 2 ? '50%' : '0%' }}
                                                ></div>

                                                {/* Step 1: Ordered */}
                                                <div className={`relative z-10 w-7 h-7 flex items-center justify-center rounded-lg transition-colors duration-300 ${step >= 1 ? 'bg-green-500 text-white shadow-md' : 'bg-gray-100 text-gray-400'}`}>
                                                    <Package size={12} />
                                                </div>

                                                {/* Spacer */}
                                                <div className="flex-1"></div>

                                                {/* Step 2: Shipped */}
                                                <div className={`relative z-10 w-7 h-7 flex items-center justify-center rounded-lg transition-colors duration-300 ${step >= 2 ? 'bg-green-500 text-white shadow-md' : 'bg-gray-100 text-gray-400'}`}>
                                                    <CreditCard size={12} />
                                                </div>

                                                {/* Spacer */}
                                                <div className="flex-1"></div>

                                                {/* Step 3: Delivered */}
                                                <div className={`relative z-10 w-7 h-7 flex items-center justify-center rounded-lg transition-colors duration-300 ${step >= 3 ? 'bg-green-500 text-white shadow-md' : 'bg-gray-100 text-gray-400'}`}>
                                                    <Package size={12} />
                                                </div>
                                            </div>

                                            <div className="flex justify-between text-[8px] font-bold text-gray-400 uppercase mt-2">
                                                <span className={step >= 1 ? 'text-green-600' : ''}>Placed</span>
                                                <span className={step >= 2 ? 'text-green-600 text-center' : 'text-center'}>Shipped</span>
                                                <span className={step >= 3 ? 'text-green-600 text-right' : 'text-right'}>Received</span>
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

                        <p className="text-[10px] md:text-xs font-bold text-gray-500 mt-4 text-center">
                            Instant Delivery (60 Mins)
                        </p>

                        {order.deliveryOtpDebug && user && (
                            <div className="mt-6 p-4 bg-emerald-50 rounded-2xl border-2 border-emerald-100 border-dashed text-center">
                                <p className="text-[10px] font-bold uppercase  text-emerald-600 mb-1">Share this OTP with delivery partner</p>
                                <p className="text-2xl font-bold text-emerald-700">{order.deliveryOtpDebug}</p>
                            </div>
                        )}
                    </div>

                    {/* Return Request & UPI Info */}
                    {order.returnRequest && (
                        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4 shadow-sm font-bold mt-4">
                            <h3 className="text-[10px] md:text-sm font-bold uppercase mb-2 flex items-center gap-2 text-amber-700">
                                <RefreshCw size={14} /> Return Request Details
                            </h3>
                            <div className="space-y-2 text-xs text-amber-900">
                                <div className="flex justify-between">
                                    <span>Status:</span>
                                    <span className="uppercase text-amber-800">{order.returnRequest.status}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Reason:</span>
                                    <span>{order.returnRequest.reason}</span>
                                </div>
                                
                                {order.returnRequest.isUpiRequested && (
                                    <div className="mt-3 pt-3 border-t border-amber-200">
                                        {order.returnRequest.upiId ? (
                                            <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-amber-100">
                                                <span className="text-gray-600">UPI ID Submitted:</span>
                                                <span className="text-black font-extrabold break-all">{order.returnRequest.upiId}</span>
                                            </div>
                                        ) : (
                                            <div className="bg-white p-3 rounded-xl border border-amber-100 space-y-2">
                                                <p className="text-gray-700 text-[10px] font-bold uppercase">Submit UPI ID for Refund</p>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={userUpiId}
                                                        onChange={(e) => setUserUpiId(e.target.value)}
                                                        placeholder="example@upi"
                                                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-black"
                                                    />
                                                    <button
                                                        onClick={handleSubmitUpi}
                                                        disabled={isSubmittingUpi}
                                                        className="px-4 py-2 bg-black text-white rounded-lg text-[10px] font-bold uppercase hover:bg-gray-800 disabled:bg-gray-300 transition-colors"
                                                    >
                                                        {isSubmittingUpi ? '...' : 'Submit'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-2 mt-4">
                        <button
                            onClick={() => navigate(`/track-order/${orderId}`)}
                            className="flex-1 py-3 bg-black text-white rounded-xl font-bold text-[10px] uppercase hover:bg-gray-800 transition-all active:scale-95"
                        >
                            Track Live Order
                        </button>

                        {(() => {
                            const isDelivered = order.status?.toLowerCase() === 'delivered';
                            const deliveredTime = order.deliveredAt ? new Date(order.deliveredAt).getTime() : 0;
                            const now = new Date().getTime();
                            const isWithin24h = deliveredTime && (now - deliveredTime) < (24 * 60 * 60 * 1000);
                            const isTryAndBuy = order.orderType === 'try_and_buy';

                            if (isDelivered && isWithin24h && !isTryAndBuy) {
                                return (
                                    <button
                                        onClick={() => setShowReturnModal(true)}
                                        className="flex-1 py-3 bg-white text-black border-2 border-black rounded-xl font-bold text-[11px] uppercase hover:bg-black hover:text-white transition-all active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        <RefreshCcw size={14} />
                                        Return Items
                                    </button>
                                );
                            }
                            return null;
                        })()}

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

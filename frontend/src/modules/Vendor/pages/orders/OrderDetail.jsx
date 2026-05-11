import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
    FiArrowLeft,
    FiPackage,
    FiMapPin,
    FiUser,
    FiDollarSign,
    FiCamera,
    FiTruck,
    FiPrinter,
    FiDownload
} from 'react-icons/fi';
import closhLogo from "../../../../shared/assets/closh_logo.svg";
import { motion, AnimatePresence } from 'framer-motion';
import { useVendorAuthStore } from '../../store/vendorAuthStore';
import { getVendorOrderById, updateVendorOrderStatus } from '../../services/vendorService';
import { formatPrice } from '../../../../shared/utils/helpers';
import { formatVariantLabel } from '../../../../shared/utils/variant';
import Badge from '../../../../shared/components/Badge';
import AnimatedSelect from '../../../Admin/components/AnimatedSelect';

// CLOSH official address used on all vendor invoices
const CLOSH_ADDRESS = "CLOSH Headquarters, 123 Business Avenue, Mumbai, Maharashtra, 400001, India";
import toast from 'react-hot-toast';
import socketService from '../../../../shared/utils/socket';

import { IMAGE_BASE_URL } from '../../../../shared/utils/constants';

const getFullImageUrl = (image) => {
    if (!image) return null;
    if (image.startsWith('http') || image.startsWith('data:')) return image;
    const cleanImage = image.startsWith('/') ? image : `/${image}`;
    return `${IMAGE_BASE_URL}${cleanImage}`;
};

const OrderDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { vendor } = useVendorAuthStore();

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [updatingStatus, setUpdatingStatus] = useState(false);

    const vendorId = vendor?.id || vendor?._id;
    const shippingAddress = order?.shippingAddress ?? order?.address ?? null;
    const customerName =
        order?.customer?.name ??
        order?.userId?.name ??
        order?.guestInfo?.name ??
        order?.shippingAddress?.name ??
        order?.address?.name ??
        'Guest';
    const customerEmail =
        order?.customer?.email ??
        order?.userId?.email ??
        order?.guestInfo?.email ??
        order?.shippingAddress?.email ??
        order?.address?.email ??
        'N/A';
    const customerPhone =
        order?.customer?.phone ??
        order?.userId?.phone ??
        order?.guestInfo?.phone ??
        order?.shippingAddress?.phone ??
        order?.address?.phone ??
        order?.shippingAddress?.mobile ??
        'N/A';

    useEffect(() => {
        if (!id || !vendorId) return;

        const fetchOrder = async () => {
            setLoading(true);
            try {
                const res = await getVendorOrderById(id);
                const data = res?.data ?? res;
                setOrder(data ?? null);
            } catch {
                // api.js shows toast
                setOrder(null);
            } finally {
                setLoading(false);
            }
        };

        fetchOrder();

        // Real-time socket updates (connection managed by VendorHeader)
        if (id) {
            socketService.joinRoom(`order_${id}`);
        }

        const handleRealTimeUpdate = (data) => {
            const displayId = id;
            if (data.orderId === displayId) {
                fetchOrder();
            }
        };

        socketService.on('order_picked_up', handleRealTimeUpdate);
        socketService.on('order_delivered', handleRealTimeUpdate);
        socketService.on('order_status_updated', handleRealTimeUpdate);

        return () => {
            socketService.off('order_picked_up');
            socketService.off('order_delivered');
            socketService.off('order_status_updated');
        };
    }, [id, vendorId]);

    const handleStatusChange = async (newStatus) => {
        if (!order) return;

        // Verify the order ID exists
        const orderId = order.orderId ?? order._id;
        if (!orderId) {
            toast.error('Order ID is missing. Cannot update status.');
            return;
        }

        // Verify the status is valid
        if (!newStatus || typeof newStatus !== 'string') {
            toast.error('Invalid status selected.');
            return;
        }

        console.log('🔵 Sending status update request:', { orderId, newStatus });

        setUpdatingStatus(true);
        try {
            const response = await updateVendorOrderStatus(orderId, newStatus);
            console.log('✅ Status update response:', response);

            // Optimistically update local state
            setOrder((prev) => ({
                ...prev,
                vendorItems: prev.vendorItems?.map((vi) =>
                    vi.vendorId?.toString() === vendorId?.toString()
                        ? { ...vi, status: newStatus }
                        : vi
                ),
                status: newStatus,
            }));
            toast.success(`Order status updated to ${newStatus}`);
        } catch (error) {
            // Show specific error message from API
            const errorDetails = {
                message: error?.response?.data?.message || error?.message || 'Failed to update order status',
                status: error?.response?.status,
                data: error?.response?.data,
                fullError: error
            };

            console.error('❌ Status update error:', errorDetails);
            toast.error(errorDetails.message);
        } finally {
            setUpdatingStatus(false);
        }
    };

    const statusOptions = [
        { value: 'pending', label: 'Pending', color: 'yellow' },
        { value: 'accepted', label: 'Accepted (Start Preparing)', color: 'blue' },
        { value: 'ready_for_pickup', label: 'Ready for Pickup', color: 'indigo' },
        { value: 'picked_up', label: 'Picked Up by Rider', color: 'purple' },
        { value: 'out_for_delivery', label: 'Out for Delivery', color: 'orange' },
        { value: 'delivered', label: 'Delivered', color: 'green' },
        { value: 'cancelled', label: 'Cancelled', color: 'red' },
    ];

    const transitionMap = {
        pending: ['accepted', 'cancelled'],
        accepted: ['ready_for_pickup', 'cancelled'],
        ready_for_pickup: ['ready_for_pickup'], // Moving to picked_up is handled by delivery partner
        picked_up: ['picked_up'],
        out_for_delivery: ['out_for_delivery'],
        delivered: ['delivered'],
        cancelled: ['cancelled'],
    };

    // Derive per-vendor status from vendorItems
    const vendorItem = order?.vendorItems?.find(
        (vi) => vi.vendorId?.toString() === vendorId?.toString()
    );
    const currentStatus = String(vendorItem?.status ?? order?.status ?? 'pending').toLowerCase();
    const allowedStatuses = transitionMap[currentStatus] || [currentStatus];
    const visibleStatusOptions = statusOptions.filter((option) =>
        allowedStatuses.includes(option.value)
    );

    // Items this vendor sold in this order
    const vendorItems = vendorItem?.items ?? [];
    const vendorSubtotal = vendorItem?.basePrice ?? 
                          vendorItem?.items?.reduce((sum, it) => sum + (it.vendorPrice ?? it.price ?? 0) * (it.quantity ?? 1), 0) ??
                          vendorItem?.subtotal ?? 0;

    const [showInvoice, setShowInvoice] = useState(false);

    const handlePrint = () => {
        window.print();
    };

    const InvoiceModal = () => {
        if (!order) return null;

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden my-8"
                >
                    {/* Action Bar */}
                    <div className="p-4 bg-gray-50 border-b flex justify-between items-center no-print">
                        <h3 className="font-bold text-gray-800">Order Invoice</h3>
                        <div className="flex gap-2">
                                <button
                                    onClick={handlePrint}
                                    className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-bold shadow-lg shadow-teal-200"
                                >
                                    <FiDownload /> Download PDF
                                </button>
                            <button
                                onClick={() => setShowInvoice(false)}
                                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-bold"
                            >
                                Close
                            </button>
                        </div>
                    </div>

                    {/* Printable Area */}
                    <div id="printable-invoice" className="p-8 sm:p-12 bg-white text-gray-800 font-sans">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-8 mb-12">
                            <div className="space-y-2 flex items-center gap-4">
                                <img src={closhLogo} alt="CLOSH Logo" className="h-12 w-auto" />
                                <h1 className="text-4xl font-black text-teal-600 tracking-tighter">CLOSH</h1>
                            </div>
                            <div className="text-sm text-gray-500 space-y-1">
                                <p className="font-bold text-gray-800 uppercase">{vendor?.storeName || 'Vendor Official'}</p>
                                <p>{vendor?.shopAddress || 'Vendor Store Address'}</p>
                                {vendor?.gstNumber && <p>GSTIN: {vendor.gstNumber}</p>}
                                <p>Phone: {vendor?.phone || 'N/A'}</p>
                                <p className="mt-2 text-gray-600">{CLOSH_ADDRESS}</p>
                            </div>
                            <div className="text-right">
                                <h2 className="text-2xl font-bold text-gray-900 mb-1">INVOICE</h2>
                                <p className="text-gray-500 text-sm">#{order.orderId || order._id}</p>
                                <p className="text-gray-500 text-sm">Date: {new Date(order.createdAt).toLocaleDateString()}</p>
                                <div className="mt-4 flex flex-col items-end gap-2">
                                    <Badge variant={order.paymentStatus === 'paid' ? 'delivered' : 'pending'}>
                                        {order.paymentStatus?.toUpperCase() || 'PENDING'}
                                    </Badge>
                                    <span className={`px-2 py-1 ${(order.paymentMethod === 'cod' || order.paymentMethod === 'cash') ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'} text-[10px] font-bold rounded border uppercase`}>
                                        {(order.paymentMethod === 'cod' || order.paymentMethod === 'cash') ? 'Cash on Delivery' : 'Prepaid'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12 py-8 border-y border-gray-100">
                        {/* Billed From (Vendor) */}
                        <div className="space-y-3 p-4 bg-gray-50 rounded-lg shadow-sm">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Billed From (Vendor)</h3>
                            <div className="space-y-1">
                                <p className="font-bold text-lg text-gray-900">{vendor?.storeName || 'Our Store'}</p>
                                <p className="text-sm text-gray-600 leading-relaxed max-w-xs">{vendor?.shopAddress}</p>
                                {vendor?.gstNumber && <p className="text-sm font-semibold text-gray-700">GST: {vendor.gstNumber}</p>}
                                {vendor?.phone && <p className="text-sm text-gray-500">Tel: {vendor.phone}</p>}
                            </div>
                        </div>
                        {/* Billed To (Customer) */}
                        <div className="space-y-3 p-4 bg-gray-50 rounded-lg shadow-sm">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Billed To (Customer)</h3>
                            <div className="space-y-1">
                                <p className="font-bold text-lg text-gray-900">{customerName}</p>
                                <p className="text-sm text-gray-600 leading-relaxed max-w-xs">
                                    {shippingAddress?.address || shippingAddress?.street}, {shippingAddress?.city}, {shippingAddress?.state} - {shippingAddress?.zipCode}<br/>{shippingAddress?.country}
                                </p>
                                <p className="text-sm text-gray-500">Phone: {customerPhone}</p>
                                <p className="text-sm text-gray-500">Email: {customerEmail}</p>
                            </div>
                        </div>
                        </div>

                        <table className="w-full mb-12">
                            <thead>
                                <tr className="border-b-2 border-teal-600 bg-teal-100 text-teal-800">
                                    <th className="py-4 text-left text-xs font-black uppercase tracking-wider">Product Description</th>
                                    <th className="py-4 text-right text-xs font-black uppercase tracking-wider">Unit Price</th>
                                    <th className="py-4 text-center text-xs font-black uppercase tracking-wider">Qty</th>
                                    <th className="py-4 text-right text-xs font-black uppercase tracking-wider">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {vendorItems.map((item, idx) => (
                                    <tr key={idx} className="group">
                                        <td className="py-6">
                                            <p className="font-bold text-gray-900">{item.name}</p>
                                            {formatVariantLabel(item.variant) && (
                                                <p className="text-xs text-gray-400 mt-1">{formatVariantLabel(item.variant)}</p>
                                            )}
                                        </td>
                                        <td className="py-6 text-right font-medium text-gray-600">{formatPrice(item.vendorPrice ?? item.price ?? 0)}</td>
                                        <td className="py-6 text-center font-bold text-gray-900">{item.quantity}</td>
                                        <td className="py-6 text-right font-bold text-gray-900">{formatPrice((item.vendorPrice ?? item.price ?? 0) * item.quantity)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="flex justify-end">
                            <div className="w-full max-w-xs space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Your Base Price</span>
                                    <span className="font-bold text-gray-900">{formatPrice(vendorSubtotal)}</span>
                                </div>
                                <div className="flex justify-between text-sm border-t border-dashed border-gray-200 pt-2">
                                    <span className="text-gray-500">Platform Commission</span>
                                    <span className="font-bold text-red-500">-{formatPrice(vendorItem?.commissionAmount || 0)}</span>
                                </div>
                                <div className="flex justify-between text-sm border-t border-dashed border-gray-200 pt-2">
                                    <span className="text-gray-500">Payment Method</span>
                                    <span className="font-bold text-gray-900 uppercase">{(order.paymentMethod === 'cod' || order.paymentMethod === 'cash') ? 'COD' : 'Prepaid'}</span>
                                </div>
                                <div className="pt-4 border-t-2 border-gray-900 flex justify-between items-center">
                                    <span className="text-lg font-black text-gray-900 uppercase">Vendor Earning</span>
                                    <span className="text-2xl font-black text-emerald-600">{formatPrice(vendorItem?.vendorEarnings || 0)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-20 pt-12 border-t border-gray-100 text-center">
                            <p className="text-xs text-gray-400 font-medium italic">Thank you for your business. This is an automated vendor invoice from CLOSH.</p>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="p-6 text-center">
                <p className="text-gray-500">Loading order details...</p>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="p-6 text-center space-y-3">
                <p className="text-gray-700 font-semibold">Order not found</p>
                <p className="text-sm text-gray-500">
                    Order #{id} may not belong to your store.
                </p>
                <Link
                    to="/vendor/orders"
                    className="inline-block text-blue-600 hover:underline text-sm"
                >
                    ← Back to Orders
                </Link>
            </div>
        );
    }

    return (
        <>
            {/* Global Print Styles */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #printable-invoice, #printable-invoice * {
                        visibility: visible;
                    }
                    #printable-invoice {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                }
            `}} />

            <AnimatePresence>
                {showInvoice && <InvoiceModal />}
            </AnimatePresence>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
            >
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Link
                        to="/vendor/orders"
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <FiArrowLeft className="text-gray-600" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            Order #{order.orderId ?? order._id}
                            {order.orderType && (
                                <span className={`px-2 py-0.5 ${order.orderType === 'try_and_buy' ? 'bg-orange-50 text-orange-700 border-orange-100' : 'bg-blue-50 text-blue-700 border-blue-100'} text-[10px] font-bold rounded-lg border uppercase  shadow-sm animate-pulse`}>
                                    {order.orderType.replace(/_/g, ' ')}
                                </span>
                            )}
                        </h1>
                        <p className="text-sm text-gray-500">
                            Placed on{' '}
                            {order.createdAt
                                ? new Date(order.createdAt).toLocaleDateString()
                                : '—'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowInvoice(true)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-bold shadow-sm"
                    >
                        <FiDownload className="text-sm" />
                        Download Invoice
                    </button>
                    <AnimatedSelect
                        options={visibleStatusOptions}
                        value={currentStatus}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        disabled={updatingStatus}
                        color={
                            visibleStatusOptions.find((opt) => opt.value === currentStatus)
                                ?.color || 'gray'
                        }
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Order Items */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-200">
                            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                                <FiPackage />
                                Your Items in this Order
                            </h2>
                        </div>
                        <div className="divide-y divide-gray-200">
                            {vendorItems.length > 0 ? (
                                vendorItems.map((item, index) => (
                                    <div key={index} className="p-4 flex gap-4">
                                        <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                            <img
                                                src={getFullImageUrl(item.image)}
                                                alt={item.name}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    e.target.src =
                                                        'https://via.placeholder.com/64?text=P';
                                                }}
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="font-medium text-gray-800">
                                                        {item.name}
                                                    </h3>
                                                    <div className="flex flex-col gap-1">
                                                        <p className="text-sm text-gray-500">
                                                            Qty: {item.quantity}
                                                        </p>
                                                        {formatVariantLabel(item?.variant) && (
                                                            <p className="text-[11px] text-gray-400 font-medium">
                                                                {formatVariantLabel(item?.variant)}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <p className="font-semibold text-gray-800">
                                                    {formatPrice(
                                                        (item.vendorPrice ?? item.price ?? 0) * (item.quantity ?? 1)
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-6 text-center text-gray-500 text-sm">
                                    No item details available for this order.
                                </div>
                            )}
                        </div>
                        {vendorSubtotal > 0 && (
                            <div className="p-4 border-t border-gray-200 flex justify-end">
                                <div className="text-right">
                                    <p className="text-sm text-gray-500">
                                        Your Total Base Price
                                    </p>
                                    <p className="text-lg font-bold text-gray-800">
                                        {formatPrice(vendorSubtotal)}
                                    </p>
                                    <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Platform Commission</span>
                                            <span className="text-red-500">-{formatPrice(vendorItem?.commissionAmount || 0)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm font-bold pt-1 border-t border-dashed border-gray-100">
                                            <span className="text-gray-800">Your Net Earning</span>
                                            <span className="text-emerald-600">{formatPrice(vendorItem?.vendorEarnings || 0)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Proof of Delivery Card */}
                    {(order.readyPhoto || order.pickupPhoto || order.deliveryPhoto || order.openBoxPhoto) && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mt-6">
                            <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                <FiCamera className="text-blue-600" />
                                Proof & Verification Photos
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                {order.readyPhoto && (
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase ">Package Ready Proof</p>
                                        <div className="relative aspect-video bg-white rounded-lg overflow-hidden border border-gray-100 group">
                                            <img
                                                src={getFullImageUrl(order.readyPhoto)}
                                                alt="Ready Proof"
                                                className="w-full h-full object-cover cursor-pointer transition-transform group-hover:scale-105"
                                                onClick={() => window.open(getFullImageUrl(order.readyPhoto), '_blank')}
                                            />
                                        </div>
                                    </div>
                                )}
                                {order.pickupPhoto && (
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase ">Pickup Proof</p>
                                        <div className="relative aspect-video bg-white rounded-lg overflow-hidden border border-gray-100 group">
                                            <img
                                                src={getFullImageUrl(order.pickupPhoto)}
                                                alt="Pickup Proof"
                                                className="w-full h-full object-cover cursor-pointer transition-transform group-hover:scale-105"
                                                onClick={() => window.open(getFullImageUrl(order.pickupPhoto), '_blank')}
                                            />
                                        </div>
                                    </div>
                                )}
                                {order.deliveryPhoto && (
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase ">Delivery Proof</p>
                                        <div className="relative aspect-video bg-white rounded-lg overflow-hidden border border-gray-100 group">
                                            <img
                                                src={getFullImageUrl(order.deliveryPhoto)}
                                                alt="Delivery Proof"
                                                className="w-full h-full object-cover cursor-pointer transition-transform group-hover:scale-105"
                                                onClick={() => window.open(getFullImageUrl(order.deliveryPhoto), '_blank')}
                                            />
                                        </div>
                                    </div>
                                )}
                                {order.openBoxPhoto && (
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase ">Open Box Proof</p>
                                        <div className="relative aspect-video bg-white rounded-lg overflow-hidden border border-gray-100 group">
                                            <img
                                                src={getFullImageUrl(order.openBoxPhoto)}
                                                alt="Open Box Proof"
                                                className="w-full h-full object-cover cursor-pointer transition-transform group-hover:scale-105"
                                                onClick={() => window.open(getFullImageUrl(order.openBoxPhoto), '_blank')}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Customer Info */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <FiUser />
                            Customer Details
                        </h2>
                        <div className="space-y-3">
                            <div>
                                <p className="text-sm text-gray-500">Name</p>
                                <p className="font-medium">{customerName}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Email</p>
                                <p className="font-medium truncate">{customerEmail}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Mobile</p>
                                <p className="text-[10px] italic text-gray-400">Available only to delivery partner</p>
                            </div>
                        </div>
                    </div>

                    {/* Delivery Partner (Assigned) */}
                    {order.deliveryBoyId && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <FiTruck className="text-indigo-500" />
                                Assigned Partner
                            </h2>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0 border border-indigo-100 overflow-hidden">
                                    {order.deliveryBoyId.profileImage ? (
                                        <img 
                                            src={getFullImageUrl(order.deliveryBoyId.profileImage)} 
                                            alt="Rider" 
                                            className="w-full h-full object-cover" 
                                        />
                                    ) : (
                                        <FiTruck className="text-indigo-600 text-xl" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-gray-800 truncate">
                                        {order.deliveryBoyId.name || 'Delivery Partner'}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {order.deliveryBoyId.phone || 'N/A'}
                                    </p>
                                    {order.deliveryBoyId.vehicleNumber && (
                                        <p className="text-[10px] text-gray-400 mt-0.5">
                                            Vehicle: {order.deliveryBoyId.vehicleNumber}
                                        </p>
                                    )}
                                </div>
                                {order.deliveryBoyId.phone && (
                                    <a
                                        href={`tel:${order.deliveryBoyId.phone}`}
                                        className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                                        title="Call Partner"
                                    >
                                        <FiUser />
                                    </a>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Payment Info */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <FiDollarSign className="text-emerald-500" />
                            Payment Overview
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase  mb-1">Payment Method</p>
                                <div className="flex items-center gap-2">
                                    {(order.paymentMethod === 'cod' || order.paymentMethod === 'cash') ? (
                                        <span className="px-2 py-1 bg-purple-50 text-purple-700 text-[10px] font-bold rounded border border-purple-100 uppercase er flex items-center gap-1">
                                            <FiDollarSign /> Cash on Delivery
                                        </span>
                                    ) : (
                                        <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded border border-emerald-100 uppercase er">
                                            Prepaid
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase  mb-1">Payment Status</p>
                                <Badge variant={order.paymentStatus === 'paid' ? 'delivered' : 'pending'}>
                                    {order.paymentStatus?.replace(/_/g, ' ')?.toUpperCase() || 'PENDING'}
                                </Badge>
                                {(order.paymentMethod === 'cod' || order.paymentMethod === 'cash') && order.paymentStatus === 'paid' && (
                                    <p className="text-[9px] text-gray-400 font-medium mt-1 italic">
                                        * Collected by Delivery Partner
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Shipping Address */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <FiMapPin />
                            Shipping Address
                        </h2>
                        {shippingAddress ? (
                            <p className="text-gray-600 text-sm leading-relaxed">
                                {shippingAddress.address ?? shippingAddress.street ?? 'N/A'}
                                <br />
                                {shippingAddress.city}, {shippingAddress.state}{' '}
                                {shippingAddress.zipCode}
                                <br />
                                {shippingAddress.country}
                            </p>
                        ) : (
                            <p className="text-sm text-gray-400">
                                No address available
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </motion.div >
        </>
    );
};

export default OrderDetail;

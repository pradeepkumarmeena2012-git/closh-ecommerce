import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../shared/utils/api';
import {
    Package, MapPin, CheckCircle, ChevronRight, Truck, ShieldCheck,
    Phone, Clock, AlertCircle, Loader2, Store, Navigation, QrCode
} from 'lucide-react';

const STATUS_CONFIG = {
    pending: { label: 'Pending', color: 'bg-slate-100 text-slate-500', icon: Clock },
    arrived: { label: 'Arrived', color: 'bg-amber-100 text-amber-600', icon: Navigation },
    otp_verified: { label: 'OTP Verified', color: 'bg-blue-100 text-blue-600', icon: ShieldCheck },
    picked_up: { label: 'Picked Up', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
};

export default function MultiVendorPickup() {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [batch, setBatch] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState('');
    const [otpInputs, setOtpInputs] = useState({});
    const [showOtpFor, setShowOtpFor] = useState(null);
    const [customerOtp, setCustomerOtp] = useState('');
    const [showCustomerOtp, setShowCustomerOtp] = useState(false);

    const fetchOrder = useCallback(async () => {
        try {
            const res = await api.get(`/delivery/multi-vendor/${orderId}/status`);
            const orderData = res.data;
            setOrder(orderData.order);
            const b = orderData.batch;
            setBatch(b);
            if (b?.status === 'arrived') {
                setShowCustomerOtp(true);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load order.');
        } finally {
            setLoading(false);
        }
    }, [orderId]);

    useEffect(() => { fetchOrder(); }, [fetchOrder]);

    const doAction = async (fn) => {
        setActionLoading(true);
        setError('');
        try {
            await fn();
            await fetchOrder();
        } catch (err) {
            setError(err.response?.data?.message || 'Action failed. Try again.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleImageUpload = async (e, vendorId) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);
        formData.append('orderId', order?._id || order?.id);
        formData.append('vendorId', vendorId);

        setActionLoading(true);
        setError('');
        try {
            await api.post('/delivery/uploads/image', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            await fetchOrder();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to upload proof photo.');
        } finally {
            setActionLoading(false);
        }
    };

    const arriveAtStop = (vendorId) => doAction(() =>
        api.post(`/delivery/multi-vendor/${orderId}/stops/${vendorId}/arrive`)
    );

    const verifyOtp = (vendorId) => doAction(async () => {
        await api.post(`/delivery/multi-vendor/${orderId}/stops/${vendorId}/verify-otp`, { otp: otpInputs[vendorId] });
        setShowOtpFor(null);
    });

    const confirmPickup = (vendorId) => doAction(() =>
        api.post(`/delivery/multi-vendor/${orderId}/stops/${vendorId}/pickup`)
    );

    const startDelivery = () => doAction(() =>
        api.post(`/delivery/multi-vendor/${orderId}/start-delivery`)
    );

    const arriveCustomer = () => doAction(async () => {
        const { data } = await api.post(`/delivery/multi-vendor/${orderId}/arrive-customer`);
        setShowCustomerOtp(true);
    });

    const completeDelivery = () => doAction(() =>
        api.post(`/delivery/multi-vendor/${orderId}/complete`, { otp: customerOtp })
    );

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
            <Loader2 className="animate-spin text-slate-400" size={36} />
        </div>
    );

    if (!order) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4 p-6">
            <AlertCircle className="text-red-400" size={48} />
            <p className="text-slate-600 font-semibold text-center">{error || 'Order not found.'}</p>
            <button onClick={() => navigate(-1)} className="px-6 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold">Go Back</button>
        </div>
    );

    const stops = order.vendorPickups || [];
    const completedStops = stops.filter(s => s.status === 'picked_up').length;
    const allPicked = completedStops === stops.length && stops.length > 0;
    const progressPct = stops.length > 0 ? Math.round((completedStops / stops.length) * 100) : 0;

    const currentStop = stops.find(s => s.status !== 'picked_up');

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-32">
            {/* Header */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white px-5 pt-14 pb-8">
                <button onClick={() => navigate(-1)} className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-1">
                    ← Back
                </button>
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
                        <Truck size={20} className="text-white" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Multi-Vendor Order</p>
                        <h1 className="text-lg font-black">#{order.orderId}</h1>
                    </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase">{completedStops}/{stops.length} Stops</span>
                    <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                            style={{ width: `${progressPct}%` }}
                        />
                    </div>
                    <span className="text-xs font-black text-emerald-400">{progressPct}%</span>
                </div>
            </div>

            {/* Error banner */}
            {error && (
                <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
                    <AlertCircle size={16} className="text-red-500 shrink-0" />
                    <p className="text-red-600 text-xs font-bold">{error}</p>
                </div>
            )}

            {/* Customer Delivery Info */}
            <div className="mx-4 mt-5 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
                        <MapPin size={14} className="text-white" />
                    </div>
                    <div>
                        <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Deliver To</p>
                        <p className="text-sm font-black text-slate-900">{order.shippingAddress?.name}</p>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                            {order.shippingAddress?.address}, {order.shippingAddress?.city}
                        </p>
                        {order.shippingAddress?.phone && (
                            <a href={`tel:${order.shippingAddress.phone}`} className="flex items-center gap-1 text-xs font-bold text-blue-600 mt-1">
                                <Phone size={10} /> {order.shippingAddress.phone}
                            </a>
                        )}
                    </div>
                </div>
            </div>

            {/* Pickup Stops */}
            <div className="mx-4 mt-5">
                <p className="text-xs font-black uppercase text-slate-400 tracking-widest mb-3">Pickup Stops</p>
                <div className="space-y-4">
                    {stops.map((stop, idx) => {
                        const isActive = stop === currentStop;
                        const isPicked = stop.status === 'picked_up';
                        const statusCfg = STATUS_CONFIG[stop.status] || STATUS_CONFIG.pending;
                        const StatusIcon = statusCfg.icon;

                        const coords = stop.shopLocation?.coordinates || stop.location?.coordinates;
                        const [lng, lat] = coords || [];
                        const mapsUrl = coords && coords[0] !== 0 ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}` : null;

                        return (
                            <div
                                key={String(stop.vendorId)}
                                className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all duration-300 ${
                                    isActive ? 'border-slate-900 shadow-slate-900/10' : isPicked ? 'border-emerald-200' : 'border-slate-100 opacity-60'
                                }`}
                            >
                                {/* Stop Header */}
                                <div className={`flex items-center gap-3 p-4 ${isPicked ? 'bg-emerald-50' : isActive ? 'bg-slate-900' : 'bg-slate-50'}`}>
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm font-black ${isPicked ? 'bg-emerald-500 text-white' : isActive ? 'bg-white text-slate-900' : 'bg-slate-200 text-slate-500'}`}>
                                        {isPicked ? <CheckCircle size={16} /> : idx + 1}
                                    </div>
                                    <div className="flex-1">
                                        <p className={`text-sm font-black ${isActive ? 'text-white' : isPicked ? 'text-emerald-700' : 'text-slate-600'}`}>
                                            {stop.vendorName}
                                        </p>
                                        {stop.shopAddress && (
                                            <p className={`text-[11px] font-medium mt-0.5 ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>
                                                {stop.shopAddress}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${statusCfg.color}`}>
                                            {statusCfg.label}
                                        </span>
                                        {mapsUrl && !isPicked && (
                                            <a
                                                href={mapsUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black transition-all active:scale-95 border ${
                                                    isActive 
                                                        ? 'bg-white/10 hover:bg-white/20 text-white border-white/10' 
                                                        : 'bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-100'
                                                }`}
                                            >
                                                <Navigation size={10} className="rotate-45" />
                                                Navigate
                                            </a>
                                        )}
                                    </div>
                                </div>

                                {/* Action Area — only for active stop */}
                                {isActive && (
                                    <div className="p-4 space-y-4">
                                        {/* Step 1: Arrive */}
                                        {stop.status === 'pending' && (
                                            <button
                                                onClick={() => arriveAtStop(stop.vendorId)}
                                                disabled={actionLoading}
                                                className="w-full py-3 bg-amber-500 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-60"
                                            >
                                                {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Navigation size={16} />}
                                                Mark Arrived at {stop.vendorName}
                                            </button>
                                        )}

                                        {/* Step 2: Enter vendor OTP */}
                                        {stop.status === 'arrived' && (
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Ask vendor for their OTP</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="number"
                                                        placeholder="Enter 6-digit OTP"
                                                        className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-center text-xl font-black tracking-[0.3em] focus:outline-none focus:border-slate-900"
                                                        value={otpInputs[stop.vendorId] || ''}
                                                        onChange={e => setOtpInputs(p => ({ ...p, [stop.vendorId]: e.target.value }))}
                                                        maxLength={6}
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => verifyOtp(stop.vendorId)}
                                                    disabled={actionLoading || !otpInputs[stop.vendorId]?.length}
                                                    className="w-full py-3 bg-blue-600 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-60"
                                                >
                                                    {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                                                    Verify OTP
                                                </button>
                                            </div>
                                        )}

                                        {/* Step 3: Confirm pickup */}
                                        {stop.status === 'otp_verified' && (
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
                                                    <ShieldCheck size={16} className="text-blue-500 shrink-0" />
                                                    <p className="text-xs font-bold text-blue-700">OTP verified! Collect all items from vendor.</p>
                                                </div>
                                                <button
                                                    onClick={() => confirmPickup(stop.vendorId)}
                                                    disabled={actionLoading}
                                                    className="w-full py-3 bg-emerald-500 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-60"
                                                >
                                                    {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Package size={16} />}
                                                    Confirm Pickup from {stop.vendorName}
                                                </button>
                                            </div>
                                        )}

                                        {/* Proof Image Upload */}
                                        {stop.status !== 'pending' && (
                                            <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                                <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider mb-2">Proof of Pickup (Photo)</p>
                                                {stop.proofPhoto ? (
                                                    <div className="relative w-full h-32 rounded-lg overflow-hidden border border-slate-200 group">
                                                        <img src={stop.proofPhoto} alt="Pickup proof" className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <label className="cursor-pointer px-3 py-1.5 bg-white text-slate-900 text-xs font-bold rounded-lg shadow hover:bg-slate-100">
                                                                Change Photo
                                                                <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, stop.vendorId)} />
                                                            </label>
                                                        </div>
                                                        <div className="absolute top-2 right-2 bg-emerald-500 text-white p-1 rounded-full shadow-sm">
                                                            <CheckCircle size={14} />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <label className="flex flex-col items-center justify-center w-full h-24 border border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-100/50 transition-colors">
                                                        <div className="flex flex-col items-center justify-center pt-2 pb-2">
                                                            <QrCode size={20} className="text-slate-400 mb-1" />
                                                            <p className="text-[11px] text-slate-500 font-bold">Tap to Upload Shop Photo</p>
                                                            <p className="text-[9px] text-slate-400 mt-0.5">JPEG, PNG up to 5MB</p>
                                                        </div>
                                                        <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, stop.vendorId)} />
                                                    </label>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Picked up info and photo */}
                                {isPicked && (
                                    <div className="px-4 pb-4 space-y-2">
                                        {stop.pickedUpAt && (
                                            <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                                                ✓ Picked up at {new Date(stop.pickedUpAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        )}
                                        {stop.proofPhoto && (
                                            <div className="w-20 h-20 rounded-lg overflow-hidden border border-slate-100">
                                                <img src={stop.proofPhoto} alt="Pickup proof" className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Final Delivery Actions */}
            {allPicked && (
                <div className="mx-4 mt-5 space-y-3">
                    {order.status === 'picked_up' && (
                        <button
                            onClick={startDelivery}
                            disabled={actionLoading}
                            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-base flex items-center justify-center gap-3 active:scale-95 transition-transform disabled:opacity-60 shadow-lg"
                        >
                            {actionLoading ? <Loader2 size={20} className="animate-spin" /> : <Truck size={20} />}
                            Start Final Delivery
                        </button>
                    )}

                    {order.status === 'out_for_delivery' && batch?.status !== 'arrived' && (
                        <button
                            onClick={arriveCustomer}
                            disabled={actionLoading}
                            className="w-full py-4 bg-amber-500 text-white rounded-2xl font-black text-base flex items-center justify-center gap-3 active:scale-95 transition-transform disabled:opacity-60 shadow-lg"
                        >
                            {actionLoading ? <Loader2 size={20} className="animate-spin" /> : <MapPin size={20} />}
                            Arrived at Customer Location
                        </button>
                    )}

                    {order.status === 'out_for_delivery' && showCustomerOtp && (
                        <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-3">
                            <div className="flex justify-between items-center">
                                <p className="text-xs font-black uppercase text-slate-500 tracking-widest">Customer Delivery OTP</p>
                            </div>
                            <input
                                type="number"
                                placeholder="Enter customer OTP"
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-center text-2xl font-black tracking-[0.3em] focus:outline-none focus:border-slate-900"
                                value={customerOtp}
                                onChange={e => setCustomerOtp(e.target.value)}
                                maxLength={6}
                            />
                            <button
                                onClick={completeDelivery}
                                disabled={actionLoading || !customerOtp}
                                className="w-full py-3 bg-emerald-500 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-60"
                            >
                                {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                                Complete Delivery
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Success */}
            {order.status === 'delivered' && (
                <div className="mx-4 mt-6 p-6 bg-emerald-50 rounded-2xl border border-emerald-200 text-center">
                    <CheckCircle size={40} className="text-emerald-500 mx-auto mb-3" />
                    <p className="text-lg font-black text-emerald-700">Order Delivered!</p>
                    <p className="text-xs text-emerald-600 mt-1">Multi-vendor order successfully completed.</p>
                    <button onClick={() => navigate('/delivery/orders')} className="mt-4 px-6 py-2 bg-emerald-500 text-white rounded-xl font-black text-sm">
                        Back to Orders
                    </button>
                </div>
            )}
        </div>
    );
}

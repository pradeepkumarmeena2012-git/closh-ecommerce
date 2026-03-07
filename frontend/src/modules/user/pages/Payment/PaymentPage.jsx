import { useOrderStore } from '../../../../shared/store/orderStore';
import { useAddressStore } from '../../../../shared/store/addressStore';
import toast from 'react-hot-toast';
import api from '../../../../shared/utils/api';

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useUserLocation } from '../../context/LocationContext';
import LocationModal from '../../components/Header/LocationModal';
import {
    ArrowLeft,
    ChevronRight,
    ChevronDown,
    Banknote,
    Smartphone,
    CreditCard,
    Clock,
    Wallet,
    Percent,
    Landmark,
    Gift,
    ShieldCheck,
    Plus,
    MapPin,
    X,
    Check,
    Package,
    LocateFixed,
    Search,
    MapPinned,
    Tag,
    Heart
} from 'lucide-react';

// Force HMR: v3.1 (Fixing toast import and addOrder cache)
const PaymentPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { cart, getCartTotal, clearCart } = useCart();
    const { user } = useAuth();
    const { addresses, activeAddress, updateActiveAddress, refreshAddresses } = useUserLocation();
    const { createOrder } = useOrderStore();

    // Get address from checkout navigation OR from context
    const passedAddress = location.state?.selectedAddress || null;
    const [currentAddress, setCurrentAddress] = useState(passedAddress || activeAddress || null);
    const [showAddressSheet, setShowAddressSheet] = useState(false);
    const [showLocationModal, setShowLocationModal] = useState(false); // Header-style location modal

    const [paymentMethod, setPaymentMethod] = useState('');
    const [deliveryType, setDeliveryType] = useState(location.state?.deliveryType === 'standard' ? 'check_and_buy' : (location.state?.deliveryType || 'check_and_buy'));
    const [isProcessing, setIsProcessing] = useState(false);
    const [expandedOption, setExpandedOption] = useState('');
    const isNavigatingToSuccess = useRef(false);

    // Promo Code States
    const [promoCode, setPromoCode] = useState('');
    const [appliedPromo, setAppliedPromo] = useState(null);
    const [promoError, setPromoError] = useState('');
    const [isApplyingPromo, setIsApplyingPromo] = useState(false);

    // Sync addresses from localStorage on mount
    useEffect(() => {
        refreshAddresses();
    }, [refreshAddresses]);

    // If no address was passed but we have saved addresses, use the first one
    useEffect(() => {
        if (!currentAddress && addresses.length > 0) {
            setCurrentAddress(addresses[0]);
        }
    }, [addresses, currentAddress]);

    // Sync currentAddress when activeAddress changes (e.g. from LocationModal)
    useEffect(() => {
        if (activeAddress) {
            setCurrentAddress(activeAddress);
        }
    }, [activeAddress]);

    // Calculate totals
    const totalMRP = cart.reduce((acc, item) => {
        const itemSellingPrice = item.discountedPrice !== undefined ? item.discountedPrice : (item.price || item.originalPrice || 0);
        const itemMRP = Math.max(item.originalPrice || 0, item.price || 0, itemSellingPrice);
        return acc + (itemMRP * item.quantity);
    }, 0);

    const totalDiscount = totalMRP - getCartTotal();

    const platformFee = 20;
    const shipping = getCartTotal() > 500 ? 0 : 40;

    // Calculate Promo Discount
    let promoDiscount = 0;
    if (appliedPromo) {
        const subtotal = totalMRP - totalDiscount;
        if (appliedPromo.type === 'percentage') {
            promoDiscount = (subtotal * appliedPromo.value) / 100;
            if (appliedPromo.maxDiscount) {
                promoDiscount = Math.min(promoDiscount, appliedPromo.maxDiscount);
            }
        } else {
            promoDiscount = appliedPromo.value;
        }
    }

    const finalTotal = totalMRP - totalDiscount - promoDiscount + platformFee + shipping;

    const handleApplyPromo = (codeToApply) => {
        const finalCode = (typeof codeToApply === 'string' ? codeToApply : promoCode).trim();
        if (!finalCode) {
            setPromoError('Please enter a code');
            return;
        }

        setIsApplyingPromo(true);
        setPromoError('');

        // Simulate API call or check local storage
        setTimeout(() => {
            const savedCodes = localStorage.getItem('admin-promocodes');
            const subtotal = totalMRP - totalDiscount;

            if (savedCodes) {
                const codes = JSON.parse(savedCodes);
                const found = codes.find(c => c.code.toUpperCase() === finalCode.toUpperCase() && c.status === 'active');

                if (found) {
                    const now = new Date();
                    if (new Date(found.endDate) < now) {
                        setPromoError('This code has expired');
                    } else if (subtotal < found.minPurchase) {
                        setPromoError(`Minimum purchase of ₹${found.minPurchase} required`);
                    } else if (found.usageLimit !== -1 && found.usedCount >= found.usageLimit) {
                        setPromoError('Usage limit reached for this code');
                    } else {
                        setAppliedPromo(found);
                        setPromoCode(finalCode);
                    }
                } else {
                    setPromoError('Invalid promo code');
                }
            } else {
                setPromoError('Invalid promo code');
            }
            setIsApplyingPromo(false);
        }, 800);
    };

    // Auto-apply code from Offers page
    useEffect(() => {
        if (location.state?.appliedCode) {
            handleApplyPromo(location.state.appliedCode);
            // Clear the state so it doesn't re-apply on refresh
            navigate(location.pathname, { replace: true, state: { ...location.state, appliedCode: undefined } });
        }
    }, [location.state]);

    const handleRemovePromo = () => {
        setAppliedPromo(null);
        setPromoError('');
    };

    const handleSelectAddress = (addr) => {
        setCurrentAddress(addr);
        updateActiveAddress(addr);
        setShowAddressSheet(false);
    };

    // When header LocationModal closes, sync address & close the bottom sheet too
    const handleLocationModalClose = () => {
        setShowLocationModal(false);
        // The LocationModal updates activeAddress via context, which will sync via useEffect above
    };

    const handlePlaceOrder = async () => {
        if (!paymentMethod) {
            toast.error('Please select a payment method');
            return;
        }

        if (!currentAddress) {
            toast.error('Please select a shipping address');
            return;
        }

        setIsProcessing(true);
        try {
            // Normalize payment method to backend-allowed values: 'card', 'cash', 'cod', 'bank', 'wallet', 'upi'
            let normalizedPaymentMethod = 'cod';
            const lowerPm = paymentMethod.toLowerCase();
            if (lowerPm.includes('cod')) normalizedPaymentMethod = 'cod';
            else if (lowerPm.includes('upi')) normalizedPaymentMethod = 'upi';
            else if (lowerPm.includes('card')) normalizedPaymentMethod = 'card';
            else if (lowerPm.includes('wallet')) normalizedPaymentMethod = 'wallet';
            else if (lowerPm.includes('bank')) normalizedPaymentMethod = 'bank';
            else if (lowerPm.includes('amazon_pay')) normalizedPaymentMethod = 'upi';
            else normalizedPaymentMethod = 'cod';

            const orderPayload = {
                items: cart.map(item => ({
                    id: item.id || item._id,
                    quantity: item.quantity,
                    price: item.discountedPrice || item.price,
                    variant: item.selectedSize ? { size: item.selectedSize } : item.variant
                })),
                shippingAddress: {
                    name: currentAddress.fullName || currentAddress.name || user?.name || "Customer",
                    email: user?.email || "user@test.com",
                    phone: currentAddress.mobile || currentAddress.phone || user?.mobile || user?.phone || "N/A",
                    address: currentAddress.address || "Street Address",
                    city: currentAddress.city || "City",
                    state: currentAddress.state || "State",
                    zipCode: currentAddress.zipCode || currentAddress.pincode || "000000",
                    country: 'India'
                },
                paymentMethod: normalizedPaymentMethod,
                couponCode: appliedPromo?.code || "",
                shippingOption: 'online',
                orderType: ['try_and_buy', 'check_and_buy'].includes(deliveryType) ? deliveryType : 'check_and_buy',
                deliveryType: 'online'
            };

            const response = await createOrder(orderPayload);

            if (response && response.id) {
                toast.success('Order placed successfully!');
                isNavigatingToSuccess.current = true;
                clearCart();
                navigate(`/order-success/${response.id}`);
            }
        } catch (error) {
            console.error("Order placement failed:", error);
            toast.error(error.message || 'Failed to place order. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const toggleOption = (option) => {
        if (expandedOption === option) {
            setExpandedOption('');
        } else {
            setExpandedOption(option);
        }
    };

    // Get estimated delivery date (5-7 days from now)
    const getDeliveryDate = () => {
        const date = new Date();
        date.setDate(date.getDate() + 5 + Math.floor(Math.random() * 3));
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    };

    const PaymentOption = ({ id, icon: Icon, title, subtitle, offers, children }) => (
        <div className="border-b border-gray-100 last:border-0">
            <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleOption(id)}
            >
                <div className="flex items-center gap-4">
                    <Icon size={20} className="text-gray-600" />
                    <div>
                        <div className="text-[13px] font-bold text-gray-900">{title}</div>
                        {subtitle && <div className="text-[10px] text-gray-500 font-medium">{subtitle}</div>}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {offers && <span className="text-[10px] font-black text-emerald-600 uppercase">{offers}</span>}
                    {expandedOption === id ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                </div>
            </div>
            {expandedOption === id && (
                <div className="px-4 pb-4 animate-fadeIn">
                    {children}
                </div>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 pb-24 md:pb-12">
            {/* Header */}
            <header className="bg-white sticky top-0 z-50 border-b border-gray-100 px-4 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-lg font-black uppercase tracking-tight leading-tight">Review Order</h1>
                        {totalDiscount > 0 && (
                            <p className="text-[11px] font-bold text-emerald-600">You're saving ₹{totalDiscount}</p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-green-500" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">100% Secure</span>
                </div>
            </header>

            {/* Progress Bar */}
            <div className="bg-white border-b border-gray-100 px-4 py-4 mb-4">
                <div className="flex items-center justify-center max-w-sm mx-auto">
                    <div className="flex flex-col items-center">
                        <div className="w-3 h-3 bg-emerald-500 rounded-full mb-1"></div>
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Bag</span>
                    </div>
                    <div className="flex-1 h-0.5 bg-emerald-500 mx-2 mb-4"></div>
                    <div className="flex flex-col items-center">
                        <div className="w-3 h-3 bg-emerald-500 rounded-full mb-1"></div>
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Address</span>
                    </div>
                    <div className="flex-1 h-0.5 bg-black mx-2 mb-4"></div>
                    <div className="flex flex-col items-center">
                        <div className="w-3 h-3 bg-white border-2 border-black rounded-full mb-1"></div>
                        <span className="text-[10px] font-black text-black uppercase tracking-widest">Payment</span>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 max-w-2xl">

                {/* ========== DELIVERY DETAILS SECTION ========== */}
                <div className="bg-white rounded-xl shadow-sm mb-4 overflow-hidden">
                    {/* Delivery Details Header */}
                    <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-50">
                        <MapPin size={16} className="text-gray-700" />
                        <span className="text-[13px] font-black text-gray-900 uppercase tracking-tight">Delivery Details</span>
                    </div>

                    {/* Address Display */}
                    {currentAddress ? (
                        <div className="px-4 py-4">
                            <div className="mb-1">
                                <span className="text-[14px] font-black text-gray-900">{currentAddress.name}</span>
                                <span className="text-[13px] text-gray-600 font-medium ml-1.5">
                                    {currentAddress.address}
                                    {currentAddress.locality ? `, ${currentAddress.locality}` : ''}
                                    {currentAddress.city ? `, ${currentAddress.city}` : ''}
                                    {currentAddress.state ? `, ${currentAddress.state}` : ''}
                                    {currentAddress.pincode ? `, ${currentAddress.pincode}` : ''}
                                </span>
                            </div>
                            {(() => {
                                const phone = currentAddress.phone || currentAddress.mobile || user?.phone || user?.mobile;
                                if (phone && phone !== "0000000000" && phone !== "N/A") {
                                    return <p className="text-[12px] text-gray-500 mt-1">Mobile: <span className="font-bold text-gray-700">{phone}</span></p>;
                                }
                                return <p className="text-[12px] text-red-500 mt-1 font-medium">Please add a mobile number in your profile.</p>;
                            })()}
                            <button
                                onClick={() => setShowAddressSheet(true)}
                                className="mt-3 text-[12px] font-bold text-[#e53e70] flex items-center gap-1 hover:gap-2 transition-all"
                            >
                                Change Address <ChevronRight size={14} />
                            </button>
                        </div>
                    ) : (
                        <div className="px-4 py-6 text-center">
                            <MapPin size={28} className="text-gray-300 mx-auto mb-2" />
                            <p className="text-[12px] text-gray-400 font-medium mb-3">No delivery address selected</p>
                            <button
                                onClick={() => setShowAddressSheet(true)}
                                className="text-[12px] font-bold text-[#e53e70] flex items-center gap-1 mx-auto hover:gap-2 transition-all"
                            >
                                Add Delivery Address <ChevronRight size={14} />
                            </button>
                        </div>
                    )}

                    {/* Delivery Estimate - show items */}
                    {cart.length > 0 && currentAddress && (
                        <div className="border-t border-gray-100">
                            {cart.map((item, idx) => (
                                <div key={item.id || idx} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
                                    <img
                                        src={item.image}
                                        alt={item.name}
                                        className="w-12 h-14 object-cover rounded-lg bg-gray-100"
                                        onError={(e) => { e.target.src = 'https://placehold.co/48x56/f3f4f6/9ca3af?text=IMG'; }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <Package size={12} className="text-gray-400 flex-shrink-0" />
                                            <span className="text-[12px] font-bold text-gray-800">Delivery by {getDeliveryDate()}</span>
                                        </div>
                                        <p className="text-[11px] text-gray-500 font-medium truncate">
                                            {item.selectedSize ? `Size: ${item.selectedSize}` : ''} {item.quantity > 1 ? `• Qty: ${item.quantity}` : ''}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ========== DELIVERY TYPE SECTION ========== */}
                <div className="bg-white rounded-xl shadow-sm mb-4 overflow-hidden">
                    <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-50">
                        <Package size={16} className="text-gray-700" />
                        <span className="text-[13px] font-black text-gray-900 uppercase tracking-tight">Delivery Type</span>
                    </div>
                    <div className="p-4 grid grid-cols-1 gap-3">
                        {[
                            { id: 'check_and_buy', title: 'Check and Buy', desc: 'Check the product quality before you pay', icon: ShieldCheck },
                            { id: 'try_and_buy', title: 'Try and Buy', desc: 'Try at your doorstep before you keep it', icon: Heart },
                        ].map((type) => (
                            <label
                                key={type.id}
                                className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${deliveryType === type.id ? 'border-black bg-black/5' : 'border-gray-50 bg-gray-50/50 hover:bg-gray-50'
                                    }`}
                                onClick={() => setDeliveryType(type.id)}
                            >
                                <input
                                    type="radio"
                                    name="deliveryType"
                                    className="hidden"
                                    checked={deliveryType === type.id}
                                    onChange={() => { }}
                                />
                                <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center shrink-0">
                                    {deliveryType === type.id && <div className="w-2.5 h-2.5 bg-black rounded-full" />}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <type.icon size={16} className={deliveryType === type.id ? 'text-black' : 'text-gray-400'} />
                                        <span className="text-[13px] font-black text-gray-900 uppercase tracking-tight">{type.title}</span>
                                    </div>
                                    <p className="text-[10px] font-bold text-gray-400 mt-0.5">{type.desc}</p>
                                </div>
                                {deliveryType === type.id && (
                                    <Check size={16} className="text-emerald-500" />
                                )}
                            </label>
                        ))}
                    </div>
                </div>

                {/* Promo Code Section */}
                <div className="bg-white rounded-xl p-4 mb-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <Tag size={16} className="text-gray-700" />
                        <span className="text-[13px] font-black text-gray-900 uppercase tracking-tight">Apply Promo Code</span>
                    </div>

                    {!appliedPromo ? (
                        <div className="space-y-2">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Enter code (e.g. SAVE20)"
                                    value={promoCode}
                                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                                    className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold focus:bg-white focus:border-black outline-none transition-all uppercase"
                                />
                                <button
                                    onClick={handleApplyPromo}
                                    disabled={isApplyingPromo}
                                    className="px-6 py-2 bg-black text-white text-xs font-black uppercase tracking-widest rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-all shadow-md active:scale-95"
                                >
                                    {isApplyingPromo ? '...' : 'Apply'}
                                </button>
                            </div>
                            {promoError && (
                                <p className="text-[10px] font-bold text-red-500 animate-fadeIn ml-1">{promoError}</p>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-xl animate-scaleIn">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                                    <Check size={16} className="text-white" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[12px] font-black text-gray-900 uppercase tracking-wider">{appliedPromo.code}</span>
                                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-tight">Applied</span>
                                    </div>
                                    <p className="text-[10px] font-bold text-emerald-600">You saved ₹{promoDiscount.toFixed(0)} additional!</p>
                                </div>
                            </div>
                            <button
                                onClick={handleRemovePromo}
                                className="p-2 hover:bg-emerald-100 rounded-full transition-colors"
                            >
                                <X size={16} className="text-emerald-700" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Coupons & Bank Offers */}
                <div
                    onClick={() => navigate('/offers', { state: { from: 'payment', selectedAddress: currentAddress } })}
                    className="bg-white rounded-xl p-4 mb-4 shadow-sm flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors group"
                >
                    <div className="flex items-center gap-3">
                        <Percent size={18} className="text-gray-700" />
                        <div>
                            <h3 className="text-[13px] font-black uppercase tracking-tight text-gray-900 mb-0.5">Available Offers</h3>
                            <p className="text-[10px] font-bold text-gray-400">Tap to see coupons for you</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-[#e53e70] font-bold text-xs uppercase group-hover:gap-3 transition-all">
                        View All <ChevronRight size={14} />
                    </div>
                </div>

                {/* Recommended Payment Options */}
                <div className="mb-4">
                    <h2 className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-3 ml-2">Recommended Payment Options</h2>
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                        <label className="flex items-center justify-between p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-4">
                                <input
                                    type="radio"
                                    name="payment"
                                    value="cod_rec"
                                    checked={paymentMethod === 'cod_rec'}
                                    onChange={() => setPaymentMethod('cod_rec')}
                                    className="accent-black w-4 h-4"
                                />
                                <div className="flex flex-col">
                                    <span className="text-[13px] font-bold text-gray-900">Cash on Delivery (Cash/UPI)</span>
                                </div>
                            </div>
                            <Banknote size={20} className="text-gray-400" />
                        </label>

                        <label className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-4">
                                <input
                                    type="radio"
                                    name="payment"
                                    value="amazon_pay"
                                    checked={paymentMethod === 'amazon_pay'}
                                    onChange={() => setPaymentMethod('amazon_pay')}
                                    className="accent-black w-4 h-4"
                                />
                                <div className="flex flex-col">
                                    <span className="text-[13px] font-bold text-gray-900">Amazon Pay UPI</span>
                                </div>
                            </div>
                            <div className="px-2 py-1 bg-gray-100 rounded text-[10px] font-black uppercase tracking-wider text-gray-600">PAY</div>
                        </label>
                    </div>
                </div>

                {/* Online Payment Options */}
                <div className="mb-4">
                    <h2 className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-3 ml-2">Online Payment Options</h2>
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                        <PaymentOption id="upi" icon={Smartphone} title="UPI (Pay via any App)" offers="6 Offers">
                            <div className="space-y-3 pl-9">
                                {['Google Pay', 'PhonePe', 'Paytm'].map(app => (
                                    <label key={app} className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="payment"
                                            value={`upi_${app}`}
                                            checked={paymentMethod === `upi_${app}`}
                                            onChange={() => setPaymentMethod(`upi_${app}`)}
                                            className="accent-black w-4 h-4"
                                        />
                                        <span className="text-sm font-medium text-gray-700">{app}</span>
                                    </label>
                                ))}
                                <div className="pt-2">
                                    <input
                                        type="text"
                                        placeholder="Enter UPI ID"
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:border-black outline-none transition-colors"
                                    />
                                    <button className="mt-2 w-full py-2 bg-gray-900 text-white text-xs font-bold uppercase rounded-lg">Verify & Pay</button>
                                </div>
                            </div>
                        </PaymentOption>

                        <PaymentOption id="card" icon={CreditCard} title="Credit/Debit Card" offers="4 Offers">
                            <div className="pl-9 pt-2">
                                <button className="text-xs font-black uppercase text-[#ffcc00] hover:text-black transition-colors flex items-center gap-1">
                                    <Plus size={14} /> Add New Card
                                </button>
                            </div>
                        </PaymentOption>

                        <PaymentOption id="paylater" icon={Clock} title="Pay Later">
                            <div className="pl-9">
                                <p className="text-xs text-gray-500">Check your eligibility for Pay Later options.</p>
                            </div>
                        </PaymentOption>

                        <PaymentOption id="wallet" icon={Wallet} title="Wallets" offers="1 Offer">
                            <div className="pl-9 space-y-3">
                                {['Paytm Wallet', 'Amazon Pay Balance', 'PhonePe Wallet'].map(wallet => (
                                    <label key={wallet} className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="payment"
                                            value={`wallet_${wallet}`}
                                            checked={paymentMethod === `wallet_${wallet}`}
                                            onChange={() => setPaymentMethod(`wallet_${wallet}`)}
                                            className="accent-black w-4 h-4"
                                        />
                                        <span className="text-sm font-medium text-gray-700">{wallet}</span>
                                    </label>
                                ))}
                            </div>
                        </PaymentOption>

                        <PaymentOption id="emi" icon={Percent} title="EMI" offers="6 Offers">
                            <div className="pl-9">
                                <p className="text-xs text-gray-500">No Cost EMI available on selected cards.</p>
                            </div>
                        </PaymentOption>

                        <PaymentOption id="netbanking" icon={Landmark} title="Net Banking">
                            <div className="pl-9">
                                <select className="w-full p-2 border border-gray-200 rounded-lg text-sm outline-none">
                                    <option>Select Bank</option>
                                    <option>HDFC Bank</option>
                                    <option>SBI</option>
                                    <option>ICICI Bank</option>
                                    <option>Axis Bank</option>
                                </select>
                            </div>
                        </PaymentOption>
                    </div>
                </div>

                {/* Pay on Delivery Option */}
                <div className="mb-6">
                    <h2 className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-3 ml-2">Pay on Delivery Option</h2>
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                        <label className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-4">
                                <input
                                    type="radio"
                                    name="payment"
                                    value="cod_main"
                                    checked={paymentMethod === 'cod_main'}
                                    onChange={() => setPaymentMethod('cod_main')}
                                    className="accent-black w-4 h-4"
                                />
                                <div className="flex flex-col">
                                    <span className="text-[13px] font-bold text-gray-900">Cash on Delivery (Cash/UPI)</span>
                                </div>
                            </div>
                            <Banknote size={20} className="text-gray-400" />
                        </label>
                    </div>
                </div>

                {/* Gift Card */}
                <div className="bg-white rounded-xl p-4 mb-6 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Gift size={20} className="text-gray-900" />
                        <span className="text-[13px] font-bold text-gray-900">Have a Gift Card?</span>
                    </div>
                    <button className="text-[11px] font-black text-red-500 uppercase hover:text-red-600 transition-colors">
                        Apply
                    </button>
                </div>

                {/* Price Details */}
                <div className="bg-white p-6 rounded-xl shadow-sm mb-24">
                    <h3 className="text-[13px] font-black uppercase tracking-widest text-gray-900 mb-4 pb-4 border-b border-gray-100">
                        Price Details ({cart.length} Items)
                    </h3>
                    <div className="space-y-3 mb-4">
                        <div className="flex justify-between text-[13px]">
                            <span className="text-gray-500 font-medium">Total MRP</span>
                            <span className="text-gray-900 font-bold">₹{totalMRP}</span>
                        </div>
                        <div className="flex justify-between text-[13px]">
                            <span className="text-gray-500 font-medium">Discount on MRP</span>
                            <span className="text-emerald-600 font-bold">-₹{totalDiscount}</span>
                        </div>
                        {appliedPromo && (
                            <div className="flex justify-between text-[13px] animate-fadeInUp">
                                <span className="text-gray-500 font-medium flex items-center gap-1.5">
                                    Coupon <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest">{appliedPromo.code}</span>
                                </span>
                                <span className="text-emerald-600 font-bold">-₹{promoDiscount.toFixed(0)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-[13px]">
                            <span className="text-gray-500 font-medium">Platform Fee</span>
                            <span className="text-gray-900 font-bold">₹{platformFee}</span>
                        </div>
                        <div className="flex justify-between text-[13px]">
                            <span className="text-gray-500 font-medium">Shipping Fee</span>
                            <span className="text-emerald-600 font-bold">{shipping === 0 ? 'FREE' : `₹${shipping}`}</span>
                        </div>
                    </div>
                    <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
                        <span className="text-[14px] font-black text-gray-900 uppercase tracking-tight">Total Amount</span>
                        <span className="text-[16px] font-black text-gray-900">₹{finalTotal}</span>
                    </div>
                </div>

                {/* Footer Section - Fixed Bottom */}
                <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 p-4 z-50">
                    <div className="flex items-center justify-between container mx-auto max-w-2xl">
                        <div className="flex flex-col">
                            <span className="text-[16px] font-black text-gray-900">₹{finalTotal}</span>
                            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide cursor-pointer">View Details</span>
                        </div>
                        <button
                            onClick={handlePlaceOrder}
                            disabled={isProcessing || !currentAddress}
                            className="bg-[#d32f2f] text-white px-8 py-3 rounded-lg text-[12px] font-black uppercase tracking-widest hover:bg-[#b71c1c] active:scale-95 transition-all shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isProcessing ? 'Placing Order...' : `Place Order`}
                        </button>
                    </div>
                </div>

                {/* Terms */}
                <div className="text-center pb-24 px-4">
                    <p className="text-[10px] text-gray-400 leading-relaxed font-medium">
                        By placing the order, you agree to Clothify's <span className="text-red-500 font-bold cursor-pointer">Terms of Use</span> and <span className="text-red-500 font-bold cursor-pointer">Privacy Policy</span>
                    </p>
                </div>

            </div>

            {/* ========== ADDRESS BOTTOM SHEET (Myntra-style) ========== */}
            <AddressBottomSheet
                isOpen={showAddressSheet}
                onClose={() => setShowAddressSheet(false)}
                addresses={addresses}
                currentAddress={currentAddress}
                onSelectAddress={handleSelectAddress}
                refreshAddresses={refreshAddresses}
                onOpenLocationModal={() => {
                    setShowAddressSheet(false);
                    // Small delay so bottom sheet closes first, then location modal opens
                    setTimeout(() => {
                        setShowLocationModal(true);
                    }, 350);
                }}
            />

            {/* ========== HEADER-STYLE LOCATION MODAL (with map, GPS, pincode) ========== */}
            <LocationModal
                isOpen={showLocationModal}
                onClose={handleLocationModalClose}
            />
        </div>
    );
};


/* ============================
   ADDRESS BOTTOM SHEET COMPONENT
   (Slides up from bottom like Myntra)
   ============================ */
const AddressBottomSheet = ({ isOpen, onClose, addresses, currentAddress, onSelectAddress, refreshAddresses, onOpenLocationModal }) => {
    const [isAnimating, setIsAnimating] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingAddress, setEditingAddress] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isCheckingPincode, setIsCheckingPincode] = useState(false);
    const [pincode, setPincode] = useState('');
    const [newAddress, setNewAddress] = useState({
        name: '', phone: '', zipCode: '', address: '', locality: '', city: '', state: '', type: 'Home'
    });

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setIsAnimating(true);
                });
            });
            document.body.style.overflow = 'hidden';
        } else {
            setIsAnimating(false);
            const timer = setTimeout(() => {
                setIsVisible(false);
                setShowAddForm(false);
            }, 350);
            document.body.style.overflow = '';
            return () => clearTimeout(timer);
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const handleClose = () => {
        setIsAnimating(false);
        setTimeout(() => {
            onClose();
        }, 300);
    };

    const handleCheckPincode = async () => {
        if (!pincode || pincode.length !== 6) {
            toast.error('Please enter a valid 6-digit pincode');
            return;
        }

        setIsCheckingPincode(true);
        try {
            // Use existing geocode proxy to find city/state from pincode
            const response = await api.get(`/geocode?lat=20.5937&lon=78.9629&q=${pincode}, India`);
            const data = response?.data || response;

            if (data && data.address) {
                const addr = data.address;
                setNewAddress(prev => ({
                    ...prev,
                    zipCode: pincode,
                    city: addr.city || addr.town || addr.village || addr.district || '',
                    state: addr.state || ''
                }));
                setShowAddForm(true);
                toast.success(`Found: ${addr.city || addr.district || 'Location'} in ${addr.state}`);
            } else {
                // Fallback: If Nominatim reverse lookup via dummy lat/lon doesn't work, we still proceed to form
                setShowAddForm(true);
                setNewAddress(prev => ({ ...prev, zipCode: pincode }));
            }
        } catch (error) {
            console.error("Pincode check error:", error);
            setShowAddForm(true);
            setNewAddress(prev => ({ ...prev, zipCode: pincode }));
        } finally {
            setIsCheckingPincode(false);
        }
    };

    const handleSaveNewAddress = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const payload = {
                name: newAddress.type,
                fullName: newAddress.name,
                phone: newAddress.phone,
                address: newAddress.address,
                city: newAddress.city,
                state: newAddress.state,
                zipCode: newAddress.zipCode,
                locality: newAddress.locality,
                country: 'India',
                isDefault: addresses.length === 0
            };

            let result;
            if (editingAddress) {
                result = await useAddressStore.getState().updateAddress(editingAddress.id || editingAddress._id, payload);
            } else {
                result = await useAddressStore.getState().addAddress(payload);
            }

            if (result) {
                toast.success(editingAddress ? 'Address updated' : 'Address saved');
                refreshAddresses();
                onSelectAddress(result);
                setShowAddForm(false);
                setEditingAddress(null);
                setNewAddress({ name: '', phone: '', zipCode: '', address: '', locality: '', city: '', state: '', type: 'Home' });
            }
        } catch (error) {
            console.error("Save address error:", error);
            toast.error(error.response?.data?.message || 'Failed to save address');
        } finally {
            setIsSaving(false);
        }
    };

    const handleEditAddress = (addr) => {
        setEditingAddress(addr);
        setNewAddress({
            name: addr.fullName || addr.name || '',
            phone: addr.phone || addr.mobile || '',
            zipCode: addr.zipCode || addr.pincode || '',
            address: addr.address || '',
            locality: addr.locality || '',
            city: addr.city || '',
            state: addr.state || '',
            type: addr.type || 'Home'
        });
        setShowAddForm(true);
    };

    const handleDeleteAddress = async (id) => {
        if (window.confirm('Are you sure you want to delete this address?')) {
            try {
                await useAddressStore.getState().deleteAddress(id);
                toast.success('Address deleted');
                refreshAddresses();
            } catch (error) {
                toast.error('Failed to delete address');
            }
        }
    };

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[100]">
            {/* Backdrop */}
            <div
                className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${isAnimating ? 'opacity-100' : 'opacity-0'}`}
                onClick={handleClose}
            />

            {/* Bottom Sheet */}
            <div
                className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-[20px] transition-transform duration-300 ease-out ${isAnimating ? 'translate-y-0' : 'translate-y-full'}`}
                style={{ maxHeight: '85vh', overflowY: 'auto' }}
            >
                {/* Drag Indicator */}
                <div className="flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 bg-gray-300 rounded-full" />
                </div>

                {/* Modal Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                    <h2 className="text-[16px] font-black text-gray-900">Select Delivery Location</h2>
                    <button
                        onClick={handleClose}
                        className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Pincode Entry */}
                <div className="px-5 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <input
                            type="text"
                            placeholder="Enter Pincode"
                            value={pincode}
                            onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-[14px] font-medium outline-none focus:border-black transition-colors bg-gray-50 focus:bg-white"
                        />
                        <button
                            onClick={handleCheckPincode}
                            disabled={isCheckingPincode}
                            className={`px-5 py-3 text-[12px] font-bold text-[#e53e70] uppercase tracking-wide hover:bg-pink-50 rounded-xl transition-colors whitespace-nowrap ${isCheckingPincode ? 'opacity-50' : ''}`}
                        >
                            {isCheckingPincode ? 'Checking...' : 'Check Pincode'}
                        </button>
                    </div>
                </div>

                {/* Quick Actions - Opens Header LocationModal */}
                <div className="px-5 py-3 space-y-1 border-b border-gray-100">
                    <button
                        onClick={onOpenLocationModal}
                        className="w-full flex items-center gap-3 py-3 hover:bg-gray-50 rounded-xl px-2 transition-colors"
                    >
                        <div className="w-8 h-8 bg-emerald-50 rounded-full flex items-center justify-center flex-shrink-0">
                            <LocateFixed size={16} className="text-emerald-600" />
                        </div>
                        <span className="text-[13px] font-bold text-emerald-600">Use my current Location</span>
                        <ChevronRight size={16} className="text-emerald-400 ml-auto" />
                    </button>

                    <button
                        onClick={onOpenLocationModal}
                        className="w-full flex items-center gap-3 py-3 hover:bg-gray-50 rounded-xl px-2 transition-colors"
                    >
                        <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
                            <Search size={16} className="text-blue-600" />
                        </div>
                        <span className="text-[13px] font-bold text-blue-600">Search Location</span>
                        <ChevronRight size={16} className="text-blue-400 ml-auto" />
                    </button>
                </div>

                {/* Divider with "Or" */}
                <div className="flex items-center px-5 py-3">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="px-4 text-[12px] font-bold text-gray-400 uppercase">Or</span>
                    <div className="flex-1 h-px bg-gray-200" />
                </div>

                {/* Select Saved Address */}
                <div className="px-5 pb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[14px] font-black text-gray-900">Select Saved Address</h3>
                        <button
                            onClick={() => {
                                setEditingAddress(null);
                                setNewAddress({ name: '', phone: '', zipCode: '', address: '', locality: '', city: '', state: '', type: 'Home' });
                                setShowAddForm(!showAddForm);
                            }}
                            className="text-[12px] font-bold text-[#e53e70] flex items-center gap-1 hover:gap-2 transition-all"
                        >
                            {showAddForm ? 'Cancel' : 'Add New'} <ChevronRight size={14} />
                        </button>
                    </div>

                    {/* Add/Edit Address Form (Inline) */}
                    {showAddForm && (
                        <div className="mb-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 animate-fadeInUp">
                            <h4 className="text-[12px] font-black text-gray-900 uppercase tracking-widest mb-3">
                                {editingAddress ? 'Edit Address' : 'New Address'}
                            </h4>
                            <form onSubmit={handleSaveNewAddress} className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <input
                                        required
                                        placeholder="Name"
                                        className="w-full px-3 py-2.5 bg-white rounded-xl outline-none border border-gray-200 focus:border-black text-[13px] font-medium transition-colors"
                                        value={newAddress.name}
                                        onChange={e => setNewAddress({ ...newAddress, name: e.target.value })}
                                    />
                                    <input
                                        required
                                        placeholder="Mobile"
                                        className="w-full px-3 py-2.5 bg-white rounded-xl outline-none border border-gray-200 focus:border-black text-[13px] font-medium transition-colors"
                                        value={newAddress.phone}
                                        onChange={e => setNewAddress({ ...newAddress, phone: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <input
                                        required
                                        placeholder="Pincode"
                                        className="w-full px-3 py-2.5 bg-white rounded-xl outline-none border border-gray-200 focus:border-black text-[13px] font-medium transition-colors"
                                        value={newAddress.zipCode}
                                        onChange={e => setNewAddress({ ...newAddress, zipCode: e.target.value })}
                                    />
                                    <input
                                        required
                                        placeholder="City"
                                        className="w-full px-3 py-2.5 bg-white rounded-xl outline-none border border-gray-200 focus:border-black text-[13px] font-medium transition-colors"
                                        value={newAddress.city}
                                        onChange={e => setNewAddress({ ...newAddress, city: e.target.value })}
                                    />
                                </div>
                                <input
                                    required
                                    placeholder="Locality / Town"
                                    className="w-full px-3 py-2.5 bg-white rounded-xl outline-none border border-gray-200 focus:border-black text-[13px] font-medium transition-colors"
                                    value={newAddress.locality}
                                    onChange={e => setNewAddress({ ...newAddress, locality: e.target.value })}
                                />
                                <textarea
                                    required
                                    placeholder="Full Address"
                                    className="w-full px-3 py-2.5 bg-white rounded-xl outline-none border border-gray-200 focus:border-black text-[13px] font-medium resize-none h-16 transition-colors"
                                    value={newAddress.address}
                                    onChange={e => setNewAddress({ ...newAddress, address: e.target.value })}
                                />
                                <input
                                    required
                                    placeholder="State"
                                    className="w-full px-3 py-2.5 bg-white rounded-xl outline-none border border-gray-200 focus:border-black text-[13px] font-medium transition-colors"
                                    value={newAddress.state}
                                    onChange={e => setNewAddress({ ...newAddress, state: e.target.value })}
                                />
                                {/* Address Type */}
                                <div className="flex gap-3 pt-1">
                                    {['Home', 'Work'].map(type => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setNewAddress({ ...newAddress, type })}
                                            className={`px-5 py-2 rounded-full text-[12px] font-bold border transition-all ${newAddress.type === type
                                                ? 'bg-black text-white border-black'
                                                : 'border-gray-200 text-gray-400 hover:border-gray-300'
                                                }`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex gap-3 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowAddForm(false);
                                            setEditingAddress(null);
                                        }}
                                        className="flex-1 py-2.5 text-[11px] font-black uppercase rounded-xl hover:bg-gray-200 transition-colors border border-gray-200"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="flex-1 py-2.5 bg-black text-white text-[11px] font-black uppercase rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
                                    >
                                        {isSaving ? 'Saving...' : editingAddress ? 'Update & Deliver' : 'Save & Deliver'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Saved Addresses List */}
                    {addresses.length === 0 && !showAddForm ? (
                        <div className="text-center py-8">
                            <MapPinned size={40} className="text-gray-200 mx-auto mb-3" />
                            <p className="text-[13px] text-gray-400 font-medium mb-4">No saved addresses</p>
                            <button
                                onClick={() => setShowAddForm(true)}
                                className="w-full py-3.5 border-2 border-dashed border-gray-200 rounded-2xl text-gray-500 font-bold text-[13px] hover:border-gray-300 hover:text-gray-600 transition-all flex items-center justify-center gap-2"
                            >
                                <Plus size={16} /> Add New Address
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {addresses.map(addr => {
                                const isSelected = currentAddress?.id === addr.id;
                                return (
                                    <div
                                        key={addr.id}
                                        onClick={() => onSelectAddress(addr)}
                                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all relative ${isSelected
                                            ? 'border-[#e53e70] bg-pink-50/40'
                                            : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
                                            }`}
                                    >
                                        {/* Currently Selected Badge */}
                                        {isSelected && (
                                            <div className="mb-2">
                                                <span className="text-[9px] font-black bg-[#e53e70] text-white px-2 py-0.5 rounded uppercase tracking-wider">
                                                    Currently Selected
                                                </span>
                                            </div>
                                        )}

                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                                <MapPin size={14} className={`mt-0.5 flex-shrink-0 ${isSelected ? 'text-[#e53e70]' : 'text-gray-400'}`} />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                        <span className="text-[13px] font-black text-gray-900">{addr.name}{(addr.zipCode || addr.pincode) ? `, ${addr.zipCode || addr.pincode}` : ''}</span>
                                                        {addr.type && (
                                                            <span className="text-[9px] font-black bg-gray-100 px-2 py-0.5 rounded uppercase tracking-tighter border border-gray-200">
                                                                {addr.type}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[12px] text-gray-500 font-medium leading-relaxed">
                                                        {addr.address}
                                                        {addr.locality ? `, ${addr.locality}` : ''}
                                                        {addr.city ? `, ${addr.city}` : ''}
                                                        {addr.state ? `, ${addr.state}` : ''}
                                                    </p>
                                                    {(addr.phone || addr.mobile) && (
                                                        <p className="text-[11px] text-gray-500 font-bold mt-1.5">Mob: {addr.phone || addr.mobile}</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Checkmark */}
                                            {isSelected && (
                                                <div className="w-6 h-6 bg-[#e53e70] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                                    <Check size={14} className="text-white" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-4 mt-3 ml-6">
                                            {isSelected && (
                                                <span className="text-[11px] font-bold text-gray-400 border border-gray-200 px-3 py-1.5 rounded-lg">
                                                    Delivering Here
                                                </span>
                                            )}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleEditAddress(addr); }}
                                                className="text-[11px] font-bold text-gray-600 hover:text-black transition-colors"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteAddress(addr.id || addr._id); }}
                                                className="text-[11px] font-bold text-gray-400 hover:text-red-500 transition-colors"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Add New Address Button at Bottom */}
                            {!showAddForm && (
                                <button
                                    onClick={() => setShowAddForm(true)}
                                    className="w-full py-3.5 border-2 border-dashed border-gray-200 rounded-2xl text-gray-500 font-bold text-[13px] hover:border-gray-300 hover:text-gray-600 transition-all flex items-center justify-center gap-2"
                                >
                                    <Plus size={16} /> Add New Address
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


export default PaymentPage;

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
    const [showLocationModal, setShowLocationModal] = useState(false);

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
    const [estimatedShipping, setEstimatedShipping] = useState(null);
    const [isEstimatingShipping, setIsEstimatingShipping] = useState(false);

    useEffect(() => {
        refreshAddresses();
    }, [refreshAddresses]);

    useEffect(() => {
        if (!currentAddress && addresses.length > 0) {
            setCurrentAddress(addresses[0]);
        }
    }, [addresses, currentAddress]);

    useEffect(() => {
        if (activeAddress) {
            setCurrentAddress(activeAddress);
        }
    }, [activeAddress]);

    const totalMRP = cart.reduce((acc, item) => {
        // originalPrice is the MRP stored in the cart item (set during addToCart)
        const itemMRP = Number(item.originalPrice) || Number(item.price) || 0;
        return acc + (itemMRP * item.quantity);
    }, 0);

    const totalDiscount = totalMRP - getCartTotal();
    const platformFee = 20;
    const shipping = typeof estimatedShipping === 'number' ? estimatedShipping : (getCartTotal() > 500 ? 0 : 40);

    const subtotal = getCartTotal();
    let promoDiscount = 0;

    if (appliedPromo) {
        if (appliedPromo.type === 'percentage') {
            promoDiscount = (subtotal * appliedPromo.value) / 100;
            if (appliedPromo.maxDiscount) {
                promoDiscount = Math.min(promoDiscount, appliedPromo.maxDiscount);
            }
        } else {
            promoDiscount = appliedPromo.value;
        }
    }

    const taxableAmount = Math.max(0, subtotal - promoDiscount);
    const tax = 0;

    const finalTotal = subtotal - promoDiscount + platformFee + shipping + tax;

    const handleApplyPromo = (codeToApply) => {
        const finalCode = (typeof codeToApply === 'string' ? codeToApply : promoCode).trim();
        if (!finalCode) {
            setPromoError('Please enter a code');
            return;
        }

        setIsApplyingPromo(true);
        setPromoError('');

        // Fetch available coupons from API
        api.get('/coupons/available')
            .then(response => {
                const subtotal = totalMRP - totalDiscount;
                const found = response.data?.find(c => c.code.toUpperCase() === finalCode.toUpperCase());

                if (found) {
                    const now = new Date();
                    const expiry = found.endDate || found.expiryDate;
                    if (expiry && new Date(expiry) < now) {
                        setPromoError('This code has expired');
                    } else if (subtotal < (found.minOrderValue || found.minPurchase || 0)) {
                        setPromoError(`Minimum purchase of ₹${found.minOrderValue || found.minPurchase} required`);
                    } else if (found.usageLimit !== -1 && (found.usedCount || 0) >= found.usageLimit) {
                        setPromoError('Usage limit reached for this code');
                    } else {
                        setAppliedPromo({
                            ...found,
                            value: found.discount || found.value // Normalize value/discount field
                        });
                        setPromoCode(finalCode);
                        toast.success('Promo code applied!');
                    }
                } else {
                    setPromoError('Invalid promo code');
                }
            })
            .catch(error => {
                console.error("Promo fetch error:", error);
                setPromoError('Failed to validate promo code');
            })
            .finally(() => {
                setIsApplyingPromo(false);
            });
    };
    
    // Shipping Estimation logic (Matches Checkout.jsx)
    useEffect(() => {
        let active = true;
        const timer = setTimeout(async () => {
            const validItems = cart.map(item => ({
                productId: item?.id || item?._id,
                quantity: Number(item?.quantity || 1),
                variant: item?.variant || undefined,
            })).filter(item => item.productId);

            if (!validItems.length) {
                if (active) setEstimatedShipping(0);
                return;
            }

            setIsEstimatingShipping(true);
            try {
                const response = await api.post("/shipping/estimate", {
                    items: validItems,
                    shippingAddress: {
                        country: 'India',
                        coordinates: currentAddress?.coordinates?.coordinates || currentAddress?.coordinates || null,
                    },
                    shippingOption: 'online',
                    couponType: appliedPromo?.type || null,
                });

                const payload = response?.data ?? response;
                const nextShipping = Number(payload?.shipping);
                if (active) {
                    setEstimatedShipping(Number.isFinite(nextShipping) ? nextShipping : null);
                }
            } catch (err) {
                console.error("Shipping estimation error:", err);
                if (active) setEstimatedShipping(null);
            } finally {
                if (active) setIsEstimatingShipping(false);
            }
        }, 300);

        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [cart, currentAddress, appliedPromo]);

    useEffect(() => {
        if (location.state?.appliedCode) {
            handleApplyPromo(location.state.appliedCode);
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

    const handleLocationModalClose = () => {
        setShowLocationModal(false);
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
            let normalizedPaymentMethod = 'cod';
            const lowerPm = paymentMethod.toLowerCase();
            
            // Comprehensive mapping for common payment identifiers
            if (lowerPm.includes('cod') || lowerPm.includes('cash')) {
                normalizedPaymentMethod = 'cod';
            } else if (lowerPm.includes('upi') || lowerPm.includes('gpay') || lowerPm.includes('phonepe') || lowerPm.includes('paytm') || lowerPm.includes('amazon')) {
                normalizedPaymentMethod = 'upi';
            } else if (lowerPm.includes('card') || lowerPm.includes('visa') || lowerPm.includes('master')) {
                normalizedPaymentMethod = 'card';
            } else if (lowerPm.includes('wallet')) {
                normalizedPaymentMethod = 'wallet';
            } else if (lowerPm.includes('bank')) {
                normalizedPaymentMethod = 'bank';
            }

            const orderPayload = {
                items: cart.map(item => {
                    let variantObj = item.variant || {};
                    if (item.selectedSize) variantObj.size = item.selectedSize;
                    if (item.selectedColor) variantObj.color = item.selectedColor;
                    
                    return {
                        id: item.id || item._id,
                        quantity: item.quantity,
                        price: item.discountedPrice || item.price,
                        variant: Object.keys(variantObj).length > 0 ? variantObj : undefined,
                        variantKey: item.variantKey || undefined
                    };
                }),
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
                deliveryType: 'online',
                dropoffLocation: (function() {
                    const coords = currentAddress?.coordinates?.coordinates || currentAddress?.coordinates;
                    if (Array.isArray(coords) && coords.length === 2 && Number.isFinite(coords[0])) {
                        return { type: 'Point', coordinates: [Number(coords[0]), Number(coords[1])] };
                    }
                    if (coords && typeof coords === 'object' && (coords.lon || coords.lng) && coords.lat) {
                        return { type: 'Point', coordinates: [Number(coords.lon || coords.lng), Number(coords.lat)] };
                    }
                    return null;
                })(),
                // Send frontend calculations as well for record/validation
                subtotal: subtotal,
                tax: tax,
                shipping: shipping,
                platformFee: platformFee,
                total: finalTotal
            };
            console.log("PaymentPage - Prepared orderPayload:", orderPayload);

            const response = await createOrder(orderPayload);
            if (response && response.id) {
                toast.success('Order placed successfully!');
                isNavigatingToSuccess.current = true;
                clearCart();
                navigate(`/order-success/${response.id}`);
            }
        } catch (error) {
            console.error("❌ PAYMENT_PAGE_ORDER_ERROR:", error);
            console.error("Error Detail:", {
                message: error.message,
                stack: error.stack,
                response: error.response?.data
            });
            toast.error(error?.message || 'Failed to place order. Please check your connection.');
        } finally {
            setIsProcessing(false);
        }
    };

    const toggleOption = (option) => {
        setExpandedOption(expandedOption === option ? '' : option);
    };

    const PaymentOption = ({ id, icon: Icon, title, subtitle, offers, children }) => (
        <div className="border-b border-gray-100 last:border-0 hover:bg-white hover:text-black">
            <div
                className="flex items-center justify-between p-4 cursor-pointer  transition-colors"
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
                    {offers && <span className="text-[10px] font-bold text-emerald-600 uppercase">{offers}</span>}
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
        <div className="min-h-screen bg-white pb-24 md:pb-12">
            <header className="bg-white sticky top-0 z-50 border-b border-gray-100 px-4 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-white hover:text-black rounded-full transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold uppercase leading-tight">Review Order</h1>
                        {totalDiscount > 0 && <p className="text-[11px] font-bold text-emerald-600">You're saving ₹{Number(totalDiscount.toFixed(2))}</p>}
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-4 max-w-2xl">
                {/* Progress Bar */}
                <div className="py-6 flex justify-center">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-[10px] font-bold">1</div>
                        <div className="w-12 h-0.5 bg-black" />
                        <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-[10px] font-bold shadow-[0_0_15px_rgba(0,0,0,0.2)] scale-110">2</div>
                        <div className="w-12 h-0.5 bg-gray-200" />
                        <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-[10px] font-bold">3</div>
                    </div>
                </div>

                {/* Delivery Address Section */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <MapPin size={18} className="text-gray-900" />
                            <h2 className="text-[14px] font-bold uppercase ">Delivery Address</h2>
                        </div>
                        <button
                            onClick={() => setShowAddressSheet(true)}
                            className="text-[12px] font-bold text-[#e53e70] hover:text-[#c4325c] transition-colors"
                        >
                            Change
                        </button>
                    </div>

                    {currentAddress ? (
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-[13px] font-bold text-gray-900">{currentAddress.fullName || currentAddress.name}</span>
                                {currentAddress.type && (
                                    <span className="text-[9px] font-bold bg-white text-gray-500 border border-gray-200 px-2 py-0.5 rounded uppercase ">
                                        {currentAddress.type}
                                    </span>
                                )}
                            </div>
                            <p className="text-[12px] text-gray-600 leading-relaxed font-medium">
                                {currentAddress.address}, {currentAddress.locality}, {currentAddress.city}, {currentAddress.state} - {currentAddress.zipCode || currentAddress.pincode}
                            </p>
                            {(currentAddress.mobile || currentAddress.phone) && (
                                <p className="text-[12px] text-gray-900 font-bold mt-2">Mob: {currentAddress.mobile || currentAddress.phone}</p>
                            )}
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowAddressSheet(true)}
                            className="w-full py-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 font-bold text-[13px] hover:border-black hover:text-black transition-all flex items-center justify-center gap-2"
                        >
                            <Plus size={16} /> Add Delivery Address
                        </button>
                    )}
                </div>



                {/* Payment Options Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
                    <div className="p-6 border-b border-gray-100 flex items-center gap-2">
                        <CreditCard size={18} className="text-gray-900" />
                        <h2 className="text-[14px] font-bold uppercase ">Select Payment Method</h2>
                    </div>

                    <div className="space-y-0">
                        <PaymentOption id="upi" icon={Smartphone} title="UPI (GPay / PhonePe / Paytm)" subtitle="Secure & Instant Payments" offers="NEWPROMO">
                            <div className="space-y-4 pt-4">
                                <div
                                    className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all cursor-pointer ${paymentMethod === 'GPay' ? 'border-[#e53e70] bg-pink-50/50' : 'border-gray-100'}`}
                                    onClick={() => setPaymentMethod('GPay')}
                                >
                                    <span className="text-[13px] font-bold">Google Pay</span>
                                    {paymentMethod === 'GPay' && <div className="w-2 h-2 rounded-full bg-[#e53e70]" />}
                                </div>
                                <div
                                    className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all cursor-pointer ${paymentMethod === 'PhonePe' ? 'border-[#e53e70] bg-pink-50/50' : 'border-gray-100'}`}
                                    onClick={() => setPaymentMethod('PhonePe')}
                                >
                                    <span className="text-[13px] font-bold">PhonePe</span>
                                    {paymentMethod === 'PhonePe' && <div className="w-2 h-2 rounded-full bg-[#e53e70]" />}
                                </div>
                            </div>
                        </PaymentOption>

                        <PaymentOption id="card" icon={CreditCard} title="Credit / Debit Cards" subtitle="All major cards supported" offers="10% OFF ON CARDS">
                            <div className="pt-4 space-y-3">
                                <div className="bg-gray-50 p-4 rounded-xl text-center">
                                    <CreditCard size={32} className="mx-auto text-gray-300 mb-2" />
                                    <p className="text-[11px] font-bold text-gray-500">Add logic to integrate Stripe or Razorpay here</p>
                                    <button
                                        onClick={() => setPaymentMethod('Credit/Debit Card')}
                                        className={`mt-3 w-full py-2.5 rounded-xl text-[12px] font-bold uppercase border-2 transition-all ${paymentMethod === 'Credit/Debit Card' ? 'bg-[#e53e70] text-white border-[#e53e70]' : 'border-gray-200 text-gray-600'}`}
                                    >
                                        Use Card
                                    </button>
                                </div>
                            </div>
                        </PaymentOption>

                        <PaymentOption id="cod" icon={Banknote} title="Cash On Delivery" subtitle="Pay when you receive the order" offers="SAFE">
                            <div className="pt-4">
                                <label className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === 'COD' ? 'border-[#e53e70] bg-pink-50/50' : 'border-gray-100'}`}>
                                    <div className="flex items-center gap-3">
                                        <Banknote size={20} className={paymentMethod === 'COD' ? "text-[#e53e70]" : "text-gray-400"} />
                                        <span className="text-[13px] font-bold">Pay Cash on Delivery</span>
                                    </div>
                                    <input
                                        type="radio"
                                        name="payment"
                                        className="hidden"
                                        checked={paymentMethod === 'COD'}
                                        onChange={() => setPaymentMethod('COD')}
                                    />
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'COD' ? 'border-[#e53e70] bg-[#e53e70]' : 'border-gray-200'}`}>
                                        {paymentMethod === 'COD' && <div className="w-2 h-2 rounded-full bg-white" />}
                                    </div>
                                </label>
                            </div>
                        </PaymentOption>
                    </div>
                </div>

                {/* Price Details */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-24">
                    <h3 className="text-[13px] font-bold uppercase  text-gray-900 mb-4 pb-4 border-b border-gray-100">
                        Price Details ({cart.reduce((s, i) => s + i.quantity, 0)} Items)
                    </h3>
                    <div className="space-y-3 mb-4">
                        <div className="flex justify-between text-[13px]">
                            <span className="text-gray-500 font-medium">Total MRP</span>
                            <span className="text-gray-900 font-bold">₹{Number(totalMRP.toFixed(2))}</span>
                        </div>
                        <div className="flex justify-between text-[13px]">
                            <span className="text-gray-500 font-medium">Discount price</span>
                            <span className="text-emerald-600 font-bold">-₹{Number(totalDiscount.toFixed(2))}</span>
                        </div>
                        {appliedPromo && (
                            <div className="flex justify-between text-[13px] animate-fadeInUp">
                                <span className="text-gray-500 font-medium flex items-center gap-1.5">
                                    Coupon <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ">{appliedPromo.code}</span>
                                </span>
                                <span className="text-emerald-600 font-bold">-₹{Number(promoDiscount.toFixed(2))}</span>
                            </div>
                        ) }
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
                        <span className="text-[14px] font-bold text-gray-900 uppercase ">Total Amount</span>
                        <span className="text-[17px] font-bold text-gray-900">₹{Number(finalTotal.toFixed(2))}</span>
                    </div>
                </div>

                {/* Fixed Footer for Mobile/Desktop */}
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 z-[90] md:relative md:border-t-0 md:bg-transparent md:p-0 md:mb-12 shadow-[0_-10px_25px_rgba(0,0,0,0.05)] md:shadow-none pb-safe">
                     <div className="flex items-center justify-between container mx-auto max-w-2xl px-4 md:px-0">
                         <div className="flex flex-col">
                             <div className="flex items-center gap-2">
                                 <span className="text-[11px] font-bold text-gray-400 line-through">₹{Number((totalMRP + platformFee + shipping).toFixed(2))}</span>
                                 <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">Save ₹{Number((totalMRP + platformFee + shipping - finalTotal).toFixed(2))}</span>
                             </div>
                             <span className="text-[20px] font-black text-gray-900 leading-none">₹{Number(finalTotal.toFixed(2))}</span>
                         </div>
                         <button
                             onClick={handlePlaceOrder}
                             disabled={isProcessing || !currentAddress || !paymentMethod}
                             className="bg-black text-white px-8 py-4 rounded-2xl text-[12px] font-bold uppercase hover:bg-gray-800 active:scale-95 transition-all shadow-2xl shadow-black/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                         >
                             {isProcessing ? (
                                 <>
                                     <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                     <span>Processing...</span>
                                 </>
                             ) : (
                                 <>
                                     <span>Place Order</span>
                                     <ArrowLeft size={18} className="rotate-180" />
                                 </>
                             )}
                         </button>
                     </div>
                </div>

                {/* Safe Area Padding for iOS */}
                <div className="h-[env(safe-area-inset-bottom)] bg-white md:hidden" />

                <div className="text-center py-12 md:py-24 px-4 opacity-50">
                    <p className="text-[10px] text-gray-400 leading-relaxed font-medium">
                        By placing the order, you agree to Clothify's <span className="text-gray-600 font-bold cursor-pointer">Terms of Use</span> and <span className="text-gray-600 font-bold cursor-pointer">Privacy Policy</span>
                    </p>
                </div>
            </div>

            {/* Address Selection Bottom Sheet */}
            <AddressBottomSheet
                isOpen={showAddressSheet}
                onClose={() => setShowAddressSheet(false)}
                addresses={addresses}
                currentAddress={currentAddress}
                onSelectAddress={handleSelectAddress}
                refreshAddresses={refreshAddresses}
                onOpenLocationModal={() => {
                    setShowAddressSheet(false);
                    setTimeout(() => setShowLocationModal(true), 300);
                }}
            />

            <LocationModal
                isOpen={showLocationModal}
                onClose={handleLocationModalClose}
            />
        </div>
    );
};

/* ============================
   ADDRESS BOTTOM SHEET COMPONENT
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
            setTimeout(() => setIsAnimating(true), 10);
            document.body.style.overflow = 'hidden';
        } else {
            setIsAnimating(false);
            const timer = setTimeout(() => {
                setIsVisible(false);
                setShowAddForm(false);
            }, 300);
            document.body.style.overflow = 'auto';
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

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
            }
        } catch (error) {
            toast.error('Failed to save address');
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
        if (window.confirm('Delete this address?')) {
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
        <div className="fixed inset-0 z-[1000] flex flex-col justify-end">
            <div className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${isAnimating ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
            <div className={`relative bg-white rounded-t-3xl transition-transform duration-300 transform ${isAnimating ? 'translate-y-0' : 'translate-y-full'} p-6 max-h-[90vh] overflow-y-auto`}>
                <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-6" />
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold">Select Delivery Address</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                {showAddForm ? (
                    <form onSubmit={handleSaveNewAddress} className="space-y-4">
                        <input required placeholder="Full Name" className="w-full p-3 border border-gray-100 rounded-xl" value={newAddress.name} onChange={e => setNewAddress({...newAddress, name: e.target.value})} />
                        <input required placeholder="Phone Number" className="w-full p-3 border border-gray-100 rounded-xl" value={newAddress.phone} onChange={e => setNewAddress({...newAddress, phone: e.target.value})} />
                        <div className="grid grid-cols-2 gap-3">
                            <input required placeholder="Pincode" className="w-full p-3 border border-gray-100 rounded-xl" value={newAddress.zipCode} onChange={e => setNewAddress({...newAddress, zipCode: e.target.value})} />
                            <input required placeholder="City" className="w-full p-3 border border-gray-100 rounded-xl" value={newAddress.city} onChange={e => setNewAddress({...newAddress, city: e.target.value})} />
                        </div>
                        <input required placeholder="Locality" className="w-full p-3 border border-gray-100 rounded-xl" value={newAddress.locality} onChange={e => setNewAddress({...newAddress, locality: e.target.value})} />
                        <textarea required placeholder="Address" className="w-full p-3 border border-gray-100 rounded-xl h-24" value={newAddress.address} onChange={e => setNewAddress({...newAddress, address: e.target.value})} />
                        <div className="flex gap-2">
                            {['Home', 'Work'].map(t => (
                                <button key={t} type="button" onClick={() => setNewAddress({...newAddress, type: t})} className={`px-4 py-2 rounded-full border ${newAddress.type === t ? 'bg-black text-white' : 'border-gray-200'}`}>{t}</button>
                            ))}
                        </div>
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setShowAddForm(false)} className="flex-1 py-3 font-bold border rounded-xl">Cancel</button>
                            <button type="submit" disabled={isSaving} className="flex-1 py-3 font-bold bg-black text-white rounded-xl">{isSaving ? 'Saving...' : 'Save & Select'}</button>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-3">
                        {addresses.map(addr => (
                            <div key={addr.id || addr._id} onClick={() => onSelectAddress(addr)} className={`p-4 border-2 rounded-2xl cursor-pointer ${currentAddress?.id === addr.id ? 'border-[#e53e70] bg-pink-50/50' : 'border-gray-100'}`}>
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-[13px]">{addr.fullName || addr.name}</span>
                                            <span className="text-[9px] bg-gray-100 px-2 py-0.5 rounded uppercase font-bold">{addr.type}</span>
                                        </div>
                                        <p className="text-[12px] text-gray-500 leading-tight">{addr.address}, {addr.locality}, {addr.city}</p>
                                        <p className="text-[12px] font-bold mt-1">Mob: {addr.phone || addr.mobile}</p>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); handleEditAddress(addr); }} className="text-[#e53e70] text-[11px] font-bold">Edit</button>
                                </div>
                            </div>
                        ))}
                        <button onClick={() => { setEditingAddress(null); setNewAddress({name:'',phone:'',zipCode:'',address:'',locality:'',city:'',state:'',type:'Home'}); setShowAddForm(true); }} className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-500 font-bold flex items-center justify-center gap-2 mt-4"><Plus size={18} /> Add New Address</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PaymentPage;

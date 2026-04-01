import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useUserLocation } from '../../context/LocationContext';
import { useAddressStore } from '../../../../shared/store/addressStore';
import api from '../../../../shared/utils/api';
import {
    ArrowLeft,
    Trash2,
    Heart,
    ChevronRight,
    ChevronDown,
    X,
    MapPin,
    Tag,
    ChevronUp,
    Plus,
    Truck,
    ShoppingCart,
    ShieldCheck,
    Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import LocationModal from '../../components/Header/LocationModal';
import CouponsModal from '../../components/Checkout/CouponsModal';

const CheckoutPage = () => {
    const navigate = useNavigate();
    const { cart, getCartTotal, removeFromCart, updateQuantity, clearCart, addToCart, updateVariant } = useCart();
    const { user } = useAuth();
    const { activeAddress } = useUserLocation();
    const { fetchAddresses } = useAddressStore();

    const [showSizeModal, setShowSizeModal] = useState(null); // productId for which to show modal
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [deliveryType, setDeliveryType] = useState('check_and_buy');
    const [showServiceInfo, setShowServiceInfo] = useState(false);

    // Promo Code States
    const [promoCode, setPromoCode] = useState('');
    const [appliedPromo, setAppliedPromo] = useState(null);
    const [promoError, setPromoError] = useState('');
    const [isApplyingPromo, setIsApplyingPromo] = useState(false);
    const [isCouponsModalOpen, setIsCouponsModalOpen] = useState(false);

    useEffect(() => {
        // Scroll to top on mount
        window.scrollTo(0, 0);
        // Refresh addresses to ensure latest data
        fetchAddresses().catch(() => { });
    }, [fetchAddresses]);

    const totalPrice = getCartTotal();
    const shipping = totalPrice > 500 ? 0 : 40;
    const tax = Math.round(totalPrice * 0.05); // 5% GST
    
    let promoDiscount = 0;
    if (appliedPromo) {
        if (appliedPromo.type === 'percentage') {
            promoDiscount = (totalPrice * appliedPromo.value) / 100;
            if (appliedPromo.maxDiscount) {
                promoDiscount = Math.min(promoDiscount, appliedPromo.maxDiscount);
            }
        } else {
            promoDiscount = appliedPromo.value;
        }
    }

    const finalTotal = totalPrice + shipping + tax - promoDiscount;

    const handleApplyPromo = (codeToApply) => {
        const finalCode = (typeof codeToApply === 'string' ? codeToApply : promoCode).trim();
        if (!finalCode) {
            setPromoError('Please enter a code');
            return;
        }

        setIsApplyingPromo(true);
        setPromoError('');

        api.get('/coupons/available')
            .then(response => {
                const found = response.data?.find(c => c.code.toUpperCase() === finalCode.toUpperCase());
                if (found) {
                    const now = new Date();
                    const expiry = found.endDate || found.expiryDate;
                    if (expiry && new Date(expiry) < now) {
                        setPromoError('This code has expired');
                    } else if (totalPrice < (found.minOrderValue || found.minPurchase || 0)) {
                        setPromoError(`Min purchase ₹${found.minOrderValue || found.minPurchase} required`);
                    } else {
                        setAppliedPromo({
                            ...found,
                            value: found.discount || found.value
                        });
                        setPromoCode(finalCode);
                        toast.success('Promo code applied!');
                    }
                } else {
                    setPromoError('Invalid promo code');
                }
            })
            .catch(() => setPromoError('Failed to validate promo code'))
            .finally(() => setIsApplyingPromo(false));
    };

    const handleRemovePromo = () => {
        setAppliedPromo(null);
        setPromoCode('');
        setPromoError('');
    };

    // Fixed delivery date calculation
    const getDeliveryDateInfo = () => {
        return "60 Mins";
    };

    const handleClearCart = () => {
        toast((t) => (
            <div className="flex items-center gap-3">
                <span className="text-sm font-bold">Clear your bag?</span>
                <button onClick={() => { clearCart(); toast.dismiss(t.id); toast.success('Bag cleared'); }} className="px-3 py-1 bg-red-500 text-white rounded-lg text-xs font-bold">Yes</button>
                <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg text-xs font-bold">No</button>
            </div>
        ), { duration: 6000 });
    };

    const handleAddUpsell = (item) => {
        addToCart({
            ...item,
            id: `upsell-${item.id}-${Date.now()}`, // unique id
            quantity: 1
        });
        toast.success('Added to bag');
    };

    if (cart.length === 0) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6">
                    <ShoppingCart size={40} className="text-gray-200" />
                </div>
                <h2 className="text-2xl font-bold uppercase  mb-2">Your Bag is Empty</h2>
                <p className="text-gray-400 font-bold text-xs uppercase  mb-8">Looks like you haven't added anything yet</p>
                <button
                    onClick={() => navigate('/shop')}
                    className="bg-black text-white px-8 py-4 rounded-2xl font-bold text-xs uppercase  shadow-xl active:scale-95 transition-all"
                >
                    Start Shopping
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white pb-[180px] md:pb-[100px]">
            {/* Minimal App-style Header */}
            <header className="bg-white px-4 py-4 flex items-center justify-between sticky top-0 z-50 border-b border-gray-100 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-1 hover:bg-white hover:text-black rounded-full">
                        <ArrowLeft size={24} strokeWidth={2.5} />
                    </button>
                    <h1 className="text-xl font-bold text-[#1F2937] ">Checkout</h1>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={handleClearCart} className="text-[#9CA3AF] hover:text-[#EF4444]">
                        <Trash2 size={22} />
                    </button>
                    <button onClick={() => navigate('/wishlist')} className="text-[#9CA3AF]">
                        <div className="relative">
                            <Heart size={22} />
                            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-black rounded-full border border-white" />
                        </div>
                    </button>
                </div>
            </header>

            <div className="max-w-[500px] mx-auto">
                <main className="p-4 space-y-4">
                    {/* Address Callout Prompt */}
                    {!activeAddress && (
                        <div className="bg-[#FFE4E6] rounded-[24px] p-4 flex items-center justify-between border border-[#FECDD3] animate-pulse-subtle">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                                    <MapPin size={20} className="text-[#9F1239]" />
                                </div>
                                <span className="text-[#9F1239] font-bold text-xs uppercase ">
                                    Add address to continue
                                </span>
                            </div>
                            <button
                                onClick={() => setIsLocationModalOpen(true)}
                                className="bg-[#9F1239] text-white px-5 py-2 rounded-xl font-bold text-xs uppercase  shadow-md hover:scale-105 transition-transform"
                            >
                                Add
                            </button>
                        </div>
                    )}

                    {/* Cart Items List */}
                    <div className="space-y-3">
                        {cart.map((item) => (
                            <div
                                key={item.id}
                                className="bg-white rounded-[24px] p-2 flex gap-4 relative group border border-gray-50 shadow-sm hover:shadow-md transition-shadow"
                            >
                                {/* Removed/Wishlist buttons Overlay */}
                                <div className="absolute top-2 right-2 flex gap-2 z-10">
                                    <button className="p-1.5 bg-white rounded-full text-gray-400 hover:text-black">
                                        <div className="relative">
                                            <Heart size={16} />
                                            <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-black rounded-full" />
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => removeFromCart(item.id)}
                                        className="p-1.5 bg-white rounded-full text-gray-400 hover:text-[#EF4444]"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>


                                {/* Product Image with Badge */}
                                <div className="relative w-[110px] h-[140px] shrink-0 rounded-2xl overflow-hidden bg-gray-100">
                                    <img src={item.image} alt="" className="w-full h-full object-cover" />
                                    {item.tryAndBuy && (
                                        <div className="absolute left-0 top-0 bottom-0 w-8 bg-black/90 flex items-center justify-center">
                                            <span className="text-white text-[9px] font-bold uppercase [writing-mode:vertical-lr] rotate-180">
                                                Try & Buy
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Details */}
                                <div className="flex-1 py-1 pr-8">
                                    <h4 className="text-[12px] font-bold uppercase  text-gray-400 mb-0.5">
                                        {item.brand}
                                    </h4>
                                    <h3 className="text-sm font-bold text-gray-800 line-clamp-1 mb-3">
                                        {item.name}
                                    </h3>

                                    {/* Selection Controls */}
                                    <div className="flex gap-2 mb-4">
                                        <div 
                                            onClick={() => setShowSizeModal(item)}
                                            className="flex items-center gap-1.5 bg-[#F3F4F6] px-3 py-1.5 rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                                        >
                                            <span className="text-[10px] font-bold uppercase text-gray-600">Size:</span>
                                            <span className="text-[10px] font-bold text-black">{item.selectedSize || item.variant?.size || 'XL'}</span>
                                            <ChevronDown size={14} className="text-gray-400" />
                                        </div>
                                        <div className="flex items-center gap-2 bg-[#F3F4F6] px-2 py-1.5 rounded-xl">
                                            <button
                                                onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                                                className="w-5 h-5 flex items-center justify-center hover:bg-white hover:text-black rounded-md transition-colors"
                                            >
                                                <span className="text-xs font-bold">-</span>
                                            </button>
                                            <span className="text-[11px] font-bold text-black min-w-[12px] text-center">{item.quantity}</span>
                                            <button
                                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                className="w-5 h-5 flex items-center justify-center hover:bg-white hover:text-black rounded-md transition-colors"
                                            >
                                                <span className="text-xs font-bold">+</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Price */}
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-base font-bold text-black">₹{item.price}</span>
                                        <span className="text-[11px] text-gray-400 line-through font-bold">₹{item.originalPrice}</span>
                                        <span className="text-[11px] font-bold text-[#F97316] uppercase er">
                                            {item.discount || '65% Off'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Service Selection: Try & Buy / Check & Buy */}
                    <div className="bg-white rounded-[24px] p-4 space-y-3 border border-gray-50 shadow-sm transition-all hover:shadow-md">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[11px] font-bold uppercase  text-gray-400">Choose Service</h3>
                            <button 
                                onClick={() => setShowServiceInfo(!showServiceInfo)}
                                className={`text-[10px] font-bold uppercase transition-all flex items-center gap-1.5 ${showServiceInfo ? 'text-[#9F1239]' : 'text-[#9F1239] hover:opacity-80'}`}
                            >
                                {showServiceInfo ? <><X size={12} /> Hide Details</> : 'Know More'}
                            </button>
                        </div>

                        {showServiceInfo && (
                            <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100 animate-fadeInUp">
                                <div className="space-y-4">
                                    <div className="flex gap-3">
                                        <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0 border border-black/5">
                                            <span className="text-[#9F1239] font-black text-[9px]">TB</span>
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-[11px] font-bold text-gray-900 uppercase  mb-1">Try & Buy Service</h4>
                                            <p className="text-[10px] text-gray-500 font-medium leading-relaxed">
                                                Feel confident with your purchase! Try your items at home while the delivery partner waits. 
                                                Keep what fits and return any items you don't want right there on the spot.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="h-px bg-gray-200/50" />
                                    <div className="flex gap-3">
                                        <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0 border border-black/5">
                                            <span className="text-emerald-600 font-black text-[9px]">CB</span>
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-[11px] font-bold text-gray-900 uppercase  mb-1">Check & Buy Service</h4>
                                            <p className="text-[10px] text-gray-500 font-medium leading-relaxed">
                                                Open your package to verify the product quality, appearance, and authenticity 
                                                before you make the final payment. Ensure you're getting exactly what you ordered.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                            <label className="relative cursor-pointer">
                                <input
                                    type="radio"
                                    name="deliveryType"
                                    className="peer hidden"
                                    checked={deliveryType === 'try_and_buy'}
                                    onChange={() => setDeliveryType('try_and_buy')}
                                />
                                <div className="p-2 rounded-xl border-2 border-gray-100 peer-checked:border-black peer-checked:bg-white transition-all h-full text-center">
                                    <span className="text-[9px] font-bold uppercase block mb-1 text-[#9F1239]">Try & Buy</span>
                                    <p className="text-[7px] font-bold text-gray-400 leading-tight">Try at door</p>
                                </div>
                            </label>
                            <label className="relative cursor-pointer">
                                <input
                                    type="radio"
                                    name="deliveryType"
                                    className="peer hidden"
                                    checked={deliveryType === 'check_and_buy'}
                                    onChange={() => setDeliveryType('check_and_buy')}
                                />
                                <div className="p-2 rounded-xl border-2 border-gray-100 peer-checked:border-black peer-checked:bg-white transition-all h-full text-center">
                                    <span className="text-[9px] font-bold uppercase block mb-1 text-emerald-600">Check & Buy</span>
                                    <p className="text-[7px] font-bold text-gray-400 leading-tight">Verify first</p>
                                </div>
                            </label>
                        </div>
                    </div>


                    {/* Delivery Estimation */}
                    <div className="bg-white rounded-[24px] p-4 border border-gray-50 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                                <Truck size={18} className="text-blue-600" />
                            </div>
                            <span className="text-sm font-bold uppercase ">Delivery Estimate</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="bg-white px-4 py-2 rounded-xl text-center">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Instant</p>
                                <p className="text-xs font-bold">60 Mins</p>
                            </div>
                            <p className="text-xs font-bold text-gray-500 flex-1">
                                Delivery within <span className="text-black">{getDeliveryDateInfo()}</span>
                            </p>
                        </div>
                    </div>

                    {/* One Last Touch Upsell */}
                    <div className="space-y-3 pt-4">
                        <div className="flex items-center justify-center gap-3">
                            <div className="h-px bg-gray-200 flex-1" />
                            <div className="text-center px-2">
                                <h2 className="text-xl font-bold uppercase italic leading-none">One Last Touch</h2>
                                <p className="text-[9px] font-bold text-gray-400 uppercase mt-1">Add accessories before checkout</p>
                            </div>
                            <div className="h-px bg-gray-200 flex-1" />
                        </div>

                        <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4">
                            {[
                                { id: 'u1', name: 'Gold Earrings', price: 499, brand: 'LUXE', image: 'https://images.unsplash.com/photo-1611923134239-b9be5816e23c?w=300' },
                                { id: 'u2', name: 'Silk Scarf', price: 899, brand: 'NOVA', image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=300' },
                                { id: 'u3', name: 'Silver Cuff', price: 1299, brand: 'ZETO', image: 'https://images.unsplash.com/photo-1611085583191-a3b1a20a534c?w=300' }
                            ].map((item) => (
                                <div key={item.id} className="min-w-[160px] bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100/50">
                                    <div className="aspect-[4/5] bg-gray-100 relative">
                                        <img src={item.image} alt="" className="w-full h-full object-cover" />
                                        <div className="absolute bottom-2 right-2">
                                            <button
                                                onClick={() => handleAddUpsell(item)}
                                                className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg text-black hover:bg-black hover:text-white transition-all active:scale-90"
                                            >
                                                <Plus size={18} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-2.5">
                                        <p className="text-[10px] font-bold uppercase text-gray-400 mb-0.5">{item.brand}</p>
                                        <p className="text-[11px] font-bold text-gray-800 line-clamp-1">{item.name}</p>
                                        <p className="text-xs font-bold mt-1">₹{item.price}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Promo Code Section */}
                    <div className="bg-white p-4 md:p-6 rounded-[32px] shadow-sm border border-gray-50 transition-all hover:shadow-md overflow-hidden">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2">
                                <Tag size={18} className="text-gray-900" />
                                <h2 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Apply Promo Code</h2>
                            </div>
                            <button 
                                onClick={() => setIsCouponsModalOpen(true)}
                                className="text-[10px] font-bold text-[#9F1239] flex items-center gap-1 hover:gap-1.5 transition-all uppercase"
                            >
                                View All <ChevronRight size={14} />
                            </button>
                        </div>

                        {!appliedPromo ? (
                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Enter Code"
                                        value={promoCode}
                                        onChange={(e) => {
                                            setPromoCode(e.target.value.toUpperCase());
                                            setPromoError('');
                                        }}
                                        className={`flex-1 min-w-0 px-3 md:px-4 py-3.5 bg-gray-50 border rounded-2xl text-[12px] font-bold uppercase tracking-wider outline-none transition-all ${promoError ? 'border-red-500 bg-red-50' : 'border-gray-50 focus:border-black focus:bg-white'}`}
                                    />
                                    <button
                                        onClick={() => handleApplyPromo()}
                                        disabled={!promoCode || isApplyingPromo}
                                        className="px-4 md:px-8 py-3.5 bg-black text-white text-[11px] font-bold uppercase rounded-2xl hover:bg-gray-800 disabled:opacity-50 transition-all shadow-lg active:scale-95 shrink-0"
                                    >
                                        {isApplyingPromo ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Apply'}
                                    </button>
                                </div>
                                {promoError && <p className="text-[9px] font-bold text-red-500 ml-1">{promoError}</p>}
                            </div>
                        ) : (
                            <div className="flex items-center justify-between p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 animate-fadeInUp">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center">
                                        <Check className="text-emerald-600" size={20} />
                                    </div>
                                    <div>
                                        <div className="text-[12px] font-bold text-emerald-900 uppercase ">{appliedPromo.code} Applied</div>
                                        <p className="text-[10px] font-bold text-emerald-600">Savings: ₹{promoDiscount.toFixed(0)}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleRemovePromo}
                                    className="text-[10px] font-bold text-red-500/80 hover:text-red-600 uppercase"
                                >
                                    Remove
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Price Summary / Bill Details */}
                    <div className="bg-white rounded-[32px] p-6 space-y-5 border border-gray-50 shadow-sm mt-4">
                        <h3 className="text-[11px] font-bold uppercase text-gray-400  flex items-center gap-2">
                            Bill Details
                        </h3>

                        <div className="space-y-4">
                            <div className="flex justify-between text-[13px] font-bold text-gray-500 uppercase ">
                                <span>Bag Total</span>
                                <span className="text-black">₹{totalPrice}</span>
                            </div>
                            <div className="flex justify-between text-[13px] font-bold text-gray-500 uppercase ">
                                <span>Bag Discount</span>
                                <span className="text-[#10B981]">-₹0</span>
                            </div>
                            {appliedPromo && (
                                <div className="flex justify-between text-[13px] font-bold text-[#10B981] uppercase animate-fadeInUp">
                                    <span>Promo Discount</span>
                                    <span>-₹{promoDiscount.toFixed(0)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-[13px] font-bold text-gray-500 uppercase ">
                                <span>Shipping Fee</span>
                                <span>{shipping === 0 ? <span className="text-[#10B981]">FREE</span> : `₹${shipping}`}</span>
                            </div>
                            <div className="flex justify-between text-[13px] font-bold text-gray-500 uppercase ">
                                <span>GST (5%)</span>
                                <span className="text-black">₹{tax}</span>
                            </div>
                        </div>

                        <div className="h-px bg-gray-100" />

                        <div className="flex justify-between items-center py-2">
                            <span className="text-sm font-bold uppercase text-black">Order Total</span>
                            <span className="text-xl font-bold italic er text-[#9F1239]">₹{finalTotal}</span>
                        </div>
                    </div>
                </main>
            </div>

            {/* Sticky Mobile Footer */}
            <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] px-4 py-5 md:py-6 z-[10000] safe-area-bottom">
                <div className="max-w-[500px] mx-auto space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                {activeAddress ? 'Deliver to' : 'No address selected'}
                            </span>
                            <button 
                                onClick={() => setIsLocationModalOpen(true)}
                                className="flex items-center gap-2 group cursor-pointer text-left"
                            >
                                <span className="text-xs font-bold text-black truncate max-w-[200px] group-hover:text-[#9F1239] transition-colors">
                                    {activeAddress ? [activeAddress.name || activeAddress.locality, activeAddress.city].filter(Boolean).join(', ') : 'Add address to continue'}
                                </span>
                                <ChevronDown size={14} className="text-gray-400 group-hover:text-[#9F1239] transition-all" />
                            </button>
                        </div>
                        <button
                            onClick={() => setIsLocationModalOpen(true)}
                            className="text-[11px] font-bold uppercase text-[#9F1239] hover:opacity-80 transition-opacity"
                        >
                            {activeAddress ? 'Change' : 'Add'}
                        </button>
                    </div>

                    <button
                        onClick={() => activeAddress ? navigate('/payment', { state: { deliveryType, appliedCode: appliedPromo?.code } }) : setIsLocationModalOpen(true)}
                        className={`w-full py-4 rounded-[20px] font-bold text-xs uppercase shadow-xl transition-all active:scale-[0.98] ${activeAddress
                            ? 'bg-black text-white hover:bg-gray-900'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                    >
                        {activeAddress ? 'Proceed to Payment' : 'Add Address to Proceed'}
                    </button>
                </div>
            </div>

            {/* Address Selection Modal */}
            <LocationModal
                isOpen={isLocationModalOpen}
                onClose={() => setIsLocationModalOpen(false)}
            />

            {/* Coupons Modal */}
            <CouponsModal
                isOpen={isCouponsModalOpen}
                onClose={() => setIsCouponsModalOpen(false)}
                onApply={(code) => {
                    setPromoCode(code);
                    handleApplyPromo(code);
                    setIsCouponsModalOpen(false);
                }}
                cartTotal={getCartTotal()}
            />
    
            <SizeSelectionModal
                item={showSizeModal}
                isOpen={!!showSizeModal}
                onClose={() => setShowSizeModal(null)}
                onSelect={(newSize) => {
                    updateVariant(showSizeModal.cartLineKey, { ...showSizeModal.variant, size: newSize });
                    setShowSizeModal(null);
                    toast.success('Size updated');
                }}
            />

            {/* Global Custom Styles */}
            <style dangerouslySetInnerHTML={{
                __html: `
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                @keyframes pulse-subtle {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.95; transform: scale(0.995); }
                }
                .animate-pulse-subtle { animation: pulse-subtle 3s ease-in-out infinite; }
            ` }} />
        </div>
    );
};

const SizeSelectionModal = ({ item, isOpen, onClose, onSelect }) => {
    if (!isOpen || !item) return null;

    const sizes = (item.variants?.sizes?.length > 0)
        ? item.variants.sizes
        : (item.variants?.attributes?.find(a => a.name.toLowerCase() === 'size')?.values || ['XS', 'S', 'M', 'L', 'XL', 'XXL']);

    return (
        <div className="fixed inset-0 z-[20000] flex items-end justify-center p-0 md:items-center md:p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white w-full max-w-[450px] rounded-t-[32px] md:rounded-[32px] overflow-hidden animate-slideUp">
                <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 uppercase">Select Size</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">{item.name}</p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center">
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-4 gap-3">
                        {sizes.map((size) => (
                            <button
                                key={size}
                                onClick={() => onSelect(size)}
                                className={`h-14 rounded-2xl flex items-center justify-center font-bold text-sm transition-all ${
                                    (item.selectedSize === size || item.variant?.size === size)
                                    ? 'bg-black text-white shadow-lg scale-105'
                                    : 'bg-gray-50 border border-gray-100 text-gray-900 hover:border-black'
                                }`}
                            >
                                {size}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={onClose}
                        className="w-full py-4 mt-8 bg-gray-100 text-gray-900 rounded-2xl font-bold text-[11px] uppercase hover:bg-gray-200 transition-all"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CheckoutPage;


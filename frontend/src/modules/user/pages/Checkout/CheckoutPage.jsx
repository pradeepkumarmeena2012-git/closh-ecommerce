import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from '../../context/LocationContext';
import { useAddressStore } from '../../../../shared/store/addressStore';
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
    ShoppingCart
} from 'lucide-react';
import toast from 'react-hot-toast';

const CheckoutPage = () => {
    const navigate = useNavigate();
    const { cart, getCartTotal, removeFromCart, updateQuantity, clearCart, addToCart } = useCart();
    const { user } = useAuth();
    const { activeAddress } = useLocation();
    const { fetchAddresses } = useAddressStore();

    const [isCouponOpen, setIsCouponOpen] = useState(true);
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [showSizeModal, setShowSizeModal] = useState(null); // productId for which to show modal

    useEffect(() => {
        // Scroll to top on mount
        window.scrollTo(0, 0);
    }, []);

    const totalPrice = getCartTotal();
    const shipping = totalPrice > 500 ? 0 : 40;
    const tax = Math.round(totalPrice * 0.05); // 5% GST
    const couponDiscount = appliedCoupon ? 250 : 0;
    const finalTotal = totalPrice + shipping + tax - couponDiscount;

    const handleClearCart = () => {
        if (window.confirm("Are you sure you want to clear your bag?")) {
            clearCart();
        }
    };

    const handleApplyCoupon = (code) => {
        if (code.toUpperCase() === 'FIRST50') {
            setAppliedCoupon({ code: 'FIRST50', discount: 250 });
            toast.success('Coupon Applied! You saved ₹250', {
                style: {
                    borderRadius: '16px',
                    background: '#10B981',
                    color: '#fff',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    fontSize: '11px',
                    letterSpacing: '0.1em'
                }
            });
        } else {
            toast.error('Invalid Coupon Code');
        }
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
                <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                    <ShoppingCart size={40} className="text-gray-200" />
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tight mb-2">Your Bag is Empty</h2>
                <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mb-8">Looks like you haven't added anything yet</p>
                <button
                    onClick={() => navigate('/shop')}
                    className="bg-black text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all"
                >
                    Start Shopping
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F3F4F6] pb-[180px] md:pb-[100px]">
            {/* Minimal App-style Header */}
            <header className="bg-white px-4 py-4 flex items-center justify-between sticky top-0 z-50 border-b border-gray-100 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-1 hover:bg-gray-50 rounded-full">
                        <ArrowLeft size={24} strokeWidth={2.5} />
                    </button>
                    <h1 className="text-xl font-black text-[#1F2937] tracking-tight">Checkout</h1>
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
                                <span className="text-[#9F1239] font-black text-xs uppercase tracking-widest">
                                    Add address to continue
                                </span>
                            </div>
                            <button
                                onClick={() => navigate('/account/addresses')}
                                className="bg-[#9F1239] text-white px-5 py-2 rounded-xl font-black text-xs uppercase tracking-widest shadow-md hover:scale-105 transition-transform"
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
                                    <button className="p-1.5 bg-gray-50 rounded-full text-gray-400 hover:text-black">
                                        <div className="relative">
                                            <Heart size={16} />
                                            <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-black rounded-full" />
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => removeFromCart(item.id)}
                                        className="p-1.5 bg-gray-50 rounded-full text-gray-400 hover:text-[#EF4444]"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>


                                {/* Product Image with Badge */}
                                <div className="relative w-[110px] h-[140px] shrink-0 rounded-2xl overflow-hidden bg-gray-100">
                                    <img src={item.image} alt="" className="w-full h-full object-cover" />
                                    {item.tryAndBuy && (
                                        <div className="absolute left-0 top-0 bottom-0 w-8 bg-black/90 flex items-center justify-center">
                                            <span className="text-white text-[9px] font-black uppercase tracking-[0.2em] [writing-mode:vertical-lr] rotate-180">
                                                Try & Buy
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Details */}
                                <div className="flex-1 py-1 pr-8">
                                    <h4 className="text-[12px] font-black uppercase tracking-tight text-gray-400 mb-0.5">
                                        {item.brand}
                                    </h4>
                                    <h3 className="text-sm font-bold text-gray-800 line-clamp-1 mb-3">
                                        {item.name}
                                    </h3>

                                    {/* Selection Controls */}
                                    <div className="flex gap-2 mb-4">
                                        <div className="flex items-center gap-1.5 bg-[#F3F4F6] px-3 py-1.5 rounded-xl hover:bg-gray-200 transition-colors">
                                            <span className="text-[10px] font-black uppercase text-gray-600">Size:</span>
                                            <span className="text-[10px] font-black text-black">{item.selectedSize || 'XL'}</span>
                                            <ChevronDown size={14} className="text-gray-400" />
                                        </div>
                                        <div className="flex items-center gap-2 bg-[#F3F4F6] px-2 py-1.5 rounded-xl">
                                            <button
                                                onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                                                className="w-5 h-5 flex items-center justify-center hover:bg-white rounded-md transition-colors"
                                            >
                                                <span className="text-xs font-black">-</span>
                                            </button>
                                            <span className="text-[11px] font-black text-black min-w-[12px] text-center">{item.quantity}</span>
                                            <button
                                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                className="w-5 h-5 flex items-center justify-center hover:bg-white rounded-md transition-colors"
                                            >
                                                <span className="text-xs font-black">+</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Price */}
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-base font-black text-black">₹{item.price}</span>
                                        <span className="text-[11px] text-gray-400 line-through font-bold">₹{item.originalPrice}</span>
                                        <span className="text-[11px] font-black text-[#F97316] uppercase tracking-tighter">
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
                            <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-400">Choose Service</h3>
                            <button className="text-[10px] font-black text-[#9F1239] uppercase tracking-tight">Know More</button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <label className="relative cursor-pointer">
                                <input type="radio" name="service" className="peer hidden" defaultChecked />
                                <div className="p-3 rounded-2xl border-2 border-gray-100 peer-checked:border-black peer-checked:bg-gray-50 transition-all h-full">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[11px] font-black uppercase">Standard</span>
                                    </div>
                                    <p className="text-[9px] font-bold text-gray-400 leading-tight">Delivery in 2-4 days</p>
                                </div>
                            </label>
                            <label className="relative cursor-pointer">
                                <input type="radio" name="service" className="peer hidden" />
                                <div className="p-3 rounded-2xl border-2 border-gray-100 peer-checked:border-black peer-checked:bg-gray-50 transition-all h-full">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[11px] font-black uppercase text-[#9F1239]">Try & Buy</span>
                                    </div>
                                    <p className="text-[9px] font-bold text-gray-400 leading-tight">Try at doorstep & keep</p>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Apply Coupon Section */}
                    <div className="bg-white rounded-[24px] overflow-hidden shadow-sm border border-gray-50">
                        <div
                            onClick={() => setIsCouponOpen(!isCouponOpen)}
                            className="p-4 flex items-center justify-between cursor-pointer"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                                    <Tag size={18} className="text-white" />
                                </div>
                                <span className="text-sm font-black uppercase tracking-tight">Apply Coupon</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-black uppercase text-[#9CA3AF] hover:text-black">view all</span>
                                <ChevronRight size={18} className={`text-gray-400 transition-transform ${isCouponOpen ? 'rotate-90' : ''}`} />
                            </div>
                        </div>

                        {isCouponOpen && (
                            <div className="px-4 pb-5 space-y-4 animate-fadeIn">
                                <div className={`border-[1.5px] border-dashed rounded-xl p-4 relative group transition-colors ${appliedCoupon?.code === 'FIRST50' ? 'border-[#10B981] bg-[#ECFDF5]' : 'border-gray-200 bg-gray-50/50'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <div className={`px-3 py-1 rounded-lg text-xs font-black tracking-widest uppercase ${appliedCoupon?.code === 'FIRST50' ? 'bg-[#10B981] text-white' : 'bg-gray-200 text-gray-400'}`}>
                                            FIRST50
                                        </div>
                                        <button
                                            onClick={() => appliedCoupon?.code === 'FIRST50' ? setAppliedCoupon(null) : handleApplyCoupon('FIRST50')}
                                            className={`text-[11px] font-black uppercase transition-transform ${appliedCoupon?.code === 'FIRST50' ? 'text-gray-400' : 'text-[#9F1239] hover:scale-105'}`}
                                        >
                                            {appliedCoupon?.code === 'FIRST50' ? 'Remove' : 'Apply'}
                                        </button>
                                    </div>
                                    <p className="text-[11px] font-bold text-gray-500 mb-3">
                                        Get FLAT ₹250 on your first 2 orders above ₹500.
                                    </p>
                                    {appliedCoupon?.code === 'FIRST50' ? (
                                        <div className="flex items-center gap-2 text-[#10B981]">
                                            <div className="w-1.5 h-1.5 bg-[#10B981] rounded-full animate-ping" />
                                            <span className="text-[12px] font-black uppercase tracking-tight">Applied Successfully!</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-gray-300">
                                            <div className="w-1.5 h-1.5 bg-gray-200 rounded-full" />
                                            <span className="text-[11px] font-bold uppercase">Save ₹250 off with this code</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-center gap-1 cursor-pointer">
                                    <span className="text-[10px] font-black uppercase text-gray-400">Terms And Conditions</span>
                                    <ChevronDown size={14} className="text-gray-400" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Delivery Estimation */}
                    <div className="bg-white rounded-[24px] p-4 border border-gray-50 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                                <Truck size={18} className="text-blue-600" />
                            </div>
                            <span className="text-sm font-black uppercase tracking-tight">Delivery Estimate</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="bg-gray-50 px-4 py-2 rounded-xl text-center">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Standard</p>
                                <p className="text-xs font-black">2-4 Days</p>
                            </div>
                            <p className="text-xs font-bold text-gray-500 flex-1">
                                Delivery by <span className="text-black">Sat, 2 Mar</span>
                            </p>
                        </div>
                    </div>

                    {/* Price Summary / Bill Details */}
                    <div className="bg-white rounded-[24px] p-5 space-y-4 border border-gray-50 shadow-sm">
                        <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                            Bill Details
                        </h3>

                        <div className="space-y-3">
                            <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-widest">
                                <span>Bag Total</span>
                                <span className="text-black">₹{totalPrice}</span>
                            </div>
                            <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-widest">
                                <span>Bag Discount</span>
                                <span className="text-[#10B981]">-₹0</span>
                            </div>
                            <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-widest">
                                <span>Coupon Discount</span>
                                <span className="text-[#10B981]">{appliedCoupon ? `-₹${couponDiscount}` : '₹0'}</span>
                            </div>
                            <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-widest">
                                <span>Shipping Fee</span>
                                <span>{shipping === 0 ? <span className="text-[#10B981]">FREE</span> : `₹${shipping}`}</span>
                            </div>
                            <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-widest">
                                <span>GST (5%)</span>
                                <span className="text-black">₹{tax}</span>
                            </div>
                        </div>

                        <div className="h-px bg-gray-100" />

                        <div className="flex justify-between items-center bg-gray-50 -mx-5 px-5 py-3 mt-2">
                            <span className="text-sm font-black uppercase tracking-widest">Order Total</span>
                            <span className="text-lg font-black italic tracking-tighter text-[#9F1239]">₹{finalTotal}</span>
                        </div>
                    </div>

                    {/* One Last Touch Upsell */}
                    <div className="space-y-3 pt-4">
                        <div className="flex items-center justify-center gap-3">
                            <div className="h-px bg-gray-200 flex-1" />
                            <div className="text-center px-2">
                                <h2 className="text-xl font-display font-black tracking-widest uppercase italic leading-none">One Last <span className="font-serif">Touch</span></h2>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">Add accessories before checkout</p>
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
                                        <p className="text-[10px] font-black uppercase text-gray-400 mb-0.5">{item.brand}</p>
                                        <p className="text-[11px] font-bold text-gray-800 line-clamp-1">{item.name}</p>
                                        <p className="text-xs font-black mt-1">₹{item.price}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </main>
            </div>

            {/* Sticky Mobile Footer */}
            <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] px-4 py-4 md:py-6 z-[1001]">
                <div className="max-w-[500px] mx-auto space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                {activeAddress ? 'Deliver to' : 'No address selected'}
                            </span>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-black truncate max-w-[200px]">
                                    {activeAddress ? `${activeAddress.locality}, ${activeAddress.city}` : 'Add address to continue'}
                                </span>
                                <ChevronUp size={14} className="text-gray-400" />
                            </div>
                        </div>
                        <button
                            onClick={() => navigate('/account/addresses')}
                            className="text-[11px] font-black uppercase text-[#9F1239] hover:underline"
                        >
                            {activeAddress ? 'Change' : 'Add'}
                        </button>
                    </div>

                    <button
                        onClick={() => activeAddress ? navigate('/payment') : navigate('/account/addresses')}
                        className={`w-full py-4 rounded-[20px] font-black text-xs uppercase tracking-[0.2em] shadow-lg transition-all active:scale-95 ${activeAddress
                            ? 'bg-black text-white hover:bg-gray-800'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                    >
                        {activeAddress ? 'Proceed to Payment' : 'Add Address to Proceed'}
                    </button>
                </div>
            </div>

            {/* Global Custom Styles */}
            <style jsx>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                @keyframes pulse-subtle {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.95; transform: scale(0.995); }
                }
                .animate-pulse-subtle { animation: pulse-subtle 3s ease-in-out infinite; }
            `}</style>
        </div>
    );
};

export default CheckoutPage;

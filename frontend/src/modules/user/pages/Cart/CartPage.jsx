import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ArrowLeft, ShoppingBag, Heart, ShieldCheck, ChevronRight, MapPin, ChevronDown } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import LocationModal from '../../components/Header/LocationModal';
import { useUserLocation } from '../../context/LocationContext';

const CartPage = () => {
    const { cart, removeFromCart, updateQuantity, getCartTotal } = useCart();
    const { addToWishlist } = useWishlist();
    const { activeAddress } = useUserLocation();
    const navigate = useNavigate();
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

    const totalMRP = cart.reduce((acc, item) => {
        const itemSellingPrice = item.discountedPrice !== undefined ? item.discountedPrice : (item.price || item.originalPrice || 0);
        const itemMRP = Math.max(item.originalPrice || 0, item.price || 0, itemSellingPrice);
        return acc + (itemMRP * item.quantity);
    }, 0);
    const totalDiscount = totalMRP - getCartTotal();

    if (cart.length === 0) {
        return (
            <div className="bg-[#111111] min-h-[80vh] flex flex-col items-center justify-center px-4 animate-fadeIn">
                <div className="w-32 h-32 bg-[#1a1a1a] border border-white/5 rounded-full flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(212,175,55,0.05)]">
                    <ShoppingBag size={48} className="text-[#D4AF37]/50" />
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tight text-[#FAFAFA] mb-2">Your cart is Empty</h2>
                <p className="text-white/40 font-bold text-[13px] uppercase tracking-widest mb-10 text-center max-w-xs leading-relaxed">
                    Looks like you haven't added anything to your cart yet.
                </p>
                <button
                    onClick={() => navigate('/products')}
                    className="px-10 py-4 bg-[#D4AF37] text-black text-[12px] font-black uppercase tracking-widest rounded-2xl active:scale-95 transition-all shadow-[0_0_20px_rgba(212,175,55,0.2)]"
                >
                    Continue Shopping
                </button>
            </div>
        );
    }

    const handleMoveToWishlist = (item) => {
        addToWishlist(item);
        removeFromCart(item.id);
    };

    return (
        <div className="bg-[#111111] text-[#FAFAFA] min-h-screen pb-32 md:pb-12">
            {/* Mobile Header Nav */}
            <div className="md:hidden sticky top-0 bg-[#1a1a1a]/90 backdrop-blur-xl z-40 border-b border-white/10 px-4 py-4 flex items-center gap-4 shadow-sm">
                <button onClick={() => {
                    if (window.history.length > 2) {
                        navigate(-1);
                    } else {
                        navigate('/products');
                    }
                }} className="p-3 -ml-2 rounded-full hover:bg-white/5 transition-colors"><ArrowLeft size={20} className="text-[#FAFAFA]" /></button>
                <div className="flex-1">
                    <h1 className="text-base font-black uppercase tracking-tight text-[#FAFAFA]">Shopping cart</h1>
                    <p className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">{cart.length} Items</p>
                </div>
            </div>

            {/* Address Bar - New Row */}
            <div
                onClick={() => setIsLocationModalOpen(true)}
                className="md:hidden flex items-center justify-between px-4 py-3 bg-[#111111] border-b border-white/10 cursor-pointer active:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-3 overflow-hidden">
                    <MapPin size={16} className="text-[#D4AF37] shrink-0" />
                    <div className="flex flex-col min-w-0">
                        <span className="text-[12px] font-black leading-tight flex items-center gap-2 text-[#FAFAFA]">
                            {activeAddress ? activeAddress.name : 'Select Location'} <span className="text-[9px] font-normal uppercase tracking-wider text-white/40">{activeAddress?.type}</span>
                        </span>
                        <span className="text-[10px] font-medium truncate max-w-[200px] text-white/50">
                            {activeAddress ? `${activeAddress.address}, ${activeAddress.city}` : 'Add an address to see delivery info'}
                        </span>
                    </div>
                </div>
                <ChevronDown size={14} className="text-white/30" />
            </div>

            <LocationModal
                isOpen={isLocationModalOpen}
                onClose={() => setIsLocationModalOpen(false)}
            />

            <div className="container mx-auto px-4 py-8 max-w-7xl">
                <div className="hidden md:block mb-10">
                    <h1 className="text-3xl font-black uppercase tracking-tight text-[#FAFAFA]">Your cart</h1>
                    <p className="text-[14px] font-bold text-[#D4AF37] mt-1 uppercase tracking-[0.2em]">{cart.length} Items</p>
                </div>

                <div className="flex flex-col lg:flex-row gap-10">
                    {/* Cart Items List */}
                    <div className="flex-[1.5] space-y-4">
                        {cart.map((item) => (
                            <div key={`${item.id}-${item.selectedSize}`} className="bg-[#1a1a1a] rounded-[24px] overflow-hidden border border-white/10 shadow-lg flex flex-col sm:flex-row p-4 sm:p-5 relative group transition-colors hover:border-white/20">
                                <Link to={`/product/${item.id}`} className="w-full sm:w-32 aspect-[3/4] sm:h-auto rounded-2xl overflow-hidden shrink-0 bg-[#111111] border border-white/5">
                                    <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-90 group-hover:opacity-100" />
                                </Link>

                                <div className="flex-1 flex flex-col pt-4 sm:pt-0 sm:pl-6">
                                    <div className="flex justify-between items-start mb-1">
                                        <div>
                                            <h3 className="text-[11px] font-black text-[#D4AF37] uppercase tracking-widest mb-1">{item.brand}</h3>
                                            <h4 className="text-[15px] font-bold text-[#FAFAFA] leading-tight mb-3 uppercase tracking-tight">{item.name}</h4>
                                        </div>
                                        <button
                                            className="p-2 -mr-2 text-white/40 hover:text-red-500 hover:bg-white/5 rounded-full transition-all"
                                            onClick={() => removeFromCart(item.id)}
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>

                                    <div className="flex flex-wrap gap-4 mb-5">
                                        <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                                            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Size</span>
                                            <span className="text-[12px] font-black text-[#FAFAFA] uppercase">{item.selectedSize || 'M'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                                            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Qty</span>
                                            <div className="flex items-center gap-2.5 ml-1">
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                    className="hover:text-[#D4AF37] text-white/60 disabled:opacity-30"
                                                    disabled={item.quantity <= 1}
                                                >
                                                    <Minus size={14} strokeWidth={3} />
                                                </button>
                                                <span className="text-[12px] font-black min-w-[12px] text-center text-[#FAFAFA]">{item.quantity}</span>
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                    className="hover:text-[#D4AF37] text-white/60"
                                                >
                                                    <Plus size={14} strokeWidth={3} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-auto flex items-end justify-between">
                                        <button
                                            onClick={() => handleMoveToWishlist(item)}
                                            className="text-[11px] font-black uppercase tracking-widest text-[#FAFAFA] flex items-center gap-2 border-b-2 border-transparent hover:text-[#D4AF37] hover:border-[#D4AF37] pb-1 transition-all"
                                        >
                                            <Heart size={14} /> Move to Wishlist
                                        </button>
                                        <div className="text-right">
                                            <div className="flex items-center gap-2 justify-end mb-0.5">
                                                <span className="text-lg font-black text-[#FAFAFA]">
                                                    ₹{((item.discountedPrice !== undefined ? item.discountedPrice : (item.price || item.originalPrice || 0)) * item.quantity).toFixed(0)}
                                                </span>
                                                {(item.discount || (item.originalPrice > (item.discountedPrice || item.price))) && (
                                                    <span className="text-[11px] font-black text-[#111111] bg-[#D4AF37] px-2 py-0.5 rounded-full shadow-sm">
                                                        {item.discount || `${Math.round(((item.originalPrice - (item.discountedPrice || item.price)) / item.originalPrice) * 100)}% OFF`}
                                                    </span>
                                                )}
                                            </div>
                                            {(item.originalPrice > (item.discountedPrice || item.price)) && (
                                                <span className="text-[12px] font-bold text-white/30 line-through">₹{item.originalPrice * item.quantity}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        <div className="bg-[#1a1a1a] border border-white/10 p-4 rounded-2xl flex items-center gap-4 mt-6">
                            <ShieldCheck className="text-[#D4AF37]" size={24} />
                            <div>
                                <p className="text-[12px] font-black uppercase tracking-tight text-[#FAFAFA]">Safe and Secure Payments</p>
                                <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">100% Authentic products guaranteed</p>
                            </div>
                        </div>
                    </div>

                    {/* Price Details Sidebar */}
                    <div className="flex-1 lg:max-w-md">
                        <div className="bg-[#1a1a1a] rounded-[32px] overflow-hidden border border-white/10 shadow-2xl lg:sticky lg:top-28">
                            <div className="p-8">
                                <h3 className="text-[14px] font-black uppercase tracking-widest text-[#FAFAFA] mb-8 flex items-center justify-between">
                                    Cart Summary
                                    <ShoppingBag size={18} className="text-[#D4AF37]" />
                                </h3>

                                <div className="space-y-6">
                                    <div className="flex justify-between text-[13px] font-bold">
                                        <span className="text-white/40 uppercase tracking-widest">Total MRP</span>
                                        <span className="text-[#FAFAFA] font-black tracking-tight">₹{totalMRP}</span>
                                    </div>
                                    <div className="flex justify-between text-[13px] font-bold">
                                        <span className="text-white/40 uppercase tracking-widest">Cart Discount</span>
                                        <span className="text-[#D4AF37] font-black tracking-tight">-₹{totalDiscount}</span>
                                    </div>
                                    <div className="flex justify-between text-[13px] font-bold">
                                        <span className="text-white/40 uppercase tracking-widest">Convenience Fee</span>
                                        <span className="text-[#D4AF37] font-black tracking-tight">FREE</span>
                                    </div>

                                    <div className="h-px bg-white/10 my-2"></div>

                                    <div className="flex justify-between items-end py-2">
                                        <div>
                                            <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">Total Amount</p>
                                            <p className="text-2xl font-black text-[#FAFAFA] tracking-tight">₹{getCartTotal()}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[11px] font-black text-[#111111] bg-[#D4AF37] px-2 py-1 rounded-lg">You saved ₹{totalDiscount}</p>
                                        </div>
                                    </div>

                                    {/* HIDDEN ON MOBILE: Avoids duplicate button with bottom action bar */}
                                    <button
                                        onClick={() => navigate('/checkout')}
                                        className="hidden lg:flex w-full py-5 bg-[#D4AF37] text-black text-[13px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-[0_4px_20px_rgba(212,175,55,0.2)] active:scale-95 transition-all items-center justify-center gap-3 hover:bg-[#FAFAFA] hover:shadow-xl"
                                    >
                                        Place Order <ChevronRight size={18} />
                                    </button>

                                    <p className="text-center text-[10px] font-bold text-white/30 uppercase tracking-widest mt-4">
                                        30 Days Easy Returns & Exchanges
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Bottom Action Bar */}
            <div className="lg:hidden fixed bottom-0 left-0 w-full bg-[#111111]/95 backdrop-blur-xl border-t border-white/10 px-6 py-4 z-50 flex items-center justify-between shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
                <div>
                    <p className="text-[10px] font-black text-white/50 uppercase tracking-tight">Total to Pay</p>
                    <p className="text-xl font-black text-[#FAFAFA] tracking-tight">₹{getCartTotal()}</p>
                </div>
                <button
                    onClick={() => navigate('/checkout')}
                    className="px-10 py-4 bg-[#D4AF37] text-black text-[12px] font-black uppercase tracking-widest rounded-2xl active:scale-95 transition-all shadow-[0_0_20px_rgba(212,175,55,0.2)] flex items-center justify-center min-w-[160px]"
                >
                    Checkout <ChevronRight className="inline-block ml-2 w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default CartPage;

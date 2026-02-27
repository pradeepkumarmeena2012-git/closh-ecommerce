import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ArrowLeft, ShoppingBag, Heart, ShieldCheck, ChevronRight, MapPin, ChevronDown } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import LocationModal from '../../components/Header/LocationModal';
import { useLocation as useLocationContext } from '../../context/LocationContext';

const CartPage = () => {
    const { cart, removeFromCart, updateQuantity, getCartTotal } = useCart();
    const { addToWishlist } = useWishlist();
    const { activeAddress } = useLocationContext();
    const navigate = useNavigate();
    const [isLocationModalOpen, setIsLocationModalOpen] = React.useState(false);

    const totalMRP = cart.reduce((acc, item) => {
        const itemSellingPrice = item.discountedPrice !== undefined ? item.discountedPrice : (item.price || item.originalPrice || 0);
        const itemMRP = Math.max(item.originalPrice || 0, item.price || 0, itemSellingPrice);
        return acc + (itemMRP * item.quantity);
    }, 0);
    const totalDiscount = totalMRP - getCartTotal();

    if (cart.length === 0) {
        return (
            <div className="bg-white min-h-[80vh] flex flex-col items-center justify-center px-4 animate-fadeIn">
                <div className="w-32 h-32 bg-gray-50 rounded-full flex items-center justify-center mb-8">
                    <ShoppingBag size={48} className="text-gray-200" />
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tight text-gray-900 mb-2">Your cart is Empty</h2>
                <p className="text-gray-500 font-bold text-[13px] uppercase tracking-widest mb-10 text-center max-w-xs leading-relaxed">
                    Looks like you haven't added anything to your cart yet.
                </p>
                <button
                    onClick={() => navigate('/products')}
                    className="px-10 py-4 bg-black text-white text-[12px] font-black uppercase tracking-widest rounded-2xl active:scale-95 transition-all shadow-xl"
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
        <div className="bg-[#fafafa] min-h-screen pb-24 md:pb-12">
            {/* Mobile Header Nav */}
            <div className="md:hidden sticky top-0 bg-white z-40 border-b border-gray-100 px-4 py-4 flex items-center gap-4">
                <button onClick={() => {
                    if (window.history.length > 2) {
                        navigate(-1);
                    } else {
                        navigate('/products');
                    }
                }} className="p-3 -ml-2 rounded-full hover:bg-gray-100 transition-colors"><ArrowLeft size={20} /></button>
                <div className="flex-1">
                    <h1 className="text-base font-black uppercase tracking-tight">Shopping cart</h1>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{cart.length} Items</p>
                </div>
            </div>

            {/* Address Bar - New Row */}
            <div
                onClick={() => setIsLocationModalOpen(true)}
                className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 cursor-pointer active:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-3 overflow-hidden">
                    <MapPin size={16} className="text-black shrink-0" />
                    <div className="flex flex-col min-w-0">
                        <span className="text-[12px] font-black leading-tight flex items-center gap-2 text-gray-900">
                            {activeAddress ? activeAddress.name : 'Select Location'} <span className="text-[9px] font-normal uppercase tracking-wider text-gray-500">{activeAddress?.type}</span>
                        </span>
                        <span className="text-[10px] font-medium truncate max-w-[200px] text-gray-500">
                            {activeAddress ? `${activeAddress.address}, ${activeAddress.city}` : 'Add an address to see delivery info'}
                        </span>
                    </div>
                </div>
                <ChevronDown size={14} className="text-gray-400" />
            </div>

            <LocationModal
                isOpen={isLocationModalOpen}
                onClose={() => setIsLocationModalOpen(false)}
            />

            <div className="container mx-auto px-4 py-8 max-w-7xl">
                <div className="hidden md:block mb-10">
                    <h1 className="text-3xl font-black uppercase tracking-tight text-gray-900">Your cart</h1>
                    <p className="text-[14px] font-bold text-gray-400 mt-1 uppercase tracking-[0.2em]">{cart.length} Items</p>
                </div>

                <div className="flex flex-col lg:flex-row gap-10">
                    {/* Cart Items List */}
                    <div className="flex-[1.5] space-y-4">
                        {cart.map((item) => (
                            <div key={`${item.id}-${item.selectedSize}`} className="bg-white rounded-[24px] overflow-hidden border border-gray-100 shadow-sm flex flex-col sm:flex-row p-4 sm:p-5 relative group">
                                <Link to={`/product/${item.id}`} className="w-full sm:w-32 aspect-[3/4] sm:h-auto rounded-2xl overflow-hidden shrink-0 bg-gray-50 border border-gray-100">
                                    <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                </Link>

                                <div className="flex-1 flex flex-col pt-4 sm:pt-0 sm:pl-6">
                                    <div className="flex justify-between items-start mb-1">
                                        <div>
                                            <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1">{item.brand}</h3>
                                            <h4 className="text-[15px] font-bold text-gray-800 leading-tight mb-3 uppercase tracking-tight">{item.name}</h4>
                                        </div>
                                        <button
                                            className="p-2 -mr-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                            onClick={() => removeFromCart(item.id)}
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>

                                    <div className="flex flex-wrap gap-4 mb-5">
                                        <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Size</span>
                                            <span className="text-[12px] font-black uppercase">{item.selectedSize || 'M'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Qty</span>
                                            <div className="flex items-center gap-2.5 ml-1">
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                    className="hover:text-black text-gray-400 disabled:opacity-30"
                                                    disabled={item.quantity <= 1}
                                                >
                                                    <Minus size={14} strokeWidth={3} />
                                                </button>
                                                <span className="text-[12px] font-black min-w-[12px] text-center">{item.quantity}</span>
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                    className="hover:text-black text-gray-400"
                                                >
                                                    <Plus size={14} strokeWidth={3} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-auto flex items-end justify-between">
                                        <button
                                            onClick={() => handleMoveToWishlist(item)}
                                            className="text-[11px] font-black uppercase tracking-widest text-black flex items-center gap-2 border-b-2 border-transparent hover:border-black pb-1 transition-all"
                                        >
                                            <Heart size={14} /> Move to Wishlist
                                        </button>
                                        <div className="text-right">
                                            <div className="flex items-center gap-2 justify-end mb-0.5">
                                                <span className="text-lg font-black text-black">
                                                    ₹{((item.discountedPrice !== undefined ? item.discountedPrice : (item.price || item.originalPrice || 0)) * item.quantity).toFixed(0)}
                                                </span>
                                                {(item.discount || (item.originalPrice > (item.discountedPrice || item.price))) && (
                                                    <span className="text-[11px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                                        {item.discount || `${Math.round(((item.originalPrice - (item.discountedPrice || item.price)) / item.originalPrice) * 100)}% OFF`}
                                                    </span>
                                                )}
                                            </div>
                                            {(item.originalPrice > (item.discountedPrice || item.price)) && (
                                                <span className="text-[12px] font-bold text-gray-400 line-through">₹{item.originalPrice * item.quantity}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center gap-4">
                            <ShieldCheck className="text-emerald-600" size={24} />
                            <div>
                                <p className="text-[12px] font-black uppercase tracking-tight text-emerald-900">Safe and Secure Payments</p>
                                <p className="text-[10px] font-bold text-emerald-700/70 uppercase tracking-widest">100% Authentic products guaranteed</p>
                            </div>
                        </div>
                    </div>

                    {/* Price Details Sidebar */}
                    <div className="flex-1 lg:max-w-md">
                        <div className="bg-white rounded-[32px] overflow-hidden border border-gray-100 shadow-xl sticky top-28">
                            <div className="p-8">
                                <h3 className="text-[14px] font-black uppercase tracking-widest text-gray-900 mb-8 flex items-center justify-between">
                                    cart Summary
                                    <ShoppingBag size={18} className="text-gray-300" />
                                </h3>

                                <div className="space-y-6">
                                    <div className="flex justify-between text-[13px] font-bold">
                                        <span className="text-gray-400 uppercase tracking-widest">Total MRP</span>
                                        <span className="text-gray-900 font-black tracking-tight">₹{totalMRP}</span>
                                    </div>
                                    <div className="flex justify-between text-[13px] font-bold">
                                        <span className="text-gray-400 uppercase tracking-widest">cart Discount</span>
                                        <span className="text-emerald-600 font-black tracking-tight">-₹{totalDiscount}</span>
                                    </div>
                                    <div className="flex justify-between text-[13px] font-bold">
                                        <span className="text-gray-400 uppercase tracking-widest">Convenience Fee</span>
                                        <span className="text-emerald-600 font-black tracking-tight">FREE</span>
                                    </div>

                                    <div className="h-px bg-gray-50 my-2"></div>

                                    <div className="flex justify-between items-end py-2">
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Amount</p>
                                            <p className="text-2xl font-black text-black tracking-tight">₹{getCartTotal()}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[11px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">You saved ₹{totalDiscount}</p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => navigate('/checkout')}
                                        className="w-full py-5 bg-black text-white text-[13px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3"
                                    >
                                        Place Order <ChevronRight size={18} />
                                    </button>

                                    <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-4">
                                        30 Days Easy Returns & Exchanges
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Bottom Action Bar */}
            <div className="lg:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 px-6 py-4 z-50 flex items-center justify-between shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
                <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-tight">Total to Pay</p>
                    <p className="text-xl font-black text-black tracking-tight">₹{getCartTotal()}</p>
                </div>
                <button
                    onClick={() => navigate('/checkout')}
                    className="px-10 py-4 bg-black text-white text-[12px] font-black uppercase tracking-widest rounded-2xl active:scale-95 transition-all shadow-xl"
                >
                    Checkout <ArrowLeft className="rotate-180 inline-block ml-2" size={16} />
                </button>
            </div>
        </div>
    );
};

export default CartPage;

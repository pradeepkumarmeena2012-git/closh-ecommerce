import { Link } from 'react-router-dom';
import { Heart, ShoppingCart } from 'lucide-react';
import { useWishlist } from '../../context/WishlistContext';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useCategory } from '../../context/CategoryContext';
import LoginModal from '../Modals/LoginModal';
import { useState } from 'react';

const ProductCard = ({ product }) => {
    const { toggleWishlist, isInWishlist } = useWishlist();
    const { addToCart } = useCart();
    const { user } = useAuth();
    const { activeCategory } = useCategory();
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

    const getCardTheme = (categoryName) => {
        const name = categoryName?.toLowerCase() || '';
        // Returning a custom border/glow class instead of a full background replacement
        // The card itself will stay dark `#1a1a1a`, but we'll inject these classes
        if (name === 'hello' || name === 'women') return 'border-t-[3px] border-t-[#E91E63] shadow-[0_-5px_20px_rgba(233,30,99,0.1)]';
        if (name === 'men\'s fashion' || name === 'mens' || name === 'men') return 'border-t-[3px] border-t-[#0288D1] shadow-[0_-5px_20px_rgba(2,136,209,0.1)]';
        if (name === 'bottom wear') return 'border-t-[3px] border-t-[#689F38] shadow-[0_-5px_20px_rgba(104,159,56,0.1)]';
        if (name === 'beauty') return 'border-t-[3px] border-t-[#D81B60] shadow-[0_-5px_20px_rgba(216,27,96,0.1)]';
        if (name === 'accessories') return 'border-t-[3px] border-t-[#FFB300] shadow-[0_-5px_20px_rgba(255,179,0,0.1)]';
        return 'border-t-[3px] border-t-transparent';
    };

    const cardTheme = getCardTheme(activeCategory);

    const handleAddToCart = (e) => {
        e.preventDefault();
        e.stopPropagation();

        console.log("ProductCard: Add to Cart clicked. User:", user);

        if (!user) {
            console.log("ProductCard: User null. Opening LoginModal.");
            setIsLoginModalOpen(true);
            return;
        }

        addToCart({ ...product, selectedSize: product.size ? product.size[0] : 'M' });
    };

    return (
        <>
            <div className="group relative w-full h-full flex flex-col">
                <Link
                    to={`/product/${product.id}`}
                    className={`flex flex-col bg-[#1a1a1a] ${cardTheme} rounded-[16px] md:rounded-none overflow-hidden transition-all duration-700 cursor-pointer no-underline text-inherit group-hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.7)] h-full relative z-0 group-hover:z-10`}
                >
                    {/* Image Container - Tall Fashion Aspect Ratio */}
                    <div className="relative w-full aspect-[3/4] overflow-hidden bg-[#111111]">
                        <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover transition-all duration-[1200ms] ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-105"
                        />

                        {/* Ultra-subtle overlay */}
                        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/[0.03] transition-colors duration-700 pointer-events-none" />

                        {/* Top Right Actions (Wishlist) - Minimalist Glass */}
                        <div className="absolute top-3 right-3 z-10 md:opacity-0 md:-translate-y-2 md:group-hover:opacity-100 md:group-hover:translate-y-0 transition-all duration-500 ease-out">
                            <button
                                className={`group/heart w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all duration-300 hover:scale-110 active:scale-75 ${isInWishlist(product.id) ? 'bg-[#111111] border border-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.5)] text-red-500' : 'bg-[#111111]/40 border border-white/10 text-[#FAFAFA] hover:bg-[#111111] hover:shadow-[0_4px_12px_rgba(0,0,0,0.5)]'}`}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    toggleWishlist(product);
                                }}
                            >
                                <Heart size={14} strokeWidth={1.5} className={`transition-all duration-500 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] group-active/heart:scale-50 ${isInWishlist(product.id) ? 'fill-red-500 scale-110' : 'scale-100'}`} />
                            </button>
                        </div>

                        {/* Quick Add to Cart (Desktop Hover Slider) */}
                        <div className="absolute bottom-0 left-0 right-0 z-10 translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] md:block hidden">
                            <button
                                className="w-full py-3.5 bg-[#111111] border-t border-white/5 text-[#FAFAFA] font-premium font-black text-[10px] uppercase tracking-[0.2em] hover:bg-[#D4AF37] hover:text-[#111111] transition-all flex items-center justify-center gap-2"
                                onClick={handleAddToCart}
                            >
                                Quick Add <ShoppingCart size={12} strokeWidth={2} />
                            </button>
                        </div>

                        {/* Mobile Always-Visible Cart Icon (Minimalist) */}
                        <div className="absolute bottom-3 right-3 z-10 md:hidden">
                            <button
                                className="w-8 h-8 rounded-full bg-[#111111]/80 backdrop-blur-md border border-white/10 text-[#FAFAFA] shadow-[0_4px_12px_rgba(0,0,0,0.5)] flex items-center justify-center hover:bg-[#D4AF37] hover:border-transparent hover:text-black active:scale-95 transition-all"
                                onClick={handleAddToCart}
                            >
                                <ShoppingCart size={13} strokeWidth={1.5} />
                            </button>
                        </div>

                        {/* Top Left Tags (Hyper-Minimalist) */}
                        <div className="absolute top-4 left-0 flex flex-col gap-1.5 items-start z-10">
                            {product.tryAndBuy && (
                                <span className="bg-[#111111]/90 backdrop-blur-md border border-l-0 border-white/10 text-[#FAFAFA] px-2.5 py-1 rounded-r-sm shadow-[0_2px_10px_rgba(0,0,0,0.5)] flex items-center gap-1.5">
                                    <div className="w-1 h-1 rounded-full bg-[#D4AF37] animate-pulse" />
                                    <span className="text-[7.5px] font-premium font-black leading-none uppercase tracking-[0.2em] mt-px">T&B</span>
                                </span>
                            )}
                            {product.checkAndBuy && (
                                <span className="bg-[#111111]/90 backdrop-blur-md border border-l-0 border-white/10 text-[#FAFAFA] px-2.5 py-1 rounded-r-sm shadow-[0_2px_10px_rgba(0,0,0,0.5)] flex items-center gap-1.5 mt-1">
                                    <div className="w-1 h-1 rounded-full bg-emerald-500" />
                                    <span className="text-[7.5px] font-premium font-black leading-none uppercase tracking-[0.2em] mt-px">C&B</span>
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Content Area - Minimalist Luxury */}
                    <div className="pt-4 pb-5 px-3 md:px-1 bg-transparent flex flex-col flex-1 items-start text-left">

                        <h3 className="text-[9px] md:text-[10px] font-premium font-black uppercase tracking-[0.25em] text-[#D4AF37] mb-1.5 truncate w-full">
                            {product.brand || 'Luxury'}
                        </h3>

                        <p className="text-[11px] md:text-[12px] font-premium font-bold text-[#FAFAFA] leading-relaxed line-clamp-2 mb-3 w-full">
                            {product.name}
                        </p>

                        <div className="mt-auto flex items-baseline gap-2.5 w-full">
                            <span className="text-[13px] md:text-[14px] font-premium font-black text-[#FAFAFA] tracking-wide">
                                ₹{product.discountedPrice}
                            </span>
                            {product.originalPrice && product.originalPrice !== product.discountedPrice && (
                                <span className="text-[10px] md:text-[11px] font-premium text-white/40 line-through tracking-wide">
                                    ₹{product.originalPrice}
                                </span>
                            )}
                            {product.discount && (
                                <span className="text-[9px] font-premium font-medium text-[#D4AF37] ml-auto">
                                    ({product.discount})
                                </span>
                            )}
                        </div>
                    </div>
                </Link>
            </div>

            <LoginModal
                isOpen={isLoginModalOpen}
                onClose={() => setIsLoginModalOpen(false)}
            />
        </>
    );
};

export default ProductCard;

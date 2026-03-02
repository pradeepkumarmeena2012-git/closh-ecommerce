import { Link } from 'react-router-dom';
import { Heart, ShoppingCart } from 'lucide-react';
import { useWishlist } from '../../context/WishlistContext';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import LoginModal from '../Modals/LoginModal';
import { useState } from 'react';

const ProductCard = ({ product }) => {
    const { toggleWishlist, isInWishlist } = useWishlist();
    const { addToCart } = useCart();
    const { user } = useAuth();
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

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
                    className="flex flex-col bg-white rounded-none overflow-hidden transition-all duration-700 cursor-pointer no-underline text-inherit group-hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] h-full relative z-0 group-hover:z-10"
                >
                    {/* Image Container - Tall Fashion Aspect Ratio */}
                    <div className="relative w-full aspect-[3/4] overflow-hidden bg-[#FAFAFA]">
                        <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover transition-all duration-[1200ms] ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-105"
                        />

                        {/* Ultra-subtle overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/[0.03] transition-colors duration-700 pointer-events-none" />

                        {/* Top Right Actions (Wishlist) - Minimalist Glass */}
                        <div className="absolute top-3 right-3 z-10 md:opacity-0 md:-translate-y-2 md:group-hover:opacity-100 md:group-hover:translate-y-0 transition-all duration-500 ease-out">
                            <button
                                className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all duration-300 hover:scale-110 active:scale-95 ${isInWishlist(product.id) ? 'bg-white shadow-[0_4px_12px_rgba(0,0,0,0.08)] text-red-500' : 'bg-white/40 text-[#111111] hover:bg-white hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]'}`}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    toggleWishlist(product);
                                }}
                            >
                                <Heart size={14} strokeWidth={1.5} className={isInWishlist(product.id) ? 'fill-red-500' : ''} />
                            </button>
                        </div>

                        {/* Quick Add to Cart (Desktop Hover Slider) */}
                        <div className="absolute bottom-0 left-0 right-0 z-10 translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] md:block hidden">
                            <button
                                className="w-full py-3.5 bg-white/95 backdrop-blur-md text-[#111111] font-premium font-black text-[10px] uppercase tracking-[0.2em] shadow-[0_-8px_25px_rgba(0,0,0,0.05)] hover:bg-[#111111] hover:text-white transition-colors flex items-center justify-center gap-2"
                                onClick={handleAddToCart}
                            >
                                Quick Add <ShoppingCart size={12} strokeWidth={2} />
                            </button>
                        </div>

                        {/* Mobile Always-Visible Cart Icon (Minimalist) */}
                        <div className="absolute bottom-3 right-3 z-10 md:hidden">
                            <button
                                className="w-8 h-8 rounded-full bg-white/60 backdrop-blur-md text-[#111111] shadow-[0_4px_12px_rgba(0,0,0,0.05)] flex items-center justify-center hover:bg-white active:scale-95 transition-colors"
                                onClick={handleAddToCart}
                            >
                                <ShoppingCart size={13} strokeWidth={1.5} />
                            </button>
                        </div>

                        {/* Top Left Tags (Hyper-Minimalist) */}
                        <div className="absolute top-4 left-0 flex flex-col gap-1.5 items-start z-10">
                            {product.tryAndBuy && (
                                <span className="bg-white/90 backdrop-blur-md text-[#111111] px-2.5 py-1 rounded-r-sm shadow-[0_2px_10px_rgba(0,0,0,0.05)] flex items-center gap-1.5">
                                    <div className="w-1 h-1 rounded-full bg-[#D4AF37] animate-pulse" />
                                    <span className="text-[7.5px] font-premium font-black leading-none uppercase tracking-[0.2em] mt-px">T&B</span>
                                </span>
                            )}
                            {product.checkAndBuy && (
                                <span className="bg-white/90 backdrop-blur-md text-[#111111] px-2.5 py-1 rounded-r-sm shadow-[0_2px_10px_rgba(0,0,0,0.05)] flex items-center gap-1.5 mt-1">
                                    <div className="w-1 h-1 rounded-full bg-emerald-500" />
                                    <span className="text-[7.5px] font-premium font-black leading-none uppercase tracking-[0.2em] mt-px">C&B</span>
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Content Area - Minimalist Luxury */}
                    <div className="pt-4 pb-5 px-1 bg-white flex flex-col flex-1 items-start text-left">

                        <h3 className="text-[9px] md:text-[10px] font-premium font-black uppercase tracking-[0.25em] text-[#111111]/50 mb-1.5 truncate w-full">
                            {product.brand || 'Luxury'}
                        </h3>

                        <p className="text-[11px] md:text-[12px] font-premium font-medium text-[#111111]/80 leading-relaxed line-clamp-2 mb-3 group-hover:text-[#111111] transition-colors w-full">
                            {product.name}
                        </p>

                        <div className="mt-auto flex items-baseline gap-2.5 w-full">
                            <span className="text-[13px] md:text-[14px] font-premium font-medium text-[#111111] tracking-wide">
                                ₹{product.discountedPrice}
                            </span>
                            {product.originalPrice && product.originalPrice !== product.discountedPrice && (
                                <span className="text-[10px] md:text-[11px] font-premium text-[#111111]/40 line-through tracking-wide">
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

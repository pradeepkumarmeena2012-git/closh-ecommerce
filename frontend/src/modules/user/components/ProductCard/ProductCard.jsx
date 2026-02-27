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
            <div className="group relative">
                <Link
                    to={`/product/${product.id}`}
                    className="flex flex-col bg-white rounded-md overflow-hidden transition-all duration-300 cursor-pointer no-underline text-inherit border border-gray-50 hover:border-black/5"
                >
                    <div className="relative w-full aspect-[4/5] overflow-hidden bg-[#fafafa]">
                        <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />

                        {/* Action Icons - ALWAYS VISIBLE */}
                        <div className="absolute top-2 left-2 flex gap-1.5 z-10">
                            <button
                                className="w-8 h-8 rounded-full flex items-center justify-center bg-[#ffcc00] text-black shadow-lg active:scale-90 transition-all border border-black/5"
                                onClick={handleAddToCart}
                            >
                                <ShoppingCart size={14} strokeWidth={3} />
                            </button>
                            <button
                                className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all border border-black/5 ${isInWishlist(product.id) ? 'bg-red-500 text-white' : 'bg-white text-black'}`}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    toggleWishlist(product);
                                }}
                            >
                                <Heart size={14} className={isInWishlist(product.id) ? 'fill-white' : ''} />
                            </button>
                        </div>

                        {/* Service Badges */}
                        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end z-10">
                            {product.tryAndBuy && (
                                <span className="bg-black/80 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter backdrop-blur-sm border border-white/10">
                                    Try & Buy
                                </span>
                            )}
                            {product.checkAndBuy && (
                                <span className="bg-[#ffcc00]/90 text-black text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter backdrop-blur-sm border border-black/10">
                                    Check & Buy
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="p-2 pb-3 bg-white">
                        <h3 className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-1 truncate">
                            {product.brand}
                        </h3>
                        <p className="text-[11px] font-bold text-gray-800 leading-tight line-clamp-2 mb-2">
                            {product.name}
                        </p>
                        <div className="mt-auto">
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-[13px] font-black text-black">₹{product.discountedPrice}</span>
                                <span className="text-[10px] text-gray-400 line-through font-bold">₹{product.originalPrice}</span>
                            </div>
                            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-tighter block mt-0.5">{product.discount}</span>
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

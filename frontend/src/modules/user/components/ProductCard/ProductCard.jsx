import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useWishlist } from '../../context/WishlistContext';
import { useAuth } from '../../context/AuthContext';
import { useCategory } from '../../context/CategoryContext';

const ProductCard = ({ product }) => {
    const { toggleWishlist, isInWishlist } = useWishlist();
    const { user } = useAuth();
    const { activeCategory } = useCategory();

    return (
        <>
            <div className="group relative w-full h-full flex flex-col bg-white overflow-hidden rounded-xl transition-all duration-500 hover:shadow-[0_15px_30px_rgba(0,0,0,0.08)] hover:-translate-y-1">
                <Link
                    to={`/product/${product.id}`}
                    className="flex flex-col group no-underline text-inherit h-full"
                >
                    {/* Image Container - Compact ratio */}
                    <div className="relative w-full aspect-[3/4] overflow-hidden rounded-lg bg-[#F5F5F5] group-hover:rounded-xl transition-all duration-500">
                        <img
                            src={product.image}
                            alt={product.name}
                            className={`w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110 ${product.stock === 'out_of_stock' ? 'grayscale opacity-70' : ''}`}
                        />

                        {/* Top Right Actions (Wishlist) - Glassmorphism */}
                        <div className="absolute top-2 right-2 z-10 transition-all duration-500">
                            <button
                                className={`w-6 h-6 rounded-full flex items-center justify-center backdrop-blur-md transition-all duration-300 hover:scale-110 active:scale-75 ${isInWishlist(product.id) ? 'bg-white shadow-md text-red-500' : 'bg-white/70 text-gray-900 border border-gray-100'}`}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    toggleWishlist(product);
                                }}
                            >
                                <Heart size={11} className={`${isInWishlist(product.id) ? 'fill-red-500' : ''}`} />
                            </button>
                        </div>
                        {/* Out of Stock Status - Original Red Style */}
                        {product.stock === 'out_of_stock' ? (
                            <div className="absolute inset-x-0 bottom-0 top-0 bg-gradient-to-t from-black/40 via-transparent to-transparent z-10 pointer-events-none flex flex-col justify-end pb-4 transition-opacity duration-300">
                                <span className="text-red-500 text-[11px] md:text-[13px] font-black uppercase tracking-[0.2em] text-center drop-shadow-sm">
                                    Currently unavailable
                                </span>
                            </div>
                        ) : product.vendorId?.isOnline === false ? (
                            <div className="absolute inset-x-0 bottom-0 top-0 bg-gradient-to-t from-black/70 via-transparent to-transparent z-10 pointer-events-none flex flex-col justify-end pb-4 transition-opacity duration-300">
                                <span className="text-white text-[11px] md:text-[13px] font-black uppercase tracking-[0.2em] text-center drop-shadow-lg">
                                    Store Offline
                                </span>
                            </div>
                        ) : null}
                    </div>

                    {/* Content Area - Matching Image 2 Minimalist Style */}
                    <div className="pt-2.5 pb-1.5 flex flex-col flex-1 items-start text-left">
                        <h3 className="text-[11px] md:text-[13px] font-black text-gray-900 uppercase tracking-tight mb-0.5 truncate w-full">
                            {product.brand || 'Premium'}
                        </h3>

                        <p className="text-[10px] md:text-[12px] font-medium text-gray-500 line-clamp-1 mb-1 w-full">
                            {product.name}
                        </p>

                        <div className="mt-auto flex flex-wrap items-center gap-1.5 md:gap-2 w-full">
                            <div className="flex items-center gap-1">
                                <span className="text-[11px] md:text-[13px] font-bold text-gray-900">
                                    ₹{product.discountedPrice || product.price}
                                </span>
                                {product.originalPrice && product.originalPrice > (product.discountedPrice || product.price) && (
                                    <span className="text-[9px] md:text-[11px] text-gray-400 line-through font-medium">
                                        ₹{product.originalPrice}
                                    </span>
                                )}
                            </div>
                            
                            {product.originalPrice && product.originalPrice > (product.discountedPrice || product.price) && (
                                <div className="bg-[#D8FFBD] text-[#388E3C] text-[9px] md:text-[11px] font-bold px-1 py-0.5 rounded-sm">
                                    {Math.round(((product.originalPrice - (product.discountedPrice || product.price)) / product.originalPrice) * 100)}% OFF
                                </div>
                            )}
                        </div>
                    </div>
                </Link>
            </div>
        </>
    );
};

export default ProductCard;

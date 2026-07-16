import { FiHeart } from "react-icons/fi";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useWishlistStore } from "../store/wishlistStore";
import { formatPrice, getPlaceholderImage } from "../utils/helpers";
import LazyImage from "./LazyImage";

const ProductCard = ({ product }) => {
  const productLink = `/product/${product.id}`;
  const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlistStore();
  const isFavorite = isInWishlist(product.id);

  const handleFavorite = (e) => {
    e.stopPropagation();
    if (isFavorite) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist({ id: product.id, name: product.name, price: product.price, image: product.image });
    }
  };

  return (
    <>
      <motion.div
        whileTap={{ scale: 0.98 }}
        className="flex flex-col w-full h-full group relative bg-white rounded-xl transition-all duration-500 hover:shadow-[0_15px_30px_rgba(0,0,0,0.08)] hover:-translate-y-1"
      >
        {/* IMAGE AREA - Taller 3:4 ratio with matching rounded corners */}
        <div className="relative aspect-[3/4] md:aspect-[4/5] overflow-hidden rounded-xl bg-[#F8F8F8]">
          <Link to={productLink} className="absolute inset-0 w-full h-full">
            <LazyImage
              src={product.image}
              alt={product.name}
              className={`absolute inset-0 w-full h-full object-contain transition-transform duration-700 group-hover:scale-110 ${(product.stock === 'out_of_stock' || product.stockQuantity <= 0) ? 'grayscale opacity-70' : ''}`}
              onError={(e) => { e.target.src = getPlaceholderImage(400, 533, "Product"); }}
            />
          </Link>

          {/* Wishlist Icon */}
          <button
            onClick={handleFavorite}
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-white/70 backdrop-blur-sm flex items-center justify-center text-gray-800 shadow-sm transition-all hover:bg-white hover:text-red-500 z-10"
          >
            <FiHeart size={12} className={`${isFavorite ? 'fill-current text-red-500' : ''}`} />
          </button>

          {/* Status Badges */}
          {product.stock === 'out_of_stock' || product.stockQuantity <= 0 ? (
            <div className="absolute bottom-0 left-0 bg-red-600 text-white text-[9px] md:text-[11px] font-black px-3 py-0.5 rounded-tr-lg z-20 shadow-lg border-t border-r border-white/10 uppercase tracking-wider">
                SOLD OUT
            </div>
          ) : product.vendorId?.isOnline === false ? (
            <div className="absolute bottom-0 left-0 bg-[#52b788] text-white text-[9px] md:text-[11px] font-black px-3 py-0.5 rounded-tr-lg z-20 shadow-lg border-t border-r border-white/10 uppercase tracking-wider">
                STORE OFFLINE
            </div>
          ) : (
            <div className="absolute bottom-0 left-0 bg-[#000033] text-white text-[9px] md:text-[11px] font-black px-3 py-0.5 rounded-tr-lg z-20 shadow-lg border-t border-r border-white/10 uppercase tracking-wider">
                Try & Buy
            </div>
          )}
        </div>

        {/* INFO AREA - Compact */}
        <div className="pt-2 pb-0.5 flex flex-col overflow-hidden flex-1">
          <div className="flex items-center justify-between w-full gap-1">
            <span className="text-[#1A1A1A] text-[10px] md:text-[14px] font-black uppercase tracking-tight truncate flex-1 min-w-0">
              {(product.brandName && product.brandName !== 'AAPZETO' && product.brandName !== 'Appzeto') ? product.brandName : ((product.brand && product.brand !== 'AAPZETO' && product.brand !== 'Appzeto') ? product.brand : 'CLOSH')}
            </span>
            {product.originalPrice && product.originalPrice > product.price && (
               <div className="bg-[#D8FFBD] text-[#388E3C] text-[9px] md:text-[11px] font-bold px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap">
                 {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
               </div>
            )}
          </div>
          <Link to={productLink} className="flex flex-col mt-0.5">
            <h3 className="text-gray-500 text-[9px] md:text-[13px] font-medium truncate leading-tight">
              {product.name}
            </h3>
          </Link>
          
          <div className="mt-auto flex flex-nowrap items-center w-full pt-1">
             <div className="flex items-center gap-1.5 shrink-0 min-w-0 overflow-hidden">
                <span className="text-[12px] md:text-[14px] font-black text-gray-900 whitespace-nowrap tracking-tight">
                   {formatPrice(product.price)}
                </span>
                {product.originalPrice && product.originalPrice > product.price && (
                  <span className="text-[10px] md:text-[12px] text-gray-400 line-through font-semibold whitespace-nowrap truncate">
                    {formatPrice(product.originalPrice)}
                  </span>
                )}
             </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default ProductCard;

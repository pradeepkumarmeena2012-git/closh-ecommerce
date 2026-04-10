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
        className="flex flex-col w-full h-full group relative bg-white"
      >
        {/* IMAGE AREA - Taller 3:4 ratio with matching rounded corners */}
        <div className="relative aspect-[3/4] md:aspect-[4/5] overflow-hidden rounded-xl bg-[#F8F8F8]">
          <Link to={productLink} className="block w-full h-full">
            <LazyImage
              src={product.image}
              alt={product.name}
              className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${product.stock === 'out_of_stock' ? 'grayscale opacity-70' : ''}`}
              onError={(e) => { e.target.src = getPlaceholderImage(400, 533, "Product"); }}
            />
          </Link>

          {/* Out of Stock Overlay */}
          {product.stock === 'out_of_stock' && (
            <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] z-20 flex items-center justify-center p-2 pointer-events-none">
              <span className="bg-red-500 text-white text-[10px] md:text-xs font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-xl transform -rotate-12 border-2 border-white scale-110">
                Sold Out
              </span>
            </div>
          )}

          {/* Wishlist Icon */}
          <button
            onClick={handleFavorite}
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-white/70 backdrop-blur-sm flex items-center justify-center text-gray-800 shadow-sm transition-all hover:bg-white hover:text-red-500 z-10"
          >
            <FiHeart size={12} className={`${isFavorite ? 'fill-current text-red-500' : ''}`} />
          </button>
        </div>

        {/* INFO AREA - Compact */}
        <div className="pt-2 pb-0.5 flex flex-col">
          <Link to={productLink} className="flex flex-col gap-0.5">
            <span className="text-[#1A1A1A] text-[10px] md:text-[14px] font-black uppercase tracking-tight line-clamp-1">
              {product.brandName || product.vendorName || "Premium"}
            </span>
            <h3 className="text-gray-500 text-[9px] md:text-[13px] font-medium line-clamp-1 leading-tight">
              {product.name}
            </h3>
          </Link>
          
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
             <div className="flex items-center gap-1.5">
                <span className="text-gray-900 text-[11px] md:text-[14px] font-bold">
                   {formatPrice(product.price)}
                </span>
                {product.originalPrice && product.originalPrice > product.price && (
                  <span className="text-gray-400 text-[10px] md:text-[13px] line-through font-medium">
                    {formatPrice(product.originalPrice)}
                  </span>
                )}
             </div>
             
             {product.originalPrice && product.originalPrice > product.price && (
                <div className="bg-[#D8FFBD] text-[#388E3C] text-[8px] md:text-[11px] font-bold px-1.5 md:px-2 py-0.5 rounded-sm">
                  {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                </div>
             )}
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default ProductCard;

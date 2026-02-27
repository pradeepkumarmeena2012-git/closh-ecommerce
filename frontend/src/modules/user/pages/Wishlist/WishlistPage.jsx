import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, X, Heart, Search, MapPin, ChevronDown, ArrowLeft } from 'lucide-react';
import { useWishlist } from '../../context/WishlistContext';
import { useCart } from '../../context/CartContext';
import LocationModal from '../../components/Header/LocationModal';
import { useLocation as useLocationContext } from '../../context/LocationContext';

const WishlistPage = () => {
    const { wishlistItems, toggleWishlist } = useWishlist();
    const { addToCart } = useCart();
    const { activeAddress } = useLocationContext();
    const navigate = useNavigate();
    const [isLocationModalOpen, setIsLocationModalOpen] = React.useState(false);
    const [addedItems, setAddedItems] = React.useState({});

    const handleAddToCart = (product) => {
        addToCart({ ...product, selectedSize: product.size ? product.size[0] : 'M' });
        setAddedItems(prev => ({ ...prev, [product.id]: true }));
        // Optional: show a toast or message
    };

    return (
        <div className="bg-white min-h-screen pb-20">
            {/* Sticky Header Container */}
            <div className="md:hidden sticky top-0 z-40 bg-white">
                {/* Mobile Header Nav */}
                <div className="border-b border-gray-100 px-4 py-4 flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-1"><ArrowLeft size={20} /></button>
                    <div className="flex-1">
                        <h1 className="text-base font-black uppercase tracking-tight">Wishlist</h1>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{wishlistItems.length} Items</p>
                    </div>
                </div>

                {/* Address Bar - Now Sticky inside container */}
                <div
                    onClick={() => setIsLocationModalOpen(true)}
                    className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 cursor-pointer active:bg-gray-50 transition-colors"
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
            </div>

            <LocationModal
                isOpen={isLocationModalOpen}
                onClose={() => setIsLocationModalOpen(false)}
            />

            <div className="container mx-auto px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-xl font-black uppercase tracking-tight text-gray-900">Wishlist Items</h1>
                    <p className="text-[13px] font-bold text-gray-400 mt-1 uppercase tracking-widest">{wishlistItems.length} Items</p>
                </div>

                {wishlistItems.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-6 gap-y-10">
                        {wishlistItems.map((product) => (
                            <div key={product.id} className="group flex flex-col">
                                <div className="relative aspect-[3/4] rounded-[24px] overflow-hidden mb-4 bg-gray-50 border border-gray-100 shadow-sm group-hover:shadow-md transition-all">
                                    <img
                                        src={product.image}
                                        alt={product.name}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                        onClick={() => navigate(`/product/${product.id}`)}
                                    />

                                    {/* Click Collect Connect Banner */}
                                    {product.tryAndBuy && (
                                        <div className="absolute bottom-0 left-0 w-full">
                                            <div className="bg-black/80 backdrop-blur-sm text-white text-[9px] font-black px-4 py-2 flex items-center justify-center uppercase tracking-widest text-center">
                                                Click Connect Collect
                                            </div>
                                        </div>
                                    )}

                                    {/* Remove Icon (Filled Heart) */}
                                    <button
                                        onClick={() => toggleWishlist(product)}
                                        className="absolute bottom-4 right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-90"
                                    >
                                        <Heart size={20} className="fill-red-500 text-red-500" />
                                    </button>
                                </div>

                                <div className="px-1 flex-1">
                                    <div className="text-[11px] font-black text-gray-400 uppercase tracking-tight mb-0.5">{product.brand}</div>
                                    <h3 className="text-[13px] font-bold text-gray-800 leading-tight line-clamp-1 mb-2">{product.name}</h3>
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="text-[14px] font-black text-black">₹{product.discountedPrice}</span>
                                        <span className="text-[12px] font-bold text-gray-400 line-through">₹{product.originalPrice}</span>
                                        <span className="text-[11px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                            {product.discount}
                                        </span>
                                    </div>

                                    <button
                                        onClick={() => handleAddToCart(product)}
                                        disabled={addedItems[product.id]}
                                        className={`w-full py-3 border rounded-xl text-[12px] font-black uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${addedItems[product.id] ? 'bg-black text-white border-black cursor-default' : 'bg-white border-gray-200 hover:border-black hover:bg-black hover:text-white'}`}
                                    >
                                        {addedItems[product.id] ? 'Added to Cart' : 'Add to Cart'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-24 text-center">
                        <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Heart size={40} className="text-gray-200" />
                        </div>
                        <h3 className="text-xl font-black uppercase tracking-tight">Your wishlist is empty</h3>
                        <p className="text-gray-500 font-bold text-sm mt-2 mb-8 lowercase first-letter:uppercase">Save your favorite items here!</p>
                        <button
                            onClick={() => navigate('/products')}
                            className="px-10 py-4 bg-black text-white text-[12px] font-black uppercase tracking-widest rounded-2xl active:scale-95 transition-all shadow-xl"
                        >
                            Explore Now
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WishlistPage;

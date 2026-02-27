import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    Heart,
    ShoppingCart,
    Star,
    Share2,
    ChevronLeft,
    ShieldCheck,
    Truck,
    RotateCcw,
    Check,
    ChevronDown,
    ChevronUp,
    Info,
    MapPin,
    X,
    CheckCircle2,
    Tag,
    Ticket
} from 'lucide-react';
import { useProductStore } from '../../../../shared/store/productStore';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import LocationModal from '../../components/Header/LocationModal';
import { useLocation as useLocationContext } from '../../context/LocationContext';

import { useAuth } from '../../context/AuthContext';
import LoginModal from '../../components/Modals/LoginModal';

const ProductDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { addToCart, cart, getCartCount } = useCart();
    const { toggleWishlist, isInWishlist } = useWishlist();
    const { activeAddress } = useLocationContext();
    const { fetchProductById } = useProductStore();

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedSize, setSelectedSize] = useState('');
    const [activeImg, setActiveImg] = useState(0);
    const [openAccordion, setOpenAccordion] = useState('description');
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [isSizeChartOpen, setIsSizeChartOpen] = useState(false);
    const [showAddedToast, setShowAddedToast] = useState(false);
    const [promoCodes, setPromoCodes] = useState([]);
    const [copiedCode, setCopiedCode] = useState(null);

    useEffect(() => {
        const loadProductData = async () => {
            setLoading(true);
            const data = await fetchProductById(id);
            if (data) {
                setProduct(data);
            } else {
                // If not found in API, check local storage/static as fallback (optional)
                // navigate('/products'); 
            }
            setLoading(false);
        };
        loadProductData();
        window.scrollTo(0, 0);
    }, [id, fetchProductById]);

    useEffect(() => {
        const savedCodes = localStorage.getItem('admin-promocodes');
        if (savedCodes) {
            const parsedCodes = JSON.parse(savedCodes);
            const now = new Date();
            const activeCodes = parsedCodes.filter(code =>
                code.status === 'active' &&
                new Date(code.endDate) > now
            );
            setPromoCodes(activeCodes);
        }
    }, []);

    const copyCode = (code) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#fafafa]">
            <div className="w-16 h-16 border-4 border-black/10 border-t-black rounded-full animate-spin transition-all" />
            <p className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 animate-pulse">Loading Premium Piece...</p>
        </div>
    );

    if (!product) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#fafafa] px-6 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <X size={32} className="text-gray-300" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight mb-2">Product Not Found</h2>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-8">This collection might have moved or ended.</p>
            <button onClick={() => navigate('/shop')} className="px-8 py-4 bg-black text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl active:scale-95 transition-all">Go to Shop</button>
        </div>
    );

    const handleAddToCart = () => {
        console.log("ProductDetailsPage: handleAddToCart called. User:", user);

        if (!user) {
            console.log("User is null. Opening LoginModal.");
            setIsLoginModalOpen(true);
            return;
        }

        if (!selectedSize) {
            alert('Please select a size first');
            return;
        }
        addToCart({ ...product, selectedSize });
        setShowAddedToast(true);
        setTimeout(() => setShowAddedToast(false), 3000);
    };

    const toggleAccordion = (id) => {
        setOpenAccordion(openAccordion === id ? null : id);
    };

    // Use actual images from product
    const productImages = Array.isArray(product.images) && product.images.length > 0
        ? product.images
        : [product.image || 'https://via.placeholder.com/800x1000?text=Premium+Piece'];

    // Use product variants if available
    const sizes = (product.variants?.sizes?.length > 0)
        ? product.variants.sizes
        : (product.variants?.attributes?.find(a => a.name.toLowerCase() === 'size')?.values || ['XS', 'S', 'M', 'L', 'XL', 'XXL']);

    // Cart count logic
    const cartCount = getCartCount();

    return (
        <div className="bg-[#fafafa] min-h-screen pb-20 overflow-x-hidden">
            {/* Universal Header - Mimics Mobile View for consistency */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md z-[100] border-b border-gray-100 shadow-sm">
                <div className="container mx-auto flex items-center justify-between px-4 py-4">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-gray-50 rounded-full transition-colors shrink-0">
                        <ChevronLeft size={24} className="text-black" />
                    </button>
                    <div className="flex-1 flex justify-center">
                        <h1 className="text-sm font-black uppercase tracking-widest truncate max-w-[150px]">{product.brand}</h1>
                    </div>
                    <div className="flex items-center gap-3 md:gap-4 shrink-0">
                        <button
                            onClick={() => toggleWishlist(product)}
                            className="relative transition-colors p-1"
                        >
                            <Heart size={20} className={isInWishlist(product?.id) ? 'fill-red-500 text-red-500' : 'text-gray-700'} />
                        </button>
                        <Link to="/cart" className="relative p-1">
                            <ShoppingCart size={20} className="text-gray-700" />
                            {cartCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-[#39ff14] text-black text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white">
                                    {cartCount}
                                </span>
                            )}
                        </Link>
                    </div>
                </div>

                <div className="border-t border-gray-50">
                    <div
                        onClick={() => setIsLocationModalOpen(true)}
                        className="container mx-auto flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-gray-50 transition-all font-bold"
                    >
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-7 h-7 rounded-full bg-gray-50 flex items-center justify-center shrink-0">
                                <MapPin size={14} className="text-black" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-[11px] font-black leading-tight flex items-center gap-2 text-gray-900 uppercase tracking-tight">
                                    {activeAddress ? activeAddress.name : 'Select Location'}
                                    {activeAddress?.type && (
                                        <span className="text-[8px] font-black bg-black text-white px-1.5 py-0.5 rounded uppercase tracking-tighter">{activeAddress.type}</span>
                                    )}
                                </span>
                                <span className="text-[10px] font-bold truncate max-w-[200px] md:max-w-none text-gray-400">
                                    {activeAddress ? `${activeAddress.address}, ${activeAddress.city}` : 'Add an address to see delivery info'}
                                </span>
                            </div>
                        </div>
                        <ChevronDown size={14} className="text-gray-400" />
                    </div>
                </div>
            </div>

            <LocationModal
                isOpen={isLocationModalOpen}
                onClose={() => setIsLocationModalOpen(false)}
            />

            <LoginModal
                isOpen={isLoginModalOpen}
                onClose={() => setIsLoginModalOpen(false)}
                onSuccess={() => {
                    // Optionally continue with add to cart if desired, or just let them click again
                    setIsLoginModalOpen(false);
                }}
            />

            <div className="container mx-auto px-4 py-4 md:py-6">
                <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 items-start">

                    {/* Left: Image Gallery */}
                    <div className="flex-1 lg:flex-[1.2] w-full flex flex-col gap-6 lg:sticky lg:top-28">
                        {/* Thumbnails - Desktop */}
                        <div className="hidden md:flex flex-row gap-4 w-full overflow-x-auto py-2">
                            {productImages.map((img, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => setActiveImg(idx)}
                                    className={`w-24 aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer transition-all border-2 shrink-0 ${activeImg === idx ? 'border-black shadow-lg scale-105' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                >
                                    <img src={img} alt="" className="w-full h-full object-cover" />
                                </div>
                            ))}
                        </div>

                        {/* Main Image */}
                        <div className="flex-1 relative aspect-[3/4] lg:aspect-auto lg:h-[calc(100vh-280px)] lg:min-h-[650px] lg:max-h-[900px] rounded-[32px] md:rounded-[40px] overflow-hidden bg-white shadow-2xl group">
                            <img src={productImages[activeImg]} alt={product.name} className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105" />

                            {/* Tags/Badges */}
                            <div className="absolute top-6 left-6 flex flex-col gap-2">
                                <div className="bg-black text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-xl">
                                    New Arrival
                                </div>
                                <div className="bg-[#ffcc00] text-black text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-xl">
                                    Top Rated
                                </div>
                            </div>

                            {/* Wishlist Mobile */}
                            <button
                                onClick={() => toggleWishlist(product)}
                                className="absolute top-6 right-6 w-12 h-12 bg-white/90 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-xl md:hidden"
                            >
                                <Heart size={24} className={isInWishlist(product?.id) ? 'fill-red-500 text-red-500' : 'text-black'} />
                            </button>

                            {/* Rating Badge */}
                            <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl flex items-center gap-2 shadow-xl border border-white/20">
                                <div className="flex items-center gap-1">
                                    <span className="text-[15px] font-black">4.5</span>
                                    <Star size={14} className="fill-black" />
                                </div>
                                <div className="w-[1px] h-3 bg-gray-300" />
                                <span className="text-[13px] font-bold text-gray-500">1.2k Reviews</span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Product Info */}
                    <div className="flex-1 w-full max-w-2xl">
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-1.5">
                                <h2 className="text-[13px] font-black text-gray-400 uppercase tracking-[0.2em]">{product.brand}</h2>
                                <div className="hidden md:flex items-center gap-4">
                                    <button className="p-2 hover:bg-gray-100 rounded-full transition-colors"><Share2 size={20} /></button>
                                    <button
                                        onClick={() => toggleWishlist(product)}
                                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                    >
                                        <Heart size={22} className={isInWishlist(product?.id) ? 'fill-red-500 text-red-500 border-none' : 'text-black'} />
                                    </button>
                                </div>
                            </div>
                            <h1 className="text-xl md:text-2xl lg:text-3xl font-black text-black leading-tight mb-4 uppercase tracking-tight">{product.name}</h1>

                            <div className="flex items-center gap-4 mb-2">
                                <span className="text-3xl font-black text-black">
                                    ₹{product.discountedPrice !== undefined ? product.discountedPrice : product.price}
                                </span>
                                <div className="flex flex-col">
                                    {(product.originalPrice || product.price) && (
                                        <div className="flex items-center gap-2">
                                            {product.originalPrice && (
                                                <span className="text-lg text-gray-400 line-through">₹{product.originalPrice}</span>
                                            )}
                                            {(product.discount || (product.originalPrice && (product.discountedPrice || product.price) && product.originalPrice > (product.discountedPrice || product.price))) && (
                                                <span className="text-emerald-600 font-black text-sm bg-emerald-50 px-2.5 py-1 rounded-lg">
                                                    {product.discount || `${Math.round(((product.originalPrice - (product.discountedPrice || product.price)) / product.originalPrice) * 100)}% OFF`}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    <p className="text-[11px] font-bold text-gray-500 mt-1 uppercase tracking-wider italic">inclusive of all taxes</p>
                                </div>
                            </div>
                        </div>

                        {/* Size Selection */}
                        <div className="mb-8">
                            <div className="flex justify-between items-end mb-5">
                                <h3 className="text-[12px] font-black uppercase tracking-widest text-black flex items-center gap-2">
                                    Select Size <Info size={14} className="text-gray-400" />
                                </h3>
                                <button
                                    onClick={() => setIsSizeChartOpen(true)}
                                    className="text-[11px] font-black text-blue-600 uppercase tracking-widest border-b border-blue-600 pb-0.5 hover:text-blue-800 transition-colors"
                                >
                                    Size Chart
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                {sizes.map((size) => (
                                    <button
                                        key={size}
                                        onClick={() => setSelectedSize(size)}
                                        className={`min-w-[56px] h-14 md:min-w-[64px] rounded-2xl flex items-center justify-center font-black text-[15px] transition-all relative ${selectedSize === size
                                            ? 'bg-black text-white shadow-xl scale-110'
                                            : 'bg-white border-2 border-gray-100 text-gray-800 hover:border-black'
                                            }`}
                                    >
                                        {size}
                                        {selectedSize === size && (
                                            <div className="absolute -top-1 -right-1 bg-black text-white rounded-full p-0.5 border-2 border-white">
                                                <Check size={10} strokeWidth={4} />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                            {selectedSize && (
                                <p className="mt-4 text-[13px] font-bold text-emerald-600 flex items-center gap-2 animate-fadeIn">
                                    <ShieldCheck size={16} /> Fast shipping available for size {selectedSize}
                                </p>
                            )}
                        </div>

                        {/* Actions - Inline */}
                        <div className="flex gap-4 mb-8">
                            <button
                                onClick={handleAddToCart}
                                className="flex-[3] h-16 bg-black text-white rounded-[20px] font-black text-[14px] uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all shadow-[0_10px_30px_rgba(0,0,0,0.15)] hover:bg-[#1a1a1a]"
                            >
                                <ShoppingCart size={20} />
                                Add to Cart
                            </button>
                            <button
                                onClick={() => toggleWishlist(product)}
                                className={`flex-1 h-16 rounded-[20px] font-black text-[14px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all border-2 ${isInWishlist(product?.id)
                                    ? 'bg-red-50 border-red-100 text-red-500'
                                    : 'bg-white border-gray-100 text-gray-800 hover:border-black'
                                    }`}
                            >
                                <Heart size={20} className={isInWishlist(product?.id) ? 'fill-red-500' : ''} />
                                <span className="hidden md:inline">Wishlist</span>
                            </button>
                        </div>

                        {/* USP Features */}
                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="flex items-start gap-3 p-4 bg-white rounded-2xl border border-gray-100">
                                <Truck className="text-gray-400 shrink-0" size={24} />
                                <div>
                                    <h4 className="text-[12px] font-black uppercase tracking-tight">Free Delivery</h4>
                                    <p className="text-[10px] font-bold text-gray-500">On all orders above ₹999</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-4 bg-white rounded-2xl border border-gray-100">
                                <RotateCcw className="text-gray-400 shrink-0" size={24} />
                                <div>
                                    <h4 className="text-[12px] font-black uppercase tracking-tight">Easy Returns</h4>
                                    <p className="text-[10px] font-bold text-gray-500">14 days exchange policy</p>
                                </div>
                            </div>
                        </div>

                        {/* Promo Codes / Available Offers */}
                        {promoCodes.length > 0 && (
                            <div className="mb-10 animate-fadeIn overflow-hidden">
                                <div className="flex items-center justify-between mb-5">
                                    <h3 className="text-[12px] font-black uppercase tracking-widest text-black flex items-center gap-2">
                                        Available Offers <Ticket size={14} className="text-emerald-500" />
                                    </h3>
                                </div>
                                <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar snap-x -mx-4 px-4 sm:mx-0 sm:px-0">
                                    {promoCodes.map((promo) => (
                                        <div
                                            key={promo.id}
                                            className="min-w-[240px] bg-white border border-gray-100 rounded-[24px] p-5 snap-start relative overflow-hidden group hover:shadow-xl transition-all duration-500 border-l-4 border-l-emerald-500"
                                        >
                                            {/* Decorative Background Element */}
                                            <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-emerald-50/50 rounded-full group-hover:scale-150 transition-transform duration-700 -z-0" />

                                            <div className="relative z-10">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <Tag size={12} className="text-emerald-500" />
                                                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                                                        {promo.type === 'percentage' ? `${promo.value}% Savings` : `₹${promo.value} Discount`}
                                                    </span>
                                                </div>

                                                <h4 className="text-[16px] font-black text-black mb-1 flex items-center gap-2">
                                                    {promo.code}
                                                </h4>

                                                <p className="text-[11px] font-bold text-gray-500 mb-4 line-clamp-1">
                                                    Valid on orders above ₹{promo.minPurchase}
                                                </p>

                                                <button
                                                    onClick={() => copyCode(promo.code)}
                                                    className={`w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all flex items-center justify-center gap-2 ${copiedCode === promo.code
                                                        ? 'bg-emerald-500 text-white border-emerald-500'
                                                        : 'bg-black text-white hover:bg-[#1a1a1a] shadow-lg'
                                                        }`}
                                                >
                                                    {copiedCode === promo.code ? (
                                                        <>
                                                            <Check size={12} strokeWidth={4} />
                                                            Copied!
                                                        </>
                                                    ) : (
                                                        'Copy Code'
                                                    )}
                                                </button>
                                            </div>

                                            {/* Ticket Holes */}
                                            <div className="absolute top-1/2 -left-2 w-4 h-4 bg-[#fafafa] rounded-full border border-gray-100 -translate-y-1/2" />
                                            <div className="absolute top-1/2 -right-2 w-4 h-4 bg-[#fafafa] rounded-full border border-gray-100 -translate-y-1/2" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Details Accordion */}
                        <div className="space-y-1">
                            {[
                                {
                                    id: 'description', title: 'Product Details', content: (
                                        <div className="space-y-4">
                                            <p className="text-[14px] text-gray-600 leading-relaxed font-medium">
                                                This premium piece from {product.brand} showcases exceptional craftsmanship and timeless style.
                                                Designed for the modern individual who values both comfort and aesthetics.
                                            </p>
                                            <ul className="grid grid-cols-2 gap-y-3 gap-x-6">
                                                {['Cotton Blend', 'Regular Fit', 'Machine Washable', 'Breathable Fabric', 'Eco-friendly', 'Premium Quality'].map(item => (
                                                    <li key={item} className="flex items-center gap-2 text-[13px] font-bold text-gray-500">
                                                        <div className="w-1 h-1 bg-black rounded-full" /> {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )
                                },
                                {
                                    id: 'specifications', title: 'Specifications', content: (
                                        <div className="grid grid-cols-2 gap-y-4">
                                            <div>
                                                <h5 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1">Occasion</h5>
                                                <p className="text-[14px] font-bold">Casual / Streetwear</p>
                                            </div>
                                            <div>
                                                <h5 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1">Pattern</h5>
                                                <p className="text-[14px] font-bold">Solid / Graphic</p>
                                            </div>
                                            <div>
                                                <h5 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1">Fabric Type</h5>
                                                <p className="text-[14px] font-bold">Woven</p>
                                            </div>
                                            <div>
                                                <h5 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1">Country of Origin</h5>
                                                <p className="text-[14px] font-bold">India</p>
                                            </div>
                                        </div>
                                    )
                                },
                                {
                                    id: 'shipping', title: 'Shipping & Returns', content: (
                                        <div className="space-y-4 text-[13px] font-middle text-gray-600 leading-relaxed">
                                            <p>Estimated delivery within 3-5 business days. Express shipping available at checkout.</p>
                                            <p>You can return or exchange this item within 14 days of delivery. The item must be unused with all original tags intact.</p>
                                        </div>
                                    )
                                }
                            ].map(section => (
                                <div key={section.id} className="border-b border-gray-100">
                                    <button
                                        onClick={() => toggleAccordion(section.id)}
                                        className="w-full flex items-center justify-between py-6 text-[14px] font-black uppercase tracking-widest"
                                    >
                                        {section.title}
                                        {openAccordion === section.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </button>
                                    <div className={`overflow-hidden transition-all duration-300 ${openAccordion === section.id ? 'max-h-96 pb-8' : 'max-h-0'}`}>
                                        {section.content}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            {/* Removed sticky bottom actions */}
            {/* Size Chart Modal */}
            <SizeChartModal
                isOpen={isSizeChartOpen}
                onClose={() => setIsSizeChartOpen(false)}
            />

            {/* Added to Cart Success Popup */}
            {showAddedToast && createPortal(
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[10001] w-[90%] max-w-[400px] animate-fadeInUp">
                    <div className="bg-black/90 backdrop-blur-xl border border-white/20 p-4 rounded-[24px] shadow-2xl flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#39ff14] rounded-2xl flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(57,255,20,0.3)]">
                            <CheckCircle2 size={24} className="text-black" />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-white text-[14px] font-black uppercase tracking-tight">Success!</h4>
                            <p className="text-gray-400 text-[11px] font-bold">Your product has been added to cart</p>
                        </div>
                        <Link
                            to="/cart"
                            className="bg-white text-black px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-[#39ff14] transition-colors no-underline"
                        >
                            View Cart
                        </Link>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

const SizeChartModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const sizeData = [
        { size: 'XS', chest: '37', length: '24.5', shoulder: '16.5', sleeves: '24' },
        { size: 'S', chest: '39', length: '25', shoulder: '17', sleeves: '24.5' },
        { size: 'M', chest: '41', length: '26', shoulder: '17.5', sleeves: '24.5' },
        { size: 'L', chest: '43', length: '26.5', shoulder: '18', sleeves: '25' },
        { size: 'XL', chest: '44', length: '27', shoulder: '18.5', sleeves: '25' },
        { size: 'XXL', chest: '46', length: '27.5', shoulder: '19.5', sleeves: '25.5' },
    ];

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-[5px] animate-fadeIn">
            <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden relative animate-scaleIn">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div>
                        <h2 className="text-lg font-black uppercase tracking-tight text-gray-900">Size Guide</h2>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Measurements in inches</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-all active:scale-95"
                    >
                        <X size={20} className="text-black" />
                    </button>
                </div>

                {/* Table Content */}
                <div className="p-6">
                    <div className="overflow-hidden border border-gray-100 rounded-[20px] shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500 border-b border-gray-100 italic">Size</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500 border-b border-gray-100">Chest</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500 border-b border-gray-100">Length</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500 border-b border-gray-100">Shoulder</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500 border-b border-gray-100">Sleeves</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {sizeData.map((row) => (
                                    <tr key={row.size} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-4 py-4 text-[12px] font-black text-black italic bg-gray-50/30">{row.size}</td>
                                        <td className="px-4 py-4 text-[13px] font-bold text-gray-600">{row.chest}</td>
                                        <td className="px-4 py-4 text-[13px] font-bold text-gray-600">{row.length}</td>
                                        <td className="px-4 py-4 text-[13px] font-bold text-gray-600">{row.shoulder}</td>
                                        <td className="px-4 py-4 text-[13px] font-bold text-gray-600">{row.sleeves}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-6 p-4 bg-gray-50 rounded-2xl">
                        <p className="text-[10px] font-bold text-gray-500 italic leading-relaxed">
                            * These are product measurements. For the perfect fit, we recommend comparing these measurements with a similar item you already own.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-[#fafafa] border-t border-gray-100">
                    <button
                        onClick={onClose}
                        className="w-full py-4 bg-black text-white rounded-[20px] font-black text-[12px] uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all"
                    >
                        Got It
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ProductDetailsPage;

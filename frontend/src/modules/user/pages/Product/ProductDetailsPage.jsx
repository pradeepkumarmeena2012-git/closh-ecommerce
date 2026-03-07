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
import { useUserLocation } from '../../context/LocationContext';

import { useAuth } from '../../context/AuthContext';
import LoginModal from '../../components/Modals/LoginModal';

const ProductDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { addToCart, cart, getCartCount } = useCart();
    const { toggleWishlist, isInWishlist } = useWishlist();
    const { activeAddress } = useUserLocation();
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
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#111111]">
            <div className="w-16 h-16 border-4 border-white/10 border-t-[#D4AF37] rounded-full animate-spin transition-all" />
            <p className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#D4AF37] animate-pulse">Loading Premium Piece...</p>
        </div>
    );

    if (!product) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#111111] px-6 text-center">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                <X size={32} className="text-white/40" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight mb-2 text-[#FAFAFA]">Product Not Found</h2>
            <p className="text-xs font-bold text-white/60 uppercase tracking-widest mb-8">This collection might have moved or ended.</p>
            <button onClick={() => navigate('/shop')} className="px-8 py-4 bg-[#D4AF37] text-black text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl active:scale-95 transition-all">Go to Shop</button>
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
        <div className="bg-[#111111] text-[#FAFAFA] min-h-screen pb-20 overflow-x-hidden">
            {/* Universal Header - Mimics Mobile View for consistency */}
            <div className="md:hidden sticky top-0 bg-[#111111]/95 backdrop-blur-md z-[100] border-b border-white/10 shadow-sm">
                <div className="container mx-auto flex items-center justify-between px-4 py-4">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors shrink-0">
                        <ChevronLeft size={24} className="text-[#FAFAFA]" />
                    </button>
                    <div className="flex-1 flex justify-center">
                        <h1 className="text-sm font-black uppercase tracking-widest truncate max-w-[150px]">{product.brand}</h1>
                    </div>
                    <div className="flex items-center gap-3 md:gap-4 shrink-0">
                        <button
                            onClick={() => toggleWishlist(product)}
                            className="relative transition-colors p-1"
                        >
                            <Heart size={20} className={isInWishlist(product?.id) ? 'fill-[#D4AF37] text-[#D4AF37]' : 'text-[#FAFAFA]'} />
                        </button>
                        <Link to="/cart" className="relative p-1">
                            <ShoppingCart size={20} className="text-[#FAFAFA]" />
                            {cartCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-[#D4AF37] text-black text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center border border-[#111111]">
                                    {cartCount}
                                </span>
                            )}
                        </Link>
                    </div>
                </div>

                <div className="border-t border-white/10">
                    <div
                        onClick={() => setIsLocationModalOpen(true)}
                        className="container mx-auto flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-white/5 transition-all font-bold"
                    >
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                                <MapPin size={14} className="text-[#FAFAFA]" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-[11px] font-black leading-tight flex items-center gap-2 text-[#FAFAFA] uppercase tracking-tight">
                                    {activeAddress ? activeAddress.name : 'Select Location'}
                                    {activeAddress?.type && (
                                        <span className="text-[8px] font-black bg-[#D4AF37] text-black px-1.5 py-0.5 rounded uppercase tracking-tighter">{activeAddress.type}</span>
                                    )}
                                </span>
                                <span className="text-[10px] font-bold truncate max-w-[200px] md:max-w-none text-white/50">
                                    {activeAddress ? `${activeAddress.address}, ${activeAddress.city}` : 'Add an address to see delivery info'}
                                </span>
                            </div>
                        </div>
                        <ChevronDown size={14} className="text-white/40" />
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
                                    className={`w-24 aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer transition-all border-2 shrink-0 ${activeImg === idx ? 'border-[#D4AF37] shadow-lg scale-105' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                >
                                    <img src={img} alt="" className="w-full h-full object-cover" />
                                </div>
                            ))}
                        </div>

                        {/* Main Image */}
                        <div className="flex-1 relative aspect-[3/4] lg:aspect-[4/5] lg:max-h-[600px] lg:max-w-[480px] lg:mx-auto w-full rounded-[32px] md:rounded-[40px] overflow-hidden bg-[#1a1a1a] shadow-2xl group border border-white/10">
                            <img src={productImages[activeImg]} alt={product.name} className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105" />

                            {/* Tags/Badges */}
                            <div className="absolute top-6 left-6 flex flex-col gap-2">
                                <div className="bg-[#111111] text-[#FAFAFA] text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-xl border border-[#D4AF37]/30">
                                    New Arrival
                                </div>
                                <div className="bg-[#D4AF37] text-black text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-xl">
                                    Top Rated
                                </div>
                            </div>

                            {/* Wishlist Mobile */}
                            <button
                                onClick={() => toggleWishlist(product)}
                                className="absolute top-6 right-6 w-12 h-12 bg-[#111111]/90 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-xl md:hidden border border-white/10"
                            >
                                <Heart size={24} className={isInWishlist(product?.id) ? 'fill-[#D4AF37] text-[#D4AF37]' : 'text-[#FAFAFA]'} />
                            </button>

                            {/* Rating Badge */}
                            <div className="absolute bottom-6 left-6 bg-[#111111]/90 backdrop-blur-md px-4 py-2 rounded-2xl flex items-center gap-2 shadow-xl border border-white/10">
                                <div className="flex items-center gap-1">
                                    <span className="text-[15px] font-black text-[#FAFAFA]">4.5</span>
                                    <Star size={14} className="fill-[#D4AF37] text-[#D4AF37]" />
                                </div>
                                <div className="w-[1px] h-3 bg-white/20" />
                                <span className="text-[13px] font-bold text-white/60">1.2k Reviews</span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Product Info */}
                    <div className="flex-1 w-full max-w-2xl">
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-1.5">
                                <h2 className="text-[13px] font-black text-[#D4AF37] uppercase tracking-[0.2em]">{product.brand}</h2>
                                <div className="hidden md:flex items-center gap-4">
                                    <button className="p-2 hover:bg-white/10 rounded-full transition-colors"><Share2 size={20} className="text-[#FAFAFA]" /></button>
                                    <button
                                        onClick={() => toggleWishlist(product)}
                                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                                    >
                                        <Heart size={22} className={isInWishlist(product?.id) ? 'fill-[#D4AF37] text-[#D4AF37] border-none' : 'text-[#FAFAFA]'} />
                                    </button>
                                </div>
                            </div>
                            <h1 className="text-xl md:text-2xl lg:text-3xl font-black text-[#FAFAFA] leading-tight mb-4 uppercase tracking-tight">{product.name}</h1>

                            <div className="flex items-center gap-4 mb-2">
                                <span className="text-3xl font-black text-[#FAFAFA]">
                                    ₹{product.discountedPrice !== undefined ? product.discountedPrice : product.price}
                                </span>
                                <div className="flex flex-col">
                                    {(product.originalPrice || product.price) && (
                                        <div className="flex items-center gap-2">
                                            {product.originalPrice && (
                                                <span className="text-lg text-white/40 line-through">₹{product.originalPrice}</span>
                                            )}
                                            {(product.discount || (product.originalPrice && (product.discountedPrice || product.price) && product.originalPrice > (product.discountedPrice || product.price))) && (
                                                <span className="text-emerald-400 font-black text-sm bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                                                    {product.discount || `${Math.round(((product.originalPrice - (product.discountedPrice || product.price)) / product.originalPrice) * 100)}% OFF`}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    <p className="text-[11px] font-bold text-white/50 mt-1 uppercase tracking-wider italic">inclusive of all taxes</p>
                                </div>
                            </div>
                        </div>

                        {/* Size Selection */}
                        <div className="mb-8">
                            <div className="flex justify-between items-end mb-5">
                                <h3 className="text-[12px] font-black uppercase tracking-widest text-[#FAFAFA] flex items-center gap-2">
                                    Select Size <Info size={14} className="text-[#D4AF37]" />
                                </h3>
                                <button
                                    onClick={() => setIsSizeChartOpen(true)}
                                    className="text-[11px] font-black text-[#D4AF37] uppercase tracking-widest border-b border-[#D4AF37] pb-0.5 hover:text-[#fae588] transition-colors"
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
                                            ? 'bg-[#D4AF37] text-black shadow-[0_0_15px_rgba(212,175,55,0.4)] scale-110'
                                            : 'bg-[#1a1a1a] border border-white/10 text-[#FAFAFA] hover:border-[#D4AF37]'
                                            }`}
                                    >
                                        {size}
                                        {selectedSize === size && (
                                            <div className="absolute -top-1 -right-1 bg-[#111111] text-[#D4AF37] rounded-full p-0.5 border-2 border-[#111111]">
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
                        <div className="flex gap-4 mb-6">
                            <button
                                onClick={handleAddToCart}
                                className="flex-[3] h-16 bg-[#D4AF37] text-black rounded-[20px] font-black text-[14px] uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all shadow-[0_10px_30px_rgba(212,175,55,0.2)] hover:bg-[#c39e2e]"
                            >
                                <ShoppingCart size={20} />
                                Add to Cart
                            </button>
                            <button
                                onClick={() => toggleWishlist(product)}
                                className={`flex-1 h-16 rounded-[20px] font-black text-[14px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all border ${isInWishlist(product?.id)
                                    ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37]'
                                    : 'bg-[#1a1a1a] border-white/10 text-[#FAFAFA] hover:border-[#D4AF37]'
                                    }`}
                            >
                                <Heart size={20} className={isInWishlist(product?.id) ? 'fill-[#D4AF37]' : ''} />
                                <span className="hidden md:inline">Wishlist</span>
                            </button>
                        </div>

                        {/* Vendor Info Section */}
                        {product.vendorId && (
                            <div className="mb-8 p-5 bg-[#1a1a1a] rounded-3xl border border-white/10 shadow-sm flex items-center justify-between hover:border-[#D4AF37] transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        {product.vendorId.storeLogo ? (
                                            <img
                                                src={product.vendorId.storeLogo}
                                                alt={product.vendorId.storeName}
                                                className="w-14 h-14 rounded-2xl object-cover border-2 border-white/5 shadow-sm"
                                            />
                                        ) : (
                                            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-white/40">
                                                <ShoppingCart size={24} />
                                            </div>
                                        )}
                                        <div className="absolute -bottom-1 -right-1 bg-[#D4AF37] w-4 h-4 rounded-full border-2 border-[#1a1a1a] shadow-sm" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Sold By</p>
                                        <h4 className="text-[16px] font-black text-[#FAFAFA] group-hover:text-[#D4AF37] transition-colors">{product.vendorId.storeName}</h4>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <MapPin size={10} className="text-[#D4AF37]" />
                                            <p className="text-[11px] font-bold text-white/50 uppercase tracking-tight">
                                                {product.vendorId.address?.city ? `${product.vendorId.address.city}, ${product.vendorId.address.state}` : 'Verified Vendor'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <div className="flex items-center gap-1 bg-[#D4AF37] text-black px-2.5 py-1 rounded-xl text-[12px] font-black shadow-lg">
                                        {product.vendorId.rating || '4.5'} <Star size={10} className="fill-black" />
                                    </div>
                                    <p className="text-[9px] font-black text-white/40 uppercase tracking-tighter">Store Rating</p>
                                </div>
                            </div>
                        )}


                        {/* USP Features */}
                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="flex items-start gap-3 p-4 bg-[#1a1a1a] rounded-2xl border border-white/10">
                                <Truck className="text-[#D4AF37] shrink-0" size={24} />
                                <div>
                                    <h4 className="text-[12px] font-black uppercase tracking-tight text-[#FAFAFA]">Free Delivery</h4>
                                    <p className="text-[10px] font-bold text-white/50">On all orders above ₹999</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-4 bg-[#1a1a1a] rounded-2xl border border-white/10">
                                <RotateCcw className="text-[#D4AF37] shrink-0" size={24} />
                                <div>
                                    <h4 className="text-[12px] font-black uppercase tracking-tight text-[#FAFAFA]">Easy Returns</h4>
                                    <p className="text-[10px] font-bold text-white/50">14 days exchange policy</p>
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
                                            className="min-w-[240px] bg-[#1a1a1a] border border-white/10 rounded-[24px] p-5 snap-start relative overflow-hidden group hover:shadow-xl transition-all duration-500 border-l-4 border-l-[#D4AF37]"
                                        >
                                            {/* Decorative Background Element */}
                                            <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-[#D4AF37]/10 rounded-full group-hover:scale-150 transition-transform duration-700 -z-0" />

                                            <div className="relative z-10">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <Tag size={12} className="text-[#D4AF37]" />
                                                    <span className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest">
                                                        {promo.type === 'percentage' ? `${promo.value}% Savings` : `₹${promo.value} Discount`}
                                                    </span>
                                                </div>

                                                <h4 className="text-[16px] font-black text-[#FAFAFA] mb-1 flex items-center gap-2">
                                                    {promo.code}
                                                </h4>

                                                <p className="text-[11px] font-bold text-white/50 mb-4 line-clamp-1">
                                                    Valid on orders above ₹{promo.minPurchase}
                                                </p>

                                                <button
                                                    onClick={() => copyCode(promo.code)}
                                                    className={`w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all flex items-center justify-center gap-2 ${copiedCode === promo.code
                                                        ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                                                        : 'bg-white/10 text-[#FAFAFA] hover:bg-white/20 shadow-lg'
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
                                            <div className="absolute top-1/2 -left-2 w-4 h-4 bg-[#111111] rounded-full border border-white/10 -translate-y-1/2" />
                                            <div className="absolute top-1/2 -right-2 w-4 h-4 bg-[#111111] rounded-full border border-white/10 -translate-y-1/2" />
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
                                            <p className="text-[14px] text-white/60 leading-relaxed font-medium">
                                                This premium piece from {product.brand} showcases exceptional craftsmanship and timeless style.
                                                Designed for the modern individual who values both comfort and aesthetics.
                                            </p>
                                            <ul className="grid grid-cols-2 gap-y-3 gap-x-6">
                                                {['Cotton Blend', 'Regular Fit', 'Machine Washable', 'Breathable Fabric', 'Eco-friendly', 'Premium Quality'].map(item => (
                                                    <li key={item} className="flex items-center gap-2 text-[13px] font-bold text-white/60">
                                                        <div className="w-1 h-1 bg-[#D4AF37] rounded-full" /> {item}
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
                                                <h5 className="text-[11px] font-black text-[#D4AF37] uppercase tracking-widest mb-1">Occasion</h5>
                                                <p className="text-[14px] font-bold text-[#FAFAFA]">Casual / Streetwear</p>
                                            </div>
                                            <div>
                                                <h5 className="text-[11px] font-black text-[#D4AF37] uppercase tracking-widest mb-1">Pattern</h5>
                                                <p className="text-[14px] font-bold text-[#FAFAFA]">Solid / Graphic</p>
                                            </div>
                                            <div>
                                                <h5 className="text-[11px] font-black text-[#D4AF37] uppercase tracking-widest mb-1">Fabric Type</h5>
                                                <p className="text-[14px] font-bold text-[#FAFAFA]">Woven</p>
                                            </div>
                                            <div>
                                                <h5 className="text-[11px] font-black text-[#D4AF37] uppercase tracking-widest mb-1">Country of Origin</h5>
                                                <p className="text-[14px] font-bold text-[#FAFAFA]">India</p>
                                            </div>
                                        </div>
                                    )
                                },
                                {
                                    id: 'shipping', title: 'Shipping & Returns', content: (
                                        <div className="space-y-4 text-[13px] font-middle text-white/60 leading-relaxed">
                                            <p><span className="text-[#D4AF37] font-black uppercase tracking-widest text-[11px]">Instant Delivery:</span> Your order will be delivered within 60 minutes. Order now for the fastest service.</p>
                                            <p>You can return or exchange this item within 14 days of delivery. The item must be unused with all original tags intact.</p>
                                        </div>
                                    )
                                }
                            ].map(section => (
                                <div key={section.id} className="border-b border-white/10">
                                    <button
                                        onClick={() => toggleAccordion(section.id)}
                                        className="w-full flex items-center justify-between py-6 text-[14px] font-black text-[#FAFAFA] uppercase tracking-widest"
                                    >
                                        {section.title}
                                        {openAccordion === section.id ? <ChevronUp size={18} className="text-[#D4AF37]" /> : <ChevronDown size={18} className="text-white/40" />}
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
                    <div className="bg-[#1a1a1a]/95 backdrop-blur-xl border border-[#D4AF37]/30 p-4 rounded-[24px] shadow-2xl flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#D4AF37] rounded-2xl flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(212,175,55,0.3)]">
                            <CheckCircle2 size={24} className="text-black" />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-[#FAFAFA] text-[14px] font-black uppercase tracking-tight">Success!</h4>
                            <p className="text-white/60 text-[11px] font-bold">Your product has been added to cart</p>
                        </div>
                        <Link
                            to="/cart"
                            className="bg-[#D4AF37] text-black px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-colors no-underline"
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
            <div className="bg-[#111111] border border-white/10 w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden relative animate-scaleIn">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <div>
                        <h2 className="text-lg font-black uppercase tracking-tight text-[#FAFAFA]">Size Guide</h2>
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Measurements in inches</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-all active:scale-95"
                    >
                        <X size={20} className="text-[#FAFAFA]" />
                    </button>
                </div>

                {/* Table Content */}
                <div className="p-6">
                    <div className="overflow-hidden border border-white/10 rounded-[20px] shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/5">
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#D4AF37] border-b border-white/10 italic">Size</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white/50 border-b border-white/10">Chest</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white/50 border-b border-white/10">Length</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white/50 border-b border-white/10">Shoulder</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white/50 border-b border-white/10">Sleeves</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {sizeData.map((row) => (
                                    <tr key={row.size} className="hover:bg-white/5 transition-colors">
                                        <td className="px-4 py-4 text-[12px] font-black text-[#FAFAFA] italic bg-white/5">{row.size}</td>
                                        <td className="px-4 py-4 text-[13px] font-bold text-white/60">{row.chest}</td>
                                        <td className="px-4 py-4 text-[13px] font-bold text-white/60">{row.length}</td>
                                        <td className="px-4 py-4 text-[13px] font-bold text-white/60">{row.shoulder}</td>
                                        <td className="px-4 py-4 text-[13px] font-bold text-white/60">{row.sleeves}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-6 p-4 bg-[#1a1a1a] border border-white/10 rounded-2xl">
                        <p className="text-[10px] font-bold text-white/40 italic leading-relaxed">
                            * These are product measurements. For the perfect fit, we recommend comparing these measurements with a similar item you already own.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-[#111111] border-t border-white/10">
                    <button
                        onClick={onClose}
                        className="w-full py-4 bg-[#D4AF37] text-black rounded-[20px] font-black text-[12px] uppercase tracking-[0.2em] shadow-[0_0_15px_rgba(212,175,55,0.2)] active:scale-95 transition-all"
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

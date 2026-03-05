import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, MapPin, User, ShoppingCart, X, LayoutGrid, Compass, Heart, ChevronRight, ChevronDown } from 'lucide-react';
import MegaMenu from './MegaMenu';
import DiscoverModal from './DiscoverModal';
import LocationModal from './LocationModal';
import { useLocation as useLocationContext } from '../../context/LocationContext';

import api from '../../../../shared/utils/api';
import { useCategoryStore } from '../../../../shared/store/categoryStore';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useCategory } from '../../context/CategoryContext';
import { useAuth } from '../../context/AuthContext';
import LoginModal from '../Modals/LoginModal';
import { categories as localCategories } from '../../data/index';

const Header = ({ variant = 'default' }) => {
    const { user } = useAuth();
    const { wishlistItems } = useWishlist();
    const { activeCategory, setActiveCategory, activeSubCategory, setActiveSubCategory, getCategoryColor } = useCategory();
    const { activeAddress } = useLocationContext();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
    const [isDiscoverOpen, setIsDiscoverOpen] = useState(false);
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

    useEffect(() => {
        const handleOpenLogin = () => setIsLoginModalOpen(true);
        window.addEventListener('openLoginModal', handleOpenLogin);
        return () => window.removeEventListener('openLoginModal', handleOpenLogin);
    }, []);

    const { getCartCount, lastAddedItem } = useCart();
    const cartCount = getCartCount();
    const location = useLocation();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');

    const [searchSuggestions, setSearchSuggestions] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    // Auto-Hide Header Logic
    const [isHeaderVisible, setIsHeaderVisible] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            // Only apply on mobile where sticky real estate matters, and after 100px of scrolling
            if (window.innerWidth < 768 && currentScrollY > 100) {
                if (currentScrollY > lastScrollY) {
                    setIsHeaderVisible(false); // Scrolling down - hide
                } else {
                    setIsHeaderVisible(true);  // Scrolling up - show
                }
            } else {
                setIsHeaderVisible(true); // Always show at the top or on desktop
            }
            setLastScrollY(currentScrollY);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [lastScrollY]);

    const handleSearchInput = async (value) => {
        setSearchQuery(value);
        if (value.trim().length > 2) {
            setIsSearching(true);
            try {
                const response = await api.get('/products', {
                    params: { search: value, limit: 5 }
                });
                const products = response?.data?.data?.products || response?.data?.products || response?.products || [];
                setSearchSuggestions(products.map(p => ({
                    ...p,
                    id: p._id || p.id,
                    image: p.image || p.images?.[0] || 'https://via.placeholder.com/50x50'
                })));
            } catch (error) {
                console.error("Search failed:", error);
                setSearchSuggestions([]);
            } finally {
                setIsSearching(false);
            }
        } else {
            setSearchSuggestions([]);
        }
    };

    const handleSearch = (e) => {
        if (e && e.key === 'Enter' && searchQuery.trim()) {
            navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
            setSearchQuery('');
            setSearchSuggestions([]);
        }
    };

    const handleSuggestionClick = (suggestion) => {
        navigate(`/product/${suggestion.id}`);
        setSearchQuery('');
        setSearchSuggestions([]);
    };

    // Get categories from store
    const { categories: storeCategories, initialize } = useCategoryStore();
    useEffect(() => {
        initialize();
    }, [initialize]);

    // Compute dynamic horizontal categories (Root vs SubCategory siblings)
    const isSubcategoryMode = location.pathname === '/shop' && activeSubCategory !== 'All';

    const finalDisplayCategories = React.useMemo(() => {
        // Premium fallback images for when DB images are missing
        const fallbackMap = {
            'Women': 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?auto=format&fit=crop&w=150&q=80',
            'Men': 'https://images.unsplash.com/photo-1490367532201-b9bc1dc483f6?auto=format&fit=crop&w=150&q=80',
            'Beauty': 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=150&q=80',
            'Accessories': 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=150&q=80',
            'Footwear': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=150&q=80',
            'Home': 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=150&q=80',
            'Travel': 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=150&q=80',
            'Default': 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=150&q=80' // A sleek aesthetic overall fallback
        };

        if (!isSubcategoryMode) {
            return storeCategories.filter(c => c.isActive).map(c => ({
                ...c,
                image: c.image || fallbackMap[c.name] || fallbackMap['Default']
            }));
        }

        // If in subcategory mode, we want to scroll siblings horizontally.
        let root = activeCategory === 'For You' ? 'Women' : activeCategory;
        const currentRootData = localCategories.find(c => c.name.toLowerCase() === root.toLowerCase()) || localCategories[0];

        let subItems = [];
        if (currentRootData && currentRootData.sections) {
            currentRootData.sections.forEach(section => {
                if (section.items) {
                    subItems = [...subItems, ...section.items];
                }
            });
        }


        // Map them to mimic Root category structure { id, name, image }
        return subItems.map(item => ({
            id: item.name,
            name: item.name,
            image: item.image || currentRootData.image || fallbackMap[item.name] || fallbackMap['Default']
        }));
    }, [isSubcategoryMode, storeCategories, activeCategory, activeSubCategory]);

    // Auto-open location modal if not set and on home page
    useEffect(() => {
        const hasPrompted = sessionStorage.getItem('location-prompted');
        if (!activeAddress && (location.pathname === '/' || location.pathname === '/home') && !hasPrompted) {
            const timer = setTimeout(() => {
                setIsLocationModalOpen(true);
                sessionStorage.setItem('location-prompted', 'true');
            }, 1500); // Small delay for better UX
            return () => clearTimeout(timer);
        }
    }, [activeAddress, location.pathname]);

    // Show categories on Home and Shop pages
    const showCategories = (location.pathname === '/' || location.pathname === '/home' || location.pathname === '/shop');

    const getHeaderTheme = (categoryName) => {
        const name = categoryName?.toLowerCase() || '';

        // Retain the yellow shade at the top, varying the bottom color based on the selected category
        if (name === 'hello' || name === 'women') {
            return 'bg-gradient-to-b from-[#FFEA00] via-[#FFEA00]/80 to-[#FF4081]/80'; // Yellow to Vibrant Pink
        }
        if (name === 'men\'s fashion' || name === 'mens' || name === 'men') {
            return 'bg-gradient-to-b from-[#FFEA00] via-[#FFEA00]/80 to-[#4FC3F7]/80'; // Yellow to Light Blue
        }
        if (name === 'bottom wear') {
            return 'bg-gradient-to-b from-[#FFEA00] via-[#FFEA00]/80 to-[#9CCC65]/80'; // Yellow to Light Green
        }
        if (name === 'beauty') {
            return 'bg-gradient-to-b from-[#FFEA00] via-[#FFEA00]/80 to-[#F06292]/80'; // Yellow to Rose/Light Pink
        }
        if (name === 'accessories') {
            return 'bg-gradient-to-b from-[#FFEA00] via-[#FFEA00]/80 to-[#FFB300]/80'; // Yellow to Amber
        }

        // Default Vibrant Split (Yellow -> Blue)
        return 'bg-gradient-to-b from-[#FFEA00] via-[#FFEA00]/90 to-[#00B4D8]/80';
    };

    const currentHeaderBg = isSubcategoryMode ? getHeaderTheme(activeSubCategory) : getHeaderTheme(activeCategory);

    return (
        <header className={`w-full relative z-[999] shadow-sm font-sans ${currentHeaderBg} transition-all duration-300 ease-in-out ${variant === 'shop' ? 'sticky top-0' : ''} ${['product', 'account', 'cart', 'checkout', 'products', 'payment'].includes(variant) ? 'hidden md:block' : ''}`}>
            {/* Top Colored Section - Premium Frosted Background */}
            <div className={`relative z-[60] ${variant === 'shop' ? 'border-b border-black/5' : ''}`}>

                {/* Location Bar / Address Bar - Vibrant Edit (HIDDEN in shop variant) */}
                {variant !== 'shop' && (
                    <div
                        onClick={() => setIsLocationModalOpen(true)}
                        className="px-4 py-3 flex items-center justify-between group cursor-pointer transition-colors"
                    >
                        {/* LEFT SIDE: 60 MINS Badge */}
                        <div className="flex items-center">
                            <div className="flex flex-col items-center justify-center bg-[#1a1a1a] rounded-[14px] px-3 py-1.5 shadow-md shrink-0 border border-black/10">
                                <span className="text-[14px] font-black text-white leading-none tracking-tight">60</span>
                                <span className="text-[9px] font-black text-[#FFC107] uppercase tracking-[0.2em] leading-none mt-1 drop-shadow-sm">MINS</span>
                            </div>
                        </div>

                        {/* RIGHT SIDE: Location Icon and Details + Chevrons/Mobile Icons */}
                        <div className="flex items-center gap-2 justify-end">
                            <div className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center border border-black/10 shadow-md shrink-0 mr-1">
                                <MapPin size={18} className="text-[#FFC107]" />
                            </div>
                            <div className="flex flex-col min-w-0 pr-2 pl-1 text-left">
                                <span className="text-[14px] font-black leading-tight flex items-center gap-1.5 tracking-tight text-black">
                                    Current Location <ChevronDown size={14} className="text-[#FFC107] drop-shadow-sm" />
                                </span>
                                <span className="text-[11.5px] font-bold truncate max-w-[220px] text-black/70 transition-colors flex items-center gap-1">
                                    {activeAddress ? `${activeAddress.name}, ${activeAddress.address}` : 'Indore City, MP'}
                                </span>
                            </div>
                            <ChevronRight size={16} className="transition-transform duration-300 group-hover:translate-x-1 text-black hidden md:block" />
                            {/* Mobile Right Icons (Cart) */}
                            <div className="flex md:hidden items-center justify-center w-10 h-10 rounded-full bg-white shadow-sm border border-black/5 ml-1">
                                <Link to={user ? "/profile" : "/login"} onClick={(e) => e.stopPropagation()} className="relative p-1.5 group/icon mt-[2px]">
                                    <User size={20} className="text-gray-600 group-hover/icon:text-black transition-colors" />
                                </Link>
                            </div>
                        </div>
                    </div>
                )}

                {/* Search Bar & Wishlist Container - Seamless Collapse on Mobile Scroll */}
                <div className={`px-4 transition-all duration-300 ease-in-out grid relative ${isHeaderVisible ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="overflow-hidden w-full flex items-center gap-3">
                        <div className={`flex items-center gap-3 w-full ${variant === 'shop' ? 'pt-4 pb-4' : 'pt-2 pb-4'}`}>
                            <div className="relative flex-1 group">
                                <input
                                    type="text"
                                    placeholder='Search for "Jackets"'
                                    className="w-full py-3.5 pl-4 pr-12 border-none rounded-2xl bg-white text-[14px] font-medium text-black outline-none placeholder:text-gray-400 shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all duration-300"
                                    value={searchQuery}
                                    onChange={(e) => handleSearchInput(e.target.value)}
                                    onKeyDown={handleSearch}
                                />
                                <Search
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer group-hover:text-black transition-colors"
                                    size={18}
                                    onClick={() => searchQuery.trim() && handleSearch({ key: 'Enter' })}
                                />

                                {/* Premium Search Suggestions Dropdown */}
                                {searchSuggestions.length > 0 && (
                                    <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-[#FAFAFA] rounded-2xl shadow-xl overflow-hidden z-[1010] border border-black/5 animate-fadeInUp">
                                        <div className="p-4 border-b border-black/5 flex items-center justify-between bg-black/[0.02]">
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-black/40">Products Found</span>
                                            <span className="text-[10px] font-black text-black uppercase tracking-wider hover:underline cursor-pointer">View All</span>
                                        </div>
                                        {searchSuggestions.map((item) => (
                                            <div
                                                key={item.id}
                                                onClick={() => handleSuggestionClick(item)}
                                                className="px-5 py-3 hover:bg-black/5 flex items-center gap-4 cursor-pointer transition-colors border-b border-black/5 last:border-0 group/item"
                                            >
                                                <div className="w-12 h-14 rounded-xl overflow-hidden bg-black/5 shrink-0 shadow-sm">
                                                    <img src={item.image} alt={item.name} className="w-full h-full object-cover transition-transform group-hover/item:scale-110" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-[13px] font-bold text-black truncate mb-1">{item.name}</h4>
                                                    <p className="text-[10px] font-black uppercase text-black/40 tracking-tight">{item.brand} <span className="text-[8px] mx-1 opacity-50">•</span> <span className="text-black">₹{item.discountedPrice}</span></p>
                                                </div>
                                                <ChevronRight size={16} className="text-black/20 group-hover/item:text-black group-hover/item:translate-x-1 transition-all" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {/* Wishlist Icon for Mobile Shop View */}
                            {variant === 'shop' && (
                                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white shadow-[0_8px_30px_rgba(0,0,0,0.06)] shrink-0 group/headerHeart active:scale-75 transition-transform duration-300">
                                    <Link to="/wishlist" onClick={(e) => e.stopPropagation()} className="relative flex items-center justify-center w-full h-full">
                                        <Heart size={20} className="text-black transition-all duration-500 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] group-hover/headerHeart:scale-110 group-active/headerHeart:scale-50" />
                                        {wishlistItems?.length > 0 && (
                                            <span className="absolute top-[8px] right-[8px] bg-red-500 border-[1.5px] border-white text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                                                {wishlistItems.length}
                                            </span>
                                        )}
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="hidden md:flex flex-col border-t border-black/5">
                    <div className="flex items-center justify-between px-8 py-3">
                        <Link to="/" className="no-underline group">
                            <h1 className="font-premium text-[32px] font-black tracking-tighter drop-shadow-md transition-all duration-500 text-black group-hover:text-black/80">
                                Clothify<span className="text-black text-[40px] leading-none">.</span>
                            </h1>
                        </Link>

                        <div className="flex items-center gap-10">
                            <div
                                className="flex items-center gap-2.5 text-[12px] font-black uppercase tracking-[0.15em] cursor-pointer transition-colors py-2 group text-black/70 hover:text-black"
                                onMouseEnter={() => setIsMegaMenuOpen(true)}
                            >
                                <LayoutGrid size={18} className="text-black/50 group-hover:text-black transition-colors" />
                                Categories
                            </div>
                            <div
                                onClick={() => setIsDiscoverOpen(true)}
                                className="flex items-center gap-2.5 text-[12px] font-black uppercase tracking-[0.15em] cursor-pointer transition-colors group text-black/70 hover:text-black"
                            >
                                <Compass size={18} className="text-black/50 group-hover:text-black transition-colors group-hover:animate-spin-slow" />
                                Discover
                            </div>
                            <Link to="/wishlist" className="relative flex items-center gap-2.5 text-[12px] font-black uppercase tracking-[0.15em] no-underline transition-colors group text-black/70 hover:text-black">
                                <Heart size={18} className="text-black/50 group-hover:text-black transition-colors" />
                                Wishlist
                                {wishlistItems.length > 0 && (
                                    <span className="absolute -top-2.5 -right-3 bg-white border border-black text-black text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                                        {wishlistItems.length}
                                    </span>
                                )}
                            </Link>
                            <Link to="/cart" className="relative transition-colors group text-black/70 hover:text-black">
                                <ShoppingCart size={24} className="group-hover:scale-110 transition-transform" />
                                {cartCount > 0 && (
                                    <span className="absolute -top-2.5 -right-2.5 bg-black border-2 border-white text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                                        {cartCount}
                                    </span>
                                )}
                            </Link>
                            <Link
                                to={user ? "/profile" : "/login"}
                                className="transition-all flex flex-col items-center group relative text-black/70 hover:text-black"
                            >
                                <User size={24} className={user ? 'text-black' : ''} />
                                {!user && (
                                    <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase tracking-widest whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all text-black">
                                        Login
                                    </span>
                                )}
                            </Link>
                        </div>
                    </div>

                    {/* Mega Menu Dropdown */}
                    <MegaMenu
                        isOpen={isMegaMenuOpen}
                        onClose={() => setIsMegaMenuOpen(false)}
                    />
                </div>
            </div>

            {/* Backdrop Overlay for Mega Menu */}
            <div
                className={`fixed inset-0 bg-[#111111]/80 backdrop-blur-md transition-all duration-700 z-[40] ${isMegaMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
                onMouseEnter={() => setIsMegaMenuOpen(false)}
            />

            {/* Dynamic Category Tabs */}
            {showCategories && (
                <div className={`relative z-[30] transition-all duration-300 ease-in-out grid ${isHeaderVisible ? 'grid-rows-[1fr] opacity-100 mt-1 mb-2' : 'grid-rows-[0fr] opacity-0 mt-0 mb-0'}`}>
                    <div className="overflow-hidden">
                        <div className="flex overflow-x-auto scrollbar-hide gap-1 md:gap-4 px-2 md:px-8 pt-2 items-end scroll-smooth snap-x snap-mandatory min-h-[105px]">
                            {finalDisplayCategories.map((cat, idx) => {
                                const isSelected = isSubcategoryMode ? (activeSubCategory === cat.name) : (activeCategory === cat.name);

                                return (
                                    <button
                                        key={cat.id || idx}
                                        className={`relative flex flex-col items-center shrink-0 w-[80px] md:w-[94px] snap-center outline-none group pt-3 pb-3 px-1 transition-all duration-300 ${isSelected ? 'bg-white rounded-t-[24px]' : 'hover:-translate-y-1'}`}
                                        onClick={() => {
                                            if (isSubcategoryMode) {
                                                setActiveSubCategory(cat.name);
                                            } else {
                                                setActiveCategory(cat.name);
                                                if (location.pathname === '/' || location.pathname === '/home') {
                                                    setTimeout(() => {
                                                        const grid = document.getElementById('product-grid');
                                                        if (grid) {
                                                            grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                        }
                                                    }, 50);
                                                } else if (location.pathname !== '/shop') {
                                                    navigate('/shop');
                                                }
                                            }
                                        }}
                                    >
                                        {/* Inner Image Container (Circles) - Match screenshot styling */}
                                        <div className="w-[60px] h-[60px] md:w-[72px] md:h-[72px] rounded-full overflow-hidden bg-white shadow-sm shrink-0 flex items-center justify-center p-[2px]">
                                            <div className="w-full h-full rounded-full overflow-hidden border border-white">
                                                <img
                                                    src={cat.image}
                                                    alt={cat.name}
                                                    className={`w-full h-full object-cover transition-transform duration-[800ms] ${isSelected ? 'scale-110' : 'group-hover:scale-110'}`}
                                                />
                                            </div>
                                        </div>

                                        {/* Category Text */}
                                        <span
                                            className={`mt-2 text-[10.5px] md:text-[11.5px] text-center transition-all duration-300 leading-tight block w-full truncate px-1 ${isSelected
                                                ? 'text-black font-black drop-shadow-md'
                                                : 'text-black/70 font-bold group-hover:text-black'
                                                }`}
                                        >
                                            {cat.name}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile Sidebar - Luxury Edit */}
            <div className={`fixed inset-0 h-[100dvh] w-full bg-[#111111] !opacity-100 z-[99999] transition-all duration-[600ms] ease-out-expo transform ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'} overflow-hidden flex flex-col`}>
                {/* Header of Menu */}
                <div className="flex justify-between items-center p-6 border-b border-white/10 bg-[#111111] sticky top-0 z-10 backdrop-blur-xl">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-[20px] flex items-center justify-center shadow-lg">
                            <ShoppingCart size={22} className="text-[#D4AF37]" />
                        </div>
                        <div>
                            <h3 className="font-premium font-black text-2xl text-[#FAFAFA] uppercase tracking-tighter leading-none mb-1">Menu</h3>
                            <span className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-[0.2em] block drop-shadow-sm">The Collection</span>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsMenuOpen(false)}
                        className="w-12 h-12 bg-white/5 rounded-[20px] flex items-center justify-center hover:bg-white/10 transition-colors active:scale-95 border border-white/5"
                    >
                        <X size={24} strokeWidth={2.5} className="text-[#FAFAFA]" />
                    </button>
                </div>

                {/* Categories List */}
                <div className="flex-1 overflow-y-auto bg-[#111111] py-4 px-5">
                    <div className="space-y-2 pb-10">
                        {storeCategories.filter(c => c.isActive).map((cat) => (
                            <div key={cat.id} className="group/cat">
                                <button
                                    className="w-full flex items-center gap-4 p-3 hover:bg-white/5 rounded-[24px] transition-all duration-300 text-left outline-none border border-transparent hover:border-white/5"
                                    onClick={() => {
                                        setActiveCategory(cat.name);
                                        navigate('/shop');
                                        setIsMenuOpen(false);
                                    }}
                                >
                                    <div className="w-14 h-14 rounded-[20px] overflow-hidden bg-black flex-shrink-0 shadow-lg border border-white/10 transition-transform active:scale-95 group-hover/cat:border-[#D4AF37]/50">
                                        <img src={cat.image} alt={cat.name} className="w-full h-full object-cover transition-transform duration-700 group-hover/cat:scale-110" />
                                    </div>
                                    <div className="flex-1">
                                        <span className="font-premium font-black text-[#FAFAFA] text-[16px] uppercase tracking-tight block leading-none mb-1.5 group-hover/cat:text-[#D4AF37] transition-colors">
                                            {cat.name}
                                        </span>
                                        <span className="text-[9px] font-bold text-white/40 uppercase tracking-[0.2em] block">
                                            {cat.sections?.length || 0} Categories
                                        </span>
                                    </div>
                                    <ChevronRight className="text-white/20 group-hover/cat:text-[#D4AF37] group-hover/cat:translate-x-1 transition-all" size={18} />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Quick Access Section */}
                    <div className="pb-12 pt-6 border-t border-white/10 space-y-4">
                        <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] px-3 mb-5">Personal</h4>
                        <Link
                            to="/orders"
                            onClick={() => setIsMenuOpen(false)}
                            className="flex items-center justify-between p-5 bg-white/5 border border-white/10 rounded-[28px] group hover:bg-[#D4AF37]/10 hover:border-[#D4AF37]/30 transition-all"
                        >
                            <span className="font-bold text-[12px] uppercase tracking-[0.15em] text-[#FAFAFA] group-hover:text-[#D4AF37] transition-colors">Order History</span>
                            <div className="w-9 h-9 rounded-full bg-black/50 border border-white/10 flex items-center justify-center transition-transform group-hover:translate-x-1 group-hover:border-[#D4AF37]/50">
                                <ChevronRight size={16} className="text-[#FAFAFA] group-hover:text-[#D4AF37]" />
                            </div>
                        </Link>
                        <Link
                            to="/login"
                            onClick={() => setIsMenuOpen(false)}
                            className="flex items-center justify-center gap-3 w-full py-5 bg-[#FAFAFA] text-[#111111] rounded-[28px] font-black uppercase text-[12px] tracking-[0.2em] active:scale-95 transition-all shadow-[0_10px_30px_rgba(250,250,250,0.15)] hover:bg-[#D4AF37]"
                        >
                            Sign In / Register
                        </Link>
                    </div>
                </div>
            </div>

            {/* Discover Modal */}
            <DiscoverModal
                isOpen={isDiscoverOpen}
                onClose={() => setIsDiscoverOpen(false)}
            />

            {/* Location Modal */}
            <LocationModal
                isOpen={isLocationModalOpen}
                onClose={() => setIsLocationModalOpen(false)}
            />

            {/* Ultra-Premium Cart Toast Notification */}
            {lastAddedItem && (
                <div className="fixed top-24 right-4 z-[5000] bg-[#111111]/90 backdrop-blur-2xl text-[#FAFAFA] pl-3 pr-6 py-3 rounded-[32px] shadow-[0_20px_40px_rgba(0,0,0,0.4)] animate-fadeInUp flex items-center gap-5 min-w-[320px] border border-white/10 pointer-events-auto">
                    {/* Image Circle */}
                    <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 border-2 border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.3)]">
                        <img src={lastAddedItem.image} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 py-1">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#D4AF37] mb-1 flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-[#D4AF37] animate-pulse"></span>
                            Reserved in Cart
                        </p>
                        <h4 className="text-[13px] font-bold truncate max-w-[180px] mb-1 tracking-tight">{lastAddedItem.name}</h4>
                        <Link to="/cart" className="text-[10px] font-black uppercase tracking-wider text-white/50 hover:text-[#FAFAFA] transition-colors border-b border-transparent hover:border-[#FAFAFA]">Checkout Now</Link>
                    </div>
                    <button className="p-2 hover:bg-white/10 rounded-full transition-colors active:scale-90 absolute top-2 right-2 flex items-center justify-center">
                        <X size={14} className="text-white/40 hover:text-white" />
                    </button>
                    {/* Side Highlight Line */}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-1/2 bg-[#D4AF37] rounded-r-full shadow-[0_0_10px_#D4AF37]" />
                </div>
            )}

            {/* Global Login Modal */}
            <LoginModal
                isOpen={isLoginModalOpen}
                onClose={() => setIsLoginModalOpen(false)}
            />
        </header>
    );
};

export default Header;

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, MapPin, User, ShoppingCart, X, LayoutGrid, Compass, Heart, ChevronRight, ChevronDown } from 'lucide-react';
import MegaMenu from './MegaMenu';
import DiscoverModal from './DiscoverModal';
import LocationModal from './LocationModal';
import CategoryBar from '../Category/CategoryBar';
import { useUserLocation } from '../../context/LocationContext';

import api from '../../../../shared/utils/api';
import { useCategoryStore } from '../../../../shared/store/categoryStore';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useCategory } from '../../context/CategoryContext';
import { useAuth } from '../../context/AuthContext';
import LoginModal from '../Modals/LoginModal';
import { categories as localCategories } from '../../data/index';
import logo from '../../../../assets/animations/lottie/logo-removebg.png';

// Utility for highlighting search query in suggestions
const HighlightText = ({ text, query }) => {
    if (!query) return <span>{text}</span>;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
        <span>
            {parts.map((part, i) => (
                <span key={i} className={part.toLowerCase() === query.toLowerCase() ? "font-bold text-black" : "text-gray-500"}>
                    {part}
                </span>
            ))}
        </span>
    );
};


const Header = ({ variant = 'default' }) => {
    const headerRef = useRef(null);
    const { user } = useAuth();
    const { wishlistItems } = useWishlist();
    const { activeCategory, setActiveCategory, activeSubCategory, setActiveSubCategory, getCategoryColor } = useCategory();
    const { activeAddress } = useUserLocation();
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

    useEffect(() => {
        const el = headerRef.current;
        if (!el) return;

        const updateHeaderHeight = () => {
            const height = el.offsetHeight || 0;
            document.documentElement.style.setProperty('--user-header-height', `${height}px`);
        };

        updateHeaderHeight();

        const scrollContainer = document.getElementById('user-scroll-container');
        
        let resizeObserver;
        if ('ResizeObserver' in window) {
            resizeObserver = new ResizeObserver(() => updateHeaderHeight());
            resizeObserver.observe(el);
            if (scrollContainer) resizeObserver.observe(scrollContainer);
        }

        window.addEventListener('resize', updateHeaderHeight);
        if (scrollContainer) scrollContainer.addEventListener('resize', updateHeaderHeight);

        return () => {
            window.removeEventListener('resize', updateHeaderHeight);
            if (scrollContainer) scrollContainer.removeEventListener('resize', updateHeaderHeight);
            if (resizeObserver) resizeObserver.disconnect();
        };
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
        const scrollContainer = document.getElementById('user-scroll-container');
        const target = scrollContainer || window;

        const handleScroll = () => {
            const currentScrollY = scrollContainer ? scrollContainer.scrollTop : window.scrollY;
            
            // Logic for 'Premium Auto-Hide' - Expand when scrolling up, hide when scrolling down
            if (currentScrollY > lastScrollY && currentScrollY > 100) {
                // Scrolling down - hide additional parts to maximize screen
                setIsHeaderVisible(false);
            } else if (currentScrollY < lastScrollY) {
                // Scrolling UP - Expand header for better navigation
                setIsHeaderVisible(true);
            } else if (currentScrollY < 10) {
                // Always show at the very top
                setIsHeaderVisible(true);
            }
            
            setLastScrollY(currentScrollY);
        };

        target.addEventListener('scroll', handleScroll, { passive: true });
        return () => target.removeEventListener('scroll', handleScroll);
    }, [lastScrollY]);

    const handleSearchInput = async (value) => {
        setSearchQuery(value);
        if (value.trim().length > 0) {
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
            navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
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

    const finalDisplayCategories = useMemo(() => {
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
    const showCategories = (location.pathname === '/' || location.pathname === '/home' || location.pathname === '/shop' || location.pathname === '/categories');

    const getHeaderTheme = (categoryName) => {
        return 'bg-white';
    };

    const { getCategoryGradient } = useCategory();
    const currentGradient = isSubcategoryMode ? getCategoryGradient(activeSubCategory) : getCategoryGradient(activeCategory);

    // Close search on click outside
    const searchDropdownRef = useRef(null);
    const mobileSearchDropdownRef = useRef(null);
    useEffect(() => {
        const handleClickOutside = (e) => {
            const inDesktop = searchDropdownRef.current && searchDropdownRef.current.contains(e.target);
            const inMobile = mobileSearchDropdownRef.current && mobileSearchDropdownRef.current.contains(e.target);
            
            if (!inDesktop && !inMobile) {
                setSearchSuggestions([]);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);


    return (
        <motion.header
            ref={headerRef}
            initial={false}
            animate={{ background: currentGradient }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className={`w-full sticky top-0 left-0 z-[999] shadow-sm font-sans transition-all duration-300 ease-in-out ${['product', 'account', 'cart', 'checkout', 'products', 'payment'].includes(variant) ? 'hidden lg:block' : ''}`}
        >
            {/* Top Colored Section - Premium Frosted Background */}
            <div className={`relative z-[60] ${variant === 'shop' ? 'border-b border-black/5' : ''}`}>

                {/* Location Bar / Address Bar - Vibrant Edit (HIDDEN in shop variant) */}
                {variant !== 'shop' && (
                    <>
                        {/* Mobile Location Bar - Optimized for 425px */}
                        <motion.div 
                            initial={false}
                            animate={{ 
                                height: isHeaderVisible ? 'auto' : 0, 
                                opacity: isHeaderVisible ? 1 : 0,
                                marginBottom: isHeaderVisible ? 0 : -8
                            }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="px-4 py-1.5 flex items-center justify-between group transition-all lg:hidden overflow-hidden"
                        >
                            <div className="flex items-center gap-2">
                                <Link to="/" className="no-underline group shrink-0">
                                    <h1 className="text-[20px] font-black text-black drop-shadow-sm transition-all duration-300 active:scale-95 leading-none">
                                        Clouse<span className="text-[#FFC107]">.</span>
                                    </h1>
                                </Link>
                                <div className="flex items-center ml-1">
                                    <div className="flex flex-col items-center justify-center bg-white rounded-[7px] px-1.5 py-0.5 shadow-sm shrink-0 border border-black/5 min-w-[32px]">
                                        <span className="text-[10px] font-black text-black leading-none">60</span>
                                        <span className="text-[6px] font-black text-[#FFC107] uppercase leading-none mt-0.5">MINS</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 justify-end min-w-0" onClick={() => setIsLocationModalOpen(true)}>
                                <div className="flex flex-col min-w-0 text-right">
                                    <span className="text-[10px] font-black leading-tight flex items-center justify-end gap-1 text-black uppercase tracking-tighter opacity-80">
                                        Location <ChevronDown size={10} className="text-[#FFC107]" />
                                    </span>
                                    <span className="text-[10px] font-bold truncate max-w-[120px] text-black transition-colors block">
                                        {activeAddress ? `${activeAddress.name}` : 'Indore'}
                                    </span>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border border-black/5 shadow-sm shrink-0">
                                    <MapPin size={14} className="text-[#FFC107]" />
                                </div>
                                <Link to="/cart" className="flex items-center justify-center w-8 h-8 rounded-full bg-black shadow-lg shrink-0 active:scale-90 transition-transform">
                                    <div className="relative">
                                        <ShoppingCart size={15} className="text-white" />
                                        {cartCount > 0 && (
                                            <span className="absolute -top-2 -right-2 bg-[#FFC107] text-black text-[7px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center border border-black shadow-sm">
                                                {cartCount}
                                            </span>
                                        )}
                                    </div>
                                </Link>
                            </div>
                        </motion.div>

                        {/* Desktop Inline Navbar - Now shown on large screens (lg+) */}
                        <div className="hidden lg:flex items-center justify-between px-6 py-3">
                        <div className="flex items-center gap-8">
                            <Link to="/" className="flex items-center gap-1 no-underline group">
                                
                            </Link>

                                <button
                                    onClick={() => setIsLocationModalOpen(true)}
                                    className="flex items-center gap-3 group text-left"
                                >
                                <div className="flex items-center justify-center bg-black rounded-[14px] w-12 h-12 shrink-0 shadow-md">
                                    <span className="text-white text-[16px] font-black leading-none">60</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[12px] font-bold text-black leading-none">Mins</span>
                                    <span className="text-[12px] font-semibold text-black/70 leading-none mt-1">
                                        Current: {activeAddress ? `${activeAddress.name}` : 'Add Address'}
                                    </span>
                                </div>
                                <ChevronRight size={16} className="text-black/60 group-hover:translate-x-1 transition-transform" />
                            </button>
                            </div>

                            <div className="relative flex-1 max-w-[560px]" ref={searchDropdownRef}>
                                <div className="relative group">
                                    <input
                                        type="text"
                                        placeholder="Search for products, brands or more"
                                        className="w-full py-3 pl-12 pr-4 border border-black/10 rounded-xl bg-white text-[14px] font-medium text-black outline-none placeholder:text-gray-400 shadow-sm focus:border-black/30 transition-all"
                                        value={searchQuery}
                                        onChange={(e) => handleSearchInput(e.target.value)}
                                        onKeyDown={handleSearch}
                                    />
                                    <Search
                                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer group-focus-within:text-black transition-colors"
                                        size={18}
                                        onClick={() => searchQuery.trim() && handleSearch({ key: 'Enter' })}
                                    />
                                </div>

                                {searchSuggestions.length > 0 && (
                                    <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden z-[1010] border border-black/5 animate-fadeInUp">
                                        <div className="p-3 border-b border-black/5 flex items-center justify-between bg-gray-50/50">
                                            <span className="text-[10px] font-bold uppercase text-black/40">Suggested Products</span>
                                            <span 
                                                onClick={() => handleSearch({ key: 'Enter' })}
                                                className="text-[10px] font-bold text-black uppercase hover:underline cursor-pointer"
                                            >
                                                View All
                                            </span>
                                        </div>
                                        <div className="max-h-[400px] overflow-y-auto scrollbar-hide">
                                            {searchSuggestions.map((item) => (
                                                <div
                                                    key={item.id}
                                                    onClick={() => handleSuggestionClick(item)}
                                                    className="px-5 py-3 hover:bg-gray-50 flex items-center gap-4 cursor-pointer transition-colors border-b border-gray-50 last:border-0 group/item"
                                                >
                                                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0 border border-black/5 shadow-sm">
                                                        <img src={item.image} alt={item.name} className="w-full h-full object-cover transition-transform group-hover/item:scale-110" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-[13px] font-medium text-black truncate mb-0.5">
                                                            <HighlightText text={item.name} query={searchQuery} />
                                                        </h4>
                                                        <p className="text-[10px] font-bold uppercase text-black/30">
                                                            {item.categoryId?.name || 'Category'} <span className="text-[8px] mx-1 opacity-50">•</span> <span className="text-black/60 font-semibold">₹{item.price}</span>
                                                        </p>
                                                    </div>
                                                    <ChevronRight size={14} className="text-gray-300 group-hover/item:text-black group-hover/item:translate-x-1 transition-all" />
                                                </div>
                                            ))}
                                        </div>
                                        {/* Bottom Action Row like reference */}
                                        <div 
                                            onClick={() => handleSearch({ key: 'Enter' })}
                                            className="p-4 bg-gray-50/80 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors border-t border-black/5 group/all"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm border border-black/5 group-hover/all:scale-110 transition-transform">
                                                    <Search size={14} className="text-gray-900" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Show all results for</span>
                                                    <span className="text-[13px] font-bold text-black border-b border-black/20 group-hover/all:border-black transition-all leading-tight italic">"{searchQuery}"</span>
                                                </div>
                                            </div>
                                            <ChevronRight size={18} className="text-gray-400 group-hover/all:text-black group-hover/all:translate-x-1 transition-all" />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-6">
                                <Link
                                    to="/categories"
                                    className="flex items-center gap-2 text-[14px] font-semibold text-black/80 hover:text-black transition-colors"
                                >
                                    <LayoutGrid size={18} className="text-black/60" />
                                    Categories
                                </Link>
                                <button
                                    onClick={() => setIsDiscoverOpen(true)}
                                    className="flex items-center gap-2 text-[14px] font-semibold text-black/80 hover:text-black transition-colors"
                                >
                                    <Compass size={18} className="text-black/60" />
                                    Discover
                                </button>
                                <Link to="/wishlist" className="relative flex items-center gap-2 text-[14px] font-semibold text-black/80 hover:text-black transition-colors">
                                    <Heart size={18} className="text-black/60" />
                                    Wishlist
                                    {wishlistItems.length > 0 && (
                                        <span className="absolute -top-2 -right-3 bg-white border border-black text-black text-[9px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                                            {wishlistItems.length}
                                        </span>
                                    )}
                                </Link>
                                <Link to="/cart" className="relative flex items-center gap-2 text-[14px] font-semibold text-black/80 hover:text-black transition-colors">
                                    <ShoppingCart size={20} className="text-black/60" />
                                    Cart
                                    {cartCount > 0 && (
                                        <span className="absolute -top-2 -right-3 bg-black text-white text-[9px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                                            {cartCount}
                                        </span>
                                    )}
                                </Link>
                                <Link
                                    to={user ? "/profile" : "/login"}
                                    state={{ from: location }}
                                    className="flex items-center gap-2 text-[14px] font-semibold text-black/80 hover:text-black transition-colors"
                                >
                                    <User size={20} className="text-black/60" />
                                    {user?.name || 'User'}
                                </Link>
                            </div>
                        </div>
                    </>
                )}

                {/* Search Bar & Wishlist Container - Persistent on Mobile/Tab */}
                <div 
                    ref={mobileSearchDropdownRef} 
                    className={`px-4 transition-all duration-300 ease-in-out relative lg:hidden ${variant === 'shop' ? 'pt-2 pb-2' : 'pt-1 pb-2'}`}
                >
                    <div className="w-full flex items-center gap-3">
                        <div className="flex items-center gap-3 w-full">
                            <div className="relative flex-1 group">
                                <input
                                    type="text"
                                    placeholder='Search for "Jackets"'
                                    className="w-full py-3 pl-4 pr-12 border border-black/5 rounded-2xl bg-white text-[14px] font-medium text-black outline-none placeholder:text-gray-400 shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-300 focus:border-black/20"
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
                                    <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white rounded-2xl shadow-2xl overflow-hidden z-[1010] border border-black/5 animate-fadeInUp">
                                        <div className="p-3 border-b border-black/5 flex items-center justify-between bg-gray-50/50">
                                            <span className="text-[10px] font-bold uppercase text-black/40">Top results</span>
                                            <span 
                                                onClick={() => handleSearch({ key: 'Enter' })}
                                                className="text-[10px] font-bold text-black uppercase hover:underline"
                                            >
                                                View All
                                            </span>
                                        </div>
                                        <div className="max-h-[350px] overflow-y-auto">
                                            {searchSuggestions.map((item) => (
                                                <div
                                                    key={item.id}
                                                    onClick={() => handleSuggestionClick(item)}
                                                    className="px-4 py-3 active:bg-gray-50 flex items-center gap-4 cursor-pointer transition-colors border-b border-gray-50 last:border-0 group/mobileItem"
                                                >
                                                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-gray-100 shrink-0 border border-black/5">
                                                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-[13px] font-medium text-black truncate">
                                                            <HighlightText text={item.name} query={searchQuery} />
                                                        </h4>
                                                        <p className="text-[10px] font-bold text-black/30 uppercase mt-0.5">
                                                            {item.categoryId?.name} <span className="text-black/60 mx-1">₹{item.price}</span>
                                                        </p>
                                                    </div>
                                                    <ChevronRight size={14} className="text-gray-300" />
                                                </div>
                                            ))}
                                        </div>
                                        {/* Mobile Bottom Action Row */}
                                        <div 
                                            onClick={() => handleSearch({ key: 'Enter' })}
                                            className="p-4 bg-gray-50 border-t border-black/5 flex items-center gap-4"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm border border-black/5">
                                                <Search size={14} className="text-gray-900" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-bold text-gray-400 uppercase">Search for</span>
                                                <span className="text-[12px] font-bold text-black truncate underline italic">"{searchQuery}"</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            {/* Wishlist Icon for Mobile Shop View */}
                            {variant === 'shop' && (
                                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white shadow-[0_8px_30px_rgba(0,0,0,0.06)] shrink-0 group/headerHeart active:scale-75 transition-transform duration-300">
                                    <Link to="/wishlist" onClick={(e) => e.stopPropagation()} className="relative flex items-center justify-center w-full h-full">
                                        <Heart size={20} className="text-black transition-all duration-500 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] group-hover/headerHeart:scale-110 group-active/headerHeart:scale-50" />
                                        {wishlistItems?.length > 0 && (
                                            <span className="absolute top-[8px] right-[8px] bg-red-500 border-[1.5px] border-white text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                                                {wishlistItems.length}
                                            </span>
                                        )}
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="hidden">
                    <div className="flex items-center justify-between px-8 py-3">
                        <Link to="/" className="no-underline group">
                            <h1 className="text-[32px] font-bold  drop-shadow-md transition-all duration-500 text-black group-hover:text-black/80">
                                Clothify<span className="text-black text-[40px] leading-none">.</span>
                            </h1>
                        </Link>

                        <div className="flex items-center gap-10">
                            <div
                                className="flex items-center gap-2.5 text-[12px] font-bold uppercase  cursor-pointer transition-colors py-2 group text-black/70 hover:text-black"

                            >
                                <LayoutGrid size={18} className="text-black/50 group-hover:text-black transition-colors" />
                                Categories
                            </div>
                            <div
                                onClick={() => setIsDiscoverOpen(true)}
                                className="flex items-center gap-2.5 text-[12px] font-bold uppercase  cursor-pointer transition-colors group text-black/70 hover:text-black"
                            >
                                <Compass size={18} className="text-black/50 group-hover:text-black transition-colors group-hover:animate-spin-slow" />
                                Discover
                            </div>
                            <Link to="/wishlist" className="relative flex items-center gap-2.5 text-[12px] font-bold uppercase  no-underline transition-colors group text-black/70 hover:text-black">
                                <Heart size={18} className="text-black/50 group-hover:text-black transition-colors" />
                                Wishlist
                                {wishlistItems.length > 0 && (
                                    <span className="absolute -top-2.5 -right-3 bg-white border border-black text-black text-[9px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                                        {wishlistItems.length}
                                    </span>
                                )}
                            </Link>
                            <Link to="/cart" className="relative transition-colors group text-black/70 hover:text-black">
                                <ShoppingCart size={24} className="group-hover:scale-110 transition-transform" />
                                {cartCount > 0 && (
                                    <span className="absolute -top-2.5 -right-2.5 bg-black border-2 border-white text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                                        {cartCount}
                                    </span>
                                )}
                            </Link>
                            <Link
                                to={user ? "/profile" : "/login"}
                                state={{ from: location }}
                                className="transition-all flex flex-col items-center group relative text-black/70 hover:text-black"
                            >
                                <User size={24} className={user ? 'text-black' : ''} />
                                {!user && (
                                    <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] font-bold uppercase  whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all text-black">
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
                className={`fixed inset-0 bg-white/80 backdrop-blur-md transition-all duration-700 z-[40] ${isMegaMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
                onClick={() => setIsMegaMenuOpen(false)}
            />

            {/* Dynamic Category Tabs */}
            {showCategories && (
                <div className={`relative z-[30] transition-all duration-300 ease-in-out grid ${isHeaderVisible ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 h-0 overflow-hidden'}`}>
                    <div className="overflow-hidden">
                        <CategoryBar />
                    </div>
                </div>
            )}

            {/* Mobile Sidebar - Luxury Edit */}
            <div className={`fixed inset-0 h-[100dvh] w-full bg-white !opacity-100 z-[99999] transition-all duration-[600ms] ease-out-expo transform ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'} overflow-hidden flex flex-col`}>
                {/* Header of Menu */}
                <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-white sticky top-0 z-10 backdrop-blur-xl">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-black/10 border border-black/30 rounded-[20px] flex items-center justify-center shadow-lg">
                            <ShoppingCart size={22} className="text-black" />
                        </div>
                        <div>
                            <h3 className="font-bold text-2xl text-gray-900  leading-none mb-1">Menu</h3>
                            <span className="text-[10px] font-semibold text-black uppercase  block drop-shadow-sm">The Collection</span>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsMenuOpen(false)}
                        className="w-12 h-12 bg-gray-50 rounded-[20px] flex items-center justify-center hover:bg-gray-100 transition-colors active:scale-95 border border-gray-100"
                    >
                        <X size={24} strokeWidth={2.5} className="text-gray-900" />
                    </button>
                </div>

                {/* Categories List */}
                <div className="flex-1 overflow-y-auto bg-white py-4 px-5">
                    <div className="space-y-2 pb-10">
                        {storeCategories.filter(c => c.isActive).map((cat) => (
                            <div key={cat.id} className="group/cat">
                                <button
                                    className="w-full flex items-center gap-4 p-3 hover:bg-gray-50 rounded-[24px] transition-all duration-300 text-left outline-none border border-transparent hover:border-gray-100"
                                    onClick={() => {
                                        setActiveCategory(cat.name);
                                        navigate('/shop');
                                        setIsMenuOpen(false);
                                    }}
                                >
                                    <div className="w-14 h-14 rounded-[20px] overflow-hidden bg-black flex-shrink-0 shadow-lg border border-gray-200 transition-transform active:scale-95 group-hover/cat:border-black/50">
                                        <img src={cat.image} alt={cat.name} className="w-full h-full object-cover transition-transform duration-700 group-hover/cat:scale-110" />
                                    </div>
                                    <div className="flex-1">
                                        <span className="font-bold text-gray-900 text-[16px]  block leading-none mb-1.5 group-hover/cat:text-black transition-colors">
                                            {cat.name}
                                        </span>
                                        <span className="text-[9px] font-semibold text-gray-400 uppercase  block">
                                            {cat.sections?.length || 0} Categories
                                        </span>
                                    </div>
                                    <ChevronRight className="text-white/20 group-hover/cat:text-black group-hover/cat:translate-x-1 transition-all" size={18} />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Quick Access Section */}
                    <div className="pb-12 pt-6 border-t border-gray-200 space-y-4">
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase  px-3 mb-5">Personal</h4>
                        <Link
                            to="/orders"
                            onClick={() => setIsMenuOpen(false)}
                            className="flex items-center justify-between p-5 bg-gray-50 border border-gray-200 rounded-[28px] group hover:bg-black/10 hover:border-black/30 transition-all"
                        >
                            <span className="font-bold text-[12px] uppercase  text-gray-900 group-hover:text-black transition-colors">Order History</span>
                            <div className="w-9 h-9 rounded-full bg-black/50 border border-gray-200 flex items-center justify-center transition-transform group-hover:translate-x-1 group-hover:border-black/50">
                                <ChevronRight size={16} className="text-gray-900 group-hover:text-black" />
                            </div>
                        </Link>
                        <Link
                            to="/login"
                            state={{ from: location }}
                            onClick={() => setIsMenuOpen(false)}
                            className="flex items-center justify-center gap-3 w-full py-5 bg-[#FAFAFA] text-black rounded-[28px] font-bold uppercase text-[12px]  active:scale-95 transition-all shadow-[0_10px_30px_rgba(250,250,250,0.15)] hover:bg-black"
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
                <div className="fixed top-24 right-4 z-[5000] bg-white/90 backdrop-blur-2xl text-gray-900 pl-3 pr-6 py-3 rounded-[32px] shadow-[0_20px_40px_rgba(0,0,0,0.4)] animate-fadeInUp flex items-center gap-5 min-w-[320px] border border-gray-200 pointer-events-auto">
                    {/* Image Circle */}
                    <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 border-2 border-black shadow-[0_0_15px_rgba(212,175,55,0.3)]">
                        <img src={lastAddedItem.image} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 py-1">
                        <p className="text-[9px] font-bold uppercase  text-black mb-1 flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-black animate-pulse"></span>
                            Reserved in Cart
                        </p>
                        <h4 className="text-[13px] font-bold truncate max-w-[180px] mb-1 ">{lastAddedItem.name}</h4>
                        <Link to="/cart" className="text-[10px] font-bold uppercase  text-gray-500 hover:text-gray-900 transition-colors border-b border-transparent hover:border-[#FAFAFA]">Checkout Now</Link>
                    </div>
                    <button className="p-2 hover:bg-gray-100 rounded-full transition-colors active:scale-90 absolute top-2 right-2 flex items-center justify-center">
                        <X size={14} className="text-gray-400 hover:text-white" />
                    </button>
                    {/* Side Highlight Line */}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-1/2 bg-black rounded-r-full shadow-[0_0_10px_#D4AF37]" />
                </div>
            )}

            {/* Global Login Modal */}
            <LoginModal
                isOpen={isLoginModalOpen}
                onClose={() => setIsLoginModalOpen(false)}
            />
        </motion.header>
    );
};

export default Header;

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
        if (!isSubcategoryMode) {
            return storeCategories.filter(c => c.isActive);
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
            image: item.image || currentRootData.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=100&q=80'
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

    // Only show categories on Home and Shop pages, UNLESS variant is shop where we hide the large category bar
    const showCategories = (location.pathname === '/' || location.pathname === '/home' || location.pathname === '/shop') && variant !== 'shop';

    return (
        <header className={`w-full relative z-[999] shadow-sm transition-colors duration-500 font-sans bg-[#111111] ${variant === 'shop' ? 'sticky top-0' : ''} ${['product', 'account'].includes(variant) ? 'hidden md:block' : ''}`}>
            {/* Top Colored Section - Premium Frosted Background */}
            <div className={`relative z-[60] backdrop-blur-xl bg-black/10 ${variant === 'shop' ? 'border-b border-white/10' : ''}`}>

                {/* Location Bar / Address Bar - Luxury Edit (HIDDEN in shop variant) */}
                {variant !== 'shop' && (
                    <div
                        onClick={() => setIsLocationModalOpen(true)}
                        className="px-4 py-3 flex justify-between items-center group cursor-pointer transition-colors border-b border-white/10"
                    >
                        <div className="flex items-center gap-4 overflow-hidden">
                            {/* Delivery Time Badge - Elegant Gradient */}
                            <div className="flex flex-col items-center justify-center bg-gradient-to-br from-white/20 to-white/5 border border-white/20 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-[0_4px_10px_rgba(0,0,0,0.1)] shrink-0 min-w-[55px]">
                                <span className="text-[12px] font-black text-[#FAFAFA] tracking-tight leading-none flex flex-col items-center text-shadow-sm">
                                    <span>60</span>
                                    <span className="text-[7.5px] text-[#D4AF37] mt-0.5 tracking-widest uppercase font-bold drop-shadow-md">Mins</span>
                                </span>
                            </div>

                            <div className="w-9 h-9 rounded-full flex items-center justify-center shadow-inner transition-colors bg-white/10 group-hover:bg-[#D4AF37]/20 border border-white/5 shrink-0">
                                <MapPin size={16} className="text-[#FAFAFA] group-hover:text-[#D4AF37] transition-colors" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-[14px] font-bold leading-tight flex items-center gap-2 text-[#FAFAFA] tracking-tight">
                                    {activeAddress ? activeAddress.name : 'Select Location'} <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#D4AF37] bg-white/10 px-1.5 py-0.5 rounded-md">{activeAddress?.type}</span>
                                </span>
                                <span className="text-[11.5px] font-medium truncate max-w-[220px] text-white/50 group-hover:text-white/80 transition-colors">
                                    {activeAddress ? `${activeAddress.address}, ${activeAddress.city}` : 'Add an address to see delivery info'}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <ChevronDown size={18} className="transition-transform duration-300 group-hover:rotate-180 text-white/50 group-hover:text-[#D4AF37]" />
                            {/* Mobile Right Icons (Wishlist & Cart) */}
                            <div className="flex md:hidden items-center gap-4 pl-3 border-l border-white/20">
                                <Link to="/wishlist" onClick={(e) => e.stopPropagation()} className="relative p-1.5 group/icon">
                                    <Heart size={22} className="text-[#FAFAFA] group-hover/icon:text-[#D4AF37] transition-colors" />
                                    {wishlistItems.length > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-[#111111] text-[#D4AF37] text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-[#D4AF37]">
                                            {wishlistItems.length}
                                        </span>
                                    )}
                                </Link>
                                <Link to="/cart" onClick={(e) => e.stopPropagation()} className="relative p-1.5 group/icon">
                                    <ShoppingCart size={22} className="text-[#FAFAFA] group-hover/icon:text-[#D4AF37] transition-colors" />
                                    {cartCount > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-[#D4AF37] text-[#111111] text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-[#111111] shadow-[0_0_8px_rgba(212,175,55,0.6)]">
                                            {cartCount}
                                        </span>
                                    )}
                                </Link>
                            </div>
                        </div>
                    </div>
                )}

                {/* Search Bar - Visible on All Screens */}
                <div className="px-4 pb-4 pt-3 flex items-center gap-2 relative">
                    <div className="relative flex-1 group">
                        <input
                            type="text"
                            placeholder='Search for "Jackets"'
                            className="w-full py-3.5 pl-6 pr-12 border border-black/5 rounded-2xl bg-white shadow-[0_8px_30px_rgba(0,0,0,0.06)] text-[14px] font-medium text-black outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-[#D4AF37]/50 transition-all duration-300"
                            value={searchQuery}
                            onChange={(e) => handleSearchInput(e.target.value)}
                            onKeyDown={handleSearch}
                        />
                        <Search
                            className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer group-hover:text-[#D4AF37] transition-colors"
                            size={18}
                            onClick={() => searchQuery.trim() && handleSearch({ key: 'Enter' })}
                        />

                        {/* Premium Search Suggestions Dropdown */}
                        {searchSuggestions.length > 0 && (
                            <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-[#FAFAFA] rounded-[24px] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)] overflow-hidden z-[1010] border border-[#111111]/5 animate-fadeInUp">
                                <div className="p-4 border-b border-[#111111]/5 flex items-center justify-between bg-[#111111]/[0.02]">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#111111]/40">Products Found</span>
                                    <span className="text-[10px] font-black text-[#D4AF37] uppercase tracking-wider hover:underline cursor-pointer">View All</span>
                                </div>
                                {searchSuggestions.map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() => handleSuggestionClick(item)}
                                        className="px-5 py-3 hover:bg-[#111111]/5 flex items-center gap-4 cursor-pointer transition-colors border-b border-[#111111]/5 last:border-0 group/item"
                                    >
                                        <div className="w-12 h-14 rounded-xl overflow-hidden bg-[#111111]/5 shrink-0 shadow-sm">
                                            <img src={item.image} alt={item.name} className="w-full h-full object-cover transition-transform group-hover/item:scale-110" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-[13px] font-bold text-[#111111] truncate mb-1 group-hover/item:text-[#D4AF37] transition-colors">{item.name}</h4>
                                            <p className="text-[10px] font-black uppercase text-[#111111]/40 tracking-tight">{item.brand} <span className="text-[8px] mx-1 opacity-50">•</span> <span className="text-[#D4AF37]">₹{item.discountedPrice}</span></p>
                                        </div>
                                        <ChevronRight size={16} className="text-[#111111]/20 group-hover/item:text-[#D4AF37] group-hover/item:translate-x-1 transition-all" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="hidden md:flex flex-col border-t border-white/5">
                    <div className="flex items-center justify-between px-8 py-3">
                        <Link to="/" className="no-underline group">
                            <h1 className="font-premium text-[32px] font-black tracking-tighter drop-shadow-md transition-all duration-500 text-[#FAFAFA] group-hover:text-[#D4AF37]">
                                Clothify<span className="text-[#D4AF37] text-[40px] leading-none group-hover:text-[#FAFAFA]">.</span>
                            </h1>
                        </Link>

                        <div className="flex items-center gap-10">
                            <div
                                className="flex items-center gap-2.5 text-[12px] font-black uppercase tracking-[0.15em] cursor-pointer transition-colors py-2 group text-[#FAFAFA] hover:text-[#D4AF37]"
                                onMouseEnter={() => setIsMegaMenuOpen(true)}
                            >
                                <LayoutGrid size={18} className="text-white/50 group-hover:text-[#D4AF37] transition-colors" />
                                Categories
                            </div>
                            <div
                                onClick={() => setIsDiscoverOpen(true)}
                                className="flex items-center gap-2.5 text-[12px] font-black uppercase tracking-[0.15em] cursor-pointer transition-colors group text-[#FAFAFA] hover:text-[#D4AF37]"
                            >
                                <Compass size={18} className="text-white/50 group-hover:text-[#D4AF37] transition-colors group-hover:animate-spin-slow" />
                                Discover
                            </div>
                            <Link to="/wishlist" className="relative flex items-center gap-2.5 text-[12px] font-black uppercase tracking-[0.15em] no-underline transition-colors group text-[#FAFAFA] hover:text-[#D4AF37]">
                                <Heart size={18} className="text-white/50 group-hover:text-[#D4AF37] transition-colors" />
                                Wishlist
                                {wishlistItems.length > 0 && (
                                    <span className="absolute -top-2.5 -right-3 bg-[#111111] border border-[#D4AF37] text-[#D4AF37] text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                                        {wishlistItems.length}
                                    </span>
                                )}
                            </Link>
                            <Link to="/cart" className="relative transition-colors group text-[#FAFAFA] hover:text-[#D4AF37]">
                                <ShoppingCart size={24} className="group-hover:scale-110 transition-transform" />
                                {cartCount > 0 && (
                                    <span className="absolute -top-2.5 -right-2.5 bg-[#D4AF37] border-2 border-[#111111] text-[#111111] text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(212,175,55,0.4)]">
                                        {cartCount}
                                    </span>
                                )}
                            </Link>
                            <Link
                                to={user ? "/profile" : "/login"}
                                className="transition-all flex flex-col items-center group relative text-[#FAFAFA] hover:text-[#D4AF37]"
                            >
                                <User size={24} className={user ? 'text-[#D4AF37]' : ''} />
                                {!user && (
                                    <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase tracking-widest whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all text-[#D4AF37]">
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

            {/* Premium Category Tabs */}
            {showCategories && (
                <div
                    className="relative z-[30] transition-colors duration-500 ease-in-out border-b border-white/10 bg-[#111111]"
                >
                    <div className="flex overflow-x-auto scrollbar-hide gap-2 md:gap-4 px-4 md:px-8 py-4 items-start scroll-smooth snap-x snap-mandatory">
                        {finalDisplayCategories.map((cat) => {
                            const isSelected = isSubcategoryMode ? (activeSubCategory === cat.name) : (activeCategory === cat.name);

                            return (
                                <button
                                    key={cat.id}
                                    className="flex flex-col items-center shrink-0 w-20 md:w-28 snap-center outline-none group py-1"
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
                                    {/* Outer Square (The Background Highlight) */}
                                    <div
                                        className={`flex items-center justify-center rounded-[20px] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:-translate-y-1.5 group-active:scale-95 ${isSelected
                                            ? 'w-16 h-16 md:w-[84px] md:h-[84px] bg-[#FAFAFA] shadow-[0_10px_30px_rgba(212,175,55,0.3)] ring-2 ring-[#D4AF37]/50 ring-offset-2 ring-offset-[#111111]'
                                            : 'w-16 h-16 md:w-[84px] md:h-[84px] bg-white/5 border border-white/10 group-hover:bg-white/10 group-hover:border-[#D4AF37]/50 group-hover:shadow-[0_15px_30px_-5px_rgba(212,175,55,0.2)]'
                                            }`}
                                    >
                                        {/* Inner Image Container */}
                                        <div
                                            className={`rounded-2xl overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isSelected
                                                ? 'w-[56px] h-[56px] md:w-[76px] md:h-[76px] border-[1.5px] border-[#111111]'
                                                : 'w-14 h-14 md:w-[76px] md:h-[76px] opacity-80 group-hover:opacity-100 group-hover:scale-105'
                                                }`}
                                        >
                                            <img
                                                src={cat.image}
                                                alt={cat.name}
                                                className="w-full h-full object-cover transition-transform duration-[1500ms] group-hover:scale-110"
                                            />
                                        </div>
                                    </div>

                                    {/* Category Text */}
                                    <span
                                        className={`mt-2 text-[10px] md:text-[11px] font-bold text-center transition-all duration-500 uppercase tracking-[0.15em] ${isSelected
                                            ? 'text-[#FAFAFA] drop-shadow-md scale-105'
                                            : 'text-white/50 group-hover:text-[#FAFAFA]'
                                            }`}
                                    >
                                        {cat.name}
                                    </span>
                                </button>
                            );
                        })}
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

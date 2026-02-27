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



const Header = () => {
    const { user } = useAuth();
    const { wishlistItems } = useWishlist();
    const { activeCategory, setActiveCategory, getCategoryColor } = useCategory();
    const { activeAddress } = useLocationContext();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
    const [isDiscoverOpen, setIsDiscoverOpen] = useState(false);
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);


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
                const products = response?.data?.products || response?.products || [];
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

    // Use store categories
    const displayCategories = storeCategories.filter(c => c.isActive);

    // Auto-open location modal if not set and on home page - Disabled as per user request
    /*
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
    */

    // Only show categories on Home and Shop pages
    const showCategories = location.pathname === '/' || location.pathname === '/home' || location.pathname === '/shop';

    const currentBgColor = getCategoryColor(activeCategory);

    return (
        <header className="w-full relative z-[999] shadow-sm transition-colors duration-500" style={{ backgroundColor: currentBgColor }}>
            {/* Top Colored Section */}
            <div className="relative z-[60]">
                {/* Location Bar / Address Bar - Myntra Style */}
                <div
                    onClick={() => setIsLocationModalOpen(true)}
                    className="px-4 py-2.5 flex justify-between items-center group cursor-pointer transition-colors border-b border-white/10 bg-transparent"
                >
                    <div className="flex items-center gap-3 overflow-hidden">
                        {/* Delivery Time Badge */}
                        <div className="flex flex-col items-center justify-center bg-white/10 backdrop-blur-md px-2 py-1 rounded-xl border border-white/20 shrink-0 min-w-[50px]">
                            <span className="text-[11px] font-black text-[#39ff14] leading-tight flex flex-col items-center">
                                <span>60</span>
                                <span className="text-[7px] text-white/70 -mt-1 tracking-tighter uppercase font-bold">Mins</span>
                            </span>
                        </div>

                        <div className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-colors bg-white/20 shrink-0">
                            <MapPin size={16} className="text-white" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[13px] font-black leading-tight flex items-center gap-2 text-white">
                                {activeAddress ? activeAddress.name : 'Select Location'} <span className="text-[10px] font-normal uppercase tracking-wider opacity-70 text-white">{activeAddress?.type}</span>
                            </span>
                            <span className="text-[11px] font-medium truncate max-w-[200px] opacity-80 text-white">
                                {activeAddress ? `${activeAddress.address}, ${activeAddress.city}` : 'Add an address to see delivery info'}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <ChevronDown size={16} className="transition-transform group-hover:rotate-180 text-white/70" />
                        {/* Mobile Right Icons (Wishlist & Cart) */}
                        <div className="flex md:hidden items-center gap-2 pl-2 border-l border-white/20">
                            <Link to="/wishlist" onClick={(e) => e.stopPropagation()} className="relative p-1">
                                <Heart size={20} className="text-white" />
                                {wishlistItems.length > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white">
                                        {wishlistItems.length}
                                    </span>
                                )}
                            </Link>
                            <Link to="/cart" onClick={(e) => e.stopPropagation()} className="relative p-1">
                                <ShoppingCart size={20} className="text-white" />
                                {cartCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-[#39ff14] text-black text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white">
                                        {cartCount}
                                    </span>
                                )}
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Search Bar - Visible on All Screens */}
                <div className="px-4 pb-3 pt-2 flex items-center gap-2 relative">
                    <div className="relative flex-1 group">
                        <input
                            type="text"
                            placeholder='Search for "Jackets"'
                            className="w-full py-3.5 pl-5 pr-12 border-none rounded-xl bg-white text-[15px] font-medium text-black outline-none placeholder:text-gray-400 shadow-sm focus:ring-2 focus:ring-[#ffcc00]/30 transition-all"
                            value={searchQuery}
                            onChange={(e) => handleSearchInput(e.target.value)}
                            onKeyDown={handleSearch}
                        />
                        <Search
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer group-hover:text-black transition-colors"
                            size={18}
                            onClick={() => searchQuery.trim() && handleSearch({ key: 'Enter' })}
                        />

                        {/* Search Suggestions Dropdown */}
                        {searchSuggestions.length > 0 && (
                            <div className="absolute top-full left-0 w-full bg-white mt-2 rounded-[20px] shadow-2xl overflow-hidden z-[1010] border border-gray-100 animate-fadeInUp">
                                <div className="p-4 border-b border-gray-50 flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-tight text-gray-400">Products Found</span>
                                    <span className="text-[10px] font-black text-blue-600 uppercase">View All</span>
                                </div>
                                {searchSuggestions.map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() => handleSuggestionClick(item)}
                                        className="px-4 py-3 hover:bg-gray-50 flex items-center gap-4 cursor-pointer transition-colors border-b border-gray-50 last:border-0"
                                    >
                                        <div className="w-10 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-[13px] font-bold text-gray-800 truncate mb-0.5">{item.name}</h4>
                                            <p className="text-[10px] font-black uppercase text-gray-400 tracking-tight">{item.brand} • ₹{item.discountedPrice}</p>
                                        </div>
                                        <ChevronRight size={14} className="text-gray-300" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>

                <div className="hidden md:flex flex-col">
                    <div className="flex items-center justify-between px-6 py-2">
                        <Link to="/" className="no-underline">
                            <h1 className="text-[28px] font-extrabold tracking-widest drop-shadow-sm transition-colors duration-500 text-white">Clothify</h1>
                        </Link>

                        <div className="flex items-center gap-8">
                            <div
                                className="flex items-center gap-2 text-[13px] font-black uppercase tracking-widest cursor-pointer transition-colors py-1 group text-white/90 hover:text-white"
                                onMouseEnter={() => setIsMegaMenuOpen(true)}
                            >
                                <LayoutGrid size={18} className="text-[#39ff14] group-hover:scale-110 transition-transform" />
                                Categories
                            </div>
                            <div
                                onClick={() => setIsDiscoverOpen(true)}
                                className="flex items-center gap-2 text-[13px] font-black uppercase tracking-widest cursor-pointer transition-colors text-white/90 hover:text-white"
                            >
                                <Compass size={18} className="text-pink-400 animate-spin-slow" />
                                Discover
                            </div>
                            <Link to="/wishlist" className="relative flex items-center gap-2 text-[13px] font-black uppercase tracking-widest no-underline transition-colors text-white/90 hover:text-white">
                                <Heart size={18} className="text-red-400" />
                                Wishlist
                                {wishlistItems.length > 0 && (
                                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center">
                                        {wishlistItems.length}
                                    </span>
                                )}
                            </Link>
                            <Link to="/cart" className="relative transition-colors text-white hover:text-[#39ff14]">
                                <ShoppingCart size={22} />
                                {cartCount > 0 && (
                                    <span className="absolute -top-2 -right-2 bg-[#39ff14] text-black text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                                        {cartCount}
                                    </span>
                                )}
                            </Link>
                            <Link
                                to={user ? "/profile" : "/login"}
                                className="transition-colors flex flex-col items-center group relative text-white hover:text-[#39ff14]"
                            >
                                <User size={22} className={user ? 'text-[#39ff14]' : ''} />
                                {!user && (
                                    <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase tracking-tighter whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all text-white/50 group-hover:text-white">
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
                className={`fixed inset-0 bg-[#0a192f]/80 backdrop-blur-[6px] transition-all duration-500 z-[40] ${isMegaMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
                onMouseEnter={() => setIsMegaMenuOpen(false)}
            />

            {/* Premium Category Tabs - Dynamic Background - Conditional Rendering */}
            {showCategories && (
                <div
                    className="relative z-[30] transition-colors duration-500 ease-in-out border-t border-white/10"
                    style={{ backgroundColor: currentBgColor }}
                >
                    <div className="flex overflow-x-auto scrollbar-hide gap-1 md:gap-3 px-3 md:px-6 pt-1 pb-2 items-start scroll-smooth snap-x snap-mandatory">
                        {displayCategories.map((cat) => (
                            <button
                                key={cat.id}
                                className="flex flex-col items-center shrink-0 w-20 md:w-28 snap-center outline-none mx-0.5 group py-1"
                                onClick={() => {
                                    setActiveCategory(cat.name);
                                    navigate('/shop');
                                }}
                            >
                                {/* Outer Square (The Background Highlight) */}
                                <div
                                    className={`flex items-center justify-center rounded-xl transition-all duration-500 ${activeCategory === cat.name
                                        ? 'w-16 h-16 md:w-20 md:h-20 bg-white shadow-[0_10px_20px_rgba(0,0,0,0.15)]'
                                        : 'w-16 h-16 md:w-20 md:h-20 bg-transparent group-hover:bg-white/10'
                                        }`}
                                >
                                    {/* Inner Image Square with Padding gap */}
                                    <div
                                        className={`rounded-xl overflow-hidden transition-all duration-500 ${activeCategory === cat.name
                                            ? 'w-[58px] h-[58px] md:w-[74px] md:h-[74px] border-2 border-gray-50 shadow-sm'
                                            : 'w-14 h-14 md:w-18 md:h-18 border border-white/30'
                                            }`}
                                    >
                                        <img
                                            src={cat.image}
                                            alt={cat.name}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        />
                                    </div>
                                </div>

                                {/* Category Text - Just below the outer square */}
                                <span
                                    className={`mt-1 text-[10px] md:text-[11px] font-black text-center transition-all duration-500 uppercase tracking-widest ${activeCategory === cat.name
                                        ? 'text-white scale-110 drop-shadow-md'
                                        : 'text-white/60 group-hover:text-white'
                                        }`}
                                >
                                    {cat.name}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Mobile Sidebar */}
            <div className={`fixed inset-0 h-[100dvh] w-full bg-[#ffffff] !opacity-100 z-[99999] transition-all duration-500 ease-in-out transform ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'} overflow-hidden flex flex-col`}>
                {/* Header of Menu */}
                <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-black rounded-2xl flex items-center justify-center shadow-lg">
                            <ShoppingCart size={20} className="text-[#ffcc00]" />
                        </div>
                        <div>
                            <h3 className="font-black text-xl uppercase tracking-tight leading-none">Menu</h3>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 block">Browse Categories</span>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsMenuOpen(false)}
                        className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center hover:bg-gray-100 transition-colors active:scale-95"
                    >
                        <X size={24} strokeWidth={3} className="text-black" />
                    </button>
                </div>

                {/* Categories List */}
                <div className="flex-1 overflow-y-auto bg-white py-2 px-4 shadow-inner">
                    <div className="space-y-1 pb-10">
                        {displayCategories.map((cat) => (
                            <div key={cat.id} className="group">
                                <button
                                    className="w-full flex items-center gap-3 py-3 px-1 active:bg-gray-50 rounded-xl transition-all duration-200 text-left outline-none"
                                    onClick={() => {
                                        setActiveCategory(cat.name);
                                        navigate('/shop');
                                        setIsMenuOpen(false);
                                    }}
                                >
                                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0 border border-gray-100 shadow-sm transition-transform active:scale-95">
                                        <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1">
                                        <span className="font-black text-gray-900 text-[13px] uppercase tracking-tight block leading-none mb-1">
                                            {cat.name}
                                        </span>
                                        <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest block opacity-70">
                                            {cat.sections?.length || 0} Sets
                                        </span>
                                    </div>
                                    <ChevronRight className="text-gray-300" size={14} />
                                </button>

                                {/* Drill-down Sections (Optional visibility on click) */}
                                <div className="ml-[60px] flex gap-2 overflow-x-auto scrollbar-hide pb-3 -mt-1 pr-4">
                                    {(cat.sections || []).map(section => (
                                        <span
                                            key={section.title}
                                            className="whitespace-nowrap text-[8px] font-black uppercase tracking-widest text-gray-500 bg-gray-50 px-2.5 py-1 rounded-md active:bg-black active:text-white transition-colors"
                                        >
                                            {section.title}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Quick Access Section */}
                    <div className="mt-10 mb-20 space-y-4">
                        <div className="h-[1px] bg-gray-100 w-full mb-8" />
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-2 mb-4">My Account</h4>
                        <Link
                            to="/orders"
                            onClick={() => setIsMenuOpen(false)}
                            className="flex items-center justify-between p-5 bg-gray-50 border border-gray-100 rounded-[24px] group hover:bg-black transition-all"
                        >
                            <span className="font-black text-[11px] uppercase tracking-widest text-black group-hover:text-white transition-colors">Order History</span>
                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center transition-transform group-hover:translate-x-1">
                                <ChevronRight size={14} className="text-black" />
                            </div>
                        </Link>
                        <Link
                            to="/login"
                            onClick={() => setIsMenuOpen(false)}
                            className="flex items-center justify-center gap-3 w-full py-5 bg-black text-white rounded-[24px] font-black uppercase text-[11px] tracking-widest active:scale-95 transition-all shadow-xl"
                        >
                            Login / Create Account
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


            {/* Cart Toast Notification */}
            {lastAddedItem && (
                <div className="fixed top-24 right-4 z-[5000] bg-black text-white px-6 py-4 rounded-[20px] shadow-2xl animate-fadeInRight flex items-center gap-4 min-w-[300px] border border-white/10">
                    <div className="w-12 h-16 rounded-lg overflow-hidden shrink-0 border border-white/20">
                        <img src={lastAddedItem.image} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#39ff14] mb-1">Added to Cart</p>
                        <h4 className="text-[13px] font-bold truncate max-w-[180px] mb-1">{lastAddedItem.name}</h4>
                        <Link to="/cart" className="text-[11px] font-black uppercase text-[#ffcc00] hover:underline transition-all">View Cart</Link>
                    </div>
                    <button className="p-1 hover:bg-white/10 rounded-full transition-colors">
                        <X size={16} />
                    </button>
                </div>
            )}
        </header>
    );
};

export default Header;

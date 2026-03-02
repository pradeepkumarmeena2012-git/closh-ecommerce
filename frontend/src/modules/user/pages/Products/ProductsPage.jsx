import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { products } from '../../data';
import { useWishlist } from '../../context/WishlistContext';
import { useCart } from '../../context/CartContext';
import { Filter, X, ChevronDown, ChevronUp, Star, Eye, ShoppingCart, Search, ArrowLeft, Heart, Share2, Check, MapPin } from 'lucide-react';
import LocationModal from '../../components/Header/LocationModal';
import { useAuth } from '../../context/AuthContext';
import LoginModal from '../../components/Modals/LoginModal';
import { useLocation as useLocationContext } from '../../context/LocationContext';
import ProductCard from '../../components/ProductCard/ProductCard';

const ProductsPage = () => {
    const { toggleWishlist, isInWishlist, wishlistItems } = useWishlist();
    const { addToCart, getCartCount } = useCart();
    const { activeAddress } = useLocationContext();
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isSortOpen, setIsSortOpen] = useState(false);
    const [isGenderOpen, setIsGenderOpen] = useState(false);
    const [isHeaderSearchOpen, setIsHeaderSearchOpen] = useState(false);
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

    // Active Filters State
    const [activeFilterTab, setActiveFilterTab] = useState('Brand');
    const [searchValue, setSearchValue] = useState(''); // Brand search in drawer
    const [headerSearchValue, setHeaderSearchValue] = useState(searchParams.get('search') || ''); // Main grid search
    const [selectedSort, setSelectedSort] = useState('New Arrivals');
    const [selectedGender, setSelectedGender] = useState('All');
    const [selectedBrands, setSelectedBrands] = useState([]);
    const [selectedSizes, setSelectedSizes] = useState([]);

    // Desktop Section states
    const [openSections, setOpenSections] = useState({
        brand: true,
        subCategory: true,
        productType: true,
        trend: false,
        size: false,
        fit: false,
        fabric: false,
        pattern: false,
        closureType: false,
        originCountry: false,
        gender: false,
        colorFamily: false,
        color: false
    });

    const division = searchParams.get('division');
    const category = searchParams.get('category');
    const subCategoryFromUrl = searchParams.get('subCategory') || searchParams.get('subcategory');
    const brandFromUrl = searchParams.get('brand');

    useEffect(() => {
        const searchFromUrl = searchParams.get('search');
        if (searchFromUrl) {
            setHeaderSearchValue(searchFromUrl);
            setIsHeaderSearchOpen(true);
        }
        if (brandFromUrl) {
            setSelectedBrands([brandFromUrl]);
        }
    }, [searchParams, brandFromUrl]);

    // Dynamic Filter State
    const [filterOptions, setFilterOptions] = useState({
        sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
        fabrics: [],
        patterns: [],
        fits: []
    });

    const [allProducts, setAllProducts] = useState([...products]);

    // Load admin products and attributes
    useEffect(() => {
        // Load products
        const savedProducts = localStorage.getItem('admin-products');
        if (savedProducts) {
            const parsedProducts = JSON.parse(savedProducts);
            // Merge unique products
            const merged = [...parsedProducts, ...products];
            // Simple deduplication - prioritize admin if duplicate ID (though IDs should ideally be distinct)
            const unique = Array.from(new Map(merged.map(item => [item.id, item])).values());
            setAllProducts(unique);
        }

        // Load attribute sets from admin side
        const savedSets = localStorage.getItem('admin-attribute-sets');
        if (savedSets) {
            const parsedSets = JSON.parse(savedSets);
            const newOptions = { ...filterOptions };

            parsedSets.forEach(set => {
                const name = set.name.toLowerCase();
                if (name.includes('size')) newOptions.sizes = set.attributes;
                if (name.includes('material') || name.includes('fabric')) newOptions.fabrics = set.attributes;
                if (name.includes('pattern')) newOptions.patterns = set.attributes;
                if (name.includes('fit')) newOptions.fits = set.attributes;
            });

            setFilterOptions(newOptions);
        }
    }, []);

    // Mock unique values for filters
    const filterCategories = [
        'Brand', 'Sub Category', 'Product Type', 'Trend', 'Trend Type', 'Size', 'Fit', 'Fabric', 'Pattern', 'Closure Type', 'Neck Type', 'Rise Type', 'Length'
    ];

    const brands = [...new Set(allProducts.map(p => p.brand))].filter(Boolean).sort();
    const subCategories = [...new Set(allProducts.map(p => p.subCategory))].filter(Boolean);
    // Use dynamic sizes
    const sizes = filterOptions.sizes;

    const toggleSection = (section) => {
        setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    // Derived filtered products
    const filteredProducts = React.useMemo(() => {
        let result = [...allProducts];

        // 1. Gender Filter (Manual override)
        if (selectedGender !== 'All') {
            result = result.filter(p => p.division?.toLowerCase() === selectedGender.toLowerCase());
        }

        // 2. URL Params Filter (Only if no manual override)
        if (selectedGender === 'All') {
            if (division) {
                result = result.filter(p => p.division?.toLowerCase() === division.toLowerCase());
            }
            if (category) {
                result = result.filter(p => p.category?.toLowerCase() === category.toLowerCase() || p.division?.toLowerCase() === category.toLowerCase());
            }
        }

        if (subCategoryFromUrl) {
            result = result.filter(p => p.subCategory?.toLowerCase() === subCategoryFromUrl.toLowerCase());
        }

        // 4. Header Search Filter
        if (headerSearchValue) {
            const query = headerSearchValue.toLowerCase();
            result = result.filter(p =>
                (p.name || '').toLowerCase().includes(query) ||
                (p.brand || '').toLowerCase().includes(query) ||
                (p.subCategory || '').toLowerCase().includes(query)
            );
        }

        // 5. Brand Filter
        if (selectedBrands.length > 0) {
            result = result.filter(p => selectedBrands.includes(p.brand));
        }

        // 6. Sorting Logic
        switch (selectedSort) {
            case 'Price: Low to High':
                result.sort((a, b) => a.discountedPrice - b.discountedPrice);
                break;
            case 'Price: High to Low':
                result.sort((a, b) => b.discountedPrice - a.discountedPrice);
                break;
            case 'Discount':
                result.sort((a, b) => {
                    const getDisc = (s) => parseInt(s.split('%')[0]) || 0;
                    return getDisc(b.discount) - getDisc(a.discount);
                });
                break;
            default:
                result.sort((a, b) => b.id - a.id);
                break;
        }

        return result;
    }, [headerSearchValue, selectedGender, selectedSort, selectedBrands, division, category, subCategoryFromUrl, allProducts]);

    const handleSelectBrand = (brand) => {
        setSelectedBrands(prev =>
            prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]
        );
    };

    const clearFilters = () => {
        setSelectedBrands([]);
        setSelectedSizes([]);
        setSelectedGender('All');
        setHeaderSearchValue('');
    };

    const FilterSection = ({ title, id, children }) => (
        <div className="border-b border-white/10 py-4">
            <button
                onClick={() => toggleSection(id)}
                className="w-full flex items-center justify-between text-[14px] font-premium font-black uppercase tracking-[0.2em] text-[#FAFAFA] mb-2 group"
            >
                <div className="flex items-center gap-2 group-hover:text-[#D4AF37] transition-colors">
                    <span className="text-xl font-medium">{openSections[id] ? '-' : '+'}</span>
                    {title}
                </div>
                {selectedBrands.length > 0 && id === 'brand' && (
                    <div className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full shadow-[0_0_8px_#D4AF37]" />
                )}
            </button>
            {openSections[id] && (
                <div className="mt-3 space-y-2.5 animate-fadeIn">
                    {children}
                </div>
            )}
        </div>
    );

    return (
        <div className="bg-[#111111] min-h-screen pb-20 md:pb-0 text-[#FAFAFA] font-sans">
            {/* Universal Header - Mimics Mobile View for consistency */}
            <div className="sticky top-0 bg-[#0a0a0a]/90 backdrop-blur-xl z-[60] border-b border-white/10 shadow-sm">
                <div className="container mx-auto flex items-center gap-4 px-4 py-3">
                    <button className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors shrink-0" onClick={() => window.history.back()}>
                        <ArrowLeft size={22} className="text-[#FAFAFA]" />
                    </button>
                    <div className="flex-1 flex flex-col items-center min-w-0">
                        {isHeaderSearchOpen ? (
                            <input
                                autoFocus
                                type="text"
                                placeholder="Search products..."
                                className="w-full text-center text-[13px] font-premium font-black uppercase tracking-[0.2em] border-none outline-none py-2 bg-white/5 rounded-xl px-4 text-[#FAFAFA] placeholder:text-white/30 focus:ring-1 focus:ring-[#D4AF37]/50"
                                value={headerSearchValue}
                                onChange={(e) => setHeaderSearchValue(e.target.value)}
                            />
                        ) : (
                            <div className="text-center">
                                <h1 className="text-sm md:text-base font-premium font-black truncate leading-tight uppercase tracking-[0.2em] text-[#FAFAFA]">{selectedBrands[0] || subCategoryFromUrl || category}</h1>
                                <p className="text-[10px] md:text-[11px] font-premium font-bold text-[#D4AF37] tracking-[0.1em]">{filteredProducts.length} Items</p>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-3 md:gap-4 shrink-0">
                        <Search
                            size={20}
                            className="text-[#FAFAFA] cursor-pointer hidden md:block hover:text-[#D4AF37] transition-colors"
                            onClick={() => setIsHeaderSearchOpen(!isHeaderSearchOpen)}
                        />
                        <Link to="/wishlist" className="relative transition-colors group">
                            <Heart size={20} className="text-[#FAFAFA] group-hover:text-[#D4AF37] transition-colors" />
                            {wishlistItems.length > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 bg-[#111111] text-[#D4AF37] text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center border border-[#D4AF37]">
                                    {wishlistItems.length}
                                </span>
                            )}
                        </Link>
                        <Link to="/cart" className="relative transition-colors group">
                            <ShoppingCart size={20} className="text-[#FAFAFA] group-hover:text-[#D4AF37] transition-colors" />
                            {getCartCount() > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 bg-[#D4AF37] text-[#111111] text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center border border-[#111111] shadow-[0_0_8px_rgba(212,175,55,0.6)]">
                                    {getCartCount()}
                                </span>
                            )}
                        </Link>
                    </div>
                </div>

                <div className="border-t border-white/5">
                    <div
                        onClick={() => setIsLocationModalOpen(true)}
                        className="container mx-auto flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-white/5 transition-all font-bold"
                    >
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/5">
                                <MapPin size={14} className="text-[#FAFAFA]" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-[11px] font-black leading-tight flex items-center gap-2 text-[#FAFAFA] uppercase tracking-tight">
                                    {activeAddress ? activeAddress.name : 'Select Location'}
                                    {activeAddress?.type && (
                                        <span className="text-[8px] font-black bg-[#D4AF37] text-[#111111] px-1.5 py-0.5 rounded shadow-[0_0_8px_rgba(212,175,55,0.4)] uppercase tracking-tighter">{activeAddress.type}</span>
                                    )}
                                </span>
                                <span className="text-[10px] font-bold truncate max-w-[200px] md:max-w-none text-white/50">
                                    {activeAddress ? `${activeAddress.address}, ${activeAddress.city}` : 'Add an address to see delivery info'}
                                </span>
                            </div>
                        </div>
                        <ChevronDown size={14} className="text-white/50" />
                    </div>
                </div>
            </div>

            <LocationModal
                isOpen={isLocationModalOpen}
                onClose={() => setIsLocationModalOpen(false)}
            />

            <div className="container mx-auto px-4 py-8 pb-32 md:pb-8">
                {/* Desktop Breadcrumbs & Sorting - Refined */}
                <div className="hidden md:block mb-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[11px] font-premium font-black text-white/50 uppercase tracking-[0.2em]">
                            Home <span className="scale-75 text-white/20">›</span> {selectedBrands[0] || division} <span className="scale-75 text-white/20">›</span> {category}
                            <span className="ml-4 text-white/20 font-normal">|</span>
                            <span className="ml-4 text-[#D4AF37] font-black tracking-widest">{filteredProducts.length} ITEMS</span>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="relative group">
                                <div className="flex items-center gap-2 border border-white/20 bg-white/5 px-6 py-2.5 rounded-xl text-[12px] font-premium font-black uppercase tracking-[0.2em] cursor-pointer hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/10 transition-all">
                                    Sort By <ChevronDown size={14} className="text-[#D4AF37]" />
                                </div>
                                <div className="absolute top-full right-0 mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-[0_20px_40px_rgba(0,0,0,0.6)] py-2 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                                    {['Price: Low to High', 'Price: High to Low', 'Discount', 'Popularity', 'New Arrivals'].map(option => (
                                        <button
                                            key={option}
                                            onClick={() => setSelectedSort(option)}
                                            className={`w-full text-left px-6 py-3 text-[11px] font-premium font-black uppercase tracking-[0.15em] hover:bg-white/5 transition-colors ${selectedSort === option ? 'text-[#D4AF37] bg-white/5' : 'text-white/60'}`}
                                        >
                                            {option}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {selectedBrands.length > 0 && (
                        <div className="flex flex-wrap gap-3 mt-4 animate-fadeIn">
                            {selectedBrands.map(brand => (
                                <div key={brand} className="flex items-center gap-3 bg-[#D4AF37]/10 border border-[#D4AF37]/30 pl-4 pr-3 py-2 rounded-lg text-[11px] font-premium font-black uppercase tracking-[0.2em] text-[#D4AF37] shadow-sm">
                                    {brand}
                                    <div
                                        onClick={() => handleSelectBrand(brand)}
                                        className="w-5 h-5 bg-black/50 border border-white/10 rounded-full flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors"
                                    >
                                        <X size={12} className="text-[#FAFAFA]" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex gap-12">
                    {/* Sidebar Filters - Desktop */}
                    <aside className="hidden lg:block w-[260px] shrink-0">
                        <div className="sticky top-24">
                            <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-4">
                                <h2 className="text-lg font-premium font-black flex items-center gap-3 uppercase tracking-[0.2em] text-[#FAFAFA]">
                                    <Filter size={18} className="text-[#D4AF37]" /> FILTERS
                                </h2>
                                <button onClick={clearFilters} className="text-[10px] font-premium font-black text-red-500 hover:text-red-400 uppercase tracking-[0.2em] transition-colors">
                                    Clear All
                                </button>
                            </div>

                            <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-200px)] pr-2 scrollbar-thin">
                                <FilterSection title="Brand" id="brand">
                                    <div className="space-y-4 pt-2">
                                        {brands.map(brand => (
                                            <label key={brand} className="flex items-center gap-3 cursor-pointer group">
                                                <input
                                                    type="checkbox"
                                                    className="hidden"
                                                    checked={selectedBrands.includes(brand)}
                                                    onChange={() => handleSelectBrand(brand)}
                                                />
                                                <div className={`w-4 h-4 border rounded flex items-center justify-center transition-all ${selectedBrands.includes(brand) ? 'bg-[#D4AF37] border-[#D4AF37] shadow-[0_0_8px_rgba(212,175,55,0.4)] scale-110' : 'border-white/30 bg-white/5 group-hover:border-[#D4AF37]/50'
                                                    }`}>
                                                    {selectedBrands.includes(brand) && <Check size={10} className="text-[#111111]" strokeWidth={4} />}
                                                </div>
                                                <span className={`text-[12px] font-premium font-bold tracking-widest uppercase transition-colors ${selectedBrands.includes(brand) ? 'text-[#FAFAFA]' : 'text-white/50 group-hover:text-white/80'
                                                    }`}>{brand}</span>
                                            </label>
                                        ))}
                                    </div>
                                </FilterSection>

                                <FilterSection title="Sub Category" id="subCategory">
                                    <div className="space-y-3 pt-2 flex flex-col items-start gap-1">
                                        {subCategories.map(sub => (
                                            <div key={sub} className="text-[12px] font-premium font-bold tracking-widest uppercase text-white/50 hover:text-[#D4AF37] cursor-pointer transition-colors border-b border-transparent hover:border-[#D4AF37]/30 pb-0.5">{sub}</div>
                                        ))}
                                    </div>
                                </FilterSection>

                                <FilterSection title="Product Type" id="productType" />
                                <FilterSection title="Trend" id="trend" />
                                <FilterSection title="Size" id="size">
                                    <div className="grid grid-cols-3 gap-2">
                                        {sizes.map(size => (
                                            <button key={size} className="border border-white/20 bg-white/5 py-2.5 text-[11px] font-premium font-black rounded-lg hover:border-[#D4AF37] hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] transition-all tracking-[0.1em]">
                                                {size}
                                            </button>
                                        ))}
                                    </div>
                                </FilterSection>
                                <FilterSection title="Fit" id="fit" />
                                <FilterSection title="Fabric" id="fabric" />
                                <FilterSection title="Pattern" id="pattern" />
                                <FilterSection title="Closure Type" id="closureType" />
                                <FilterSection title="Gender" id="gender" />
                            </div>
                        </div>
                    </aside>

                    {/* Main Content Grid */}
                    <div className="flex-1">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
                            {filteredProducts.length > 0 ? filteredProducts.map((product) => (
                                <div key={product.id}>
                                    <ProductCard product={product} />
                                </div>
                            )) : (
                                <div className="col-span-full py-24 text-center">
                                    <div className="w-24 h-24 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <Search size={40} className="text-white/20" />
                                    </div>
                                    <h3 className="text-xl font-premium font-black uppercase tracking-[0.2em] text-[#FAFAFA]">No products match filter</h3>
                                    <button
                                        onClick={clearFilters}
                                        className="mt-8 px-10 py-4 bg-[#D4AF37] text-[#111111] text-[12px] font-premium font-black uppercase tracking-[0.3em] rounded-2xl active:scale-95 transition-all shadow-[0_10px_30px_rgba(212,175,55,0.2)] hover:bg-[#b0902d]"
                                    >
                                        Reset Filters
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Gender Modal - Mobile */}
            {
                isGenderOpen && (
                    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md animate-fadeIn">
                        <div className="absolute bottom-0 left-0 w-full bg-[#111111] rounded-t-[32px] overflow-hidden animate-slideUp border-t border-white/10 shadow-[0_-20px_50px_rgba(0,0,0,0.8)]">
                            <div className="flex items-center justify-between p-6 border-b border-white/10">
                                <h3 className="text-[14px] font-premium font-black uppercase tracking-[0.2em] text-[#FAFAFA]">Select Gender</h3>
                                <button onClick={() => setIsGenderOpen(false)} className="p-2.5 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-colors">
                                    <X size={20} className="text-[#FAFAFA]" />
                                </button>
                            </div>
                            <div className="p-6 space-y-3">
                                {['All', 'Men', 'Women', 'Boys', 'Girls'].map(gender => (
                                    <button
                                        key={gender}
                                        onClick={() => {
                                            setSelectedGender(gender);
                                            setIsGenderOpen(false);
                                        }}
                                        className={`w-full flex items-center justify-between p-5 rounded-[20px] text-[12px] font-premium font-black uppercase tracking-[0.2em] transition-all border ${selectedGender === gender ? 'bg-[#D4AF37] border-[#D4AF37] text-[#111111]' : 'border-white/10 bg-white/5 text-white/50 hover:text-[#FAFAFA]'}`}
                                    >
                                        {gender}
                                        {selectedGender === gender && <Check size={18} />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Sort Modal - Mobile */}
            {
                isSortOpen && (
                    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md animate-fadeIn">
                        <div className="absolute bottom-0 left-0 w-full bg-[#111111] rounded-t-[32px] overflow-hidden animate-slideUp border-t border-white/10 shadow-[0_-20px_50px_rgba(0,0,0,0.8)]">
                            <div className="flex items-center justify-between p-6 border-b border-white/10">
                                <h3 className="text-[14px] font-premium font-black uppercase tracking-[0.2em] text-[#FAFAFA]">Sort By</h3>
                                <button onClick={() => setIsSortOpen(false)} className="p-2.5 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-colors">
                                    <X size={20} className="text-[#FAFAFA]" />
                                </button>
                            </div>
                            <div className="p-6 space-y-3">
                                {['Price: Low to High', 'Price: High to Low', 'Discount', 'Popularity', 'New Arrivals'].map(option => (
                                    <button
                                        key={option}
                                        onClick={() => {
                                            setSelectedSort(option);
                                            setIsSortOpen(false);
                                        }}
                                        className={`w-full flex items-center justify-between p-5 rounded-[20px] text-[12px] font-premium font-black uppercase tracking-[0.2em] transition-all border ${selectedSort === option ? 'bg-[#D4AF37] border-[#D4AF37] text-[#111111]' : 'border-white/10 bg-white/5 text-white/50 hover:text-[#FAFAFA]'}`}
                                    >
                                        {option}
                                        {selectedSort === option && <Check size={18} />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Filter Modal - Mobile */}
            {
                isFilterOpen && (
                    <div className="fixed inset-0 z-[100] bg-[#111111] animate-slideUp flex flex-col pt-safe">
                        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 shrink-0 bg-[#111111]">
                            <h3 className="text-[14px] font-premium font-black uppercase tracking-[0.2em] text-[#FAFAFA] flex items-center gap-3">
                                <Filter size={18} className="text-[#D4AF37]" /> Filters
                            </h3>
                            <button onClick={() => setIsFilterOpen(false)} className="p-2.5 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-colors">
                                <X size={20} className="text-[#FAFAFA]" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 py-4 pb-32">
                            <div className="space-y-4">
                                <FilterSection title="Brand" id="brand">
                                    <div className="space-y-4 pt-2">
                                        {brands.map(brand => (
                                            <label key={brand} className="flex items-center gap-4 cursor-pointer group">
                                                <input
                                                    type="checkbox"
                                                    className="hidden"
                                                    checked={selectedBrands.includes(brand)}
                                                    onChange={() => handleSelectBrand(brand)}
                                                />
                                                <div className={`w-5 h-5 border rounded flex items-center justify-center transition-all ${selectedBrands.includes(brand) ? 'bg-[#D4AF37] border-[#D4AF37] shadow-[0_0_8px_rgba(212,175,55,0.4)] scale-110' : 'border-white/30 bg-white/5 group-hover:border-[#D4AF37]/50'
                                                    }`}>
                                                    {selectedBrands.includes(brand) && <Check size={12} className="text-[#111111]" strokeWidth={4} />}
                                                </div>
                                                <span className={`text-[13px] font-premium font-bold tracking-widest uppercase transition-colors ${selectedBrands.includes(brand) ? 'text-[#FAFAFA]' : 'text-white/50 group-hover:text-white/80'
                                                    }`}>{brand}</span>
                                            </label>
                                        ))}
                                    </div>
                                </FilterSection>

                                <FilterSection title="Sub Category" id="subCategory">
                                    <div className="space-y-3 pt-2 flex flex-col items-start gap-1">
                                        {subCategories.map(sub => (
                                            <div key={sub} className="text-[13px] font-premium font-bold tracking-widest uppercase text-white/50 hover:text-[#D4AF37] cursor-pointer transition-colors border-b border-transparent hover:border-[#D4AF37]/30 pb-0.5">{sub}</div>
                                        ))}
                                    </div>
                                </FilterSection>

                                <FilterSection title="Size" id="size">
                                    <div className="grid grid-cols-4 gap-3">
                                        {sizes.map(size => (
                                            <button key={size} className="border border-white/20 bg-white/5 py-4 text-[12px] font-premium font-black rounded-xl hover:border-[#D4AF37] hover:bg-[#D4AF37]/10 text-white/80 hover:text-[#D4AF37] transition-all tracking-[0.1em]">
                                                {size}
                                            </button>
                                        ))}
                                    </div>
                                </FilterSection>

                                {/* Other sections as placeholders or implemented similarly */}
                                <FilterSection title="Product Type" id="productType" />
                                <FilterSection title="Trend" id="trend" />
                                <FilterSection title="Fit" id="fit" />
                                <FilterSection title="Fabric" id="fabric" />
                                <FilterSection title="Pattern" id="pattern" />
                            </div>
                        </div>

                        <div className="border-t border-white/10 p-5 pl-safe pr-safe pb-safe flex gap-4 bg-[#111111]/95 backdrop-blur-xl fixed bottom-0 left-0 w-full shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-10">
                            <button
                                onClick={clearFilters}
                                className="flex-1 py-4 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors rounded-[20px] text-[11px] font-premium font-black uppercase tracking-[0.2em] text-[#FAFAFA]"
                            >
                                Reset
                            </button>
                            <button
                                onClick={() => setIsFilterOpen(false)}
                                className="flex-[2] py-4 bg-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.2)] text-[#111111] rounded-[20px] text-[11px] font-premium font-black uppercase tracking-[0.2em] hover:bg-[#b0902d] transition-colors"
                            >
                                Apply Filters
                            </button>
                        </div>
                    </div>
                )
            }
            <div className="md:hidden fixed bottom-0 left-0 w-full bg-[#111111]/90 backdrop-blur-2xl border-t border-white/10 z-[50] flex h-16 shadow-[0_-8px_30px_rgba(0,0,0,0.5)]">
                <button
                    onClick={() => setIsGenderOpen(true)}
                    className="flex-1 flex items-center justify-center gap-2 text-[10px] font-premium font-black uppercase tracking-[0.2em] text-[#FAFAFA] border-r border-white/5 hover:bg-white/5 transition-colors"
                >
                    Gender
                </button>
                <button
                    onClick={() => setIsSortOpen(true)}
                    className="flex-1 flex items-center justify-center gap-2 text-[10px] font-premium font-black uppercase tracking-[0.2em] text-[#FAFAFA] border-r border-white/5 hover:bg-white/5 transition-colors"
                >
                    Sort
                </button>
                <button
                    onClick={() => setIsFilterOpen(true)}
                    className="flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-premium font-black uppercase tracking-[0.2em] text-[#D4AF37] hover:bg-[#D4AF37]/5 transition-colors"
                >
                    <Filter size={16} className="text-[#D4AF37]" /> Filter
                </button>
            </div>

            <LoginModal
                isOpen={isLoginModalOpen}
                onClose={() => setIsLoginModalOpen(false)}
            />
        </div>
    );
};

export default ProductsPage;

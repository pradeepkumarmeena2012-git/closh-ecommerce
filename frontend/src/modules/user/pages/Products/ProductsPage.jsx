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
        <div className="border-b border-gray-100 py-4">
            <button
                onClick={() => toggleSection(id)}
                className="w-full flex items-center justify-between text-[14px] font-black uppercase tracking-wider text-gray-900 mb-2"
            >
                <div className="flex items-center gap-2">
                    <span className="text-xl font-medium">{openSections[id] ? '-' : '+'}</span>
                    {title}
                </div>
                {selectedBrands.length > 0 && id === 'brand' && (
                    <div className="w-1.5 h-1.5 bg-black rounded-full" />
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
        <div className="bg-white min-h-screen pb-20 md:pb-0">
            {/* Universal Header - Mimics Mobile View for consistency */}
            <div className="sticky top-0 bg-white z-[60] border-b border-gray-100 shadow-sm">
                <div className="container mx-auto flex items-center gap-4 px-4 py-3">
                    <button className="p-2 -ml-2 rounded-full hover:bg-gray-50 transition-colors shrink-0" onClick={() => window.history.back()}>
                        <ArrowLeft size={22} className="text-black" />
                    </button>
                    <div className="flex-1 flex flex-col items-center min-w-0">
                        {isHeaderSearchOpen ? (
                            <input
                                autoFocus
                                type="text"
                                placeholder="Search products..."
                                className="w-full text-center text-sm font-bold border-none outline-none py-1 bg-gray-50 rounded-lg px-4"
                                value={headerSearchValue}
                                onChange={(e) => setHeaderSearchValue(e.target.value)}
                            />
                        ) : (
                            <div className="text-center">
                                <h1 className="text-sm md:text-base font-black truncate leading-tight uppercase tracking-tight">{selectedBrands[0] || subCategoryFromUrl || category}</h1>
                                <p className="text-[10px] md:text-[11px] font-bold text-gray-400">{filteredProducts.length} Items</p>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-3 md:gap-4 shrink-0">
                        <Search
                            size={20}
                            className="text-gray-600 cursor-pointer hidden md:block"
                            onClick={() => setIsHeaderSearchOpen(!isHeaderSearchOpen)}
                        />
                        <Link to="/wishlist" className="relative transition-colors">
                            <Heart size={20} className="text-gray-700" />
                            {wishlistItems.length > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white">
                                    {wishlistItems.length}
                                </span>
                            )}
                        </Link>
                        <Link to="/cart" className="relative transition-colors">
                            <ShoppingCart size={20} className="text-gray-700" />
                            {getCartCount() > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 bg-[#39ff14] text-black text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white">
                                    {getCartCount()}
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

            <div className="container mx-auto px-4 py-8 pb-32 md:pb-8">
                {/* Desktop Breadcrumbs & Sorting - Refined */}
                <div className="hidden md:block mb-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                            Home <span className="scale-75 text-gray-300">›</span> {selectedBrands[0] || division} <span className="scale-75 text-gray-300">›</span> {category}
                            <span className="ml-4 text-gray-300 font-normal">|</span>
                            <span className="ml-4 text-gray-400 font-black tracking-normal italic">{filteredProducts.length} items found</span>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="relative group">
                                <div className="flex items-center gap-2 border border-gray-200 px-5 py-2.5 rounded-xl text-[13px] font-black uppercase tracking-widest cursor-pointer hover:border-black transition-all">
                                    Sort By <ChevronDown size={14} />
                                </div>
                                <div className="absolute top-full right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-2xl py-2 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                                    {['Price: Low to High', 'Price: High to Low', 'Discount', 'Popularity', 'New Arrivals'].map(option => (
                                        <button
                                            key={option}
                                            onClick={() => setSelectedSort(option)}
                                            className={`w-full text-left px-6 py-3 text-[12px] font-bold hover:bg-gray-50 transition-colors ${selectedSort === option ? 'text-black bg-gray-50' : 'text-gray-500'}`}
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
                                <div key={brand} className="flex items-center gap-3 bg-white border border-gray-200 pl-4 pr-3 py-2 rounded-lg text-[13px] font-black uppercase tracking-tight shadow-sm">
                                    {brand}
                                    <div
                                        onClick={() => handleSelectBrand(brand)}
                                        className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors"
                                    >
                                        <X size={12} className="text-gray-500" />
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
                            <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-4">
                                <h2 className="text-lg font-black flex items-center gap-3">
                                    <Filter size={18} /> FILTERS
                                </h2>
                                <button onClick={clearFilters} className="text-[12px] font-black text-red-600 uppercase tracking-tighter hover:underline">
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
                                                <div className={`w-4 h-4 border-2 rounded flex items-center justify-center transition-all ${selectedBrands.includes(brand) ? 'bg-black border-black shadow-lg scale-110' : 'border-gray-300 group-hover:border-black'
                                                    }`}>
                                                    {selectedBrands.includes(brand) && <Check size={10} className="text-white" strokeWidth={4} />}
                                                </div>
                                                <span className={`text-[13px] font-bold transition-colors ${selectedBrands.includes(brand) ? 'text-black' : 'text-gray-500 group-hover:text-black'
                                                    }`}>{brand}</span>
                                            </label>
                                        ))}
                                    </div>
                                </FilterSection>

                                <FilterSection title="Sub Category" id="subCategory">
                                    <div className="space-y-3 pt-2">
                                        {subCategories.map(sub => (
                                            <div key={sub} className="text-[13px] font-bold text-gray-500 hover:text-black cursor-pointer">{sub}</div>
                                        ))}
                                    </div>
                                </FilterSection>

                                <FilterSection title="Product Type" id="productType" />
                                <FilterSection title="Trend" id="trend" />
                                <FilterSection title="Size" id="size">
                                    <div className="grid grid-cols-3 gap-2">
                                        {sizes.map(size => (
                                            <button key={size} className="border border-gray-200 py-2 text-[12px] font-black rounded-lg hover:border-black hover:bg-black hover:text-white transition-all">
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
                                <div
                                    key={product.id}
                                    className="group cursor-pointer flex flex-col"
                                    onClick={() => navigate(`/product/${product.id}`)}
                                >
                                    <div className="relative aspect-[3/4] rounded-[24px] md:rounded-[32px] overflow-hidden mb-4 bg-gray-50 shadow-sm border border-gray-100 group-hover:shadow-xl transition-all duration-500 group-hover:-translate-y-1">
                                        <img src={product.image} alt={product.name} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />

                                        {/* Click Collect Connect Banner */}
                                        {product.tryAndBuy && (
                                            <div className="absolute bottom-0 left-0 w-full">
                                                <div className="bg-black/80 backdrop-blur-sm text-white text-[10px] font-black px-4 py-2 flex items-center justify-center uppercase tracking-[0.15em]">
                                                    Click Connect Collect
                                                </div>
                                            </div>
                                        )}

                                        {/* Icons */}
                                        <div className="absolute top-3 left-3 flex px-2 py-2 gap-2 z-10">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (!user) {
                                                        setIsLoginModalOpen(true);
                                                        return;
                                                    }
                                                    addToCart({ ...product, selectedSize: product.size ? product.size[0] : 'M' });
                                                }}
                                                className="w-10 h-10 bg-[#ffcc00] text-black rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all"
                                            >
                                                <ShoppingCart size={18} strokeWidth={3} />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleWishlist(product);
                                                }}
                                                className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-90 ${isInWishlist(product.id) ? 'bg-red-500 text-white' : 'bg-white text-black'}`}
                                            >
                                                <Heart size={18} className={isInWishlist(product.id) ? 'fill-white' : ''} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="px-1">
                                        <div className="text-[12px] font-black text-gray-400 uppercase tracking-tight mb-0.5">{product.brand}</div>
                                        <h3 className="text-[14px] font-bold text-gray-800 leading-tight line-clamp-1 mb-2 group-hover:text-black transition-colors">{product.name}</h3>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[15px] font-black text-black">
                                                ₹{product.discountedPrice !== undefined ? product.discountedPrice : product.price}
                                            </span>
                                            {(product.originalPrice || product.price) && product.originalPrice && (
                                                <span className="text-[12px] font-bold text-gray-400 line-through">₹{product.originalPrice}</span>
                                            )}
                                            {(product.discount || (product.originalPrice && (product.discountedPrice || product.price) && product.originalPrice > (product.discountedPrice || product.price))) && (
                                                <span className="text-[11px] font-black text-[#00a278] bg-[#00a278]/5 px-2 py-0.5 rounded-full">
                                                    {product.discount || `${Math.round(((product.originalPrice - (product.discountedPrice || product.price)) / product.originalPrice) * 100)}% OFF`}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="col-span-full py-24 text-center">
                                    <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <Search size={40} className="text-gray-200" />
                                    </div>
                                    <h3 className="text-xl font-black uppercase tracking-tight">No products match your filters</h3>
                                    <button
                                        onClick={clearFilters}
                                        className="mt-8 px-10 py-4 bg-black text-white text-[12px] font-black uppercase tracking-widest rounded-2xl active:scale-95 transition-all shadow-xl"
                                    >
                                        Reset All Filters
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
                    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm animate-fadeIn">
                        <div className="absolute bottom-0 left-0 w-full bg-white rounded-t-[24px] overflow-hidden animate-slideUp">
                            <div className="flex items-center justify-between p-5 border-b border-gray-100">
                                <h3 className="text-lg font-black uppercase tracking-tight">Select Gender</h3>
                                <button onClick={() => setIsGenderOpen(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-5 space-y-2">
                                {['All', 'Men', 'Women', 'Boys', 'Girls'].map(gender => (
                                    <button
                                        key={gender}
                                        onClick={() => {
                                            setSelectedGender(gender);
                                            setIsGenderOpen(false);
                                        }}
                                        className={`w-full flex items-center justify-between p-4 rounded-xl font-bold uppercase tracking-wider transition-colors ${selectedGender === gender ? 'bg-black text-white' : 'bg-gray-50 text-gray-600'}`}
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
                    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm animate-fadeIn">
                        <div className="absolute bottom-0 left-0 w-full bg-white rounded-t-[24px] overflow-hidden animate-slideUp">
                            <div className="flex items-center justify-between p-5 border-b border-gray-100">
                                <h3 className="text-lg font-black uppercase tracking-tight">Sort By</h3>
                                <button onClick={() => setIsSortOpen(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-5 space-y-2">
                                {['Price: Low to High', 'Price: High to Low', 'Discount', 'Popularity', 'New Arrivals'].map(option => (
                                    <button
                                        key={option}
                                        onClick={() => {
                                            setSelectedSort(option);
                                            setIsSortOpen(false);
                                        }}
                                        className={`w-full text-left p-4 rounded-xl font-bold transition-colors ${selectedSort === option ? 'bg-black text-white' : 'bg-gray-50 text-gray-600'}`}
                                    >
                                        {option}
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
                    <div className="fixed inset-0 z-[100] bg-white animate-slideUp flex flex-col">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                            <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                                <Filter size={20} /> Filters
                            </h3>
                            <button onClick={() => setIsFilterOpen(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 pb-24">
                            <div className="space-y-2">
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
                                                <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-all ${selectedBrands.includes(brand) ? 'bg-black border-black' : 'border-gray-300'
                                                    }`}>
                                                    {selectedBrands.includes(brand) && <Check size={12} className="text-white" strokeWidth={4} />}
                                                </div>
                                                <span className={`text-[14px] font-bold transition-colors ${selectedBrands.includes(brand) ? 'text-black' : 'text-gray-500'
                                                    }`}>{brand}</span>
                                            </label>
                                        ))}
                                    </div>
                                </FilterSection>

                                <FilterSection title="Sub Category" id="subCategory">
                                    <div className="space-y-3 pt-2">
                                        {subCategories.map(sub => (
                                            <div key={sub} className="text-[14px] font-bold text-gray-500 hover:text-black cursor-pointer">{sub}</div>
                                        ))}
                                    </div>
                                </FilterSection>

                                <FilterSection title="Size" id="size">
                                    <div className="grid grid-cols-4 gap-2">
                                        {sizes.map(size => (
                                            <button key={size} className="border border-gray-200 py-2.5 text-[12px] font-black rounded-lg hover:border-black hover:bg-black hover:text-white transition-all">
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

                        <div className="border-t border-gray-100 p-4 flex gap-4 bg-white sticky bottom-0">
                            <button
                                onClick={clearFilters}
                                className="flex-1 py-3.5 border border-gray-200 rounded-xl text-[12px] font-black uppercase tracking-wider text-gray-600"
                            >
                                Reset
                            </button>
                            <button
                                onClick={() => setIsFilterOpen(false)}
                                className="flex-1 py-3.5 bg-black text-white rounded-xl text-[12px] font-black uppercase tracking-wider"
                            >
                                Apply filters
                            </button>
                        </div>
                    </div>
                )
            }
            <div className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 z-[90] flex h-16 shadow-[0_-8px_30px_rgba(0,0,0,0.08)]">
                <button
                    onClick={() => setIsGenderOpen(true)}
                    className="flex-1 flex items-center justify-center gap-2 text-[13px] font-black uppercase tracking-wider border-r border-gray-100"
                >
                    Gender
                </button>
                <button
                    onClick={() => setIsSortOpen(true)}
                    className="flex-1 flex items-center justify-center gap-2 text-[13px] font-black uppercase tracking-wider border-r border-gray-100"
                >
                    Sort
                </button>
                <button
                    onClick={() => setIsFilterOpen(true)}
                    className="flex-1 flex items-center justify-center gap-2 text-[13px] font-black uppercase tracking-wider"
                >
                    Filter
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

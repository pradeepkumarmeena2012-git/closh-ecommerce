import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCartStore } from '../../../shared/store/useStore';
import { useWishlistStore } from '../../../shared/store/wishlistStore';
import { useAuthStore } from '../../../shared/store/authStore';
import api from '../../../shared/utils/api';
import {
    Filter, X, ChevronDown, Star, Search, ArrowLeft, Heart, ShoppingCart, Check, SlidersHorizontal
} from 'lucide-react';

const ProductsPage = () => {
    const { addItem: addToCart } = useCartStore();
    const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlistStore();
    const { isAuthenticated } = useAuthStore();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);

    // Filters
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isSortOpen, setIsSortOpen] = useState(false);
    const [selectedSort, setSelectedSort] = useState('newest');
    const [searchValue, setSearchValue] = useState(searchParams.get('search') || searchParams.get('q') || '');
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
    const [selectedBrand, setSelectedBrand] = useState(searchParams.get('brand') || '');

    // Fetch categories & brands
    useEffect(() => {
        api.get('/categories/all').then(res => {
            const list = res?.data || res || [];
            setCategories(Array.isArray(list) ? list : []);
        }).catch(() => {});
        api.get('/brands/all').then(res => {
            const list = res?.data || res || [];
            setBrands(Array.isArray(list) ? list : []);
        }).catch(() => {});
    }, []);

    // Fetch products
    useEffect(() => {
        const fetchProducts = async () => {
            setIsLoading(true);
            try {
                const params = { page, limit: 20, sort: selectedSort };
                if (searchValue) params.search = searchValue;
                if (selectedCategory) params.category = selectedCategory;
                if (selectedBrand) params.brand = selectedBrand;

                const res = await api.get('/products', { params });
                const data = res?.data || res || {};
                setProducts(data.products || []);
                setTotal(data.total || 0);
                setPages(data.pages || 1);
            } catch {
                setProducts([]);
            } finally {
                setIsLoading(false);
            }
        };
        fetchProducts();
    }, [page, selectedSort, searchValue, selectedCategory, selectedBrand]);

    const sortOptions = [
        { value: 'newest', label: 'Newest First' },
        { value: 'price-asc', label: 'Price: Low to High' },
        { value: 'price-desc', label: 'Price: High to Low' },
        { value: 'popular', label: 'Popularity' },
        { value: 'rating', label: 'Top Rated' },
    ];

    const handleToggleWishlist = (product) => {
        const id = product._id || product.id;
        if (isInWishlist(id)) {
            removeFromWishlist(id);
        } else {
            addToWishlist({ ...product, id });
        }
    };

    const handleAddToCart = (product) => {
        addToCart({
            id: product._id || product.id,
            name: product.name,
            price: product.price,
            originalPrice: product.originalPrice || product.price,
            image: Array.isArray(product.images) ? product.images[0] : product.image,
            images: product.images,
            vendorId: product.vendorId?._id || product.vendorId,
            vendorName: product.vendorId?.storeName || 'Store',
            stockQuantity: product.stockQuantity,
            quantity: 1,
        });
    };

    const clearFilters = () => {
        setSelectedCategory('');
        setSelectedBrand('');
        setSearchValue('');
        setSelectedSort('newest');
        setPage(1);
    };

    return (
        <div className="bg-white min-h-screen pb-20">
            {/* Header */}
            <div className="sticky top-0 bg-white z-[60] border-b border-gray-100 shadow-sm">
                <div className="container mx-auto flex items-center gap-4 px-4 py-3">
                    <button className="p-2 -ml-2 rounded-full hover:bg-gray-50 transition-colors shrink-0" onClick={() => navigate(-1)}>
                        <ArrowLeft size={22} className="text-black" />
                    </button>
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            placeholder="Search products..."
                            className="w-full text-sm font-bold border border-gray-200 outline-none py-2.5 bg-gray-50 rounded-xl px-4 pr-10 focus:border-black focus:bg-white transition-all"
                            value={searchValue}
                            onChange={(e) => { setSearchValue(e.target.value); setPage(1); }}
                        />
                        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-6">
                {/* Result count & Active filters */}
                <div className="flex items-center justify-between mb-6">
                    <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">
                        {total} Products Found
                    </p>
                    {(selectedCategory || selectedBrand) && (
                        <button onClick={clearFilters} className="text-[11px] font-black text-red-500 uppercase tracking-wider">
                            Clear Filters
                        </button>
                    )}
                </div>

                <div className="flex gap-8">
                    {/* Desktop Sidebar Filters */}
                    <aside className="hidden lg:block w-[240px] shrink-0">
                        <div className="sticky top-20 space-y-6">
                            <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                                <Filter size={16} /> Filters
                            </h3>

                            {/* Categories */}
                            <div>
                                <h4 className="text-[12px] font-black uppercase tracking-widest text-gray-500 mb-3">Category</h4>
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    <button
                                        onClick={() => { setSelectedCategory(''); setPage(1); }}
                                        className={`block w-full text-left text-[13px] px-3 py-2 rounded-lg font-bold transition-colors ${!selectedCategory ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                                    >
                                        All Categories
                                    </button>
                                    {categories.map(cat => (
                                        <button
                                            key={cat._id}
                                            onClick={() => { setSelectedCategory(cat._id); setPage(1); }}
                                            className={`block w-full text-left text-[13px] px-3 py-2 rounded-lg font-bold transition-colors ${selectedCategory === cat._id ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                                        >
                                            {cat.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Brands */}
                            <div>
                                <h4 className="text-[12px] font-black uppercase tracking-widest text-gray-500 mb-3">Brand</h4>
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    <button
                                        onClick={() => { setSelectedBrand(''); setPage(1); }}
                                        className={`block w-full text-left text-[13px] px-3 py-2 rounded-lg font-bold transition-colors ${!selectedBrand ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                                    >
                                        All Brands
                                    </button>
                                    {brands.map(brand => (
                                        <button
                                            key={brand._id}
                                            onClick={() => { setSelectedBrand(brand._id); setPage(1); }}
                                            className={`block w-full text-left text-[13px] px-3 py-2 rounded-lg font-bold transition-colors ${selectedBrand === brand._id ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                                        >
                                            {brand.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Sort */}
                            <div>
                                <h4 className="text-[12px] font-black uppercase tracking-widest text-gray-500 mb-3">Sort By</h4>
                                <div className="space-y-1">
                                    {sortOptions.map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => { setSelectedSort(opt.value); setPage(1); }}
                                            className={`block w-full text-left text-[13px] px-3 py-2 rounded-lg font-bold transition-colors ${selectedSort === opt.value ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* Product Grid */}
                    <div className="flex-1">
                        {isLoading ? (
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-8">
                                {Array.from({ length: 8 }).map((_, i) => (
                                    <div key={i} className="animate-pulse">
                                        <div className="aspect-[3/4] bg-gray-100 rounded-2xl mb-3" />
                                        <div className="h-3 bg-gray-100 rounded w-2/3 mb-2" />
                                        <div className="h-4 bg-gray-100 rounded w-1/2" />
                                    </div>
                                ))}
                            </div>
                        ) : products.length > 0 ? (
                            <>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-8">
                                    {products.map((product) => {
                                        const id = product._id || product.id;
                                        const imageUrl = Array.isArray(product.images) ? product.images[0] : (product.image || '');
                                        const sellingPrice = product.price || 0;
                                        const originalPrice = product.originalPrice || product.price || 0;
                                        const hasDiscount = originalPrice > sellingPrice;
                                        const discountPercent = hasDiscount ? Math.round(((originalPrice - sellingPrice) / originalPrice) * 100) : 0;

                                        return (
                                            <div
                                                key={id}
                                                className="group cursor-pointer flex flex-col"
                                                onClick={() => navigate(`/product/${id}`)}
                                            >
                                                <div className="relative aspect-[3/4] rounded-2xl overflow-hidden mb-3 bg-gray-50 border border-gray-100 group-hover:shadow-lg transition-all duration-300">
                                                    <img
                                                        src={imageUrl}
                                                        alt={product.name}
                                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                        onError={(e) => { e.target.src = 'https://placehold.co/300x400/f3f4f6/9ca3af?text=No+Image'; }}
                                                    />

                                                    {/* Quick actions */}
                                                    <div className="absolute top-2 left-2 flex gap-2 z-10">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleAddToCart(product); }}
                                                            className="w-9 h-9 bg-black/80 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all hover:bg-black"
                                                        >
                                                            <ShoppingCart size={15} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleToggleWishlist(product); }}
                                                            className={`w-9 h-9 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-90 ${isInWishlist(id) ? 'bg-red-500 text-white' : 'bg-white text-black'}`}
                                                        >
                                                            <Heart size={15} className={isInWishlist(id) ? 'fill-white' : ''} />
                                                        </button>
                                                    </div>

                                                    {hasDiscount && (
                                                        <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] font-black px-2 py-1 rounded-lg">
                                                            {discountPercent}% OFF
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="px-1">
                                                    {product.vendorId?.storeName && (
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-tight mb-0.5">{product.vendorId.storeName}</p>
                                                    )}
                                                    <h3 className="text-[13px] font-bold text-gray-800 leading-tight line-clamp-1 mb-1">{product.name}</h3>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[14px] font-black text-black">₹{sellingPrice}</span>
                                                        {hasDiscount && (
                                                            <span className="text-[11px] font-bold text-gray-400 line-through">₹{originalPrice}</span>
                                                        )}
                                                    </div>
                                                    {product.rating > 0 && (
                                                        <div className="flex items-center gap-1 mt-1">
                                                            <Star size={12} className="fill-amber-400 text-amber-400" />
                                                            <span className="text-[11px] font-bold text-gray-500">{product.rating.toFixed(1)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Pagination */}
                                {pages > 1 && (
                                    <div className="flex items-center justify-center gap-2 mt-10">
                                        {Array.from({ length: pages }, (_, i) => i + 1).slice(0, 10).map(p => (
                                            <button
                                                key={p}
                                                onClick={() => setPage(p)}
                                                className={`w-10 h-10 rounded-xl text-[13px] font-black transition-all ${page === p ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="py-24 text-center">
                                <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Search size={40} className="text-gray-200" />
                                </div>
                                <h3 className="text-xl font-black uppercase tracking-tight mb-2">No Products Found</h3>
                                <p className="text-gray-400 text-sm mb-6">Try adjusting your filters or search query</p>
                                <button
                                    onClick={clearFilters}
                                    className="px-8 py-3 bg-black text-white text-[12px] font-black uppercase tracking-widest rounded-2xl active:scale-95 transition-all shadow-xl"
                                >
                                    Reset Filters
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Bottom Filter/Sort Bar */}
            <div className="lg:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 z-[90] flex h-14 shadow-[0_-8px_30px_rgba(0,0,0,0.08)]">
                <button
                    onClick={() => setIsSortOpen(true)}
                    className="flex-1 flex items-center justify-center gap-2 text-[12px] font-black uppercase tracking-wider border-r border-gray-100"
                >
                    <SlidersHorizontal size={14} /> Sort
                </button>
                <button
                    onClick={() => setIsFilterOpen(true)}
                    className="flex-1 flex items-center justify-center gap-2 text-[12px] font-black uppercase tracking-wider"
                >
                    <Filter size={14} /> Filter
                </button>
            </div>

            {/* Mobile Sort Modal */}
            {isSortOpen && (
                <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm animate-fadeIn" onClick={() => setIsSortOpen(false)}>
                    <div className="absolute bottom-0 left-0 w-full bg-white rounded-t-[24px] overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                            <h3 className="text-lg font-black uppercase tracking-tight">Sort By</h3>
                            <button onClick={() => setIsSortOpen(false)} className="p-2 bg-gray-100 rounded-full"><X size={20} /></button>
                        </div>
                        <div className="p-5 space-y-2 pb-8">
                            {sortOptions.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => { setSelectedSort(opt.value); setPage(1); setIsSortOpen(false); }}
                                    className={`w-full text-left p-4 rounded-xl font-bold transition-colors ${selectedSort === opt.value ? 'bg-black text-white' : 'bg-gray-50 text-gray-600'}`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile Filter Modal */}
            {isFilterOpen && (
                <div className="fixed inset-0 z-[100] bg-white flex flex-col">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                        <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                            <Filter size={20} /> Filters
                        </h3>
                        <button onClick={() => setIsFilterOpen(false)} className="p-2 bg-gray-100 rounded-full"><X size={20} /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 pb-24 space-y-6">
                        <div>
                            <h4 className="text-[12px] font-black uppercase tracking-widest text-gray-500 mb-3">Category</h4>
                            <div className="space-y-2">
                                <button onClick={() => setSelectedCategory('')} className={`w-full text-left p-3 rounded-xl font-bold text-[13px] ${!selectedCategory ? 'bg-black text-white' : 'bg-gray-50 text-gray-600'}`}>All</button>
                                {categories.map(cat => (
                                    <button key={cat._id} onClick={() => setSelectedCategory(cat._id)} className={`w-full text-left p-3 rounded-xl font-bold text-[13px] ${selectedCategory === cat._id ? 'bg-black text-white' : 'bg-gray-50 text-gray-600'}`}>{cat.name}</button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h4 className="text-[12px] font-black uppercase tracking-widest text-gray-500 mb-3">Brand</h4>
                            <div className="space-y-2">
                                <button onClick={() => setSelectedBrand('')} className={`w-full text-left p-3 rounded-xl font-bold text-[13px] ${!selectedBrand ? 'bg-black text-white' : 'bg-gray-50 text-gray-600'}`}>All</button>
                                {brands.map(brand => (
                                    <button key={brand._id} onClick={() => setSelectedBrand(brand._id)} className={`w-full text-left p-3 rounded-xl font-bold text-[13px] ${selectedBrand === brand._id ? 'bg-black text-white' : 'bg-gray-50 text-gray-600'}`}>{brand.name}</button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-100 p-4 flex gap-4 bg-white sticky bottom-0">
                        <button onClick={clearFilters} className="flex-1 py-3.5 border border-gray-200 rounded-xl text-[12px] font-black uppercase tracking-wider text-gray-600">Reset</button>
                        <button onClick={() => { setPage(1); setIsFilterOpen(false); }} className="flex-1 py-3.5 bg-black text-white rounded-xl text-[12px] font-black uppercase tracking-wider">Apply</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductsPage;

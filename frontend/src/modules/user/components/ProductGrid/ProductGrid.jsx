import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowRight } from 'react-icons/fi';
import ProductCard from '../ProductCard/ProductCard';
import { useProductStore } from '../../../../shared/store/productStore';
import { useCategory } from '../../context/CategoryContext';

const ProductGrid = () => {
    const navigate = useNavigate();
    const { products, isLoading, fetchPublicProducts } = useProductStore();
    const { activeCategory, getCategoryColor } = useCategory();

    useEffect(() => {
        if (activeCategory === 'All') {
            fetchPublicProducts({ limit: 100, sort: 'newest' });
        } else if (activeCategory === 'For You') {
            fetchPublicProducts({ limit: 12, sort: 'newest' });
        } else {
            fetchPublicProducts({ category: activeCategory, limit: 24 });
        }
    }, [activeCategory, fetchPublicProducts]);

    const displayProducts = products.length > 0 ? products : [];

    const dynamicTitle = activeCategory === 'For You' ? 'New Drops' : activeCategory === 'All' ? 'All Products' : `${activeCategory} Collection`;
    const themeColor = getCategoryColor(activeCategory) || '#111111';

    const getGridBadgeTheme = (categoryName) => {
        const name = categoryName?.toLowerCase() || '';
        // Returning dark premium badges with category-color tinted text, borders, and glows
        if (name === 'hello' || name === 'women') return 'bg-white text-[#FF4081] border border-[#FF4081]/30 shadow-[0_0_15px_rgba(255,64,129,0.15)]';
        if (name === 'men\'s fashion' || name === 'mens' || name === 'men') return 'bg-white text-[#29B6F6] border border-[#29B6F6]/30 shadow-[0_0_15px_rgba(41,182,246,0.15)]';
        if (name === 'bottom wear') return 'bg-white text-[#8BC34A] border border-[#8BC34A]/30 shadow-[0_0_15px_rgba(139,195,74,0.15)]';
        if (name === 'beauty') return 'bg-white text-[#F06292] border border-[#F06292]/30 shadow-[0_0_15px_rgba(240,98,146,0.15)]';
        if (name === 'accessories') return 'bg-white text-[#FFCA28] border border-[#FFCA28]/30 shadow-[0_0_15px_rgba(255,202,40,0.15)]';
        return 'bg-white text-gray-900 border border-transparent shadow-[0_4px_15px_rgba(0,0,0,0.1)]';
    };

    const badgeTheme = getGridBadgeTheme(activeCategory);

    return (
        <section id="product-grid" className="py-4 md:py-8 bg-[#FAFAFA] transition-colors duration-500">
            <div className="container px-4 md:px-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                    <div className="flex flex-col">
                        <h2 className="text-[24px] md:text-[32px] font-black uppercase tracking-tight text-gray-900 leading-none">
                            {dynamicTitle}
                        </h2>
                        <div className="w-12 h-1 bg-black mt-2 md:mt-3" />
                    </div>
                    <button className="text-gray-400 font-bold text-[11px] uppercase tracking-widest hover:text-black transition-colors flex items-center gap-2 group" onClick={() => navigate('/shop')}>
                        View All <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>

                {isLoading && displayProducts.length === 0 ? (
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-x-2 gap-y-6 md:gap-x-5 md:gap-y-8">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="flex flex-col gap-4">
                                <div className="aspect-[3/4] bg-gray-100 animate-pulse rounded-2xl" />
                                <div className="h-4 w-2/3 bg-gray-100 animate-pulse" />
                                <div className="h-4 w-1/3 bg-gray-100 animate-pulse" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-x-2 gap-y-6 md:gap-x-5 md:gap-y-8">
                        {displayProducts.map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                )}

                {!isLoading && displayProducts.length === 0 && (
                    <div className="py-12 text-center">
                        <p className="text-gray-400 font-bold uppercase  text-xs">No new drops found</p>
                    </div>
                )}
            </div>
        </section>
    );
};

export default ProductGrid;

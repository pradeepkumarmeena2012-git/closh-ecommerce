import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ProductCard from '../ProductCard/ProductCard';
import { useProductStore } from '../../../../shared/store/productStore';
import { useCategory } from '../../context/CategoryContext';

const ProductGrid = () => {
    const navigate = useNavigate();
    const { products, isLoading, fetchPublicProducts } = useProductStore();
    const { activeCategory, getCategoryColor } = useCategory();

    useEffect(() => {
        if (activeCategory === 'For You' || activeCategory === 'All') {
            fetchPublicProducts({ limit: 12, sort: 'newest' });
        } else {
            fetchPublicProducts({ category: activeCategory, limit: 12 });
        }
    }, [activeCategory, fetchPublicProducts]);

    const displayProducts = products.length > 0 ? products : [];

    const dynamicTitle = activeCategory === 'For You' ? 'New Drops' : `${activeCategory} Collection`;
    const themeColor = getCategoryColor(activeCategory) || '#111111';

    const getGridBadgeTheme = (categoryName) => {
        const name = categoryName?.toLowerCase() || '';
        // Returning dark premium badges with category-color tinted text, borders, and glows
        if (name === 'hello' || name === 'women') return 'bg-[#111111] text-[#FF4081] border border-[#FF4081]/30 shadow-[0_0_15px_rgba(255,64,129,0.15)]';
        if (name === 'men\'s fashion' || name === 'mens' || name === 'men') return 'bg-[#111111] text-[#29B6F6] border border-[#29B6F6]/30 shadow-[0_0_15px_rgba(41,182,246,0.15)]';
        if (name === 'bottom wear') return 'bg-[#111111] text-[#8BC34A] border border-[#8BC34A]/30 shadow-[0_0_15px_rgba(139,195,74,0.15)]';
        if (name === 'beauty') return 'bg-[#111111] text-[#F06292] border border-[#F06292]/30 shadow-[0_0_15px_rgba(240,98,146,0.15)]';
        if (name === 'accessories') return 'bg-[#111111] text-[#FFCA28] border border-[#FFCA28]/30 shadow-[0_0_15px_rgba(255,202,40,0.15)]';
        return 'bg-[#111111] text-[#FAFAFA] border border-transparent shadow-[0_4px_15px_rgba(0,0,0,0.1)]';
    };

    const badgeTheme = getGridBadgeTheme(activeCategory);

    return (
        <section id="product-grid" className="py-4 md:py-8 bg-[#FAFAFA] transition-colors duration-500">
            <div className="container px-4 md:px-8">
                <div className="flex justify-between items-center mb-6 px-1">
                    <h2
                        className={`font-premium text-[12px] md:text-[14px] font-black uppercase tracking-[0.2em] px-5 py-2.5 rounded-full transition-all duration-500 ${badgeTheme}`}
                    >
                        {dynamicTitle}
                    </h2>
                    <button className="text-[#111111] font-black text-[10px] uppercase tracking-widest border-b-2 border-[#111111] pb-0.5 hover:text-[#D4AF37] hover:border-[#D4AF37] transition-colors" onClick={() => navigate('/shop')}>View All</button>
                </div>

                {isLoading && displayProducts.length === 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 2xl:grid-cols-8 gap-4 md:gap-6">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="aspect-[3/4] bg-gray-100 animate-pulse rounded-2xl" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 2xl:grid-cols-8 gap-4 md:gap-6">
                        {displayProducts.map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                )}

                {!isLoading && displayProducts.length === 0 && (
                    <div className="py-12 text-center">
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No new drops found</p>
                    </div>
                )}
            </div>
        </section>
    );
};

export default ProductGrid;

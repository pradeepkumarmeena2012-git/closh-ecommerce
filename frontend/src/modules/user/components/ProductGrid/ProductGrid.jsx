import React, { useEffect } from 'react';
import ProductCard from '../ProductCard/ProductCard';
import { useProductStore } from '../../../../shared/store/productStore';

const ProductGrid = () => {
    const { products, isLoading, fetchPublicProducts } = useProductStore();

    useEffect(() => {
        fetchPublicProducts({ limit: 8, sort: 'newest' });
    }, [fetchPublicProducts]);

    // Fallback if no products are found yet
    const displayProducts = products.length > 0 ? products : [];

    return (
        <section className="py-4 md:py-6 bg-white">
            <div className="container px-4 md:px-8">
                <div className="flex justify-between items-center mb-6 px-1">
                    <h2 className="font-display text-[15px] md:text-xl font-black uppercase tracking-tight text-white px-3 py-1.5 bg-black rounded-sm leading-none">New Drops</h2>
                    <button className="text-black font-black text-[10px] uppercase tracking-widest border-b-2 border-black pb-0.5" onClick={() => window.location.href = '/shop'}>View All</button>
                </div>

                {isLoading && displayProducts.length === 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 2xl:grid-cols-8 gap-4 md:gap-6">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="aspect-[3/4] bg-gray-100 animate-pulse rounded-2xl" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 2xl:grid-cols-8 gap-4 md:gap-6">
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

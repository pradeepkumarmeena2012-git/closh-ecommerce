import React, { useEffect, useMemo } from 'react';
import { useCategoryStore } from '../../../../shared/store/categoryStore';
import { useCategory as useUiCategory } from '../../context/CategoryContext';
import { useNavigate } from 'react-router-dom';

const CategoryContent = () => {
    const { activeCategory } = useUiCategory();
    const { categories, getCategoriesByParent, getRootCategories, isLoading, initialize } = useCategoryStore();
    const navigate = useNavigate();

    useEffect(() => {
        initialize();
    }, [initialize]);

    // Find the current active root category object
    const activeRoot = useMemo(() => {
        return getRootCategories().find(c => c.name === activeCategory);
    }, [activeCategory, getRootCategories]);

    // Get subcategories of the active root
    const subCategories = useMemo(() => {
        if (!activeRoot) return [];
        return getCategoriesByParent(activeRoot.id);
    }, [activeRoot, getCategoriesByParent]);

    if (isLoading && categories.length === 0) return (
        <div className="flex items-center justify-center p-20 animate-pulse">
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-300">Syncing Collections...</div>
        </div>
    );

    if (!activeRoot && !isLoading) return (
        <div className="flex flex-col items-center justify-center p-20 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Select a category to explore</p>
        </div>
    );

    return (
        <div className="pb-20 bg-white min-h-screen">
            {/* Displaying subcategories as a grid in a single section for now, or group them if needed */}
            <div className="px-4 pt-4">
                <h3 className="text-[13px] font-black text-gray-900 mb-5 uppercase tracking-tight">
                    {activeRoot.name} Collections
                </h3>

                {subCategories.length === 0 ? (
                    <div className="py-20 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">No sub-collections found</p>
                        <button
                            onClick={() => navigate(`/shop?category=${activeRoot.id}`)}
                            className="mt-4 px-6 py-2 bg-black text-white text-[9px] font-black uppercase tracking-widest rounded-xl"
                        >
                            View All Products
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-8 gap-3 md:gap-5">
                        {subCategories.map((item) => (
                            <div
                                key={item.id}
                                className="flex flex-col items-center group cursor-pointer"
                                onClick={() => navigate(`/shop?category=${activeRoot.id}&subCategory=${item.id}`)}
                            >
                                <div className="w-full aspect-square bg-[#fafafa] rounded-2xl overflow-hidden mb-3 border-2 border-transparent group-hover:border-black/5 group-hover:shadow-xl transition-all p-1">
                                    <div className="w-full h-full rounded-xl overflow-hidden shadow-inner relative">
                                        <img
                                            src={item.image || 'https://via.placeholder.com/200x200?text=Sub'}
                                            alt={item.name}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                                    </div>
                                </div>
                                <span className="text-[9px] font-black text-gray-800 text-center uppercase tracking-tight leading-none px-1 group-hover:text-black">
                                    {item.name}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CategoryContent;

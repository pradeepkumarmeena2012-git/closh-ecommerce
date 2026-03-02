import React from 'react';
import { useNavigate } from 'react-router-dom';
import { bannerCategories, secondaryBannerCategories } from '../../data';
import { useCategoryStore } from '../../../../shared/store/categoryStore';
import { useCategory } from '../../context/CategoryContext';

const CategoryBanners = () => {
    const { categories, initialize } = useCategoryStore();
    const { setActiveCategory } = useCategory();
    const navigate = useNavigate();

    React.useEffect(() => {
        initialize();
    }, [initialize]);

    // Filter active categories
    const activeCategories = categories.filter(c => c.isActive);

    const handleCategoryClick = (catName) => {
        setActiveCategory(catName);
        setTimeout(() => {
            const grid = document.getElementById('product-grid');
            if (grid) {
                grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 50); // Small timeout to allow state to settle
    };

    return (
        <div className="py-5 md:py-10">
            <div className="container">
                {/* Dynamic Categories Row */}
                <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-6 gap-3 md:gap-6">
                    {activeCategories.map((category) => (
                        <div
                            key={category.id}
                            onClick={() => handleCategoryClick(category.name)}
                            className="flex flex-col items-center cursor-pointer transition-all group"
                        >
                            <div className="w-full aspect-square rounded-xl md:rounded-2xl overflow-hidden mb-2 md:mb-4 shadow-sm bg-gray-100">
                                <img
                                    src={category.image || 'https://placehold.co/150?text=' + category.name}
                                    alt={category.name}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    onError={(e) => { e.target.src = 'https://placehold.co/150?text=' + category.name }}
                                />
                            </div>
                            <p className="text-[10px] sm:text-xs md:text-sm font-bold text-center text-text-primary uppercase tracking-tight line-clamp-1">{category.name}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CategoryBanners;

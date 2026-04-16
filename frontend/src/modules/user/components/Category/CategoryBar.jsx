import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCategoryStore } from '../../../../shared/store/categoryStore';
import { useCategory } from '../../context/CategoryContext';
import allImage from '../../../../assets/animations/lottie/image.png';

const CategoryBar = () => {
    const { categories, initialize } = useCategoryStore();
    const { activeCategory, setActiveCategory, getCategoryGradient } = useCategory();
    const location = useLocation();
    const navigate = useNavigate();
    const scrollRef = useRef(null);

    useEffect(() => {
        initialize();
    }, [initialize]);

    const filteredCategories = React.useMemo(() => {
        return categories.filter(cat => 
            (!cat.parentId || cat.parentId === '' || cat.parentId === null) && 
            cat.isActive !== false
        );
    }, [categories]);

    const rootCategories = React.useMemo(() => [
        { _id: 'all', id: 'all', name: 'All', image: allImage },
        ...filteredCategories
    ], [filteredCategories]);

    const handleCategoryClick = (cat) => {
        setActiveCategory(cat.name);
        
        if (cat.name === 'All') {
            navigate('/');
            return;
        }

        // If on Home page, only navigate to categories if product-grid is not in DOM (e.g. mobile layout).
        // Otherwise, do not scroll so the user's view isn't abruptly disrupted.
        if (location.pathname === '/' || location.pathname === '/home') {
            setTimeout(() => {
                const grid = document.getElementById('product-grid');
                if (!grid) {
                    navigate('/categories');
                }
            }, 50);
        } else if (location.pathname !== '/categories') {
            navigate('/categories');
        }
    };

    const currentGradient = getCategoryGradient(activeCategory);

    return (
        <motion.div
            initial={false}
            animate={{ background: currentGradient }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="w-full pb-0.5 pt-0 border-b border-gray-100"
        >
            <div 
                ref={scrollRef}
                className="flex overflow-x-auto scrollbar-hide gap-4 md:gap-10 px-4 md:px-8 py-2 items-center"
            >
                {rootCategories.map((cat) => {
                    const isSelected = activeCategory === cat.name;
                    return (
                        <button
                            key={cat._id || cat.id}
                            onClick={() => handleCategoryClick(cat)}
                            className="flex flex-col items-center flex-shrink-0 group transition-all"
                        >
                            <div className={`w-12 h-12 md:w-14 md:h-14 rounded-full p-[2px] transition-all duration-300 ${isSelected ? 'bg-gray-200' : 'bg-transparent'}`}>
                                <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center p-0.5 shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
                                    <img
                                        src={cat.image || "https://via.placeholder.com/150"}
                                        alt={cat.name}
                                        className={`w-full h-full object-cover rounded-full transition-transform duration-500 ${isSelected ? 'scale-105' : 'group-hover:scale-105'}`}
                                        onError={(e) => { e.target.src = 'https://via.placeholder.com/150?text=' + cat.name }}
                                    />
                                </div>
                            </div>
                            <span className={`text-[10px] md:text-[11px] mt-1.5 font-bold transition-all ${isSelected ? 'text-gray-900' : 'text-gray-500'}`}>
                                {cat.name}
                            </span>
                        </button>
                    );
                })}
            </div>
            <style dangerouslySetInnerHTML={{ __html: `
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}} />
        </motion.div>
    );
};

export default CategoryBar;

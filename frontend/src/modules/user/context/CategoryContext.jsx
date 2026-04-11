import { createContext, useContext, useState, useCallback, useMemo } from 'react';

const CategoryContext = createContext();

import { categoryColors, categoryGradients } from '../data/categoryConstants';


export const CategoryProvider = ({ children }) => {
    const [activeCategory, setActiveCategory] = useState('For You');
    const [activeSubCategory, setActiveSubCategory] = useState('All');

    // Overriding the setter to reset subcategory to All when root category changes
    const setCategoryWithReset = useCallback((newCategory) => {
        setActiveCategory(newCategory);
        setActiveSubCategory('All');
    }, []);

    const getCategoryColor = useCallback((name) => {
        if (!name) return categoryColors['For You'];

        // Case-insensitive lookup
        const entry = Object.entries(categoryColors).find(
            ([key]) => key.toLowerCase() === name.toLowerCase() ||
                name.toLowerCase().includes(key.toLowerCase())
        );

        return entry ? entry[1] : categoryColors['For You'];
    }, []);

    const getCategoryGradient = useCallback((name) => {
        if (!name) return categoryGradients['For You'];
        const entry = Object.entries(categoryGradients).find(
            ([key]) => key.toLowerCase() === name.toLowerCase() ||
                name.toLowerCase().includes(key.toLowerCase())
        );
        return entry ? entry[1] : categoryGradients['Default'];
    }, []);

    const value = useMemo(() => ({
        activeCategory,
        setActiveCategory: setCategoryWithReset,
        activeSubCategory,
        setActiveSubCategory,
        getCategoryColor,
        getCategoryGradient,
        categoryColors,
        categoryGradients
    }), [activeCategory, setCategoryWithReset, activeSubCategory, getCategoryColor, getCategoryGradient]);

    return (
        <CategoryContext.Provider value={value}>
            {children}
        </CategoryContext.Provider>
    );
};

export const useCategory = () => {
    const context = useContext(CategoryContext);
    if (!context) {
        throw new Error('useCategory must be used within a CategoryProvider');
    }
    return context;
};

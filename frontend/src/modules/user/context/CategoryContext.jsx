import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

const CategoryContext = createContext();

export const categoryColors = {
    'For You': '#e91e63',
    'Women': '#ff4081',
    'Men': '#2196f3',
    'Kids': '#00bcd4',
    'T-Shirts': '#4caf50',
    'Jeans': '#673ab7',
    'Beauty': '#9c27b0',
    'Accessories': '#cddc39',
    'Footwear': '#ff9800',
    'Home': '#795548',
    'Offers': '#f44336',
    'Shirts': '#009688',
    'Sweaters': '#607d8b',
    'Jackets': '#3f51b5',
    'Hoodies': '#ff5722'
};

export const CategoryProvider = ({ children }) => {
    const [activeCategory, setActiveCategory] = useState('For You');

    const getCategoryColor = useCallback((name) => {
        if (!name) return categoryColors['For You'];

        // Case-insensitive lookup
        const entry = Object.entries(categoryColors).find(
            ([key]) => key.toLowerCase() === name.toLowerCase() ||
                name.toLowerCase().includes(key.toLowerCase())
        );

        return entry ? entry[1] : categoryColors['For You'];
    }, []);

    const value = useMemo(() => ({
        activeCategory,
        setActiveCategory,
        getCategoryColor,
        categoryColors
    }), [activeCategory, getCategoryColor]);

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

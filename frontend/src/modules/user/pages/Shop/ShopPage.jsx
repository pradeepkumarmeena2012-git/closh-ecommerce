import React, { useEffect } from 'react';
import CategoryContent from '../../components/CategoryContent/CategoryContent';
import { useCategory } from '../../context/CategoryContext';

const ShopPage = () => {
    const { activeCategory, setActiveCategory } = useCategory();

    // If no specific category is selected (e.g. initial load or 'For You'), default to 'Women'
    // so the user sees some content instead of a blank screen.
    useEffect(() => {
        if (activeCategory === 'For You') {
            setActiveCategory('Women');
        }
    }, [activeCategory, setActiveCategory]);

    return (
        <div className="min-h-screen bg-white">
            <CategoryContent />
        </div>
    );
};

export default ShopPage;

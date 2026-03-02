import React from 'react';
import HeroSection from '../../components/HeroSection/HeroSection';
import CategoryBanners from '../../components/CategoryBanners/CategoryBanners';
import ProductGrid from '../../components/ProductGrid/ProductGrid';
import TrustBadges from '../../components/TrustBadges/TrustBadges';
import Newsletter from '../../components/Newsletter/Newsletter';
import PromoBanners from '../../components/PromoBanners/PromoBanners';

const HomePage = () => {
    return (
        <>
            <HeroSection />
            <PromoBanners />
            <ProductGrid />
            <TrustBadges />
            <Newsletter />
        </>
    );
};

export default HomePage;

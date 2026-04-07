import React, { useEffect, useRef, useState } from 'react';
import HeroSection from '../../components/HeroSection/HeroSection';
import CategoryBanners from '../../components/CategoryBanners/CategoryBanners';
import ProductGrid from '../../components/ProductGrid/ProductGrid';
import TrustBadges from '../../components/TrustBadges/TrustBadges';
import PromoBanners from '../../components/PromoBanners/PromoBanners';

// Premium Scroll Reveal Animated Wrapper
const ScrollReveal = ({ children, className = "" }) => {
    const [isVisible, setIsVisible] = useState(false);
    const domRef = useRef();

    useEffect(() => {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        const currentRef = domRef.current;
        if (currentRef) observer.observe(currentRef);

        return () => {
            if (currentRef) observer.unobserve(currentRef);
        };
    }, []);

    return (
        <div
            ref={domRef}
            className={`transition-all duration-1000 ease-out transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} ${className}`}
        >
            {children}
        </div>
    );
};

const HomePage = () => {
    return (
        <div className="overflow-x-hidden pt-0 space-y-0">
            {/* Hero Section - Shifted for Visibility */}
            <ScrollReveal>
                <HeroSection />
            </ScrollReveal>

            {/* Categorized Product Grid (Image 2 - The Response) */}
            <ScrollReveal>
                <ProductGrid />
            </ScrollReveal>

            {/* Lower Banner Section (Image 1 style - Niche) */}
            <ScrollReveal>
                <PromoBanners />
            </ScrollReveal>

            {/* Other Supplemental Home Sections */}
            <ScrollReveal>
                <CategoryBanners />
            </ScrollReveal>
            
            <ScrollReveal>
                <TrustBadges />
            </ScrollReveal>
        </div>
    );
};

export default HomePage;

import React, { useEffect, useRef, useState } from 'react';
import HeroSection from '../../components/HeroSection/HeroSection';
import CategoryBanners from '../../components/CategoryBanners/CategoryBanners';
import ProductGrid from '../../components/ProductGrid/ProductGrid';
import TrustBadges from '../../components/TrustBadges/TrustBadges';
import Newsletter from '../../components/Newsletter/Newsletter';
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
            className={`transition-all duration-1000 ease-out transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'} ${className}`}
        >
            {children}
        </div>
    );
};

const HomePage = () => {
    return (
        <div className="overflow-x-hidden">
            <HeroSection />
            <ScrollReveal>
                <PromoBanners />
            </ScrollReveal>
            <ScrollReveal>
                <ProductGrid />
            </ScrollReveal>
            <ScrollReveal>
                <TrustBadges />
            </ScrollReveal>
        </div>
    );
};

export default HomePage;

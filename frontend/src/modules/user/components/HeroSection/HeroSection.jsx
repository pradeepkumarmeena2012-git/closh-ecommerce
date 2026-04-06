import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBannerStore } from '../../../../shared/store/bannerStore';
import { useCategory } from '../../context/CategoryContext';

const HeroSection = () => {
    const navigate = useNavigate();
    const { banners, initialize } = useBannerStore();
    const { activeCategory, activeSubCategory, isSubcategoryMode } = useCategory();
    const [currentSlide, setCurrentSlide] = useState(0);
    const scrollRef = useRef(null);
    const [mobileSlide, setMobileSlide] = useState(0);
    const totalMobileSlides = 4; // SS24 + Luxe + New Arrivals + Trending

    useEffect(() => {
        initialize();
    }, [initialize]);

    // Filter active hero/home_slider banners
    const activeBanners = banners.filter(b =>
        (b.isActive !== false) &&
        (['hero', 'home_slider', 'banner'].includes(b.type))
    );

    // Fallback Banners if DB is empty
    const fallbackBanners = [
        {
            id: 'fallback-1',
            title: "The SS24 Collection",
            subtitle: "Discover the new season's most coveted pieces, crafted with uncompromising attention to luxury and detail.",
            image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=2070",
            cta: "Shop Now",
            link: "/shop"
        },
        {
            id: 'fallback-2',
            title: "Modern Minimalist",
            subtitle: "Elevate your daily rotation with pieces designed for versatility and timeless aesthetic.",
            image: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&q=80&w=2070",
            cta: "Explore Now",
            link: "/shop"
        }
    ];

    const slides = activeBanners.length > 0 ? activeBanners : fallbackBanners;

    useEffect(() => {
        if (slides.length > 1) {
            const timer = setInterval(() => {
                setCurrentSlide((prev) => (prev + 1) % slides.length);
            }, 6000);
            return () => clearInterval(timer);
        }
    }, [slides.length]);

    const getHeroTheme = (categoryName) => {
        const name = categoryName?.toLowerCase() || '';
        if (name === 'hello' || name === 'women') return 'from-[#FF4081]/10 to-[#FAFAFA]';
        if (name === 'men\'s fashion' || name === 'mens' || name === 'men') return 'from-[#4FC3F7]/10 to-[#FAFAFA]';
        return 'from-gray-50 to-[#FAFAFA]';
    };

    const currentHeroBg = isSubcategoryMode ? getHeroTheme(activeSubCategory) : getHeroTheme(activeCategory);

    return (
        <section className={`w-full bg-gradient-to-b ${currentHeroBg} transition-colors duration-700`}>
            <div className="max-w-[1600px] mx-auto px-0 md:px-6 lg:px-8 py-0 md:py-4">
                <div className="relative h-[180px] md:h-[260px] lg:h-[300px] w-full overflow-hidden rounded-none md:rounded-[24px] shadow-lg group">
                    
                    {/* Floating Promo Tags - Premium Aesthetic */}
                    <div className="absolute top-3 left-3 z-[25] flex items-center gap-1.5 px-2.5 py-1 bg-red-600 text-white text-[9px] font-black uppercase rounded-[6px] shadow-[0_4px_15px_rgba(220,38,38,0.4)] animate-fadeIn">
                         Holi Special
                    </div>
                    <div className="absolute top-3 right-3 z-[25] flex items-center gap-1.5 px-2.5 py-1 bg-black/40 backdrop-blur-md text-[#FFC107] text-[9px] font-black uppercase rounded-[6px] border border-[#FFC107]/30 shadow-xl animate-fadeIn">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#FFC107] animate-pulse" /> New
                    </div>

                    {/* Main Banner Slider */}
                    {slides.map((banner, index) => (
                        <div
                            key={banner.id || index}
                            className={`absolute inset-0 transition-opacity duration-[1s] ease-in-out ${index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                        >
                            {/* Background Image */}
                            <div
                                className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-[10s] ease-linear overflow-hidden"
                                style={{ 
                                    backgroundImage: `url(${banner.image})`,
                                    transform: index === currentSlide ? 'scale(1.1)' : 'scale(1)'
                                }}
                            />
                            
                            {/* Pro Overlay for Readability */}
                            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/30 to-transparent" />

                            {/* Content Layer */}
                            <div className="absolute inset-0 flex flex-col justify-center px-6 md:px-12 lg:px-16 z-20">
                                <div className={`max-w-xl transition-all duration-700 transform ${index === currentSlide ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                                    <div className="hidden md:flex items-center gap-2 mb-2">
                                        <div className="h-[1.5px] w-4 bg-white/40" />
                                        <span className="text-[8px] font-bold text-white tracking-[0.3em] uppercase opacity-60">Featured Collection</span>
                                    </div>
                                    
                                    <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-white leading-tight mb-2 md:mb-3 tracking-tighter drop-shadow-lg max-w-[80%] md:max-w-full">
                                        {banner.title}
                                    </h2>
                                    
                                    <p className="hidden md:block text-[11px] md:text-[12px] text-white/70 font-medium max-w-sm mb-5 leading-relaxed">
                                        {banner.subtitle || "The season's most-wanted essentials, exclusively curated for you."}
                                    </p>

                                    <div className="flex items-center gap-3 mt-1 md:mt-0">
                                        <button
                                            onClick={() => navigate(banner.link)}
                                            className="bg-white text-black py-2.5 px-8 rounded-lg font-black text-[10px] md:text-[12px] uppercase hover:bg-black hover:text-white transition-all shadow-2xl active:scale-95 border-none outline-none"
                                        >
                                            {banner.cta || "Shop Now"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Minimal Dots (Bottom Right) */}
                    <div className="absolute bottom-4 right-6 z-30 flex items-center gap-1.5">
                        {slides.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentSlide(index)}
                                className={`h-1.5 rounded-full transition-all duration-500 ${index === currentSlide ? 'w-8 bg-white' : 'w-2 bg-white/30 hover:bg-white/50'}`}
                            />
                        ))}
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes bannerIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}} />
        </section>
    );
};

export default HeroSection;



import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBannerStore } from '../../../../shared/store/bannerStore';

const HeroSection = () => {
    const navigate = useNavigate();
    const { banners, initialize } = useBannerStore();
    const [currentSlide, setCurrentSlide] = useState(0);

    useEffect(() => {
        initialize();
    }, [initialize]);

    // Filter active hero/home_slider banners
    const activeBanners = banners.filter(b =>
        (b.isActive !== false) &&
        (['hero', 'home_slider', 'banner'].includes(b.type))
    );

    // Filter active side banners
    const sideBanners = banners.filter(b =>
        (b.isActive !== false) &&
        (b.type === 'side_banner')
    ).sort((a, b) => (a.order || 0) - (b.order || 0));

    const sideBanner = sideBanners[0];

    useEffect(() => {
        if (activeBanners.length > 0) {
            const timer = setInterval(() => {
                setCurrentSlide((prev) => (prev + 1) % activeBanners.length);
            }, 5000);
            return () => clearInterval(timer);
        }
    }, [activeBanners.length]);

    if (activeBanners.length === 0) return null;

    return (
        <section className="w-full bg-[#FAFAFA] px-4 md:px-6 lg:px-12 py-4 md:py-8 font-sans">
            <div className="max-w-[1600px] mx-auto">
                <div className={`grid grid-cols-1 ${sideBanner ? 'lg:grid-cols-4' : 'lg:grid-cols-1'} gap-4 md:gap-6`}>
                    {/* Main Slider (3/4 on Large Screens) */}
                    <div className={`relative h-[400px] md:h-[500px] lg:h-[600px] overflow-hidden rounded-[40px] md:rounded-[48px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] ${sideBanner ? 'lg:col-span-3' : 'lg:col-span-1'}`}>
                        <div className="w-full h-full relative">
                            {activeBanners.map((banner, index) => (
                                <div
                                    key={banner.id}
                                    className={`absolute top-0 left-0 w-full h-full flex items-center transition-all duration-1000 ${index === currentSlide ? 'opacity-100 z-[1]' : 'opacity-0'
                                        }`}
                                >
                                    {/* Ultra-Premium Background with Deep Onyx Gradient & Ken Burns Effect */}
                                    <div
                                        className={`absolute inset-0 bg-cover bg-center transition-transform duration-10000 ease-in-out ${index === currentSlide ? 'scale-110' : 'scale-100'}`}
                                        style={{ backgroundImage: `url(${banner.image})` }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-r from-[#111111]/90 via-[#111111]/50 to-transparent" />

                                    <div className="container relative z-10 mx-auto px-8 md:px-16 lg:px-24 text-[#FAFAFA]">
                                        <div className="max-w-[700px]">
                                            <div className="flex items-center gap-4 mb-6 md:mb-8 animate-fadeInUp">
                                                <div className="w-16 h-[1px] bg-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.8)]" />
                                                <span className="text-[11px] md:text-[13px] font-bold uppercase tracking-[0.5em] text-[#D4AF37] drop-shadow-sm">The Edit</span>
                                            </div>
                                            <h2 className="font-premium text-4xl md:text-6xl lg:text-[80px] font-black mb-6 md:mb-10 uppercase tracking-tighter leading-[0.9] drop-shadow-[0_15px_15px_rgba(17,17,17,0.8)] animate-fadeInUp delay-150">
                                                {banner.title.split(' ').map((word, i) => (
                                                    <span key={i} className={i % 2 === 1 ? 'text-[#D4AF37]' : 'text-white'}>{word} </span>
                                                ))}
                                            </h2>
                                            <p className="hidden md:block text-sm md:text-lg mb-10 md:mb-14 font-medium opacity-90 max-w-[500px] leading-relaxed border-l-[3px] border-[#D4AF37] pl-6 animate-fadeInRight delay-300 backdrop-blur-md bg-[#111111]/30 py-3 pr-6 rounded-r-2xl shadow-inner border-y border-r border-[#111111]/40">
                                                {banner.subtitle}
                                            </p>
                                            <div className="flex items-center gap-6 animate-fadeInUp delay-500">
                                                <button
                                                    onClick={() => navigate(banner.link)}
                                                    className="group bg-[#FAFAFA] text-[#111111] py-4 md:py-5 px-10 md:px-14 text-[11px] md:text-sm font-black rounded-full uppercase tracking-[0.25em] transition-all duration-500 hover:bg-[#D4AF37] hover:text-[#FAFAFA] hover:-translate-y-1 active:scale-95 shadow-[0_10px_30px_rgba(17,17,17,0.3)] hover:shadow-[0_20px_40px_rgba(212,175,55,0.4)] flex items-center gap-4 relative overflow-hidden"
                                                >
                                                    {/* Elegant hover shine effect */}
                                                    <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:animate-shimmer skew-x-12" />

                                                    <span className="relative z-10">{banner.cta || 'Shop Now'}</span>
                                                    <span className="relative z-10 group-hover:translate-x-2 transition-transform duration-300">→</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {/* Premium Indicators */}
                        {activeBanners.length > 1 && (
                            <div className="absolute bottom-6 md:bottom-10 left-8 md:left-16 flex items-center gap-4 z-[2]">
                                {activeBanners.map((_, index) => (
                                    <button
                                        key={index}
                                        className={`h-1.5 transition-all duration-700 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.5)] ${index === currentSlide ? 'w-16 bg-[#D4AF37] glow' : 'w-6 bg-[#FAFAFA]/40 hover:bg-[#FAFAFA]/80'
                                            }`}
                                        onClick={() => setCurrentSlide(index)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Side Banner (1/4 on Large Screens) */}
                    {sideBanner && (
                        <div
                            className="hidden lg:flex flex-col h-[600px] rounded-[48px] overflow-hidden relative group cursor-pointer lg:col-span-1 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] border border-[#111111]/5"
                            onClick={() => navigate(sideBanner.link)}
                        >
                            <div className="absolute inset-0 bg-transparent z-10 mix-blend-overlay" />
                            <div
                                className="absolute inset-0 bg-cover bg-center transition-transform duration-[1.5s] ease-out group-hover:scale-110"
                                style={{ backgroundImage: `url(${sideBanner.image})` }}
                            />
                            {/* Rich smooth gradient bottom-up */}
                            <div className="absolute inset-0 bg-gradient-to-t from-[#111111]/90 via-[#111111]/20 to-transparent" />

                            <div className="absolute inset-x-0 bottom-0 p-10 z-20 flex flex-col items-center text-center">
                                <span className="text-[#FAFAFA] font-premium font-black text-4xl mb-2 tracking-tight drop-shadow-2xl uppercase leading-[0.9]">
                                    {sideBanner.title}
                                </span>
                                <p className="text-[#D4AF37] text-[11px] font-bold uppercase tracking-[0.3em] mb-8 opacity-90 drop-shadow-lg">
                                    {sideBanner.subtitle || 'Limited Edition'}
                                </p>
                                <div className="bg-[#111111]/80 backdrop-blur-md border border-[#D4AF37]/30 text-[#D4AF37] font-bold py-4 px-10 rounded-full w-full translate-y-8 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 uppercase tracking-widest text-[11px] shadow-[0_10px_20px_rgba(0,0,0,0.3)] hover:bg-[#D4AF37] hover:text-[#111111]">
                                    Discover
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

export default HeroSection;

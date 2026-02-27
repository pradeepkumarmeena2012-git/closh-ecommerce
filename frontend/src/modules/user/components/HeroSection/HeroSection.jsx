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
        <section className="w-full bg-white px-4 md:px-6 lg:px-12 py-4 md:py-8">
            <div className="max-w-[1600px] mx-auto">
                <div className={`grid grid-cols-1 ${sideBanner ? 'lg:grid-cols-4' : 'lg:grid-cols-1'} gap-4 md:gap-6`}>
                    {/* Main Slider (3/4 on Large Screens) */}
                    <div className={`relative h-[300px] md:h-[500px] lg:h-[600px] overflow-hidden rounded-[24px] md:rounded-[32px] shadow-2xl ${sideBanner ? 'lg:col-span-3' : 'lg:col-span-1'}`}>
                        <div className="w-full h-full relative">
                            {activeBanners.map((banner, index) => (
                                <div
                                    key={banner.id}
                                    className={`absolute top-0 left-0 w-full h-full flex items-center transition-all duration-1000 ${index === currentSlide ? 'opacity-100 z-[1]' : 'opacity-0'
                                        }`}
                                >
                                    {/* Background with Ken Burns Effect */}
                                    <div
                                        className={`absolute inset-0 bg-cover bg-center transition-transform duration-1000 ${index === currentSlide ? 'animate-ken-burns' : ''}`}
                                        style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.6)), url(${banner.image})` }}
                                    />

                                    <div className="container relative z-10 mx-auto px-6 md:px-12 lg:px-20 text-white animate-fadeInUp">
                                        <div className="max-w-[700px]">
                                            <div className="flex items-center gap-3 mb-4 md:mb-6">
                                                <div className="w-12 h-[2px] bg-[#ffcc00] shadow-[0_0_10px_#ffcc00]" />
                                                <span className="text-[10px] md:text-[13px] font-black uppercase tracking-[0.4em] text-[#ffcc00]">The Edit</span>
                                            </div>
                                            <h2 className="font-display text-3xl md:text-5xl lg:text-[75px] font-black mb-4 md:mb-8 uppercase tracking-tighter leading-[0.85] drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]">
                                                {banner.title.split(' ').map((word, i) => (
                                                    <span key={i} className={i % 2 === 1 ? 'text-[#ffcc00]' : ''}>{word} </span>
                                                ))}
                                            </h2>
                                            <p className="hidden md:block text-sm md:text-xl mb-8 md:mb-12 font-medium opacity-90 max-w-[550px] leading-relaxed border-l-4 border-[#ffcc00] pl-8 animate-fadeInRight delay-300 backdrop-blur-sm bg-black/10 py-2 rounded-r-xl">
                                                {banner.subtitle}
                                            </p>
                                            <div className="flex items-center gap-6 animate-fadeInUp delay-500">
                                                <button
                                                    onClick={() => navigate(banner.link)}
                                                    className="group bg-white text-black py-4 md:py-6 px-10 md:px-16 text-[11px] md:text-sm font-black rounded-2xl uppercase tracking-[0.25em] transition-all hover:bg-[#ffcc00] hover:scale-105 active:scale-95 shadow-[0_20px_40px_rgba(0,0,0,0.3)] flex items-center gap-4 relative overflow-hidden"
                                                >
                                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-1/2 bg-[#ffcc00] rounded-r-full" />
                                                    {banner.cta || 'Shop Now'}
                                                    <span className="group-hover:translate-x-2 transition-transform duration-300">→</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {/* Indicators */}
                        {activeBanners.length > 1 && (
                            <div className="absolute bottom-6 md:bottom-10 left-12 flex items-center gap-3 z-[2]">
                                {activeBanners.map((_, index) => (
                                    <button
                                        key={index}
                                        className={`h-1.5 transition-all duration-700 rounded-full shadow-lg ${index === currentSlide ? 'w-12 bg-[#ffcc00]' : 'w-4 bg-white/40 hover:bg-white/60'
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
                            className="hidden lg:flex flex-col h-[600px] rounded-[32px] overflow-hidden relative group cursor-pointer lg:col-span-1 shadow-2xl border-4 border-white/10"
                            onClick={() => navigate(sideBanner.link)}
                        >
                            <div className="absolute inset-0 bg-transparent z-10" />
                            <div
                                className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-110"
                                style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.7)), url(${sideBanner.image})` }}
                            />

                            <div className="absolute inset-x-0 bottom-0 p-10 z-20 flex flex-col items-center text-center">
                                <span className="text-white font-black text-3xl mb-2 tracking-tighter drop-shadow-2xl uppercase leading-none">
                                    {sideBanner.title}
                                </span>
                                <p className="text-[#ffcc00] text-[10px] font-black uppercase tracking-[0.3em] mb-8 opacity-90 drop-shadow-lg">
                                    {sideBanner.subtitle || 'Limited Edition'}
                                </p>
                                <div className="bg-white text-black font-black py-5 px-10 rounded-2xl w-full translate-y-6 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 uppercase tracking-widest text-[11px] shadow-2xl hover:bg-[#ffcc00]">
                                    Explore More
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

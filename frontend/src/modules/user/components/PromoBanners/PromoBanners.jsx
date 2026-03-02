import React, { useEffect } from 'react';
import { useCategory } from '../../context/CategoryContext';
import { useDealsStore } from '../../../../shared/store/dealsStore';

const PromoBanners = () => {
    // Use explicit selectors for better reactivity
    const deals = useDealsStore(state => state.deals);
    const initialize = useDealsStore(state => state.initialize);

    useEffect(() => {
        initialize();
    }, [initialize]);

    const activeDeals = deals.filter(d => d.status === 'active');

    // Premium Ticker Component
    const TickerBelt = ({ reverse = false }) => (
        <div className="bg-[#111111] py-2 md:py-2.5 overflow-hidden flex items-center border-y border-white/10 relative shadow-inner w-full">
            {/* Subtle Inner Glow */}
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent"></div>

            <div className={`flex ${reverse ? 'animate-ticker-reverse' : 'animate-ticker'} whitespace-nowrap w-max items-center hover:[animation-play-state:paused] transition-all cursor-crosshair`}>
                {/* Render the list twice for seamless looping (-50% translation) */}
                {[...Array(2)].map((_, setIndex) => (
                    <div key={`set-${setIndex}`} className="flex items-center">
                        {[...Array(30)].map((_, i) => (
                            <div key={i} className="flex items-center">
                                <span className="text-[#D4AF37] text-[9px] md:text-[10px] font-premium font-black uppercase tracking-[0.4em] px-6 drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]">
                                    OFFER
                                </span>
                                <span className="text-white/20 text-[6px]">◆</span>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="w-full bg-[#FAFAFA] pb-4 md:pb-8 font-sans">
            {/* Main Hero Promo Banner */}
            <div className="w-full pt-0 pb-2 md:pb-4 relative z-10">
                <div
                    className="relative w-full h-[160px] md:h-[220px] rounded-b-[40px] md:rounded-b-[60px] overflow-hidden group cursor-pointer transition-colors duration-700 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15)] bg-[#111111]"
                >
                    {/* Dark/Onyx Overlay for Premium Contrast */}
                    <div className="absolute inset-0 bg-black/20 mix-blend-multiply transition-opacity duration-700 group-hover:opacity-40"></div>

                    {/* Background Grid Pattern - Elegant Gold Tint */}
                    <div className="absolute inset-0 opacity-[0.15] pointer-events-none mix-blend-overlay" style={{ backgroundImage: 'linear-gradient(#D4AF37 1px, transparent 1px), linear-gradient(90deg, #D4AF37 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        {/* Styled "Modern Love Edit" Text with Enhanced Animations */}
                        <div className="relative animate-fadeInUp">
                            {/* Decorative Glass Clouds */}
                            <div className="absolute -top-12 -left-16 opacity-80 animate-pulse transition-all duration-1000 group-hover:scale-125 group-hover:rotate-6">
                                <div className="w-20 h-10 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full blur-[2px]" />
                                <div className="w-16 h-16 bg-white/20 backdrop-blur-lg border border-white/30 rounded-full blur-[4px] -mt-6 ml-6" />
                            </div>
                            <div className="absolute -bottom-8 -right-12 opacity-70 animate-pulse delay-700 transition-all duration-1000 group-hover:scale-110 group-hover:-rotate-6">
                                <div className="w-16 h-16 bg-white/10 backdrop-blur-md border border-white/20 rounded-full blur-[3px]" />
                                <div className="w-12 h-8 bg-[#D4AF37]/20 backdrop-blur-xl border border-[#D4AF37]/30 rounded-full blur-[2px] -mt-4 -ml-4" />
                            </div>

                            <div className="flex items-center gap-4 md:gap-8 relative z-10">
                                <h2 className="text-white font-premium font-black text-4xl md:text-7xl leading-[0.85] tracking-tight drop-shadow-[0_10px_20px_rgba(17,17,17,0.6)]">
                                    Modern<br />
                                    <span className="text-2xl md:text-5xl text-[#FAFAFA]/90 italic font-light tracking-wide">Love Edit</span>
                                </h2>

                                {/* Glassmorphism Heart Badge */}
                                <div className="relative shrink-0 flex items-center justify-center transform hover:scale-110 hover:rotate-3 transition-all duration-500 hover:drop-shadow-[0_0_20px_rgba(212,175,55,0.4)]">
                                    <svg width="120" height="120" viewBox="0 0 100 100" className="w-[110px] h-[110px] md:w-[140px] md:h-[140px] fill-white/10 backdrop-blur-md stroke-[#D4AF37] stroke-[2.5] drop-shadow-xl transition-all duration-500 group-hover:stroke-white">
                                        <path d="M50 85c-1.5 0-3-.5-4-1.5C36 74 15 54 15 37c0-10 8-18 18-18 5.5 0 11 3 14 7.5 1-1.5 2-2.5 3-3.5 3-4.5 8.5-7.5 14-7.5 10 0 18 8 18 18 0 17-21 37-31 46.5-1 1-2.5 1.5-4 1.5z" />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center text-white text-center">
                                        <div className="flex flex-col scale-[0.7] md:scale-[0.9]">
                                            <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.2em] text-[#FAFAFA]/80">Up TO</span>
                                            <span className="text-2xl md:text-4xl font-premium font-black leading-none drop-shadow-lg text-[#D4AF37] group-hover:text-white transition-colors duration-500">80%</span>
                                            <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.2em] text-[#FAFAFA]/80 mt-0.5">OFF</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Ticker 1 */}
            <TickerBelt reverse={false} />

            {/* Premium Discount Announcement Banner */}
            <div className="bg-[#FAFAFA] py-3 md:py-5 overflow-hidden relative border-y border-gray-200/50 flex items-center justify-center shadow-sm">
                {/* Elegant faint grid */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#111 1px, transparent 1px), linear-gradient(90deg, #111 1px, transparent 1px)', backgroundSize: '50px 50px' }} />

                <div className="relative flex flex-col md:flex-row items-center gap-5 md:gap-20 scale-95 md:scale-100 origin-center">
                    <div className="flex items-center gap-5">
                        <span className="text-[#878787] font-bold uppercase text-[11px] [writing-mode:vertical-lr] rotate-180 tracking-[0.2em] opacity-60">Get</span>
                        <div className="flex items-baseline gap-1.5 relative group">
                            <span className="text-5xl md:text-[85px] font-premium font-black leading-none text-[#111111] tracking-tighter drop-shadow-[0_4px_12px_rgba(17,17,17,0.1)] group-hover:text-[#D4AF37] transition-colors duration-500">₹250</span>
                            <span className="text-xl md:text-3xl font-premium font-bold text-[#111111] group-hover:text-[#D4AF37] transition-colors duration-500">OFF</span>
                        </div>
                    </div>

                    <div className="h-12 md:h-16 w-px bg-gradient-to-b from-transparent via-[#D4AF37]/40 to-transparent hidden md:block" />

                    <div className="text-center md:text-left space-y-1 bg-white/60 backdrop-blur-sm px-6 py-3 rounded-[20px] border border-white shadow-sm hover:shadow-md transition-all">
                        <p className="text-[#878787] font-medium text-[13px] md:text-[15px] tracking-wide uppercase">On your first 2 orders</p>
                        <p className="text-[#111111] font-bold text-lg md:text-2xl tracking-tight">Use Code <span className="font-premium font-black text-[#D4AF37] px-2 bg-[#111111] rounded-lg ml-1 shadow-inner inline-block -translate-y-[2px]">FIRST50</span></p>
                    </div>
                </div>
            </div>

            {/* Ticker 2 (Reverse) */}
            <TickerBelt reverse={true} />

            {/* Deal of the Day Section */}
            <div className="py-6 md:py-12 bg-[#FAFAFA] overflow-hidden">
                <div className="container mx-auto px-4 md:px-12 lg:px-24">
                    {/* Section Header */}
                    <div className="flex flex-col items-center mb-8 md:mb-12 text-center">
                        <div className="flex items-center gap-4 group">
                            <Heart fill="#D4AF37" size={24} className="animate-pulse drop-shadow-[0_0_10px_rgba(212,175,55,0.5)] md:w-[28px] md:h-[28px] text-[#D4AF37]" />
                            <h2 className="text-2xl md:text-5xl font-premium font-black uppercase tracking-tight text-[#111111]">Deal of the Day</h2>
                            <Heart fill="#D4AF37" size={24} className="animate-pulse drop-shadow-[0_0_10px_rgba(212,175,55,0.5)] md:w-[28px] md:h-[28px] text-[#D4AF37]" />
                        </div>
                        <div className="mt-3 md:mt-4 bg-white/80 backdrop-blur-md px-6 py-1.5 rounded-full border border-gray-200 shadow-sm inline-block">
                            <p className="text-[10px] md:text-[11px] font-bold text-[#878787] uppercase tracking-[0.25em]">
                                Today's Deal <span className="mx-2 text-[#D4AF37]">◆</span> <span className="text-[#111111]">Gone Tomorrow</span>
                            </p>
                        </div>
                    </div>

                    {/* Brand Cards Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-8 pb-4 md:pb-8">
                        {activeDeals.map((brand, i) => (
                            <div key={i} className={`flex flex-col ${brand.bg || 'bg-white'} rounded-[32px] md:rounded-[40px] p-4 md:p-6 items-center justify-between text-center group cursor-pointer shadow-[0_8px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(17,17,17,0.12)] transition-all duration-500 hover:-translate-y-3 border-2 border-transparent hover:border-[#D4AF37]/30 bg-white relative overflow-hidden backdrop-blur-sm`}>

                                {/* Background Glow on Hover */}
                                <div className="absolute inset-0 bg-gradient-to-b from-[#D4AF37]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

                                <div className="text-[10px] md:text-[12px] font-premium font-bold text-[#878787] uppercase tracking-wider mb-3 md:mb-5 opacity-80 group-hover:opacity-100 group-hover:text-[#111111] transition-all relative z-10">
                                    {brand.name}
                                </div>

                                <div className="w-full aspect-[4/5] bg-[#FAFAFA] rounded-2xl md:rounded-[24px] mb-4 md:mb-6 overflow-hidden relative shadow-inner group-hover:shadow-[0_10px_20px_rgba(0,0,0,0.1)] transition-all duration-500 z-10 border border-gray-100/50">
                                    {brand.image ? (
                                        <img
                                            src={brand.image}
                                            alt={brand.name}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center opacity-5">
                                            <div className="w-16 h-16 rounded-full border-[6px] border-[#111111]" />
                                        </div>
                                    )}
                                </div>

                                {/* Promo Pill */}
                                <div className="relative z-10 w-full">
                                    <div className="bg-[#111111] text-[#FAFAFA] text-[10px] md:text-[12px] font-black px-4 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl shadow-lg w-full group-hover:bg-[#D4AF37] group-hover:text-[#111111] group-hover:shadow-[0_8px_16px_rgba(212,175,55,0.3)] transition-all duration-500 transform group-hover:scale-[1.03] uppercase tracking-wide">
                                        {brand.promo}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Internal Heart Component for Section Header
const Heart = ({ size, fill = "none", className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
);

export default PromoBanners;

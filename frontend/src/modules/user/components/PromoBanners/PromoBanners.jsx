import React, { useEffect } from 'react';
import { useCategory } from '../../context/CategoryContext';
import { useDealsStore } from '../../../../shared/store/dealsStore';

const PromoBanners = () => {
    const { activeCategory, getCategoryColor } = useCategory();
    const currentBgColor = getCategoryColor(activeCategory);

    // Use explicit selectors for better reactivity
    const deals = useDealsStore(state => state.deals);
    const initialize = useDealsStore(state => state.initialize);

    useEffect(() => {
        initialize();
    }, [initialize]);

    const activeDeals = deals.filter(d => d.status === 'active');

    // Shared ticker component for internal use
    const TickerBelt = () => (
        <div className="bg-black py-1 md:py-1.5 overflow-hidden flex items-center">
            <div className="flex animate-ticker whitespace-nowrap min-w-full">
                {[...Array(30)].map((_, i) => (
                    <span key={i} className="text-white text-[8px] md:text-[9px] font-black uppercase tracking-[0.3em] px-4">
                        OFFER
                    </span>
                ))}
            </div>
        </div>
    );

    return (
        <div className="w-full bg-white pb-2 md:pb-4">
            {/* Main Hero Promo Banner */}
            <div className="w-full pt-0 pb-1 md:pb-1">
                <div
                    className="relative w-full h-[150px] md:h-[180px] rounded-b-[30px] md:rounded-b-[40px] overflow-hidden group cursor-pointer transition-colors duration-500"
                    style={{ backgroundColor: currentBgColor }}
                >
                    {/* Background Grid Pattern */}
                    <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '25px 25px' }} />

                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center ">
                        {/* Styled "Modern Love Edit" Text with Clouds and Heart */}
                        <div className="relative animate-fadeInUp">
                            {/* Decorative Clouds */}
                            <div className="absolute -top-10 -left-12 opacity-90 animate-pulse transition-all group-hover:scale-110">
                                <div className="w-16 h-8 bg-white/20 rounded-full blur-md" />
                                <div className="w-12 h-12 bg-white/30 rounded-full blur-lg -mt-4 ml-4" />
                            </div>
                            <div className="absolute -bottom-6 -right-10 opacity-80 animate-pulse delay-700 transition-all group-hover:scale-110">
                                <div className="w-14 h-14 bg-white/20 rounded-full blur-lg" />
                                <div className="w-10 h-6 bg-white/30 rounded-full blur-md -mt-4 -ml-2" />
                            </div>

                            <div className="flex items-center gap-2 md:gap-4">
                                <h2 className="text-white font-display font-black text-3xl md:text-6xl leading-[0.85] tracking-tighter drop-shadow-2xl">
                                    Modern<br />
                                    <span className="text-xl md:text-4xl">Love Edit</span>
                                </h2>

                                {/* Heart Badge */}
                                <div className="relative shrink-0 flex items-center justify-center transform hover:scale-110 transition-transform duration-500">
                                    <svg width="100" height="100" viewBox="0 0 100 100" className="w-[100px] h-[100px] md:w-[120px] md:h-[120px] fill-transparent stroke-white stroke-[4]">
                                        <path d="M50 85c-1.5 0-3-.5-4-1.5C36 74 15 54 15 37c0-10 8-18 18-18 5.5 0 11 3 14 7.5 1-1.5 2-2.5 3-3.5 3-4.5 8.5-7.5 14-7.5 10 0 18 8 18 18 0 17-21 37-31 46.5-1 1-2.5 1.5-4 1.5z" />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center text-white text-center">
                                        <div className="flex flex-col scale-[0.6] md:scale-[0.8]">
                                            <span className="text-[10px] md:text-xs font-black uppercase tracking-tighter ">Up TO</span>
                                            <span className="text-lg md:text-3xl font-black leading-none ">80%</span>
                                            <span className="text-[10px] md:text-xs font-black uppercase tracking-tighter">OFF</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Ticker 1 */}
            <TickerBelt />

            {/* Discount Announcement Banner */}
            <div className="bg-white py-0 md:py-2 overflow-hidden relative border-y border-gray-50 flex items-center justify-center">
                {/* Grid Background */}
                <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

                <div className="relative flex flex-col md:flex-row items-center gap-4 md:gap-16 scale-90 md:scale-100 origin-center">
                    <div className="flex items-center gap-4">
                        <span className="text-gray-400 font-bold uppercase text-[10px] [writing-mode:vertical-lr] rotate-180 tracking-tighter opacity-50">Get</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl md:text-[80px] font-black leading-none text-black tracking-tighter">₹250</span>
                            <span className="text-lg md:text-2xl font-black text-black">OFF</span>
                        </div>
                    </div>

                    <div className="h-10 md:h-12 w-px bg-gray-200 hidden md:block" />

                    <div className="text-center md:text-left space-y-0.5">
                        <p className="text-gray-900 font-bold text-base md:text-xl tracking-tight">On your first 2 order</p>
                        <p className="text-gray-900 font-black text-base md:text-xl tracking-tight">Use Code <span className="text-black">FIRST50</span></p>
                    </div>
                </div>
            </div>

            {/* Ticker 2 */}
            <TickerBelt />

            {/* Deal of the Day Section */}
            <div className="py-2 md:py-6 bg-white overflow-hidden">
                <div className="container mx-auto px-3 md:px-12 lg:px-24">
                    {/* Section Header */}
                    <div className="flex flex-col items-center mb-4 md:mb-8 text-center">
                        <div className="flex items-center gap-2 group">
                            <Heart fill={currentBgColor} size={16} className="animate-pulse md:w-[20px] md:h-[20px]" />
                            <h2 className="text-xl md:text-4xl font-black uppercase tracking-tighter text-black">Deal of the Day</h2>
                            <Heart fill={currentBgColor} size={16} className="animate-pulse md:w-[20px] md:h-[20px]" />
                        </div>
                        <p className="text-[9px] md:text-xs font-black text-gray-400 uppercase tracking-[0.2em] mt-1 md:mt-2">
                            Today's Deal • <span style={{ color: currentBgColor }}>Gone Tomorrow</span>
                        </p>
                    </div>

                    {/* Brand Cards Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 md:gap-6 pb-4 md:pb-6">
                        {activeDeals.map((brand, i) => (
                            <div key={i} className={`flex flex-col ${brand.bg} rounded-[24px] md:rounded-[32px] p-3 md:p-5 items-center justify-between text-center group cursor-pointer hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-gray-100/50`}>
                                <div className="text-[9px] md:text-[11px] font-black text-gray-400 uppercase tracking-tighter mb-2 md:mb-4 opacity-70 group-hover:opacity-100 transition-opacity">
                                    {brand.name}
                                </div>
                                <div className="w-full aspect-[4/5] bg-white rounded-xl md:rounded-2xl mb-3 md:mb-5 overflow-hidden relative shadow-sm group-hover:shadow-md transition-shadow">
                                    {brand.image ? (
                                        <img
                                            src={brand.image}
                                            alt={brand.name}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center opacity-10">
                                            <div className="w-12 h-12 rounded-full border-4 border-black" />
                                        </div>
                                    )}
                                </div>
                                <div className="bg-white text-black text-[9px] md:text-[11px] font-black px-3 md:px-6 py-2 md:py-3 rounded-lg md:rounded-xl shadow-lg w-full group-hover:text-white transition-all duration-300 transform group-hover:scale-105"
                                    style={{ backgroundColor: 'white' }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = currentBgColor}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                >
                                    {brand.promo}
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
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
);

export default PromoBanners;

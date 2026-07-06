import React from 'react';
import { ShieldCheck, CheckCircle, Package, Clock } from 'lucide-react';

const badges = [
    { id: 1, icon: <ShieldCheck size={28} strokeWidth={1.5} />, text: 'Secure Payments' },
    { id: 2, icon: <CheckCircle size={28} strokeWidth={1.5} />, text: 'Genuine Quality' },
    { id: 3, icon: <Package size={28} strokeWidth={1.5} />, text: 'Click & Collect' },
    { id: 4, icon: <Clock size={28} strokeWidth={1.5} />, text: 'Delivery In 60 Min' }
];

const TrustBadges = () => {
    return (
        <div className="py-8 md:py-14 border-t border-black/5 bg-[#FAFAFA]">
            <div className="container px-2 md:px-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-8 lg:gap-12 max-w-6xl mx-auto">
                    {badges.map((badge) => (
                        <div key={badge.id} className="flex flex-col items-center gap-2 md:gap-4 text-center group cursor-pointer p-1 md:p-0">
                            <div className="w-14 h-14 md:w-16 md:h-16 relative rounded-full flex items-center justify-center bg-white border border-black/5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] text-black group-hover:border-black/50 group-hover:text-black group-hover:shadow-[0_10px_25px_rgba(212,175,55,0.15)] group-hover:-translate-y-1 transition-all duration-500 ease-out">
                                {/* Golden Ping Animation Layer */}
                                <div className="absolute inset-0 rounded-full border-2 border-black/0 group-hover:border-black/40 group-hover:animate-ping opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                                <div className="scale-75 md:scale-100">{badge.icon}</div>
                            </div>
                            <span className="text-[9px] md:text-[11px] font-bold uppercase text-black/70 group-hover:text-black transition-colors duration-300 max-w-[110px] md:max-w-none">
                                {badge.text}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TrustBadges;

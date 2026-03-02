import React from 'react';
import { ShieldCheck, CheckCircle, Package, RefreshCcw } from 'lucide-react';

const badges = [
    { id: 1, icon: <ShieldCheck size={28} strokeWidth={1.5} />, text: 'Secure Payments' },
    { id: 2, icon: <CheckCircle size={28} strokeWidth={1.5} />, text: 'Genuine Quality' },
    { id: 3, icon: <Package size={28} strokeWidth={1.5} />, text: 'Click & Collect' },
    { id: 4, icon: <RefreshCcw size={28} strokeWidth={1.5} />, text: '7 Day Return' }
];

const TrustBadges = () => {
    return (
        <div className="py-14 border-t border-black/5 bg-[#FAFAFA]">
            <div className="container px-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 max-w-6xl mx-auto">
                    {badges.map((badge) => (
                        <div key={badge.id} className="flex flex-col items-center gap-4 text-center group cursor-pointer">
                            <div className="w-16 h-16 rounded-full flex items-center justify-center bg-white border border-black/5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] text-[#111111] group-hover:border-[#D4AF37]/50 group-hover:text-[#D4AF37] group-hover:shadow-[0_10px_25px_rgba(212,175,55,0.15)] group-hover:-translate-y-1 transition-all duration-500 ease-out">
                                {badge.icon}
                            </div>
                            <span className="text-[10px] md:text-[11px] font-premium font-black uppercase tracking-[0.2em] text-[#111111]/70 group-hover:text-[#111111] transition-colors duration-300">
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

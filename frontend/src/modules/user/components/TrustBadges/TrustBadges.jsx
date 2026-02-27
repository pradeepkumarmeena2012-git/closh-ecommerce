import React from 'react';
import { ShieldCheck, CheckCircle, Package, RefreshCcw } from 'lucide-react';

const badges = [
    { id: 1, icon: <ShieldCheck size={32} />, text: 'Secure Payments' },
    { id: 2, icon: <CheckCircle size={32} />, text: 'Genuine Product' },
    { id: 3, icon: <Package size={32} />, text: 'Click Connect Collect' },
    { id: 4, icon: <RefreshCcw size={32} />, text: '7 Day Return' }
];

const TrustBadges = () => {
    return (
        <div className="py-10 border-t border-b border-border-color bg-[#fafafa]">
            <div className="container">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
                    {badges.map((badge) => (
                        <div key={badge.id} className="flex flex-col items-center gap-3 text-center">
                            <div className="text-primary">{badge.icon}</div>
                            <span className="text-xs md:text-sm font-semibold text-text-primary">{badge.text}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TrustBadges;

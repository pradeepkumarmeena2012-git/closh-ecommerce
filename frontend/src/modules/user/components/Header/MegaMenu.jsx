import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { categories } from '../../data';
import { ChevronRight, ChevronDown } from 'lucide-react';

const MegaMenu = ({ isOpen, onClose }) => {
    const [activeDivision, setActiveDivision] = useState('men');

    if (!isOpen) return null;

    const divisionData = categories.find(cat => cat.id === activeDivision);

    return (
        <div
            className="absolute top-full left-0 w-full bg-[#0a0a0a] text-white shadow-2xl z-50 animate-fadeInUp border-t border-white/5"
            onMouseLeave={onClose}
        >
            <div className="container mx-auto px-4 py-8">
                {/* Division Selector */}
                <div className="flex gap-4 mb-10 overflow-x-auto scrollbar-hide">
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveDivision(cat.id)}
                            className={`px-8 py-2.5 rounded-full text-[13px] font-black uppercase tracking-widest transition-all ${activeDivision === cat.id
                                ? 'bg-white text-black'
                                : 'border border-white/20 text-white hover:border-white/40'
                                }`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>

                {/* Sub-Category Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-x-12 gap-y-12">
                    {divisionData?.sections?.map((section, idx) => (
                        <div key={idx} className="flex flex-col gap-4 group">
                            <h3 className="text-[#39ff14] text-[14px] font-black uppercase tracking-wider mb-2 flex items-center gap-2">
                                {section.title}
                                <div className="h-[2px] w-4 bg-[#39ff14]/30 rounded-full" />
                            </h3>
                            <div className="flex flex-col gap-3">
                                {section.items.map((item, itemIdx) => (
                                    <Link
                                        key={itemIdx}
                                        to={`/products?division=${activeDivision.toUpperCase()}&category=${encodeURIComponent(section.title)}&subcategory=${encodeURIComponent(item.name || item)}`}
                                        onClick={onClose}
                                        className="text-[14px] font-bold text-gray-400 hover:text-white transition-colors flex items-center justify-between group/link"
                                    >
                                        {item.name || item}
                                        <ChevronRight size={14} className="opacity-0 -translate-x-2 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all text-[#39ff14]" />
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Bottom Bar Hints */}
                <div className="mt-16 pt-8 border-t border-white/5 flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-gray-500">
                    <div className="flex gap-8">
                        <span className="flex items-center gap-2"><div className="w-1 h-1 bg-[#39ff14] rounded-full" /> Free Delivery Above ₹500</span>
                        <span className="flex items-center gap-2"><div className="w-1 h-1 bg-[#39ff14] rounded-full" /> 14 Days Easy Returns</span>
                    </div>
                    <div className="flex gap-4">
                        <div className="w-10 h-10 border border-white/10 rounded-full flex items-center justify-center hover:bg-white/5 transition-colors">
                            <ChevronDown size={14} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MegaMenu;

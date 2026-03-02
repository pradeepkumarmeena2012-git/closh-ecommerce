import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Facebook, Twitter, Package, HelpCircle, Briefcase, CreditCard, ShieldCheck, ChevronDown } from 'lucide-react';

const footerSections = [
    {
        title: 'Customer Care',
        items: [
            { name: 'Contact Us', icon: HelpCircle },
            { name: 'Track Order', icon: Package },
            { name: "FAQ's", icon: HelpCircle }
        ]
    },
    {
        title: 'Quick Links',
        items: [
            { name: 'Offer Zone', icon: null },
            { name: 'Premium Brands', icon: null },
            { name: 'Sitemap', icon: null }
        ]
    },
    {
        title: 'Top Categories',
        items: [
            { name: 'The Essentials', icon: null },
            { name: 'Outerwear', icon: null },
            { name: 'Athleisure', icon: null },
            { name: 'Dresses', icon: null }
        ]
    },
    {
        title: 'The Company',
        items: [
            { name: 'Who are we', icon: null },
            { name: 'Careers', icon: Briefcase }
        ]
    },
    {
        title: 'Legal & Policies',
        items: [
            { name: 'Terms & Conditions', icon: null },
            { name: 'Privacy Policy', icon: ShieldCheck },
            { name: 'Refund Policy', icon: CreditCard },
            { name: 'Return Policy', icon: null }
        ]
    }
];

const Footer = () => {
    const [openSection, setOpenSection] = useState(null);

    const toggleSection = (title) => {
        setOpenSection(openSection === title ? null : title);
    };

    return (
        <footer className="bg-[#111111] pt-10 md:pt-20 pb-20 md:pb-8 border-t border-white/10 text-[#FAFAFA] overflow-hidden font-sans relative">
            {/* Soft Ambient Top Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[1px] bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent" />

            <div className="container mx-auto px-4 md:px-12 relative z-10">

                {/* Top Section - Smart & App-like Layout */}
                <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-6 md:gap-8 mb-6 md:mb-16 pb-6 md:pb-10 border-b border-white/10">
                    <div className="flex flex-col items-center md:items-start gap-2 md:gap-4 text-center md:text-left">
                        <Link to="/" className="no-underline group">
                            <h1 className="font-premium text-[28px] md:text-[36px] font-black tracking-tighter drop-shadow-md transition-all duration-500 text-[#FAFAFA] group-hover:text-[#D4AF37]">
                                Clothify<span className="text-[#D4AF37] text-[32px] md:text-[44px] leading-none group-hover:text-[#FAFAFA]">.</span>
                            </h1>
                        </Link>
                        <p className="text-[10px] md:text-[12px] font-medium text-white/50 max-w-[240px] md:max-w-[280px] leading-relaxed hidden md:block">
                            Elevating everyday fashion. Premium quality, expertly curated styles delivered with speed.
                        </p>
                        <div className="flex gap-2 md:gap-4 mt-1 md:mt-2">
                            <a href="#" className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-[#D4AF37] hover:text-[#111111] transition-all duration-300 border border-white/5 shadow-sm text-[#FAFAFA]"><Instagram size={14} className="md:w-[18px] md:h-[18px]" /></a>
                            <a href="#" className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-[#D4AF37] hover:text-[#111111] transition-all duration-300 border border-white/5 shadow-sm text-[#FAFAFA]"><Facebook size={14} className="md:w-[18px] md:h-[18px]" /></a>
                            <a href="#" className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-[#D4AF37] hover:text-[#111111] transition-all duration-300 border border-white/5 shadow-sm text-[#FAFAFA]"><Twitter size={14} className="md:w-[18px] md:h-[18px]" /></a>
                        </div>
                    </div>

                    {/* App Download Card Style (Native Feel) */}
                    <div className="flex flex-col gap-2 md:gap-3 items-center md:items-end w-full md:w-auto bg-white/[0.03] md:bg-transparent backdrop-blur-md p-4 md:p-0 rounded-[20px] md:rounded-none border border-white/5 md:border-none shadow-inner md:shadow-none">
                        <span className="font-premium font-black text-[10px] md:text-[14px] uppercase tracking-[0.2em] text-[#D4AF37] md:text-[#FAFAFA] text-center md:text-right hidden md:block">Experience The App</span>
                        <div className="flex flex-row md:flex-col lg:flex-row gap-2 md:gap-3 w-full justify-center md:justify-end">
                            <button className="flex-1 lg:flex-none h-10 md:h-12 px-4 md:px-6 bg-[#FAFAFA] text-[#111111] rounded-[12px] md:rounded-[16px] text-[9px] md:text-[11px] font-black uppercase tracking-widest hover:bg-[#D4AF37] transition-colors active:scale-95 flex items-center justify-center gap-2 shadow-[0_5px_15px_rgba(250,250,250,0.1)]">
                                Google Play
                            </button>
                            <button className="flex-1 lg:flex-none h-10 md:h-12 px-4 md:px-6 bg-white/10 text-[#FAFAFA] rounded-[12px] md:rounded-[16px] text-[9px] md:text-[11px] font-black uppercase tracking-widest hover:bg-[#D4AF37] hover:text-[#111111] transition-colors active:scale-95 flex items-center justify-center gap-2 border border-white/10 shadow-sm">
                                App Store
                            </button>
                        </div>
                    </div>
                </div>

                {/* Grid - High Density Luxury Spacing (Desktop) / Accordion (Mobile) */}
                <div className="md:grid flex flex-col md:grid-cols-4 lg:grid-cols-5 gap-y-0 md:gap-y-12 gap-x-6 mb-6 md:mb-16 border-b border-white/10 md:border-0 pb-2 md:pb-0">
                    {footerSections.map((section) => {
                        const isOpen = openSection === section.title;
                        return (
                            <div key={section.title} className="flex flex-col border-b border-white/5 md:border-0 last:border-0">
                                {/* Accordion Header (Mobile) / Title (Desktop) */}
                                <button
                                    className="md:cursor-default outline-none flex items-center justify-between w-full py-3 md:py-0 md:bg-transparent md:mb-6 group"
                                    onClick={() => toggleSection(section.title)}
                                >
                                    <h4 className="font-premium text-[11px] md:text-[13px] font-black uppercase tracking-[0.2em] text-[#FAFAFA] border-l-2 border-[#D4AF37] pl-3">
                                        {section.title}
                                    </h4>
                                    <ChevronDown
                                        size={14}
                                        className={`md:hidden text-white/40 transition-transform duration-300 ${isOpen ? 'rotate-180 text-[#D4AF37]' : 'group-hover:text-white/60'}`}
                                    />
                                </button>

                                {/* Accordion Content / Desktop List */}
                                <div className={`overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:max-h-[1000px] md:opacity-100 ${isOpen ? 'max-h-[200px] opacity-100 pb-3' : 'max-h-0 opacity-0'}`}>
                                    <ul className="space-y-3 md:space-y-3 pl-4 md:pl-0">
                                        {section.items.map(item => (
                                            <li key={item.name} className="group relative">
                                                <div className="text-[10px] md:text-[12px] font-bold text-white/40 md:text-white/50 uppercase tracking-[0.15em] cursor-pointer hover:text-[#FAFAFA] transition-colors flex items-center gap-2">
                                                    {item.icon && <item.icon size={10} className="text-[#D4AF37] opacity-60 md:opacity-100" />}
                                                    {item.name}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Bottom Bar - Trust Badges & Copyright */}
                <div className="text-center md:text-left pt-6 pb-2 md:py-0 border-t-0 md:border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 text-[8px] md:text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">
                        <span className="flex items-center gap-1.5 bg-white/5 px-2 md:px-2.5 py-1 md:py-1.5 rounded-lg border border-white/5"><ShieldCheck size={10} className="md:w-3 md:h-3" /> Secure Checkout</span>
                        <span className="flex items-center gap-1.5 bg-white/5 px-2 md:px-2.5 py-1 md:py-1.5 rounded-lg border border-white/5"><Package size={10} className="md:w-3 md:h-3" /> Free Returns</span>
                    </div>
                    <p className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-white/20 text-center md:text-left leading-relaxed">
                        © 2024 CLOTHIFY <br className="md:hidden" /> All Rights Reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;

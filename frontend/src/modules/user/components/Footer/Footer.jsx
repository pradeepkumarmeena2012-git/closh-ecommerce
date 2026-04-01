import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Facebook, Twitter, Package, HelpCircle, Briefcase, CreditCard, ShieldCheck, ChevronDown } from 'lucide-react';

const footerSections = [
    {
        title: 'Customer Care',
        items: [
            { name: 'Contact Us', icon: HelpCircle, path: '/legal/contact' },
            { name: 'Track Order', icon: Package, path: '/orders' },
            { name: "FAQ's", icon: HelpCircle, path: '/legal/faq' }
        ]
    },
    {
        title: 'Quick Links',
        items: [
            { name: 'Offer Zone', icon: null, path: '/offers' },
            { name: 'Premium Brands', icon: null, path: '/shop' },
            { name: 'Sitemap', icon: null, path: '/' }
        ]
    },
    {
        title: 'Top Categories',
        items: [
            { name: 'The Essentials', icon: null, path: '/shop' },
            { name: 'Outerwear', icon: null, path: '/shop' },
            { name: 'Athleisure', icon: null, path: '/shop' },
            { name: 'Dresses', icon: null, path: '/shop' }
        ]
    },
    {
        title: 'The Company',
        items: [
            { name: 'Who are we', icon: null, path: '/legal/about' },
            { name: 'Careers', icon: Briefcase, path: '/' }
        ]
    },
    {
        title: 'Legal & Policies',
        items: [
            { name: 'Terms & Conditions', icon: null, path: '/legal/terms' },
            { name: 'Privacy Policy', icon: ShieldCheck, path: '/legal/privacy' },
            { name: 'Refund Policy', icon: CreditCard, path: '/legal/refund' },
            { name: 'Return Policy', icon: null, path: '/legal/refund' }
        ]
    }
];

const Footer = () => {
    const [openSection, setOpenSection] = useState(null);

    const toggleSection = (title) => {
        setOpenSection(openSection === title ? null : title);
    };

    return (
        <footer className="bg-white pt-0 md:pt-20 pb-0 md:pb-8 border-t border-gray-200 text-gray-900 overflow-hidden font-sans relative w-full">
            {/* Soft Ambient Top Glow (Desktop) */}
            <div className="hidden md:block absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[1px] bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent" />

            {/* Premium Mobile App Footer (From User Screenshot) */}
            <div className="flex flex-col md:hidden w-full relative pb-[80px]">
                {/* Newsletter Block */}
                <div className="relative py-14 px-6 flex flex-col items-center justify-center text-center overflow-hidden border-b border-gray-100 bg-white">
                    {/* Abstract Dark Grid Background */}
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

                    <h2 className="text-[28px] font-bold  text-gray-900 leading-[1.15] z-10 mb-5 drop-shadow-md">
                        Join The <span className="text-black italic font-normal drop-shadow-[0_0_15px_rgba(212,175,55,0.4)]">Inner<br />Circle</span>
                    </h2>

                    <p className="text-gray-900/50 text-[10px] font-semibold uppercase  leading-relaxed max-w-[280px] z-10 mb-8 px-2">
                        Exclusive early access to new drops, VIP sales, and highly curated luxury edits delivered to your inbox.
                    </p>

                    <div className="w-full max-w-[320px] z-10 space-y-4">
                        <input
                            type="email"
                            placeholder="Enter your email address"
                            className="w-full bg-gray-50 text-gray-900 font-medium text-[13px] px-6 py-4 rounded-[24px] border border-gray-200 placeholder-gray-400 focus:outline-none focus:border-black/50 transition-colors shadow-inner"
                        />
                        <button className="w-full bg-[#FAFAFA] text-black font-bold text-[12px] uppercase  px-6 py-4 rounded-[24px] hover:bg-black transition-colors shadow-[0_5px_15px_rgba(250,250,250,0.15)] active:scale-95">
                            Subscribe
                        </button>
                    </div>
                </div>

                {/* Brand & Social/App Block */}
                <div className="py-12 px-6 flex flex-col items-center bg-gray-100">
                    <h1 className="text-[36px] font-bold  drop-shadow-md text-gray-900 mb-8">
                        CLOSH<span className="text-black">.</span>
                    </h1>

                    <div className="flex items-center gap-4 mb-10">
                        {[Instagram, Facebook, Twitter].map((Icon, idx) => (
                            <a key={idx} href="#" className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center hover:bg-black hover:text-white transition-all duration-300 border border-gray-100 shadow-sm text-gray-900/70 hover:scale-110 active:scale-95">
                                <Icon size={18} strokeWidth={1.5} />
                            </a>
                        ))}
                    </div>

                    <div className="flex gap-3 w-full max-w-[320px]">
                        <button className="flex-1 bg-gray-50 text-gray-900 rounded-[16px] py-4 text-[10px] font-bold uppercase hover:bg-black hover:text-white transition-all active:scale-95 shadow-sm flex justify-center">
                            Google Play
                        </button>
                        <button className="flex-1 bg-gray-50 text-gray-900 rounded-[16px] py-4 text-[10px] font-bold uppercase border border-gray-100 hover:bg-black hover:text-white transition-all active:scale-95 shadow-sm flex justify-center">
                            App Store
                        </button>
                    </div>
                </div>
            </div>

            {/* Desktop Full Footer */}
            <div className="hidden md:block container mx-auto px-4 md:px-12 relative z-10">

                {/* Top Section - Smart & App-like Layout */}
                <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-6 md:gap-8 mb-6 md:mb-16 pb-6 md:pb-10 border-b border-gray-200">
                    <div className="flex flex-col items-center md:items-start gap-2 md:gap-4 text-center md:text-left">
                        <Link to="/" className="no-underline group">
                            <h1 className="text-[28px] md:text-[36px] font-bold  drop-shadow-md transition-all duration-500 text-gray-900 group-hover:text-black">
                                CLOSH<span className="text-black text-[32px] md:text-[44px] leading-none group-hover:text-gray-900">.</span>
                            </h1>
                        </Link>
                        <p className="text-[10px] md:text-[12px] font-medium text-gray-500 max-w-[240px] md:max-w-[280px] leading-relaxed hidden md:block">
                            Elevating everyday fashion. Premium quality, expertly curated styles delivered with speed.
                        </p>
                        <div className="flex gap-2 md:gap-4 mt-1 md:mt-2">
                            <a href="#" className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gray-50 flex items-center justify-center hover:bg-black hover:text-white transition-all duration-300 border border-gray-100 shadow-sm text-gray-900"><Instagram size={14} className="md:w-[18px] md:h-[18px]" /></a>
                            <a href="#" className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gray-50 flex items-center justify-center hover:bg-black hover:text-white transition-all duration-300 border border-gray-100 shadow-sm text-gray-900"><Facebook size={14} className="md:w-[18px] md:h-[18px]" /></a>
                            <a href="#" className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gray-50 flex items-center justify-center hover:bg-black hover:text-white transition-all duration-300 border border-gray-100 shadow-sm text-gray-900"><Twitter size={14} className="md:w-[18px] md:h-[18px]" /></a>
                        </div>
                    </div>

                    {/* App Download Card Style (Native Feel) */}
                    <div className="flex flex-col gap-2 md:gap-3 items-center md:items-end w-full md:w-auto bg-white/[0.03] md:bg-transparent backdrop-blur-md p-4 md:p-0 rounded-[20px] md:rounded-none border border-gray-100 md:border-none shadow-inner md:shadow-none">
                        <span className="font-bold text-[10px] md:text-[14px] uppercase  text-black md:text-gray-900 text-center md:text-right hidden md:block">Experience The App</span>
                        <div className="flex flex-row md:flex-col lg:flex-row gap-2 md:gap-3 w-full justify-center md:justify-end">
                            <button className="flex-1 lg:flex-none h-10 md:h-12 px-4 md:px-6 bg-gray-50 text-gray-900 rounded-[12px] md:rounded-[16px] text-[9px] md:text-[11px] font-bold uppercase hover:bg-black hover:text-white transition-colors active:scale-95 flex items-center justify-center gap-2 shadow-sm">
                                Google Play
                            </button>
                            <button className="flex-1 lg:flex-none h-10 md:h-12 px-4 md:px-6 bg-gray-100 text-gray-900 rounded-[12px] md:rounded-[16px] text-[9px] md:text-[11px] font-bold uppercase hover:bg-black hover:text-white transition-colors active:scale-95 flex items-center justify-center gap-2 border border-gray-200 shadow-sm">
                                App Store
                            </button>
                        </div>
                    </div>
                </div>

                {/* Grid - High Density Luxury Spacing (Desktop) / Accordion (Mobile) */}
                <div className="md:grid flex flex-col md:grid-cols-4 lg:grid-cols-5 gap-y-0 md:gap-y-12 gap-x-6 mb-6 md:mb-16 border-b border-gray-200 md:border-0 pb-2 md:pb-0">
                    {footerSections.map((section) => {
                        const isOpen = openSection === section.title;
                        return (
                            <div key={section.title} className="flex flex-col border-b border-gray-100 md:border-0 last:border-0">
                                {/* Accordion Header (Mobile) / Title (Desktop) */}
                                <button
                                    className="md:cursor-default outline-none flex items-center justify-between w-full py-3 md:py-0 md:bg-transparent md:mb-6 group"
                                    onClick={() => toggleSection(section.title)}
                                >
                                    <h4 className="text-[11px] md:text-[13px] font-bold uppercase  text-gray-900 border-l-2 border-black pl-3">
                                        {section.title}
                                    </h4>
                                    <ChevronDown
                                        size={14}
                                        className={`md:hidden text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-black' : 'group-hover:text-gray-600'}`}
                                    />
                                </button>

                                {/* Accordion Content / Desktop List */}
                                <div className={`overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:max-h-[1000px] md:opacity-100 ${isOpen ? 'max-h-[200px] opacity-100 pb-3' : 'max-h-0 opacity-0'}`}>
                                    <ul className="space-y-3 md:space-y-3 pl-4 md:pl-0">
                                        {section.items.map(item => (
                                            <li key={item.name} className="group relative">
                                                <Link to={item.path || '#'} className="no-underline text-[10px] md:text-[12px] font-semibold text-gray-400 md:text-gray-500 uppercase  cursor-pointer hover:text-gray-900 transition-colors flex items-center gap-2">
                                                    {item.icon && <item.icon size={10} className="text-black opacity-60 md:opacity-100" />}
                                                    {item.name}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Bottom Bar - Trust Badges & Copyright */}
                <div className="text-center md:text-left pt-6 pb-2 md:py-0 border-t-0 md:border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 text-[8px] md:text-[10px] font-bold uppercase  text-black">
                        <span className="flex items-center gap-1.5 bg-gray-50 px-2 md:px-2.5 py-1 md:py-1.5 rounded-lg border border-gray-100"><ShieldCheck size={10} className="md:w-3 md:h-3" /> Secure Checkout</span>
                        <span className="flex items-center gap-1.5 bg-gray-50 px-2 md:px-2.5 py-1 md:py-1.5 rounded-lg border border-gray-100"><Package size={10} className="md:w-3 md:h-3" /> Free Returns</span>
                    </div>
                    <p className="text-[8px] md:text-[10px] font-semibold uppercase  text-white/20 text-center md:text-left leading-relaxed">
                        © 2024 CLOSH <br className="md:hidden" /> All Rights Reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;

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

                {/* Brand & Social/App Block */}
                <div className="py-12 px-6 flex flex-col items-center bg-gray-100">
                    <h1 className="text-[36px] font-bold  drop-shadow-md text-gray-900 mb-8">
                        CLOSH<span className="text-black">.</span>
                    </h1>


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
                    </div>

                    {/* App Download Card Style (Native Feel) */}
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

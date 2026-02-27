import React from 'react';
import { Instagram, Facebook, Twitter } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="bg-white pt-8 md:pt-12 pb-6 border-t border-gray-100 text-black overflow-hidden">
            <div className="container px-6 md:px-12">
                {/* Top Section - Smart & Compact */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 md:mb-12 pb-8 border-b border-gray-50">
                    <div className="flex flex-col gap-3">
                        <span className="font-black text-[11px] uppercase tracking-[0.2em] text-gray-400">Social Connect</span>
                        <div className="flex gap-4 text-black">
                            <a href="#" className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center hover:bg-black hover:text-white transition-all"><Instagram size={16} /></a>
                            <a href="#" className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center hover:bg-black hover:text-white transition-all"><Facebook size={16} /></a>
                            <a href="#" className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center hover:bg-black hover:text-white transition-all"><Twitter size={16} /></a>
                        </div>
                    </div>
                    <div className="flex flex-col gap-3">
                        <span className="font-black text-[11px] uppercase tracking-[0.2em] text-gray-400">Our App</span>
                        <div className="flex gap-2">
                            <button className="h-9 px-4 bg-black text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-[#ffcc00] hover:text-black transition-all active:scale-95">Google Play</button>
                            <button className="h-9 px-4 bg-black text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-[#ffcc00] hover:text-black transition-all active:scale-95">App Store</button>
                        </div>
                    </div>
                </div>

                {/* Grid - High Density */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-y-8 gap-x-4 mb-8 md:mb-12">
                    {[
                        { title: 'Help', items: ['Contact Us', "FAQ's", 'Track Order', 'Careers', 'Sitemap'] },
                        { title: 'Quick Links', items: ['Offer Zone', 'Brands'] },
                        { title: 'Top Categories', items: ['Top Wear', 'Bottom wear', 'Athleisure', 'Co-ords', 'Dresses'] },
                        { title: 'About Us', items: ['Who are we'] },
                        { title: 'Policies', items: ['Terms & Conditions', 'Privacy Policy', 'Refund Policy', 'Return Policy'] }
                    ].map((section) => (
                        <div key={section.title}>
                            <h4 className="text-[11px] font-black mb-4 uppercase tracking-[0.2em] text-black">
                                {section.title}
                            </h4>
                            <ul className="space-y-2">
                                {section.items.map(item => (
                                    <li key={item} className="text-[10px] font-bold text-gray-400 uppercase tracking-tight cursor-pointer hover:text-black transition-colors">{item}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Bottom */}
                <div className="text-center md:text-left pt-6 border-t border-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-300">© 2024 SLIKKSYNC TECHNOLOGIES PRIVATE LIMITED All Rights Reserved.</p>
                    <div className="flex gap-4 text-[9px] font-black uppercase tracking-widest text-[#ffcc00]">
                        <span>Secure Payment</span>
                        <span>Easy Returns</span>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;

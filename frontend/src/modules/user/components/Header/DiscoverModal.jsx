import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Search, Bookmark, X } from 'lucide-react';

const brandsList = [
    { name: '7-10', logo: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=100&h=100&fit=crop' },
    { name: '203', logo: '' },
    { name: 'ABDESIGNS', logo: '' },
    { name: 'Accessorize London', logo: '' },
    { name: 'ACEPACK', logo: '' },
    { name: 'Adidas', logo: 'https://images.unsplash.com/photo-1518002171953-a080ee81be4e?w=100&h=100&fit=crop' },
    { name: 'ADWYN PETER', logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR6nKxW_uXG5_LzXGz8T8jG7M9G_XGz8T8jG7M&s' },
    { name: 'AEROPOSTALE', logo: '' },
    { name: 'AGARO', logo: '' },
    { name: 'Allen Solly', logo: '' },
    { name: 'American Eagle', logo: '' },
    { name: 'Baggit', logo: '' },
    { name: 'BALMAIN', logo: '' },
    { name: 'Bewakoof', logo: '' },
    { name: 'Biba', logo: '' },
    { name: 'BLACKOUT', logo: '' },
    { name: 'BONKERS CORNER', logo: '' },
    { name: 'Campus', logo: '' },
    { name: 'Casio', logo: '' },
    { name: 'Crocs', logo: '' },
];

const alphabets = ['#', '2', '7', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

const DiscoverModal = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');

    // Lock scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const filteredBrands = useMemo(() => {
        return brandsList.filter(brand =>
            brand.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm]);

    if (!isOpen) return null;

    const handleBrandClick = (brandName) => {
        navigate(`/products?brand=${encodeURIComponent(brandName)}`);
        onClose();
    };

    const modalContent = (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-10 md:pt-20 px-4 overflow-hidden">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-2xl transition-all duration-500" onClick={onClose} />

            {/* Modal Content */}
            <div className="relative w-full max-w-[1000px] bg-[#0c0c0c] rounded-[32px] overflow-hidden shadow-2xl animate-fadeInUp flex h-[600px] border border-white/10">
                {/* Left Side: Search & Alphabet Navigation */}
                <div className="w-[300px] border-r border-white/10 flex flex-col p-6">
                    <div className="relative mb-8">
                        <input
                            type="text"
                            placeholder="Search for Brands"
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-white text-[14px] font-medium outline-none focus:border-[#ffcc00]/50 transition-colors"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    </div>

                    <div className="flex-1 overflow-y-auto scrollbar-hide space-y-4">
                        {alphabets.map((char) => (
                            <div key={char} className="space-y-3">
                                <h3 className="text-[#ffcc00] text-[18px] font-black px-2">{char}</h3>
                                {brandsList
                                    .filter(b => {
                                        const firstChar = b.name.charAt(0).toUpperCase();
                                        if (char === '#' && /\d/.test(firstChar)) return true;
                                        return firstChar === char;
                                    })
                                    .map(brand => (
                                        <button
                                            key={brand.name}
                                            onClick={() => handleBrandClick(brand.name)}
                                            className="w-full text-left px-4 py-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all text-[14px] font-bold"
                                        >
                                            {brand.name}
                                        </button>
                                    ))
                                }
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Side: Brand Grid */}
                <div className="flex-1 flex flex-col overflow-hidden bg-black/40">
                    <div className="flex justify-between items-center px-8 py-6 border-b border-white/5">
                        <h2 className="text-white text-xl font-black uppercase tracking-tight">Featured Brands</h2>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                            <X size={24} className="text-white" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredBrands.map((brand, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => handleBrandClick(brand.name)}
                                    className="group relative aspect-square bg-gradient-to-br from-white/10 to-transparent rounded-[24px] border border-white/5 flex flex-col items-center justify-center p-6 cursor-pointer hover:border-[#ffcc00]/30 hover:bg-white/5 transition-all duration-500"
                                >
                                    <Bookmark className="absolute top-4 right-4 text-white/20 group-hover:text-[#ffcc00] transition-colors" size={20} />

                                    <div className="w-24 h-24 mb-4 flex items-center justify-center">
                                        {brand.logo ? (
                                            <img src={brand.logo} alt={brand.name} className="max-w-full max-h-full object-contain filter grayscale group-hover:grayscale-0 transition-all duration-500" />
                                        ) : (
                                            <span className="text-white text-2xl font-black text-center">{brand.name}</span>
                                        )}
                                    </div>

                                    <span className="absolute bottom-6 text-[12px] font-black uppercase tracking-widest text-[#ffcc00] opacity-0 group-hover:opacity-100 transition-all">Shop Now</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default DiscoverModal;

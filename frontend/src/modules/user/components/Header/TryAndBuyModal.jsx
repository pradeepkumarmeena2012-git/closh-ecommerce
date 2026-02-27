import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Clock, DoorOpen, RotateCcw, BadgePercent, Tag, ChevronRight } from 'lucide-react';

const TryAndBuyModal = ({ isOpen, onClose }) => {
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

    if (!isOpen) return null;

    const modalContent = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-6 overflow-hidden">
            {/* Soft Glass Overlay - Covers entire screen */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-2xl transition-opacity duration-500 animate-fadeIn"
                onClick={onClose}
            />

            {/* Premium Modal Container */}
            <div className="relative w-full max-w-[420px] max-h-[90vh] bg-white rounded-[2.5rem] md:rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden animate-fadeInUp">

                {/* Visual Header Accent */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600" />

                {/* Close Button - Premium Floating Style */}
                <button
                    onClick={onClose}
                    className="absolute top-8 right-8 w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 hover:text-black hover:bg-white hover:shadow-lg transition-all duration-300 z-50 group active:scale-90"
                >
                    <span className="text-[10px] font-black tracking-tighter group-hover:scale-110 transition-transform">X</span>
                </button>

                {/* Main Scrollable Content */}
                <div className="overflow-y-auto scrollbar-hide flex-1">
                    <div className="px-6 md:px-10 pt-12 md:pt-20 pb-8 md:pb-12 flex flex-col items-center">

                        {/* Interactive Title Section */}
                        <div className="text-center mb-8 md:mb-12 group cursor-default">
                            <h2 className="text-[28px] md:text-[38px] font-black leading-[1] text-gray-900 tracking-tighter mb-3 md:mb-4 transition-transform group-hover:scale-105 duration-500">
                                Click Connect<br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-pink-600">Collect</span>
                            </h2>
                            <p className="text-[11px] md:text-[13px] font-bold text-gray-400 uppercase tracking-[0.2em]">Next-Gen Fashion Access</p>
                        </div>

                        {/* Interactive Features Grid */}
                        <div className="grid grid-cols-3 w-full mb-8 md:mb-12 gap-2 md:gap-3">
                            {[
                                { icon: <Clock className="w-5 h-5 md:w-6 md:h-6" />, label1: '60 Min', label2: 'Delivery', bg: 'bg-orange-50', color: 'text-orange-600' },
                                { icon: <DoorOpen className="w-5 h-5 md:w-6 md:h-6" />, label1: 'Direct', label2: 'Access', bg: 'bg-pink-50', color: 'text-pink-600' },
                                { icon: <RotateCcw className="w-5 h-5 md:w-6 md:h-6" />, label1: 'Instant', label2: 'Refund', bg: 'bg-purple-50', color: 'text-purple-600' }
                            ].map((item, idx) => (
                                <div key={idx} className="flex flex-col items-center text-center group cursor-pointer lg:hover:-translate-y-2 transition-all duration-500">
                                    <div className={`w-14 h-14 md:w-16 md:h-16 ${item.bg} rounded-[18px] md:rounded-[22px] flex items-center justify-center shadow-sm mb-2 md:mb-3 group-hover:shadow-xl group-hover:shadow-${item.color.split('-')[1]}/10 transition-all duration-500`}>
                                        <div className={`${item.color} group-hover:scale-110 transition-transform duration-500`}>
                                            {item.icon}
                                        </div>
                                    </div>
                                    <span className="text-[9px] md:text-[10px] font-black text-gray-900 leading-tight uppercase tracking-tight">
                                        {item.label1}<br />{item.label2}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Interactive Offers Card Section */}
                        <div className="flex flex-col gap-3 md:gap-4 w-full mb-8 md:mb-12">
                            <div className="bg-gradient-to-r from-gray-50 to-white p-4 md:p-5 rounded-[1.5rem] md:rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-4 md:gap-5 hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-500 cursor-pointer group">
                                <div className="w-12 h-12 md:w-14 md:h-14 bg-green-500 rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-lg shadow-green-200 group-hover:rotate-12 transition-all duration-500 shrink-0">
                                    <BadgePercent className="w-6 h-6 md:w-7 md:h-7" strokeWidth={2.5} />
                                </div>
                                <div className="flex flex-col gap-0.5 flex-1 text-left">
                                    <span className="text-[13px] md:text-[15px] font-black text-gray-900 uppercase leading-none">Flat 50% OFF</span>
                                    <span className="text-[10px] md:text-[11px] font-bold text-gray-400">Code: <span className="text-gray-900 font-black tracking-widest">FIRST50</span></span>
                                </div>
                                <ChevronRight className="text-gray-300 group-hover:text-black group-hover:translate-x-1 transition-all" size={18} />
                            </div>

                            <div className="bg-gradient-to-r from-gray-50 to-white p-4 md:p-5 rounded-[1.5rem] md:rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-4 md:gap-5 hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-500 cursor-pointer group">
                                <div className="w-12 h-12 md:w-14 md:h-14 bg-orange-500 rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-200 group-hover:-rotate-12 transition-all duration-500 shrink-0">
                                    <Tag className="w-6 h-6 md:w-7 md:h-7" strokeWidth={2.5} />
                                </div>
                                <div className="flex flex-col gap-0.5 flex-1 text-left">
                                    <span className="text-[13px] md:text-[15px] font-black text-gray-900 uppercase leading-none">500+ Brands</span>
                                    <span className="text-[10px] md:text-[11px] font-bold text-gray-400">Live on your fingertips</span>
                                </div>
                                <ChevronRight className="text-gray-300 group-hover:text-black group-hover:translate-x-1 transition-all" size={18} />
                            </div>
                        </div>

                        {/* Mega Interactive Button */}
                        <button
                            onClick={onClose}
                            className="group relative w-full h-[64px] md:h-[72px] bg-black text-white rounded-[1.5rem] md:rounded-[2rem] overflow-hidden transition-all duration-500 active:scale-95 shadow-2xl shadow-black/20 hover:shadow-black/40"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <span className="relative z-10 text-[14px] md:text-[16px] font-black uppercase tracking-[0.2em]">Start Shopping</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default TryAndBuyModal;

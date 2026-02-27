import React from 'react';
import AccountLayout from '../../components/Profile/AccountLayout';
import { ChevronRight, Calendar } from 'lucide-react';

const EventsPage = () => {
    return (
        <AccountLayout>
            <div className="space-y-8">
                <h2 className="text-xl font-bold">Events</h2>

                {/* Event Card - Matching Image 4 */}
                <div className="bg-white rounded-[28px] overflow-hidden shadow-md border border-gray-100 max-w-[600px] group cursor-pointer hover:shadow-xl transition-all duration-300">
                    {/* Expired Banner */}
                    <div className="bg-[#fde6d2] px-6 py-3">
                        <p className="font-extrabold text-[15px] text-gray-900">Event Expired</p>
                        <p className="text-[12px] font-bold text-gray-500">Check this week's lineup above</p>
                    </div>

                    {/* Image Section */}
                    <div className="relative h-[280px]">
                        <img
                            src="https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=1000&auto=format&fit=crop"
                            alt="Pizza & Brew Rave"
                            className="w-full h-full object-cover filter brightness-[0.8] group-hover:scale-105 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-center items-center text-center px-6">
                            <span className="bg-white/90 text-gray-600 font-extrabold text-[10px] px-3 py-1 rounded-full uppercase tracking-widest mb-4">
                                SHOP ABOVE ₹500 TO GET A FREE PASS
                            </span>
                            <h3 className="text-white font-black text-5xl tracking-tighter italic">
                                Pizza & <br /> Brew <span className="text-pink-300">Rave</span>
                            </h3>
                            <p className="text-white/80 font-bold text-[13px] mt-4 uppercase tracking-widest">
                                Secret Story, Indirangar
                            </p>
                        </div>
                        <div className="absolute bottom-4 left-4">
                            <span className="bg-white text-black font-black text-[11px] px-4 py-1.5 rounded-lg uppercase tracking-tight">
                                EVENT EXPIRED
                            </span>
                        </div>
                    </div>

                    {/* Info Section */}
                    <div className="bg-[#333333] p-6 flex justify-between items-center text-white">
                        <div className="space-y-1">
                            <p className="text-[13px] font-bold text-gray-300">
                                Sunday, 15 Jun | 04:00 PM - 07:30 PM
                            </p>
                            <h4 className="text-[18px] font-black tracking-tight">
                                Pizza & Brew Rave
                            </h4>
                        </div>
                        <button className="flex items-center gap-1 font-bold text-[14px] hover:translate-x-1 transition-transform">
                            Details <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </AccountLayout>
    );
};

export default EventsPage;

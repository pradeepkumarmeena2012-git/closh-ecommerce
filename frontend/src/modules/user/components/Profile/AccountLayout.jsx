import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ProfileSidebar from './ProfileSidebar';
import { History, ShieldCheck, RefreshCcw, Truck, ChevronLeft, MapPin, ChevronDown } from 'lucide-react';
import { useUserLocation } from '../../context/LocationContext';
import LocationModal from '../../components/Header/LocationModal';

const AccountLayout = ({ children, isMenuPage = false, hideHeader = false }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { activeAddress } = useUserLocation();
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024); // lg breakpoint
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Helper to get page title based on path
    const getPageTitle = () => {
        const path = location.pathname;
        if (path.includes('profile')) return 'My Profile';
        if (path.includes('orders')) return 'My Orders';
        if (path.includes('addresses')) return 'My Addresses';
        if (path.includes('offers')) return 'My Offers';
        return 'Account';
    };

    return (
        <div className="bg-white text-gray-900 min-h-screen pb-12">
            <div className="container mx-auto px-4 md:px-8 lg:px-12 py-4 md:py-8">
                {/* Mobile Back Header */}
                {isMobile && !hideHeader && (
                    <div className="flex items-center gap-3 mb-2 bg-gray-50 p-2 md:p-3 rounded-[20px] md:rounded-2xl shadow-sm border border-gray-200 mx-1">
                        <button
                            onClick={() => {
                                if (isMenuPage) {
                                    if (window.history.length > 2) {
                                        navigate(-1);
                                    } else {
                                        navigate('/');
                                    }
                                } else {
                                    navigate('/account');
                                }
                            }}
                            className="w-10 h-10 md:w-10 md:h-10 bg-black text-white rounded-[14px] md:rounded-xl flex items-center justify-center active:scale-95 transition-all shadow-[0_0_15px_rgba(212,175,55,0.3)]"
                        >
                            <ChevronLeft size={20} strokeWidth={3} />
                        </button>
                        <h1 className="font-bold text-lg md:text-xl text-gray-900">{getPageTitle()}</h1>
                    </div>
                )}

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Hide sidebar on mobile detail pages */}
                    {(!isMobile || isMenuPage) && <ProfileSidebar />}

                    {/* Hide detail content on mobile account menu */}
                    {(!isMobile || !isMenuPage) && (
                        <main className="flex-1 px-1 lg:px-0">
                            <div className="bg-gray-50 rounded-[24px] md:rounded-3xl shadow-2xl border border-gray-200 p-3 md:p-8 min-h-[400px] md:min-h-[500px]">
                                {children}
                            </div>
                        </main>
                    )}
                </div>

                {/* Benefits Section - Hide on mobile detail pages to keep it clean */}
                {(!isMobile || isMenuPage) && (
                    <div className="mt-8 overflow-x-auto scrollbar-hide">
                        <div className="flex justify-between min-w-0 w-full border-t border-gray-200 pt-6 pb-6 lg:pb-8">
                            {[
                                { icon: <ShieldCheck size={20} />, label: 'Secure Payments' },
                                { icon: <History size={20} />, label: 'Genuine Product' },
                                { icon: <RefreshCcw size={20} />, label: 'Click Connect Collect' },
                                { icon: <Truck size={20} />, label: '24 Hour Return' }
                            ].map((item, idx) => (
                                <div key={idx} className="flex flex-col items-center gap-1.5 px-2 flex-1 group">
                                    <div className="text-gray-400 group-hover:text-black transition-colors">{item.icon}</div>
                                    <span className="text-[11px] md:text-[12px] font-bold text-gray-500 text-center leading-tight group-hover:text-white transition-colors">{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <LocationModal
                isOpen={isLocationModalOpen}
                onClose={() => setIsLocationModalOpen(false)}
            />
        </div>
    );
};

export default AccountLayout;

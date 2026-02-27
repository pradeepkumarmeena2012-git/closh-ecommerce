import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    User,
    MapPin,
    ShoppingBag,
    Tag,
    Calendar,
    Users,
    LogOut,
    ChevronRight
} from 'lucide-react';

const ProfileSidebar = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const sidebarLinks = [
        { id: 'profile', label: 'Profile', path: '/profile', icon: <User size={18} /> },
        { id: 'addresses', label: 'Addresses', path: '/addresses', icon: <MapPin size={18} /> },
        { id: 'orders', label: 'My Orders', path: '/orders', icon: <ShoppingBag size={18} /> },
        { id: 'offers', label: 'My Offers', path: '/offers', icon: <Tag size={18} /> },
        { id: 'events', label: 'Events', path: '/events', icon: <Calendar size={18} /> },
        { id: 'refer', label: 'Refer and Earn', path: '/refer', icon: <Users size={18} /> },
        { id: 'contact', label: 'Contact Us', path: '/legal/contact', type: 'link' },
        { id: 'about', label: 'About Us', path: '/legal/about', type: 'link' },
        { id: 'terms', label: 'Terms And Conditions', path: '/legal/terms', type: 'link' },
        { id: 'privacy', label: 'Privacy Policy', path: '/legal/privacy', type: 'link' },
        { id: 'refund', label: 'Refund Policy', path: '/legal/refund', type: 'link' },
        { id: 'return', label: 'Return & Exchange Policy', path: '/legal/return', type: 'link' },
        { id: 'shipping', label: 'Shipping Policy', path: '/legal/shipping', type: 'link' },
    ];

    const isActive = (path) => location.pathname === path;

    return (
        <aside className="w-full lg:w-[320px] shrink-0">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <nav className="flex flex-col">
                    {sidebarLinks.map((link) => (
                        <button
                            key={link.id}
                            onClick={() => link.path && navigate(link.path)}
                            className={`flex items-center justify-between px-6 py-4 transition-all border-b border-gray-50 last:border-0 ${isActive(link.path)
                                ? 'bg-black text-white'
                                : 'text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            <div className="flex items-center gap-4">
                                {link.icon && (
                                    <span className={`p-2 rounded-lg ${isActive(link.path) ? 'bg-white/10' : 'bg-gray-100'}`}>
                                        {link.icon}
                                    </span>
                                )}
                                <span className="font-semibold text-[15px]">{link.label}</span>
                            </div>
                            {!isActive(link.path) && <ChevronRight size={16} className="text-gray-300" />}
                        </button>
                    ))}
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-4 px-6 py-6 text-gray-400 font-bold hover:text-red-500 transition-colors"
                    >
                        <LogOut size={18} />
                        <span>Logout</span>
                    </button>
                </nav>
            </div>
        </aside>
    );
};

export default ProfileSidebar;

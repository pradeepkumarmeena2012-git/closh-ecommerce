import React from 'react';
import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';
import BottomNav from '../../components/Navigation/BottomNav';
import SupportChatWidget from './SupportChatWidget';

const UserLayout = ({ children, variant = 'default' }) => {
    return (
        <div className="flex flex-col min-h-screen bg-[#F5F5F7]">
            <Header variant={variant} />
            <main className="flex-1">{children}</main>
            {['product', 'account', 'cart', 'checkout', 'products', 'payment'].includes(variant) ? <div className="hidden md:block"><Footer /></div> : variant !== 'shop' && <Footer />}
            <BottomNav />
            <SupportChatWidget />
        </div>
    );
};

export default UserLayout;

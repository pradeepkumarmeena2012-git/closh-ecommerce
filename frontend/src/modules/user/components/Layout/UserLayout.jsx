import React from 'react';
import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';
import BottomNav from '../../components/Navigation/BottomNav';

const UserLayout = ({ children, variant = 'default' }) => {
    return (
        <div className="flex flex-col min-h-screen">
            <Header variant={variant} />
            <main className="flex-1">{children}</main>
            {['product', 'account'].includes(variant) ? <div className="hidden md:block"><Footer /></div> : variant !== 'shop' && <Footer />}
            <BottomNav />
        </div>
    );
};

export default UserLayout;

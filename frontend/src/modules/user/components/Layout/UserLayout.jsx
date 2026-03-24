import { useLocation } from 'react-router-dom';
import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';
import BottomNav from '../../components/Navigation/BottomNav';


const UserLayout = ({ children, variant = 'default', showHeader = true }) => {
    const location = useLocation();
    return (
        <div id="user-layout-root" className="flex flex-col h-screen overflow-hidden bg-white">
            {showHeader && <Header variant={variant} />}
            <div id="user-scroll-container" className="flex-1 overflow-y-auto scroll-smooth scrollbar-responsive">
                <main className="flex-1">{children}</main>
                <div className={['product', 'account', 'cart', 'checkout', 'products', 'payment'].includes(variant) ? "hidden md:block" : (variant !== 'shop' ? "" : "hidden")}>
                    <Footer />
                </div>
            </div>
            {!['checkout', 'payment'].includes(variant) && <BottomNav />}
        </div>
    );
};

export default UserLayout;

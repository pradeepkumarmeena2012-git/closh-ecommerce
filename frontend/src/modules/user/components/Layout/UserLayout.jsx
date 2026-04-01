import { useLocation } from 'react-router-dom';
import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';
import BottomNav from '../../components/Navigation/BottomNav';


const UserLayout = ({ children, variant = 'default', showHeader = true }) => {
    const location = useLocation();
    const isAddressPage = location.pathname.includes('/addresses');
    
    const displayHeader = showHeader && (variant !== 'products' && !location.pathname.startsWith('/products')) && !isAddressPage;
    const displayBottomNav = !['checkout', 'payment'].includes(variant || '') && !location.pathname.startsWith('/products') && !isAddressPage;

    return (
        <div id="user-layout-root" className="flex flex-col h-screen overflow-hidden bg-white">
            {displayHeader && <Header variant={variant} />}
            <div id="user-scroll-container" className="flex-1 overflow-y-auto scroll-smooth scrollbar-responsive">
                <main className="flex-1">{children}</main>
                <div className={['product', 'account', 'cart', 'checkout', 'products', 'payment'].includes(variant) || isAddressPage ? "hidden lg:block" : (variant !== 'shop' ? "" : "hidden")}>
                    <Footer />
                </div>
            </div>
            {displayBottomNav && <BottomNav />}
        </div>
    );
};

export default UserLayout;

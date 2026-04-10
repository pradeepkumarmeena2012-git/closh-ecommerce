import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import MobileHeader from '../Header/MobileHeader';
import DesktopHeader from '../Header/DesktopHeader';
import MobileBottomNav from './MobileBottomNav';
import MobileCartBar from './MobileCartBar';
import CartDrawer from '../../../../shared/components/Cart/CartDrawer';
import useMobileHeaderHeight from '../../hooks/useMobileHeaderHeight';

const MobileLayout = ({ children, showBottomNav = true, showCartBar = true }) => {
  const location = useLocation();
  const headerHeight = useMobileHeaderHeight();
  // Hide header and bottom nav on login, register, and verification pages
  const isAuthPage = location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname === '/verification';

  const isCheckoutPage = location.pathname === '/checkout';
  const isAddressPage = location.pathname.includes('/addresses');
  const isSalePage = location.pathname.startsWith('/sale/');

  // Respect the showBottomNav prop and hide on auth / checkout / address pages
  const shouldShowBottomNav = showBottomNav && !isAuthPage && !isCheckoutPage && !isAddressPage;
  
  // Hide header on categories, search, wishlist, profile, auth, and sale pages
  const shouldShowHeader = !isAuthPage &&
    location.pathname !== '/search' &&
    location.pathname !== '/wishlist' &&
    location.pathname !== '/profile' &&
    location.pathname !== '/orders' &&
    !isCheckoutPage &&
    !isAddressPage &&
    !isSalePage;

  // Ensure body scroll is restored when component mounts
  useEffect(() => {
    document.body.style.overflowY = '';
    return () => {
      document.body.style.overflowY = '';
    };
  }, []);

  return (
    <>
      {/* DesktopHeader removed to avoid duplication with platform-wide Header */}
      {shouldShowHeader && <MobileHeader />}
      <main
        className={`min-h-screen w-full overflow-x-hidden md:container md:mx-auto md:px-12 lg:px-24 xl:px-40 ${shouldShowBottomNav ? 'pb-20' : ''} ${showCartBar ? 'pb-24' : ''}`}
        style={{ paddingTop: shouldShowHeader ? `${headerHeight}px` : '0px' }}
      >
        {children}
      </main>
      {showCartBar && <MobileCartBar />}
      {shouldShowBottomNav && <MobileBottomNav />}
      {/* CartDrawer removed to avoid duplication with global CartDrawer in App.jsx */}
    </>
  );
};

export default MobileLayout;


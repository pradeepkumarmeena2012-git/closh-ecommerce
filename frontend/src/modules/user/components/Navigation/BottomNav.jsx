import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Grid, ShoppingCart, User, Compass } from 'lucide-react';
import { useCart } from '../../context/CartContext';

const BottomNav = () => {
    const { getCartCount } = useCart();
    const cartCount = getCartCount();
    const location = useLocation();
    const [isVisible, setIsVisible] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);

    useEffect(() => {
        let ticking = false;

        const handleScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const currentScrollY = window.scrollY;
                    const scrollHeight = document.documentElement.scrollHeight;
                    const clientHeight = document.documentElement.clientHeight;
                    const isAtBottom = currentScrollY + clientHeight >= scrollHeight - 80;

                    // Prevent iOS/Android rubber-banding (overscroll) from triggering nav updates
                    if (currentScrollY <= 0) {
                        setIsVisible(true);
                    } else if (currentScrollY > scrollHeight - clientHeight) {
                        setIsVisible(false);
                    } else if (Math.abs(currentScrollY - lastScrollY) > 10) {
                        // Only trigger if scrolled more than 10px to avoid micro-bounce jitters
                        if (isAtBottom) {
                            setIsVisible(false);
                        } else if (currentScrollY > lastScrollY) {
                            // Scrolling Down -> Hide Navigation
                            setIsVisible(false);
                        } else {
                            // Scrolling Up -> Show Navigation
                            setIsVisible(true);
                        }
                        setLastScrollY(currentScrollY);
                    }

                    ticking = false;
                });
                ticking = true;
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [lastScrollY]);

    // Hide bottom nav on PLP page to show filter bar
    if (location.pathname === '/products') return null;

    return (
        <div className={`fixed bottom-0 left-0 w-full h-[65px] md:h-[70px] bg-white/80 backdrop-blur-xl border-t border-white/20 flex md:hidden justify-around items-center z-[1000] shadow-[0_-10px_30px_rgba(0,0,0,0.08)] pb-safe transition-transform duration-300 ${isVisible ? 'translate-y-0' : 'translate-y-full'}`}>
            <NavLink
                to="/"
                className={({ isActive }) => `flex flex-col items-center gap-1 text-[10px] font-bold uppercase tracking-wider no-underline ${isActive ? 'text-accent' : 'text-gray-400'}`}
            >
                <Home size={22} />
                <span>Home</span>
            </NavLink>
            <NavLink
                to="/shop"
                className={({ isActive }) => `flex flex-col items-center gap-1 text-[10px] font-bold uppercase tracking-wider no-underline ${isActive ? 'text-accent' : 'text-gray-400'}`}
            >
                <Compass size={22} className={location.pathname === '/shop' ? 'animate-spin-slow' : ''} />
                <span>Categories</span>
            </NavLink>
            {/* <NavLink
                to="/shop"
                className={({ isActive }) => `flex flex-col items-center gap-1 text-[10px] font-bold uppercase tracking-wider no-underline ${isActive && location.hash === '#categories' ? 'text-accent' : 'text-gray-400'}`}
            >
                <Grid size={22} />
                <span>Categories</span>
            </NavLink> */}
            <NavLink
                to="/cart"
                className={({ isActive }) => `flex flex-col items-center gap-1 text-[10px] font-bold uppercase tracking-wider no-underline relative ${isActive ? 'text-accent' : 'text-gray-400'}`}
            >
                <ShoppingCart size={22} />
                {cartCount > 0 && (
                    <span className="absolute -top-1.5 right-1.5 bg-black text-white text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white">
                        {cartCount}
                    </span>
                )}
                <span>Cart</span>
            </NavLink>
            <NavLink
                to="/account"
                className={({ isActive }) => `flex flex-col items-center gap-1 text-[10px] font-bold uppercase tracking-wider no-underline ${isActive ? 'text-accent' : 'text-gray-400'}`}
            >
                <User size={22} />
                <span>Account</span>
            </NavLink>
        </div>
    );
};

export default BottomNav;

import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  FiShoppingBag, FiMapPin, FiChevronDown, FiChevronRight, FiUser, FiSearch
} from "react-icons/fi";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useCartStore, useUIStore } from "../../../../shared/store/useStore";
import { useAuthStore } from "../../../../shared/store/authStore";
import { appLogo } from "../../../../data/logos";
import { motion, AnimatePresence } from "framer-motion";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import SearchBar from "../../../../shared/components/SearchBar";
import { categories } from "../../../../data/categories";
import { useUserLocation } from "../../context/LocationContext";

const MobileHeader = () => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showCartAnimation, setShowCartAnimation] = useState(false);
  const [positionsReady, setPositionsReady] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [animationPositions, setAnimationPositions] = useState({
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0,
  });
  const [isTopRowVisible, setIsTopRowVisible] = useState(true);
  const [topRowHeight, setTopRowHeight] = useState(70);
  const lastScrollYRef = useRef(0);
  const topRowRef = useRef(null);
  const userMenuRef = useRef(null);
  const logoRef = useRef(null);
  const cartRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const itemCount = useCartStore((state) => state.getItemCount());
  const toggleCart = useUIStore((state) => state.toggleCart);
  const cartAnimationTrigger = useUIStore(
    (state) => state.cartAnimationTrigger
  );
  const { user, isAuthenticated, logout } = useAuthStore();
  const { activeAddress, serviceability } = useUserLocation();

  const [homeCategoryId, setHomeCategoryId] = useState(null);

  const getCurrentCategoryId = () => {
    const match = location.pathname.match(/\/(?:app\/)?category\/([^/]+)/);
    return match ? String(match[1]) : null;
  };

  const urlCategoryId = getCurrentCategoryId();
  // On home page, use the event-driven category; otherwise use URL
  const isHomePage = location.pathname === '/' || location.pathname === '/home';
  const currentCategoryId = isHomePage ? homeCategoryId : urlCategoryId;

  // Listen for category events to keep header in sync
  useEffect(() => {
    const handleCategorySelect = (e) => {
      setHomeCategoryId(e.detail?.categoryId || null);
    };
    window.addEventListener('home-category-select', handleCategorySelect);
    return () => window.removeEventListener('home-category-select', handleCategorySelect);
  }, []);

  // Reset selected category when navigating away from home
  useEffect(() => {
    if (!isHomePage) setHomeCategoryId(null);
  }, [isHomePage]);

  // Measure top row height
  useEffect(() => {
    const measureTopRow = () => {
      if (topRowRef.current) {
        const height = topRowRef.current.offsetHeight;
        setTopRowHeight(height);
      }
    };

    measureTopRow();
    window.addEventListener("resize", measureTopRow);
    return () => window.removeEventListener("resize", measureTopRow);
  }, []);

  // Handle scroll to hide/show top part
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          const lastScrollY = lastScrollYRef.current;

          if (currentScrollY < 10) {
            setIsTopRowVisible(true);
          } else if (currentScrollY < lastScrollY) {
            setIsTopRowVisible(true);
          } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
            setIsTopRowVisible(false);
          }

          lastScrollYRef.current = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Cart animation logic (omitted for brevity but kept in final implementation)
  const shouldShowAnimation =
    showCartAnimation &&
    positionsReady &&
    animationPositions.startX > 0 &&
    animationPositions.endX > 0;

  const animationContent = shouldShowAnimation ? (
    <motion.div
      className="fixed pointer-events-none"
      style={{
        left: 0, top: 0, zIndex: 10000,
      }}
      initial={{
        x: animationPositions.startX - 24,
        y: animationPositions.startY - 24,
        scale: 0.8,
        opacity: 0,
      }}
      animate={{
        x: animationPositions.endX - 24,
        y: animationPositions.endY - 24,
        scale: [0.8, 1, 1.05, 0.95],
        opacity: [0, 1, 1, 0.8, 0],
      }}
      transition={{
        duration: 4,
        ease: [0.25, 0.1, 0.25, 1],
        times: [0, 0.1, 0.7, 0.9, 1],
        type: "tween",
      }}
      onAnimationComplete={() => {
        setShowCartAnimation(false);
      }}>
      <div className="w-12 h-12 flex items-center justify-center">
        <DotLottieReact
          src="https://lottie.host/083a2680-e854-4006-a50b-674276be82cd/oQMRcuZUkS.lottie"
          autoplay
          loop={false}
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    </motion.div>
  ) : null;

  const headerContent = (
    <motion.header
      key="mobile-header"
      className="fixed top-0 left-0 right-0 z-[9999] bg-white md:hidden border-b border-gray-100"
      initial={false}
      animate={{
        y: isTopRowVisible ? 0 : -60, // Adjust based on how much we want to hide
      }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {/* Serviceability Banner */}
      {!serviceability?.loading && !serviceability?.isServiceable && activeAddress && (
          <div className="w-full bg-red-600 text-white text-[11px] font-bold text-center py-1.5 px-3 shadow-md z-[1000] relative animate-fadeIn">
              {serviceability?.message || "This service is not available in your city"}
          </div>
      )}
      <div className="flex flex-col">
        {/* Row 1: Location and User */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-50/50" ref={topRowRef}>
           <div className="flex items-center gap-3">
               <Link to="/" className="no-underline group">
                   
               </Link>
               
               <div className="flex items-center gap-2" onClick={() => navigate('/addresses')}>
                   <div className="flex items-center justify-center w-8 h-8 bg-black rounded-[8px] text-white flex-shrink-0">
                       <span className="text-[12px] font-black leading-none tracking-tighter">60</span>
                   </div>
                   <div className="flex flex-col min-w-0">
                       <span className="text-[11px] font-black text-gray-900 leading-none">delivery in 60 min</span>
                       <div className="flex items-center gap-0.5 text-[9px] text-gray-400 font-bold whitespace-nowrap">
                           Current <FiChevronRight size={10} className="text-gray-400 mt-0.5" />
                       </div>
                   </div>
               </div>
           </div>
          <div className="flex items-center gap-3">
              <button 
                onClick={toggleCart} 
                className="w-9 h-9 flex items-center justify-center relative bg-gray-50 rounded-full"
                ref={cartRef}
              >
                <FiShoppingBag className="text-xl text-gray-700" />
                {itemCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center border-2 border-white shadow-sm">
                        {itemCount}
                    </span>
                )}
              </button>
              <Link to={isAuthenticated ? "/profile" : "/login"} className="w-9 h-9 flex items-center justify-center bg-gray-50 rounded-full text-gray-700">
                {user?.avatar ? (
                    <img src={user.avatar} className="w-6 h-6 rounded-full object-cover" alt="profile" />
                ) : (
                    <FiUser className="text-xl" />
                )}
              </Link>
          </div>
        </div>

        {/* Row 2: Search and Badge */}
        <div className="px-3 py-2 flex items-center gap-2">
            <div className="flex-1">
                <div className="relative flex items-center bg-gray-100/50 rounded-xl px-3 py-2 transition-all focus-within:bg-white focus-within:ring-1 focus-within:ring-gray-200">
                    <FiSearch className="text-gray-300 mr-2 text-lg" />
                    <input 
                        type="text" 
                        placeholder="Search for products, brands or more" 
                        className="bg-transparent border-none outline-none text-xs w-full text-gray-700 placeholder:text-gray-400 font-medium"
                        onClick={() => navigate('/search')}
                        readOnly
                    />
                </div>
            </div>
            <div className="flex-shrink-0">
                <div className="bg-yellow-400 text-[10px] font-black px-2.5 py-1.5 rounded-lg uppercase tracking-tighter shadow-sm">
                    Try & Buy
                </div>
            </div>
        </div>

        {/* Row 3: Category Shortcuts */}
        <div className="px-3 pb-2 overflow-hidden">
            <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide py-0.5">
                {/* "All" pill to reset category filter */}
                <button
                    onClick={() => {
                        if (location.pathname === '/' || location.pathname === '/home') {
                            window.dispatchEvent(new CustomEvent('home-category-select', { detail: { categoryId: null } }));
                        } else {
                            navigate('/');
                        }
                    }}
                    className="flex flex-col items-center gap-1 flex-shrink-0 group"
                >
                    <div className={`w-12 h-12 rounded-full overflow-hidden border-2 bg-gray-900 flex items-center justify-center ${!currentCategoryId ? 'border-primary-500 ring-2 ring-primary-200' : 'border-gray-200'}`}>
                        <span className="text-white text-[10px] font-black">ALL</span>
                    </div>
                    <span className="text-[9px] font-extrabold text-gray-600">All</span>
                </button>
                {categories.map((category) => (
                    <button
                        key={category.id}
                        onClick={() => {
                            if (location.pathname === '/' || location.pathname === '/home') {
                                window.dispatchEvent(new CustomEvent('home-category-select', { detail: { categoryId: String(category.id) } }));
                            } else {
                                navigate(`/category/${category.id}`);
                            }
                        }}
                        className="flex flex-col items-center gap-1 flex-shrink-0 group"
                    >
                        <div className={`w-12 h-12 rounded-full overflow-hidden border bg-white ${currentCategoryId === String(category.id) ? 'border-primary-500 ring-2 ring-primary-200' : 'border-gray-100'}`}>
                            <img 
                                src={category.image} 
                                alt={category.name} 
                                className="w-full h-full object-cover group-active:scale-95 transition-transform" 
                            />
                        </div>
                        <span className="text-[9px] font-extrabold text-gray-600 group-active:text-primary-600">
                            {category.name}
                        </span>
                    </button>
                ))}
            </div>
        </div>
      </div>
    </motion.header>
  );

  return (
    <>
      {typeof document !== "undefined" &&
        createPortal(headerContent, document.body)}
      {typeof document !== "undefined" &&
        createPortal(animationContent, document.body)}
    </>
  );
};

export default MobileHeader;


import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { FiHome, FiGrid, FiCompass, FiHeart, FiUser } from "react-icons/fi";
import { useWishlistStore } from "../../../../shared/store/wishlistStore";
import { useAuthStore } from "../../../../shared/store/authStore";

const MobileBottomNav = () => {
  const location = useLocation();
  const wishlistCount = useWishlistStore((state) => state.getItemCount());
  const { isAuthenticated } = useAuthStore();

  const navItems = [
    { path: "/home", icon: FiHome, label: "Home" },
    { path: "/categories", icon: FiGrid, label: "Categories" },
    {
      path: "/wishlist",
      icon: FiHeart,
      label: "Wishlist",
      badge: wishlistCount > 0 ? wishlistCount : null,
    },
    {
      path: isAuthenticated ? "/account" : "/login",
      icon: FiUser,
      label: "Profile",
    },
  ];

  const isActive = (path) => {
    if (path === "/home") return location.pathname === "/home" || location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const iconVariants = {
    inactive: { scale: 1, color: "#9ca3af" },
    active: { scale: 1.1, color: "#111827", transition: { duration: 0.3, ease: "easeOut" } },
  };

  const navContent = (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-[9999] safe-area-bottom shadow-[0_-5px_20px_rgba(0,0,0,0.03)] lg:hidden">
      <div className="flex items-center justify-around h-16 px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-col items-center justify-center flex-1 h-full relative"
            >
              <div className="relative flex flex-col items-center gap-1">
                <motion.div
                  variants={iconVariants}
                  initial="inactive"
                  animate={active ? "active" : "inactive"}
                  className="relative"
                >
                  <Icon className="text-xl" />
                  {item.badge && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#FF5722] text-white text-[8px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                      {item.badge}
                    </span>
                  )}
                </motion.div>
                <span className={`text-[10px] font-bold uppercase transition-colors ${active ? 'text-gray-900' : 'text-gray-400'}`}>
                  {item.label}
                </span>
                {active && (
                  <motion.div
                    layoutId="activeDot"
                    className="absolute -bottom-2 w-1 h-1 bg-[#FF5722] rounded-full"
                  />
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );

  return createPortal(navContent, document.body);
};

export default MobileBottomNav;

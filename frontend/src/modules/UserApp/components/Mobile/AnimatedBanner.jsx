import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { FiArrowRight, FiZap, FiTag } from "react-icons/fi";

const AnimatedBanner = () => {
  const [currentBanner, setCurrentBanner] = useState(0);
  const [ripples, setRipples] = useState([]);

  const banners = [
    {
      id: 1,
      title: "Flash Sale",
      subtitle: "Limited Time Offer",
      discount: "Up to 50% OFF",
      description: "Shop now before it ends!",
      gradient: "from-red-500 via-pink-500 to-orange-500",
      link: "/flash-sale",
      icon: FiZap,
    },
    {
      id: 2,
      title: "Daily Deals",
      subtitle: "New Deals Every Day",
      discount: "Save 30%",
      description: "Check out today's best deals",
      gradient: "from-blue-500 via-purple-500 to-indigo-500",
      link: "/daily-deals",
      icon: FiTag,
    },
    {
      id: 3,
      title: "Special Offers",
      subtitle: "Exclusive Discounts",
      discount: "Up to 40% OFF",
      description: "Don't miss out!",
      gradient: "from-green-500 via-teal-500 to-cyan-500",
      link: "/offers",
      icon: FiTag,
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [banners.length]);

  // Ripple effect handler
  const handleRipple = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Ensure valid numbers
    if (isNaN(x) || isNaN(y)) return;

    const newRipple = {
      id: Date.now(),
      x: Math.max(0, x),
      y: Math.max(0, y),
    };

    setRipples((prev) => [...prev, newRipple]);

    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 600);
  };

  return (
    <div className="px-4 py-3">
      <div className="relative w-full h-32 rounded-2xl overflow-hidden shadow-xl">
        <AnimatePresence mode="wait">
          {banners.map((banner, index) => {
            if (index !== currentBanner) return null;
            const Icon = banner.icon;

            return (
              <motion.div
                key={banner.id}
                initial={{ opacity: 0, scale: 1.1, x: "100%" }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95, x: "-100%" }}
                transition={{
                  duration: 0.5,
                  ease: [0.25, 0.1, 0.25, 1],
                }}
                style={{ willChange: "transform, opacity" }}
                className={`absolute inset-0 bg-gradient-to-br ${banner.gradient} p-3 relative`}>
                {/* Ripple Effects */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none z-20">
                  {ripples.map((ripple) => (
                    <motion.div
                      key={ripple.id}
                      className="absolute rounded-full bg-white/40"
                      style={{
                        left: `${ripple.x}px`,
                        top: `${ripple.y}px`,
                        width: 0,
                        height: 0,
                      }}
                      initial={{
                        width: 0,
                        height: 0,
                        x: "-50%",
                        y: "-50%",
                        opacity: 0.6,
                      }}
                      animate={{ width: 200, height: 200, opacity: 0 }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                  ))}
                </div>

                {/* Content */}
                <Link
                  to={banner.link}
                  onClick={handleRipple}
                  onTouchStart={handleRipple}
                  className="relative z-10 h-full flex pt-2 justify-between group">
                  <div className="flex-1">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="flex items-center gap-2 mb-0">
                      <motion.div
                        animate={{
                          scale: [1, 1.2, 1],
                          rotate: [0, 10, -10, 0],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}>
                        <Icon className="text-white text-lg drop-shadow-lg" />
                      </motion.div>
                      <motion.span
                        className="text-white/90 text-xs font-medium"
                        animate={{
                          opacity: [0.9, 1, 0.9],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}>
                        {banner.subtitle}
                      </motion.span>
                    </motion.div>

                    <motion.h3
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-white text-xl font-extrabold mb-0 drop-shadow-lg relative inline-block">
                      {banner.title}
                    </motion.h3>

                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="text-white/90 text-xs mb-1">
                      {banner.description}
                    </motion.p>

                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5, type: "spring" }}
                      style={{
                        willChange: "transform",
                        transform: "translateZ(0)",
                      }}
                      className="inline-flex items-center gap-2 bg-white/25 px-3 py-1.5 rounded-full relative overflow-hidden"
                      whileTap={{ scale: 0.95 }}>
                      <span className="text-white font-bold text-sm relative z-10">
                        {banner.discount}
                      </span>
                      <FiArrowRight className="text-white text-sm relative z-10" />
                    </motion.div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Indicator Dots */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentBanner(index)}
              className="focus:outline-none">
              <motion.div
                animate={{
                  width: index === currentBanner ? 24 : 6,
                  opacity: index === currentBanner ? 1 : 0.5,
                }}
                transition={{ duration: 0.3 }}
                className={`h-1.5 rounded-full bg-white ${index === currentBanner ? "w-6" : "w-1.5"
                  }`}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnimatedBanner;

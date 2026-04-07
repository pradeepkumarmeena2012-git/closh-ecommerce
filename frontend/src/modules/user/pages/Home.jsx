import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, matchPath, useNavigate } from "react-router-dom";
import { FiHeart, FiArrowRight } from "react-icons/fi";
import MobileLayout from "../components/Layout/MobileLayout";
import ProductCard from "../../../shared/components/ProductCard";
import AnimatedBanner from "../components/Mobile/AnimatedBanner";
import NewArrivalsSection from "../components/Mobile/NewArrivalsSection";
import DailyDealsSection from "../components/Mobile/DailyDealsSection";
import RecommendedSection from "../components/Mobile/RecommendedSection";
import FeaturedVendorsSection from "../components/Mobile/FeaturedVendorsSection";
import BrandLogosScroll from "../components/Mobile/BrandLogosScroll";
import MobileCategoryGrid from "../components/Mobile/MobileCategoryGrid";
import LazyImage from "../../../shared/components/LazyImage";
import {
  getMostPopular,
  getTrending,
  getFlashSale,
  getDailyDeals,
  getAllNewArrivals,
  getRecommendedProducts,
  getApprovedVendors,
  getCatalogBrands,
} from "../data/catalogData";
import PageTransition from "../../../shared/components/PageTransition";
import usePullToRefresh from "../hooks/usePullToRefresh";
import toast from "react-hot-toast";
import api from "../../../shared/utils/api";
import { useCategoryStore } from "../../../shared/store/categoryStore";
import heroSlide1 from "../../../../data/hero/slide1.png";
import heroSlide2 from "../../../../data/hero/slide2.png";
import heroSlide3 from "../../../../data/hero/slide3.png";
import heroSlide4 from "../../../../data/hero/slide4.png";
import stylishWatchImg from "../../../../data/products/stylish watch.png";

const normalizeId = (value) => String(value ?? "").trim();
const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeProduct = (raw) => {
  const vendorObj =
    raw?.vendor && typeof raw.vendor === "object"
      ? raw.vendor
      : raw?.vendorId && typeof raw.vendorId === "object"
        ? raw.vendorId
        : null;
  const brandObj =
    raw?.brand && typeof raw.brand === "object"
      ? raw.brand
      : raw?.brandId && typeof raw.brandId === "object"
        ? raw.brandId
        : null;
  const categoryObj =
    raw?.category && typeof raw.category === "object"
      ? raw.category
      : raw?.categoryId && typeof raw.categoryId === "object"
        ? raw.categoryId
        : null;

  const id = normalizeId(raw?.id || raw?._id);
  const vendorId = normalizeId(vendorObj?._id || vendorObj?.id || raw?.vendorId);
  const brandId = normalizeId(brandObj?._id || brandObj?.id || raw?.brandId);
  const categoryId = normalizeId(
    categoryObj?._id || categoryObj?.id || raw?.categoryId
  );
  const image = raw?.image || raw?.images?.[0] || "";

  return {
    ...raw,
    id,
    _id: id,
    vendorId,
    vendorName: raw?.vendorName || vendorObj?.storeName || vendorObj?.name || "",
    brandId,
    brandName: raw?.brandName || brandObj?.name || "",
    categoryId,
    categoryName: raw?.categoryName || categoryObj?.name || "",
    image,
    images: Array.isArray(raw?.images) ? raw.images : image ? [image] : [],
    price: toNumber(raw?.price, 0),
    originalPrice:
      raw?.originalPrice !== undefined ? toNumber(raw.originalPrice, undefined) : undefined,
    rating: toNumber(raw?.rating, 0),
    reviewCount: toNumber(raw?.reviewCount, 0),
    isActive: raw?.isActive !== false,
    flashSale: !!raw?.flashSale,
    isNew: !!raw?.isNewArrival,
  };
};

const normalizeVendor = (raw) => ({
  ...raw,
  id: normalizeId(raw?.id || raw?._id),
  _id: normalizeId(raw?.id || raw?._id),
  isVerified: !!raw?.isVerified,
  rating: toNumber(raw?.rating, 0),
  reviewCount: toNumber(raw?.reviewCount, 0),
  status: raw?.status || "approved",
});

const normalizeBrand = (raw) => ({
  ...raw,
  id: normalizeId(raw?.id || raw?._id),
  _id: normalizeId(raw?.id || raw?._id),
  name: raw?.name || "",
  logo: raw?.logo || "",
});

const deriveDailyDeals = (products = []) => {
  const flash = products.filter((p) => p.flashSale);
  const discounted = products.filter(
    (p) =>
      p.originalPrice !== undefined &&
      toNumber(p.originalPrice, 0) > toNumber(p.price, 0) &&
      !p.flashSale
  );
  const merged = [...flash, ...discounted];
  return merged.filter(
    (p, index, arr) =>
      index === arr.findIndex((x) => normalizeId(x.id) === normalizeId(p.id))
  );
};

const DEFAULT_HERO_SLIDES = [
  { image: heroSlide1 },
  { image: heroSlide2 },
  { image: heroSlide3 },
  { image: heroSlide4 },
];

const extractResponseData = (response) => {
  if (response && typeof response === "object") {
    if (Object.prototype.hasOwnProperty.call(response, "data")) {
      return response.data;
    }
    return response;
  }
  return null;
};

const asList = (value) => (Array.isArray(value) ? value : []);
const KNOWN_USER_ROUTE_PATTERNS = [
  "/",
  "/home",
  "/search",
  "/offers",
  "/daily-deals",
  "/flash-sale",
  "/new-arrivals",
  "/categories",
  "/category/:id",
  "/brand/:id",
  "/seller/:id",
  "/product/:id",
  "/sale/:slug",
  "/track-order/:orderId",
];

const getPathnameFromTarget = (target) =>
  String(target || "").trim().split("?")[0].split("#")[0];

const isKnownInternalRoute = (target) => {
  const pathname = getPathnameFromTarget(target);
  if (!pathname) return false;
  return KNOWN_USER_ROUTE_PATTERNS.some((pattern) =>
    !!matchPath({ path: pattern, end: true }, pathname)
  );
};

const resolveBannerLink = (banner) => {
  const candidate = String(
    banner?.linkUrl || banner?.link || banner?.url || ""
  ).trim();
  if (!candidate) return "";
  if (isExternalLink(candidate)) return candidate;
  if (isSafeInternalPath(candidate) && isKnownInternalRoute(candidate))
    return candidate;
  return "";
};

const isExternalLink = (target) => /^https?:\/\//i.test(String(target || "").trim());
const isSafeInternalPath = (target) => String(target || "").startsWith("/");

const MobileHome = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [autoSlidePaused, setAutoSlidePaused] = useState(false);
  const [isDraggingSlide, setIsDraggingSlide] = useState(false);
  const [slides, setSlides] = useState(DEFAULT_HERO_SLIDES);
  const [promoBanners, setPromoBanners] = useState([]);
  const [sideBanner, setSideBanner] = useState(null);
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [homeVendors, setHomeVendors] = useState([]);
  const [homeBrands, setHomeBrands] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const { categories: storeCategories, initialize: initCategories, getRootCategories } = useCategoryStore();

  useEffect(() => { initCategories(); }, [initCategories]);

  // Listen for category selection events from the header
  useEffect(() => {
    const handleCategorySelect = (e) => {
      const catId = e.detail?.categoryId;
      setSelectedCategoryId(catId || null);
    };
    window.addEventListener('home-category-select', handleCategorySelect);
    return () => window.removeEventListener('home-category-select', handleCategorySelect);
  }, []);

  // Get root categories for category tab bar
  const rootCategories = useMemo(() => {
    return getRootCategories().filter(c => c.isActive !== false);
  }, [storeCategories, getRootCategories]);

  // Import fallback categories for name resolution
  // The header uses hardcoded IDs (1-6) from data/categories.js
  // We need to resolve these to actual category names for filtering
  const headerCategories = useMemo(() => {
    // Lazy import to avoid circular deps
    try {
      const cats = require('../../../../data/categories').categories;
      return Array.isArray(cats) ? cats : [];
    } catch { return []; }
  }, []);

  // Resolve the selected header category to actual DB category IDs
  const resolvedCategoryIds = useMemo(() => {
    if (!selectedCategoryId) return [];
    // Find the header category name by its hardcoded ID
    const headerCat = headerCategories.find(c => String(c.id) === normalizeId(selectedCategoryId));
    const catName = headerCat?.name?.toLowerCase() || '';
    if (!catName) return [normalizeId(selectedCategoryId)];
    
    // Find all store categories that match this name (root + children)
    const matchingRoot = rootCategories.find(c => c.name?.toLowerCase() === catName);
    if (!matchingRoot) return [normalizeId(selectedCategoryId)];
    
    // Return the root ID + all child category IDs
    const rootId = normalizeId(matchingRoot.id || matchingRoot._id);
    const childIds = storeCategories
      .filter(c => {
        const parentId = typeof c.parentId === 'object' ? (c.parentId?._id || c.parentId?.id) : c.parentId;
        return normalizeId(parentId) === rootId;
      })
      .map(c => normalizeId(c.id || c._id));
    
    // Also get grandchildren
    const grandChildIds = storeCategories
      .filter(c => {
        const parentId = typeof c.parentId === 'object' ? (c.parentId?._id || c.parentId?.id) : c.parentId;
        return childIds.includes(normalizeId(parentId));
      })
      .map(c => normalizeId(c.id || c._id));
    
    return [rootId, ...childIds, ...grandChildIds];
  }, [selectedCategoryId, headerCategories, rootCategories, storeCategories]);

  // Products filtered by selected category
  const categoryFilteredProducts = useMemo(() => {
    if (!selectedCategoryId || catalogProducts.length === 0) return [];
    if (resolvedCategoryIds.length === 0) return [];
    return catalogProducts.filter(p => {
      const catId = normalizeId(p.categoryId);
      return resolvedCategoryIds.includes(catId);
    });
  }, [selectedCategoryId, catalogProducts, resolvedCategoryIds]);

  // Selected category name
  const selectedCategoryName = useMemo(() => {
    if (!selectedCategoryId) return '';
    const headerCat = headerCategories.find(c => String(c.id) === normalizeId(selectedCategoryId));
    if (headerCat) return headerCat.name;
    const cat = rootCategories.find(c => normalizeId(c.id || c._id) === normalizeId(selectedCategoryId));
    return cat?.name || 'Category';
  }, [selectedCategoryId, headerCategories, rootCategories]);

  const fallbackMostPopular = getMostPopular();
  const fallbackTrending = getTrending();
  const fallbackFlashSale = getFlashSale();
  const fallbackNewArrivals = getAllNewArrivals().slice(0, 6);
  const fallbackDailyDeals = getDailyDeals().slice(0, 5);
  const fallbackRecommended = getRecommendedProducts(6);
  const fallbackVendors = getApprovedVendors();
  const fallbackBrands = getCatalogBrands().slice(0, 10);

  const computedNewArrivals = useMemo(() => {
    if (catalogProducts.length === 0) return fallbackNewArrivals;
    return catalogProducts.filter((p) => p.isNew).slice(0, 6);
  }, [catalogProducts, fallbackNewArrivals]);

  const computedDailyDeals = useMemo(() => {
    if (catalogProducts.length === 0) return fallbackDailyDeals;
    return deriveDailyDeals(catalogProducts).slice(0, 5);
  }, [catalogProducts, fallbackDailyDeals]);

  const computedRecommended = useMemo(() => {
    if (catalogProducts.length === 0) return fallbackRecommended;
    return [...catalogProducts]
      .sort((a, b) => toNumber(b.rating, 0) - toNumber(a.rating, 0))
      .slice(0, 6);
  }, [catalogProducts, fallbackRecommended]);

  const computedMostPopular = useMemo(() => {
    if (catalogProducts.length === 0) return fallbackMostPopular.slice(0, 6);
    return [...catalogProducts]
      .sort((a, b) => {
        const reviewsDiff = toNumber(b.reviewCount, 0) - toNumber(a.reviewCount, 0);
        if (reviewsDiff !== 0) return reviewsDiff;
        return toNumber(b.rating, 0) - toNumber(a.rating, 0);
      })
      .slice(0, 6);
  }, [catalogProducts, fallbackMostPopular]);

  const computedTrending = useMemo(() => {
    if (catalogProducts.length === 0) return fallbackTrending.slice(0, 6);
    return [...catalogProducts]
      .sort((a, b) => {
        const ratingDiff = toNumber(b.rating, 0) - toNumber(a.rating, 0);
        if (ratingDiff !== 0) return ratingDiff;
        return toNumber(b.reviewCount, 0) - toNumber(a.reviewCount, 0);
      })
      .slice(0, 6);
  }, [catalogProducts, fallbackTrending]);

  const computedFlashSale = useMemo(() => {
    if (catalogProducts.length === 0) return fallbackFlashSale.slice(0, 6);
    return catalogProducts.filter((product) => product.flashSale).slice(0, 6);
  }, [catalogProducts, fallbackFlashSale]);

  const computedVendors = useMemo(() => {
    if (homeVendors.length === 0) return fallbackVendors;
    return [...homeVendors]
      .filter((vendor) => vendor.status === "approved")
      .sort((a, b) => toNumber(b.rating, 0) - toNumber(a.rating, 0))
      .slice(0, 10);
  }, [homeVendors, fallbackVendors]);

  const computedBrands = useMemo(() => {
    if (homeBrands.length === 0) return fallbackBrands;
    return homeBrands.slice(0, 10);
  }, [homeBrands, fallbackBrands]);

  const fetchHomeData = useCallback(async () => {
    try {
      const [productsRes, vendorsRes, brandsRes, bannersRes] =
        await Promise.allSettled([
          api.get("/products", { params: { page: 1, limit: 120 } }),
          api.get("/vendors/all", {
            params: { status: "approved", page: 1, limit: 50 },
          }),
          api.get("/brands/all"),
          api.get("/banners"),
        ]);

      if (productsRes.status === "fulfilled") {
        const payload = extractResponseData(productsRes.value);
        const productsSource = asList(payload?.products);
        const normalizedProducts = productsSource
          .map(normalizeProduct)
          .filter((product) => product.id && product.isActive !== false);
        setCatalogProducts(normalizedProducts);
      }

      if (vendorsRes.status === "fulfilled") {
        const payload = extractResponseData(vendorsRes.value);
        const vendorsSource = asList(payload?.vendors);
        setHomeVendors(
          vendorsSource
            .map(normalizeVendor)
            .filter((vendor) => vendor.id)
        );
      }

      if (brandsRes.status === "fulfilled") {
        const payload = extractResponseData(brandsRes.value);
        const brandsSource = asList(payload);
        setHomeBrands(
          brandsSource
            .map(normalizeBrand)
            .filter((brand) => brand.id)
        );
      }

      if (bannersRes.status === "fulfilled") {
        const payload = extractResponseData(bannersRes.value);
        const allBanners = asList(payload).filter(
          (banner) => banner?.image && banner?.isActive !== false
        );

        const bannerSlides = allBanners
          .filter((banner) =>
            ["home_slider", "hero"].includes(String(banner?.type || ""))
          )
          .sort((a, b) => toNumber(a.order, 0) - toNumber(b.order, 0))
          .map((banner, index) => ({
            id: normalizeId(banner._id || banner.id || `home-slide-${index}`),
            image: banner.image,
            link: resolveBannerLink(banner),
            title: banner.title || "",
          }));
        setSlides(bannerSlides.length > 0 ? bannerSlides : DEFAULT_HERO_SLIDES);

        const banners = allBanners
          .filter((banner) => String(banner?.type || "") === "promotional")
          .sort((a, b) => toNumber(a.order, 0) - toNumber(b.order, 0))
          .map((banner, index) => ({
            id: normalizeId(banner._id || banner.id || `promo-banner-${index}`),
            title: banner.title || "Special Offer",
            subtitle: banner.subtitle || "Limited Time",
            description: banner.description || "",
            discount: banner.description || "Shop Now",
            link: resolveBannerLink(banner),
            image: banner.image,
            type: banner.type || "promotional",
          }));
        setPromoBanners(banners);

        const mapped = allBanners
          .filter((banner) => String(banner?.type || "") === "side_banner")
          .sort((a, b) => toNumber(a.order, 0) - toNumber(b.order, 0))
          .map((banner, index) => ({
            id: normalizeId(banner._id || banner.id || `side-banner-${index}`),
            image: banner.image,
            title: banner.title || "PREMIUM",
            subtitle: banner.subtitle || "Exclusive Collection",
            link: resolveBannerLink(banner),
          }));
        setSideBanner(mapped[0] || null);
      } else {
        setSlides(DEFAULT_HERO_SLIDES);
        setPromoBanners([]);
        setSideBanner(null);
      }
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    fetchHomeData();
  }, [fetchHomeData]);

  // Auto-slide functionality (pauses when user is dragging)
  useEffect(() => {
    if (autoSlidePaused) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [slides.length, autoSlidePaused]);

  // Minimum swipe distance (in pixels) to trigger slide change
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    e.stopPropagation(); // Prevent pull-to-refresh from interfering
    setTouchEnd(null);
    setIsDraggingSlide(false);
    const touch = e.targetTouches[0];
    setTouchStart(touch.clientX);
    setDragOffset(0);
    setAutoSlidePaused(true);
  };

  const onTouchMove = (e) => {
    if (touchStart === null) return;
    e.stopPropagation(); // Prevent pull-to-refresh from interfering
    const touch = e.targetTouches[0];
    const currentX = touch.clientX;
    // Calculate difference: positive when swiping left, negative when swiping right
    const diff = touchStart - currentX;
    if (Math.abs(diff) > 8) {
      setIsDraggingSlide(true);
    }
    // Constrain the drag offset to prevent over-dragging
    // Use container width for better responsiveness
    const containerWidth = e.currentTarget?.offsetWidth || 400;
    const maxDrag = containerWidth * 0.5; // Maximum drag distance (50% of container)
    // dragOffset: positive = swiping left (show next), negative = swiping right (show previous)
    setDragOffset(Math.max(-maxDrag, Math.min(maxDrag, diff)));
    setTouchEnd(currentX);
  };

  const onTouchEnd = (e) => {
    if (e) e.stopPropagation(); // Prevent pull-to-refresh from interfering

    if (touchStart === null) {
      setAutoSlidePaused(false);
      return;
    }

    // Calculate swipe distance: positive = left swipe, negative = right swipe
    const distance = touchStart - (touchEnd || touchStart);
    const isLeftSwipe = distance > minSwipeDistance; // Finger moved left = show next slide
    const isRightSwipe = distance < -minSwipeDistance; // Finger moved right = show previous slide

    if (isLeftSwipe) {
      // Swipe left (finger moved left) - go to next slide (slide moves left)
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    } else if (isRightSwipe) {
      // Swipe right (finger moved right) - go to previous slide (slide moves right)
      setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    }

    // Reset touch state
    setTouchStart(null);
    setTouchEnd(null);
    setDragOffset(0);

    // Resume auto-slide after a short delay
    setTimeout(() => {
      setAutoSlidePaused(false);
    }, 2000);
    setTimeout(() => {
      setIsDraggingSlide(false);
    }, 150);
  };

  const handleSlideClick = (slide) => {
    if (isDraggingSlide) return;
    const target = String(slide?.link || "").trim();
    if (!target) return;

    if (isExternalLink(target)) {
      window.open(target, "_blank", "noopener,noreferrer");
      return;
    }
    if (isSafeInternalPath(target)) {
      navigate(target);
    }
  };

  const handleBannerNavigation = (target) => {
    const normalizedTarget = String(target || "").trim();
    if (!normalizedTarget) return;
    if (isExternalLink(normalizedTarget)) {
      window.open(normalizedTarget, "_blank", "noopener,noreferrer");
      return;
    }
    if (isSafeInternalPath(normalizedTarget) && isKnownInternalRoute(normalizedTarget)) {
      navigate(normalizedTarget);
    }
  };

  // Pull to refresh handler
  const handleRefresh = async () => {
    const ok = await fetchHomeData();
    if (!ok) {
      toast.error("Refresh failed. Showing available data.");
      return;
    }
    toast.success("Refreshed");
  };

  const {
    pullDistance,
    isPulling,
    elementRef,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = usePullToRefresh(handleRefresh);

  return (
    <PageTransition>
      <MobileLayout>
        <div
          ref={elementRef}
          className="w-full"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            transform: `translateY(${Math.min(pullDistance, 80)}px)`,
            transition: isPulling ? "none" : "transform 0.3s ease-out",
          }}>
          {/* Hero Banner - Compact */}
          <div className="px-5 pt-2 pb-1">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div
                className="relative w-full aspect-[2.2/1] md:aspect-[21/9] lg:h-[320px] xl:h-[360px] rounded-xl overflow-hidden lg:col-span-2"
                data-carousel
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                style={{ touchAction: "pan-y", userSelect: "none" }}>
                <motion.div
                  className="flex h-full"
                  style={{
                    width: `${slides.length * 100}%`,
                    height: "100%",
                  }}
                  animate={{
                    x:
                      dragOffset !== 0
                        ? `calc(-${currentSlide * (100 / slides.length)
                        }% - ${dragOffset}px)`
                        : `-${currentSlide * (100 / slides.length)}%`,
                  }}
                  transition={{
                    duration: dragOffset !== 0 ? 0 : 0.6,
                    ease: [0.25, 0.46, 0.45, 0.94],
                    type: "tween",
                  }}>
                  {slides.map((slide, index) => (
                    <div
                      key={index}
                      className="flex-shrink-0"
                      onClick={() => handleSlideClick(slide)}
                      style={{
                        width: `${100 / slides.length}%`,
                        height: "100%",
                        cursor: slide?.link ? "pointer" : "default",
                      }}>
                      <LazyImage
                        src={slide.image}
                        alt={`Slide ${index + 1}`}
                        className="w-full h-full object-cover pointer-events-none select-none"
                        draggable={false}
                        onError={(e) => {
                          e.target.src = `https://via.placeholder.com/400x200?text=Slide+${index + 1
                            }`;
                        }}
                      />
                    </div>
                  ))}
                </motion.div>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 pointer-events-none">
                  {slides.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setCurrentSlide(index);
                        setAutoSlidePaused(true);
                        setTimeout(() => setAutoSlidePaused(false), 2000);
                      }}
                      className={`h-1 rounded-full transition-all pointer-events-auto ${index === currentSlide
                        ? "bg-white w-5"
                        : "bg-gray-500 w-1.5"
                        }`}
                    />
                  ))}
                </div>
              </div>

              {/* Side Banner for Large Screens */}
              <div className="hidden lg:block lg:col-span-1 h-[320px] xl:h-[360px] rounded-xl overflow-hidden relative bg-gray-900 group">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/90 z-10" />
                <LazyImage
                  src={sideBanner?.image || stylishWatchImg}
                  alt={sideBanner?.title || "Premium Watch"}
                  className="w-full h-full object-contain p-6 group-hover:scale-110 transition-transform duration-700"
                  onError={(e) => {
                    e.target.src = "https://via.placeholder.com/400x400?text=Premium+Watch";
                  }}
                />
                <div className="absolute inset-x-0 bottom-0 p-6 z-20 flex flex-col items-center text-center">
                  <span className="text-yellow-400 font-bold text-2xl mb-1 drop-shadow-lg">
                    {sideBanner?.title || "PREMIUM"}
                  </span>
                  <p className="text-gray-300 text-sm mb-4 font-medium">
                    {sideBanner?.subtitle || "Exclusive Collection"}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleBannerNavigation(sideBanner?.link || "/offers")}
                    className="bg-white text-gray-900 font-bold py-3 px-8 rounded-xl w-full hover:bg-gray-100 transition-all transform hover:-translate-y-1 shadow-lg hover:shadow-xl uppercase text-sm"
                  >
                    Shop Now
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Category-Filtered Product Results (shown when a category is selected) ─── */}
          {selectedCategoryId && (
            <div className="px-5 pt-2 pb-1">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-base font-black text-gray-900 uppercase tracking-tight">
                  {selectedCategoryName}'s COLLECTION
                </h2>
                <Link
                  to={`/category/${selectedCategoryId}`}
                  className="flex items-center gap-1 text-xs text-primary-600 font-bold uppercase">
                  <span>VIEW ALL</span>
                  <FiArrowRight className="text-xs" />
                </Link>
              </div>
              {categoryFilteredProducts.length > 0 ? (
                <div className="premium-product-grid">
                  {categoryFilteredProducts.slice(0, 9).map((product, index) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}>
                      <ProductCard product={product} />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <span className="text-3xl mb-2">🔍</span>
                  <p className="text-xs text-gray-500 font-medium">No products found in this category</p>
                </div>
              )}
            </div>
          )}

          {/* Brand Logos Scroll */}
          <BrandLogosScroll brands={computedBrands} />

          {/* Most Popular - Moved up, right below banner for compact layout */}
          <div className="px-3 py-2">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-gray-800">Most Popular</h2>
              <Link
                to="/search"
                className="text-xs text-primary-600 font-semibold">
                See All
              </Link>
            </div>
            <div className="flex overflow-x-auto pb-2 -mx-3 px-3 gap-2 snap-x scrollbar-hide">
              {computedMostPopular.map((product, index) => (
                <motion.div
                  key={product.id}
                  className="w-[120px] sm:w-[140px] md:w-[180px] flex-shrink-0 snap-center"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}>
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </div>
          </div>

          {/* Categories */}
          <MobileCategoryGrid />

          {/* Animated Banner */}
          <AnimatedBanner banners={promoBanners} />

          {/* Featured Vendors Section */}
          <FeaturedVendorsSection vendors={computedVendors} />

          {/* New Arrivals */}
          <NewArrivalsSection products={computedNewArrivals} />



          {/* Trending Now - Compact */}
          <div className="px-5 py-2">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-gray-800">Trending Now</h2>
              <Link
                to="/search"
                className="text-xs text-primary-600 font-semibold">
                See All
              </Link>
            </div>
            <div className="flex overflow-x-auto pb-2 -mx-5 px-5 gap-2 snap-x scrollbar-hide">
              {computedTrending.map((product, index) => (
                <motion.div
                  key={product.id}
                  className="w-[120px] sm:w-[140px] md:w-[180px] flex-shrink-0 snap-center"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}>
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </div>
          </div>

          {/* Daily Deals */}
          <DailyDealsSection products={computedDailyDeals} />



          {/* Flash Sale - Compact */}
          {computedFlashSale.length > 0 && (
            <div className="px-5 py-2 bg-gradient-to-br from-red-50 to-orange-50">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="text-base font-bold text-gray-800">
                    Flash Sale
                  </h2>
                  <p className="text-[10px] text-gray-600">Limited time offers</p>
                </div>
                <Link
                  to="/flash-sale"
                  className="text-xs text-primary-600 font-semibold">
                  See All
                </Link>
              </div>
              <div className="flex overflow-x-auto pb-2 -mx-5 px-5 gap-2 snap-x scrollbar-hide">
                {computedFlashSale.map((product, index) => (
                  <motion.div
                    key={product.id}
                    className="w-[120px] sm:w-[140px] md:w-[180px] flex-shrink-0 snap-center"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}>
                    <ProductCard product={product} isFlashSale={true} />
                  </motion.div>
                ))}
              </div>
            </div>
          )}



          {/* Recommended for You */}
          <RecommendedSection products={computedRecommended} />

          {/* Tagline Section - Compact */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="px-3 py-6 text-left">
            <motion.h2
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-400 leading-tight flex items-center justify-start gap-2 flex-wrap"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.15 }}>
              <span>Shop from 50+ Trusted Vendors</span>
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                className="text-primary-500 inline-block">
                <FiHeart className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl fill-primary-500" />
              </motion.span>
            </motion.h2>
          </motion.div>

          {/* Bottom Spacing */}
          <div className="h-2" />
        </div>
      </MobileLayout>
    </PageTransition>
  );
};

export default MobileHome;

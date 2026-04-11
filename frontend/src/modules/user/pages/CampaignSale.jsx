import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import { motion } from "framer-motion";
import MobileLayout from "../components/Layout/MobileLayout";
import ProductCard from "../../../shared/components/ProductCard";
import PageTransition from "../../../shared/components/PageTransition";
import api from "../../../shared/utils/api";

const normalizeProduct = (raw) => {
  const vendorObj =
    raw?.vendorId && typeof raw.vendorId === "object" ? raw.vendorId : null;
  const brandObj =
    raw?.brandId && typeof raw.brandId === "object" ? raw.brandId : null;
  const categoryObj =
    raw?.categoryId && typeof raw.categoryId === "object" ? raw.categoryId : null;

  return {
    ...raw,
    id: raw?._id || raw?.id,
    vendorId: vendorObj?._id || raw?.vendorId,
    brandId: brandObj?._id || raw?.brandId,
    categoryId: categoryObj?._id || raw?.categoryId,
    vendorName: raw?.vendorName || vendorObj?.storeName || "",
    brandName: raw?.brandName || brandObj?.name || "",
    categoryName: raw?.categoryName || categoryObj?.name || "",
    image: raw?.image || raw?.images?.[0] || "",
    images: Array.isArray(raw?.images) ? raw.images : [],
    price: Number(raw?.price) || 0,
    originalPrice:
      raw?.originalPrice !== undefined ? Number(raw.originalPrice) : undefined,
    rating: Number(raw?.rating) || 0,
    reviewCount: Number(raw?.reviewCount) || 0,
  };
};

const CampaignSale = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [campaign, setCampaign] = useState(null);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const fetchCampaign = async () => {
      setIsLoading(true);
      try {
        const response = await api.get(`/campaigns/${slug}`);
        const payload = response?.data ?? response;
        if (cancelled) return;
        setCampaign(payload || null);
        
        const campaignDiscountType = payload?.discountType;
        const campaignDiscountValue = Number(payload?.discountValue) || 0;

        const normalizedProducts = Array.isArray(payload?.products)
          ? payload.products.map(product => {
              const normalized = normalizeProduct(product);
              
              // Apply campaign discount if applicable
              if (campaignDiscountValue > 0) {
                if (campaignDiscountType === 'percentage') {
                  normalized.originalPrice = normalized.originalPrice || normalized.price;
                  normalized.price = Math.round(normalized.originalPrice * (1 - campaignDiscountValue / 100));
                } else if (campaignDiscountType === 'fixed') {
                  normalized.originalPrice = normalized.originalPrice || normalized.price;
                  normalized.price = Math.max(0, normalized.originalPrice - campaignDiscountValue);
                }
              }
              
              return normalized;
          })
          : [];
        setProducts(normalizedProducts);
      } catch {
        if (!cancelled) {
          setCampaign(null);
          setProducts([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };
    fetchCampaign();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const title = useMemo(() => campaign?.name || "Special Offer", [campaign]);
  const discount = useMemo(() => {
    if (!campaign) return "";
    if (campaign.discountType === "percentage") {
      return `${campaign.discountValue || 0}% OFF`;
    }
    return `Save ${campaign.discountValue || 0}`;
  }, [campaign]);

  return (
    <PageTransition>
      <div className="w-full min-h-screen bg-white">
        <div className="px-4 py-8">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 animate-pulse">
              <div className="w-12 h-12 bg-gray-200 rounded-full mb-4"></div>
              <div className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Loading campaign...</div>
            </div>
          ) : !campaign ? (
            <div className="text-center py-20 bg-gray-50 rounded-3xl mx-4 border border-dashed border-gray-200">
              <h3 className="text-lg font-black text-gray-900 mb-2 uppercase tracking-tight">Campaign unavailable</h3>
              <p className="text-gray-500 text-sm">This offer is not active right now.</p>
              <button onClick={() => navigate('/')} className="mt-6 px-8 py-3 bg-black text-white rounded-full text-xs font-black uppercase tracking-widest">Return Home</button>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 rounded-3xl mx-4 border border-dashed border-gray-200">
              <h3 className="text-lg font-black text-gray-900 mb-2 uppercase tracking-tight">No products found</h3>
              <p className="text-gray-500 text-sm">Please check back later for exciting offers.</p>
              <button onClick={() => navigate('/')} className="mt-6 px-8 py-3 dark:bg-black text-white rounded-full text-xs font-black uppercase tracking-widest">Explore Others</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6">
              {products.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ 
                    duration: 0.6,
                    delay: (index % 10) * 0.05,
                    ease: [0.21, 1.11, 0.81, 0.99]
                  }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default CampaignSale;

import { useEffect } from "react";
import api from "../utils/api";

const PRODUCTS_CACHE_KEY = "user-catalog-products-cache";
const VENDORS_CACHE_KEY = "user-catalog-vendors-cache";
const BRANDS_CACHE_KEY = "user-catalog-brands-cache";

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
    images: Array.isArray(raw?.images) ? raw.images : raw?.image ? [raw.image] : [],
  };
};

const normalizeVendor = (raw) => ({
  ...raw,
  id: raw?._id || raw?.id,
});

const normalizeBrand = (raw) => ({
  ...raw,
  id: raw?._id || raw?.id,
});

const AppBootstrap = () => {
  useEffect(() => {
    let cancelled = false;

    const syncCatalog = async () => {
      // Small delay to let initial mounting stabilize
      await new Promise(r => setTimeout(r, 100));
      if (cancelled) return;

      try {
        const [productsRes, vendorsRes, brandsRes] = await Promise.allSettled([
          api.get("/products", { params: { page: 1, limit: 500 } }),
          api.get("/vendors/all", { params: { status: "approved", page: 1, limit: 200 } }),
          api.get("/brands/all"),
        ]);

        let updated = false;

        if (productsRes.status === "fulfilled" && !cancelled) {
          const payload = productsRes.value?.data;
          const list = Array.isArray(payload?.products)
            ? payload.products.map(normalizeProduct)
            : [];
          if (list.length) {
            const current = localStorage.getItem(PRODUCTS_CACHE_KEY);
            const nextStr = JSON.stringify(list);
            if (current !== nextStr) {
              localStorage.setItem(PRODUCTS_CACHE_KEY, nextStr);
              updated = true;
            }
          }
        }

        if (vendorsRes.status === "fulfilled" && !cancelled) {
          const payload = vendorsRes.value?.data;
          const list = Array.isArray(payload?.vendors)
            ? payload.vendors.map(normalizeVendor)
            : [];
          if (list.length) {
            const current = localStorage.getItem(VENDORS_CACHE_KEY);
            const nextStr = JSON.stringify(list);
            if (current !== nextStr) {
              localStorage.setItem(VENDORS_CACHE_KEY, nextStr);
              updated = true;
            }
          }
        }

        if (brandsRes.status === "fulfilled" && !cancelled) {
          const payload = brandsRes.value?.data;
          const list = Array.isArray(payload) ? payload.map(normalizeBrand) : [];
          if (list.length) {
            const current = localStorage.getItem(BRANDS_CACHE_KEY);
            const nextStr = JSON.stringify(list);
            if (current !== nextStr) {
              localStorage.setItem(BRANDS_CACHE_KEY, nextStr);
              updated = true;
            }
          }
        }

        if (updated && !cancelled) {
          window.dispatchEvent(new Event("catalog-cache-updated"));
        }
      } catch {
        // Keep static fallback silently.
      }
    };

    syncCatalog();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
};

export default AppBootstrap;

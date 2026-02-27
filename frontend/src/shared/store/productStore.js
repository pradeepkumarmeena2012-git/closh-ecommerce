import { create } from 'zustand';
import api from '../utils/api';
import toast from 'react-hot-toast';

const normalizeProduct = (p) => {
    const originalPrice = p.originalPrice || p.price || 0;
    const discountedPrice = p.discountedPrice || p.price || 0;
    const discountValue = p.discount || (originalPrice > discountedPrice ? `${Math.round(((originalPrice - discountedPrice) / originalPrice) * 100)}% OFF` : null);

    return {
        ...p,
        id: p._id || p.id,
        stockQuantity: p.stockQuantity ?? 0,
        price: discountedPrice,
        discountedPrice: discountedPrice,
        originalPrice: originalPrice,
        discount: discountValue,
        image: p.image || p.images?.[0] || 'https://via.placeholder.com/400x500?text=Product',
        images: Array.isArray(p.images) && p.images.length > 0 ? p.images : (p.image ? [p.image] : []),
        brand: p.brandName || p.brandId?.name || p.brand || 'Appzeto',
        category: p.categoryName || p.categoryId?.name || p.category || 'General',
        vendor: p.vendorName || p.vendorId?.storeName || 'Clothify'
    };
};

export const useProductStore = create((set, get) => ({
    products: [],
    isLoading: false,
    pagination: {
        total: 0,
        page: 1,
        limit: 10,
        pages: 1
    },

    fetchPublicProducts: async (params = {}) => {
        set({ isLoading: true });
        try {
            // Backend maps /products to Public routes
            const response = await api.get('/products', { params });
            const payload = response?.data || response;
            const productsList = Array.isArray(payload?.products) ? payload.products : [];
            const normalized = productsList.map(normalizeProduct);

            set({
                products: normalized,
                pagination: payload.pagination || {
                    total: payload.total || 0,
                    page: payload.page || 1,
                    pages: payload.pages || 1,
                    limit: params.limit || 20
                },
                isLoading: false
            });
        } catch (error) {
            set({ isLoading: false });
            // Suppress error toast for public listing unless it's critical
        }
    },

    fetchProductById: async (id) => {
        // First check locally
        const existing = get().products.find(p => String(p.id) === String(id));
        if (existing) return existing;

        try {
            const response = await api.get(`/products/${id}`);
            const payload = response?.data || response;
            return normalizeProduct(payload);
        } catch (error) {
            return null;
        }
    }
}));

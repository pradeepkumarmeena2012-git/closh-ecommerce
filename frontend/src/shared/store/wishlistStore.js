import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import api from '../utils/api';
import { useAuthStore } from './authStore';

const isMongoId = (value) => /^[a-fA-F0-9]{24}$/.test(String(value || ''));

const normalizeWishlistItem = (item) => {
  const product = item?.productId || item;
  return {
    id: product?.id || product?._id || item?.id,
    name: product?.name || item?.name || 'Product',
    price: Number(product?.price ?? item?.price ?? 0),
    image: product?.image || item?.image || '',
    stock: product?.stock || item?.stock,
    productId: product?._id || item?.id,
  };
};

export const useWishlistStore = create(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,
      hasFetched: false,

      fetchWishlist: async () => {
        const authState = useAuthStore.getState();
        if (!authState?.isAuthenticated) {
          return get().items;
        }

        set({ isLoading: true });
        try {
          const response = await api.get('/user/wishlist');
          const payload = response?.data ?? response;
          const list = Array.isArray(payload) ? payload.map(normalizeWishlistItem) : [];
          set({ items: list, isLoading: false, hasFetched: true });
          return list;
        } catch {
          set({ isLoading: false });
          return get().items;
        }
      },

      ensureHydrated: () => {
        const authState = useAuthStore.getState();
        const state = get();
        if (authState?.isAuthenticated && !state.hasFetched && !state.isLoading) {
          state.fetchWishlist().catch(() => null);
        }
      },

      // Add item to wishlist
      addItem: (item) => {
        set((state) => {
          const existingItem = state.items.find((i) => i.id === item.id);
          if (existingItem) {
            return state; // Item already in wishlist
          }
          return {
            items: [...state.items, { ...item }],
          };
        });

        const authState = useAuthStore.getState();
        if (authState?.isAuthenticated && isMongoId(item?.id)) {
          api.post('/user/wishlist', { productId: String(item.id) }).catch(() => null);
        }
      },

      // Remove item from wishlist
      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));

        const authState = useAuthStore.getState();
        if (authState?.isAuthenticated && isMongoId(id)) {
          api.delete(`/user/wishlist/${id}`).catch(() => null);
        }
      },

      // Check if item is in wishlist
      isInWishlist: (id) => {
        get().ensureHydrated();
        const state = get();
        return state.items.some((item) => item.id === id);
      },

      // Clear wishlist
      clearWishlist: () => {
        const items = [...get().items];
        set({ items: [] });

        const authState = useAuthStore.getState();
        if (authState?.isAuthenticated) {
          items
            .filter((item) => isMongoId(item.id))
            .forEach((item) => {
              api.delete(`/user/wishlist/${item.id}`).catch(() => null);
            });
        }
      },

      // Get wishlist count
      getItemCount: () => {
        get().ensureHydrated();
        const state = get();
        return state.items.length;
      },

      // Move item from wishlist to cart (returns item for cart)
      moveToCart: (id) => {
        const state = get();
        const item = state.items.find((i) => i.id === id);
        if (item) {
          set({
            items: state.items.filter((i) => i.id !== id),
          });

          const authState = useAuthStore.getState();
          if (authState?.isAuthenticated && isMongoId(id)) {
            api.delete(`/user/wishlist/${id}`).catch(() => null);
          }

          return item;
        }
        return null;
      },

      resetWishlist: () => {
        set({ items: [], hasFetched: false });
      },
    }),
    {
      name: 'wishlist-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);


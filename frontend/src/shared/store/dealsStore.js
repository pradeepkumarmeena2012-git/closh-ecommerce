import { create } from 'zustand';
import api from '../utils/api';

export const useDealsStore = create((set, get) => ({
    deals: [],
    isLoading: false,
    error: null,
    hasFetched: false,

    initialize: async () => {
        if (get().hasFetched) return;
        set({ isLoading: true });
        try {
            // Re-mapping to existing Campaigns API with daily_deal type
            const response = await api.get('/campaigns', { params: { type: 'daily_deal' } });
            const payload = response?.data || response;
            const campaigns = Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload) ? payload : []);

            if (campaigns.length > 0) {
                const mappedDeals = campaigns.map(c => ({
                    id: c._id || c.id,
                    name: c.name,
                    promo: c.bannerConfig?.title || (c.discountValue ? `${c.discountValue}${c.discountType === 'percentage' ? '%' : ' OFF'} DISCOUNT` : 'SPECIAL OFFER'),
                    bg: getDealBg(c.type),
                    image: c.bannerConfig?.image || '/placeholder-deal.png',
                    status: 'active'
                }));
                set({ deals: mappedDeals, hasFetched: true });
            } else {
                set({ deals: getDefaultDeals(), hasFetched: true });
            }
        } catch (error) {
            console.warn('Deals API error, using defaults:', error.message);
            set({ deals: getDefaultDeals(), hasFetched: true });
        } finally {
            set({ isLoading: false });
        }
    },

    fetchDeals: async () => {
        set({ isLoading: true });
        try {
            const response = await api.get('/campaigns', { params: { type: 'daily_deal' } });
            const payload = response?.data || response;
            const campaigns = Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload) ? payload : []);

            const mappedDeals = campaigns.map(c => ({
                id: c._id || c.id,
                name: c.name,
                promo: c.bannerConfig?.title || (c.discountValue ? `${c.discountValue}${c.discountType === 'percentage' ? '%' : ' OFF'} DISCOUNT` : 'SPECIAL OFFER'),
                bg: getDealBg(c.type),
                image: c.bannerConfig?.image || '/placeholder-deal.png',
                status: 'active'
            }));
            set({ deals: mappedDeals });
        } catch (error) {
            console.error('Failed to fetch deals:', error);
        } finally {
            set({ isLoading: false });
        }
    },
}));

function getDealBg(type) {
    const bgs = ['bg-rose-50', 'bg-sky-50', 'bg-amber-50', 'bg-emerald-50', 'bg-purple-50'];
    return bgs[Math.floor(Math.random() * bgs.length)];
}

// Default deals data as fallback when API is not ready
function getDefaultDeals() {
    return [
        {
            id: 'default-1',
            name: 'Premium Brands',
            promo: 'UP TO 60% OFF',
            bg: 'bg-rose-50',
            image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&auto=format&fit=crop',
            status: 'active',
        },
        {
            id: 'default-2',
            name: 'Summer Collection',
            promo: 'FLAT 40% OFF',
            bg: 'bg-sky-50',
            image: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400&auto=format&fit=crop',
            status: 'active',
        },
        {
            id: 'default-3',
            name: 'Accessories',
            promo: 'BUY 2 GET 1',
            bg: 'bg-amber-50',
            image: 'https://images.unsplash.com/photo-1611923134239-b9be5816e23c?w=400&auto=format&fit=crop',
            status: 'active',
        },
        {
            id: 'default-4',
            name: 'Footwear',
            promo: 'MIN 50% OFF',
            bg: 'bg-emerald-50',
            image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&auto=format&fit=crop',
            status: 'active',
        },
        {
            id: 'default-5',
            name: 'Urban Styles',
            promo: 'EXTRA 20% OFF',
            bg: 'bg-purple-50',
            image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&auto=format&fit=crop',
            status: 'active',
        },
    ];
}

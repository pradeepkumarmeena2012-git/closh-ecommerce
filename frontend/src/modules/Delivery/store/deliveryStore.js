import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import api from '../../../shared/utils/api';

const normalizeDeliveryBoy = (input) => {
  if (!input) return null;
  // Handle ApiResponse wrapper
  const raw = input.data && input.statusCode ? input.data : input;
  
  const id = raw.id || raw._id;
  const status = raw.status || (raw.isAvailable === false ? 'offline' : 'available');
  return { 
    ...raw, 
    id, 
    _id: id, 
    status,
    bankDetails: raw.bankDetails || {},
    upiId: raw.upiId || '',
    kycStatus: raw.kycStatus || 'none'
  };
};

const mapBackendStatusToUI = (status) => {
  const map = {
    ready_for_pickup: 'pending',
    assigned: 'accepted',
    picked_up: 'picked-up',
    out_for_delivery: 'out-for-delivery',
    delivered: 'delivered'
  };
  return map[status] || status || 'pending';
};

const toAddressLine = (shippingAddress = {}) => {
  const parts = [
    shippingAddress.address,
    shippingAddress.locality,
    shippingAddress.city,
    shippingAddress.state,
    shippingAddress.zipCode || shippingAddress.pincode
  ].filter(Boolean);
  return parts.join(', ');
};

const normalizeOrder = (raw) => {
  if (!raw) return null;
  const shippingAddress = raw?.shippingAddress || {};
  const guestInfo = raw?.guestInfo || {};
  const backendStatus = raw?.status || 'pending';
  const uiStatus = mapBackendStatusToUI(backendStatus);
  const itemCount = Array.isArray(raw?.items) ? raw.items.length : (typeof raw?.items === 'number' ? raw.items : 0);
  const vendorFirst = Array.isArray(raw?.vendorItems) && raw.vendorItems.length > 0 ? raw.vendorItems[0] : null;
  const vendorData = vendorFirst?.vendorId || {};
  
  let vendorAddress = vendorData.shopAddress || (vendorData.address?.street ? `${vendorData.address.street}, ${vendorData.address.city || ''}` : (vendorFirst?.vendorName ? 'Address in notes' : 'Address unavailable'));

  const dropoffCoords = raw?.dropoffLocation?.coordinates;
  const derivedLat = Array.isArray(dropoffCoords) && dropoffCoords.length === 2 && dropoffCoords[1] !== 0 ? dropoffCoords[1] : raw?.latitude || null;
  const derivedLng = Array.isArray(dropoffCoords) && dropoffCoords.length === 2 && dropoffCoords[0] !== 0 ? dropoffCoords[0] : raw?.longitude || null;

  const pickupCoords = raw?.pickupLocation?.coordinates;
  const vendorDataCoords = vendorData?.shopLocation?.coordinates;

  // Priority: Latest Shop Profile > Order Snapshot
  const vendorLat = Array.isArray(vendorDataCoords) && vendorDataCoords.length === 2 && vendorDataCoords[1] !== 0 
    ? vendorDataCoords[1] 
    : (Array.isArray(pickupCoords) && pickupCoords.length === 2 && pickupCoords[1] !== 0 ? pickupCoords[1] : null);

  const vendorLng = Array.isArray(vendorDataCoords) && vendorDataCoords.length === 2 && vendorDataCoords[0] !== 0 
    ? vendorDataCoords[0] 
    : (Array.isArray(pickupCoords) && pickupCoords.length === 2 && pickupCoords[0] !== 0 ? pickupCoords[0] : null);

  return {
    ...raw,
    id: raw?.orderId || raw?._id || raw?.id,
    orderId: raw?.orderId || raw?._id || raw?.id,
    customer: shippingAddress?.name || guestInfo?.name || 'Customer',
    phone: shippingAddress?.phone || shippingAddress?.mobile || guestInfo?.phone || raw?.customerPhone || raw?.phone || '',
    address: toAddressLine(shippingAddress) || 'Address unavailable',
    vendorName: vendorData.storeName || vendorFirst?.vendorName || 'Vendor',
    vendorAddress,
    total: Number(raw?.total ?? 0),
    deliveryEarnings: Number(raw?.deliveryEarnings ?? 0),
    deliveryDistance: Number(raw?.deliveryDistance ?? 0),
    status: uiStatus,
    rawStatus: backendStatus,
    items: Array.isArray(raw?.items) ? raw.items : [],
    itemCount,
    latitude: derivedLat,
    longitude: derivedLng,
    vendorLatitude: vendorLat,
    vendorLongitude: vendorLng,
    paymentMethod: raw?.paymentMethod || 'standard',
    paymentStatus: raw?.paymentStatus || 'pending',
    orderType: raw?.orderType || 'standard',
    isTryAndBuy: raw?.orderType === 'try_and_buy' || raw?.orderType === 'check_and_buy',
    isCheckAndBuy: raw?.orderType === 'check_and_buy',
    tryAndBuyCompleted: !!raw?.deliveryFlow?.tryAndBuyCompletedAt,
  };
};

const normalizeReturn = (raw) => {
  if (!raw) return null;
  const id = raw._id || raw.id;
  const status = raw.status || 'approved';
  const customerAddress = raw.orderId?.shippingAddress || {};
  const vendorData = raw.vendorId || {};
  return {
    ...raw,
    id,
    type: 'return',
    customer: customerAddress.name || 'Customer',
    phone: customerAddress.phone || customerAddress.mobile || '',
    address: toAddressLine(customerAddress) || 'Customer Address',
    vendorName: vendorData.storeName || 'Vendor',
    vendorAddress: vendorData.shopAddress || vendorData.address?.street || 'Vendor Address',
    total: Number(raw.refundAmount || 0),
    status: status === 'approved' ? 'pending' : (status === 'processing' ? 'accepted' : status),
    rawStatus: status,
    items: Array.isArray(raw.items) ? raw.items : []
  };
};

export const useDeliveryAuthStore = create(
  persist(
    (set, get) => ({
      deliveryBoy: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      orders: [],
      returns: [],
      selectedOrder: null,
      isLoadingOrders: false,
      isLoadingOrder: false,
      isUpdatingOrderStatus: false,
      isUpdatingStatus: false,

      // --- AUTH ACTIONS ---
      sendOtp: async (phone) => {
        set({ isLoading: true });
        try {
          const res = await api.post('/delivery/auth/send-otp', { phone });
          set({ isLoading: false }); return res.data || res;
        } catch (e) { set({ isLoading: false }); throw e; }
      },
      verifyOtpAndLogin: async (phone, otp) => {
        set({ isLoading: true });
        try {
          const res = await api.post('/delivery/auth/verify-otp', { phone, otp });
          const payload = res.data || res;
          const user = normalizeDeliveryBoy(payload.deliveryBoy);
          localStorage.setItem('delivery-token', payload.accessToken);
          localStorage.setItem('delivery-refresh-token', payload.refreshToken);
          set({ deliveryBoy: user, token: payload.accessToken, refreshToken: payload.refreshToken, isAuthenticated: true, isLoading: false });
          return { success: true, deliveryBoy: user };
        } catch (e) { set({ isLoading: false }); throw e; }
      },
      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const res = await api.post('/delivery/auth/login', { email, password });
          const payload = res.data || res;
          const user = normalizeDeliveryBoy(payload.deliveryBoy);
          localStorage.setItem('delivery-token', payload.accessToken);
          localStorage.setItem('delivery-refresh-token', payload.refreshToken);
          set({ deliveryBoy: user, token: payload.accessToken, refreshToken: payload.refreshToken, isAuthenticated: true, isLoading: false });
          return { success: true, deliveryBoy: user };
        } catch (e) { set({ isLoading: false }); throw e; }
      },
      sendRegistrationOtp: async (phone) => {
        set({ isLoading: true });
        try {
          const res = await api.post('/delivery/auth/send-registration-otp', { phone });
          set({ isLoading: false });
          return res.data || res;
        } catch (e) { set({ isLoading: false }); throw e; }
      },
      verifyRegistrationOtp: async (phone, otp) => {
        set({ isLoading: true });
        try {
          const res = await api.post('/delivery/auth/verify-registration-otp', { phone, otp });
          set({ isLoading: false });
          return res.data || res;
        } catch (e) { set({ isLoading: false }); throw e; }
      },
      register: async (data) => {
        set({ isLoading: true });
        try {
          const formData = new FormData();
          Object.keys(data).forEach(key => {
            if (data[key] !== null && data[key] !== undefined) {
              formData.append(key, data[key]);
            }
          });
          const res = await api.post('/delivery/auth/register', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          set({ isLoading: false });
          return res.data || res;
        } catch (e) { set({ isLoading: false }); throw e; }
      },
      logout: () => {
        const rt = localStorage.getItem('delivery-refresh-token');
        if (rt) api.post('/delivery/auth/logout', { refreshToken: rt }).catch(() => { });
        set({ deliveryBoy: null, token: null, refreshToken: null, isAuthenticated: false, orders: [], returns: [] });
        localStorage.removeItem('delivery-token');
        localStorage.removeItem('delivery-refresh-token');
        localStorage.removeItem('delivery-auth-storage');
        window.location.href = '/delivery/login';
      },

      // --- PROFILE ACTIONS ---
      fetchProfile: async () => {
        set({ isLoading: true });
        try {
          const res = await api.get('/delivery/auth/profile');
          const user = normalizeDeliveryBoy(res.data || res);
          set({ deliveryBoy: user, isLoading: false }); return user;
        } catch (e) { set({ isLoading: false }); throw e; }
      },
      fetchProfileSummary: async () => {
        try {
          const res = await api.get('/delivery/orders/profile-summary');
          const merged = normalizeDeliveryBoy({ ...get().deliveryBoy, ...(res.data || res) });
          set({ deliveryBoy: merged }); return merged;
        } catch (e) { throw e; }
      },
      updateProfile: async (data) => {
        set({ isLoading: true });
        try {
          const res = await api.put('/delivery/auth/profile', data);
          const user = normalizeDeliveryBoy(res.data || res);
          set({ deliveryBoy: user, isLoading: false }); return user;
        } catch (e) { set({ isLoading: false }); throw e; }
      },
      updateStatus: async (status) => {
        const current = get().deliveryBoy;
        if (!current) return false;
        set({ isUpdatingStatus: true, deliveryBoy: normalizeDeliveryBoy({ ...current, status }) });
        try {
          const res = await api.put('/delivery/auth/profile', { isAvailable: status === 'available', status });
          const payload = res.data || res;
          set({ deliveryBoy: normalizeDeliveryBoy({ ...current, ...payload, status }), isUpdatingStatus: false });
          return true;
        } catch (e) { set({ deliveryBoy: current, isUpdatingStatus: false }); throw e; }
      },
      updateLocation: async (latitude, longitude) => {
        const current = get().deliveryBoy;
        if (!current || current.status === 'offline') return;
        try {
          const res = await api.put('/delivery/auth/profile', { currentLocation: { type: 'Point', coordinates: [longitude, latitude] } });
          set({ deliveryBoy: normalizeDeliveryBoy({ ...current, ...(res.data || res) }) });
        } catch (e) { console.error("Location Update Failed", e); }
      },

      // --- ORDER ACTIONS ---
      fetchDashboardSummary: async () => {
        try {
          const res = await api.get('/delivery/orders/dashboard-summary');
          const p = res.data || res || {};
          return { ...p, recentOrders: (p.recentOrders || []).map(normalizeOrder) };
        } catch (e) { throw e; }
      },
      fetchAvailableOrders: async (opt = {}) => {
        set({ isLoadingOrders: true });
        try {
          const res = await api.get('/delivery/orders/available', { params: opt });
          const list = ((res.data || res)?.orders || []).map(normalizeOrder);
          set({ orders: list, isLoadingOrders: false }); return list;
        } catch (e) { set({ isLoadingOrders: false }); throw e; }
      },
      fetchOrders: async (opt = {}) => {
        set({ isLoadingOrders: true });
        try {
          const res = await api.get('/delivery/orders', { params: opt });
          const p = res.data || res;
          const orders = (p?.orders || (Array.isArray(p) ? p : [])).map(normalizeOrder);
          set({ orders, isLoadingOrders: false }); return orders;
        } catch (e) { set({ isLoadingOrders: false }); throw e; }
      },
      fetchOrderById: async (id) => {
        set({ isLoadingOrder: true });
        try {
          const res = await api.get(`/delivery/orders/${id}`);
          const order = normalizeOrder(res.data || res);
          set({ selectedOrder: order, isLoadingOrder: false }); return order;
        } catch (e) { set({ isLoadingOrder: false }); throw e; }
      },
      acceptOrder: async (id) => {
        set({ isUpdatingOrderStatus: true });
        try {
          const res = await api.post(`/delivery/orders/${id}/accept`);
          const order = normalizeOrder(res.data || res);
          set({ isUpdatingOrderStatus: false }); return order;
        } catch (e) { set({ isUpdatingOrderStatus: false }); throw e; }
      },
      updateOrderStatus: async (id, status, opt = {}) => {
        set({ isUpdatingOrderStatus: true });
        try {
          const res = await api.patch(`/delivery/orders/${id}/status`, { status, ...opt });
          const payload = res.data || res;
          const order = normalizeOrder(payload.order || payload);
          if (payload.rider) set({ deliveryBoy: normalizeDeliveryBoy({ ...get().deliveryBoy, ...payload.rider }) });
          if (get().selectedOrder?.id === id) set({ selectedOrder: order });
          set({ isUpdatingOrderStatus: false }); return order;
        } catch (e) { set({ isUpdatingOrderStatus: false }); throw e; }
      },
      completeOrder: async (id, otp, opt = {}) => {
        set({ isUpdatingOrderStatus: true });
        try {
          const res = await api.patch(`/delivery/orders/${id}/status`, { status: 'delivered', otp, ...opt });
          const payload = res.data || res;
          const order = normalizeOrder(payload.order || payload);
          if (payload.rider) set({ deliveryBoy: normalizeDeliveryBoy({ ...get().deliveryBoy, ...payload.rider }) });
          set({ isUpdatingOrderStatus: false }); return order;
        } catch (e) { set({ isUpdatingOrderStatus: false }); throw e; }
      },
      markArrivedAtCustomer: async (id, opt = {}) => {
        set({ isUpdatingOrderStatus: true });
        try {
          const res = await api.post(`/delivery/orders/${id}/arrived`, opt);
          const order = normalizeOrder(res.data || res);
          set({ isUpdatingOrderStatus: false }); return order;
        } catch (e) { set({ isUpdatingOrderStatus: false }); throw e; }
      },
      resendDeliveryOtp: async (id) => {
        const res = await api.post(`/delivery/orders/${id}/resend-delivery-otp`);
        return res.data || res;
      },
      getCompanyQR: async (id) => {
        const res = await api.get(`/delivery/orders/${id}/company-qr`);
        return res.data || res;
      },
      setBalance: (data) => {
        const c = get().deliveryBoy;
        if (c) set({ deliveryBoy: normalizeDeliveryBoy({ ...c, ...data }) });
      },

      // --- RETURN ACTIONS ---
      fetchAvailableReturns: async () => {
        set({ isLoadingOrders: true });
        try {
          const res = await api.get('/delivery/returns/available');
          const list = ((res.data || res)?.returns || []).map(normalizeReturn);
          set({ returns: list, isLoadingOrders: false }); return list;
        } catch (e) { set({ isLoadingOrders: false }); throw e; }
      },
      acceptReturn: async (id) => {
        set({ isUpdatingOrderStatus: true });
        try {
          const res = await api.post(`/delivery/returns/${id}/accept`);
          const ret = normalizeReturn(res.data || res);
          set((s) => ({ returns: s.returns.filter(r => String(r.id) !== String(id)), isUpdatingOrderStatus: false }));
          return ret;
        } catch (e) { set({ isUpdatingOrderStatus: false }); throw e; }
      },
      updateReturnStatus: async (id, status, opt = {}) => {
        set({ isUpdatingOrderStatus: true });
        try {
          const res = await api.patch(`/delivery/returns/${id}/status`, { status, ...opt });
          const ret = normalizeReturn(res.data || res);
          set({ isUpdatingOrderStatus: false }); return ret;
        } catch (e) { set({ isUpdatingOrderStatus: false }); throw e; }
      },

      initialize: () => {
        const token = localStorage.getItem('delivery-token');
        if (token) {
          const stored = JSON.parse(localStorage.getItem('delivery-auth-storage') || '{}');
          if (stored.state?.deliveryBoy) {
            set({ deliveryBoy: normalizeDeliveryBoy(stored.state.deliveryBoy), token, refreshToken: localStorage.getItem('delivery-refresh-token'), isAuthenticated: true });
          }
        }
      },
    }),
    {
      name: 'delivery-auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ token: s.token, refreshToken: s.refreshToken, deliveryBoy: s.deliveryBoy, isAuthenticated: s.isAuthenticated }),
    }
  )
);

if (typeof window !== 'undefined') {
  window.addEventListener('global-auth-failure', (e) => {
    if (e.detail?.scope === 'delivery') useDeliveryAuthStore.getState().logout();
  });
}

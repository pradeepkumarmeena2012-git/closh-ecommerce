import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import api from '../../../shared/utils/api';

const normalizeDeliveryBoy = (raw) => {
  if (!raw) return null;
  const id = raw.id || raw._id;
  const status = raw.status
    ? raw.status
    : raw.isAvailable === false
      ? 'offline'
      : 'available';

  return {
    ...raw,
    id,
    _id: id,
    status,
  };
};

const mapBackendStatusToUI = (status) => {
  if (status === 'ready_for_pickup') return 'pending';
  if (status === 'assigned') return 'accepted';
  if (status === 'picked_up') return 'picked-up';
  if (status === 'out_for_delivery') return 'out-for-delivery';
  if (status === 'delivered') return 'delivered';
  return status || 'pending';
};

/** Map a top-level status to a deliveryFlow phase (fallback when deliveryFlow not present) */
const statusToPhase = (status) => {
  const map = {
    assigned: 'assigned', ready_for_pickup: 'assigned',
    picked_up: 'picked_up', out_for_delivery: 'out_for_delivery',
    delivered: 'delivered',
  };
  return map[status] || 'assigned';
};

const toAddressLine = (shippingAddress = {}) => {
  const parts = [
    shippingAddress.address,
    shippingAddress.locality,
    shippingAddress.city,
    shippingAddress.state,
    shippingAddress.zipCode || shippingAddress.pincode,
  ].filter(Boolean);
  return parts.join(', ');
};

const normalizeOrder = (raw) => {
  const shippingAddress = raw?.shippingAddress || {};
  const guestInfo = raw?.guestInfo || {};
  const backendStatus = raw?.status || 'pending';
  const uiStatus = mapBackendStatusToUI(backendStatus);
  const itemCount = Array.isArray(raw?.items)
    ? raw.items.length
    : typeof raw?.items === 'number'
      ? raw.items
      : 0;

  const vendorFirst = Array.isArray(raw?.vendorItems) && raw.vendorItems.length > 0 ? raw.vendorItems[0] : null;
  const vendorData = vendorFirst?.vendorId || {};

  let vendorAddress = '';
  if (vendorData.shopAddress) {
    vendorAddress = vendorData.shopAddress;
  } else if (vendorData.address?.street) {
    vendorAddress = `${vendorData.address.street}, ${vendorData.address.city || ''}`;
  } else if (vendorFirst?.vendorName) {
    vendorAddress = 'Address details in order notes';
  }

  // Extract customer delivery lat/lng from dropoffLocation GeoJSON [lng, lat]
  const dropoffCoords = raw?.dropoffLocation?.coordinates;
  const derivedLat = Array.isArray(dropoffCoords) && dropoffCoords.length === 2 && dropoffCoords[1] !== 0
    ? dropoffCoords[1] : raw?.latitude || null;
  const derivedLng = Array.isArray(dropoffCoords) && dropoffCoords.length === 2 && dropoffCoords[0] !== 0
    ? dropoffCoords[0] : raw?.longitude || null;

  return {
    ...raw,
    id: raw?.orderId || raw?._id || raw?.id,
    orderId: raw?.orderId || raw?._id || raw?.id,
    customer: shippingAddress?.name || guestInfo?.name || 'Customer',
    phone: shippingAddress?.phone || shippingAddress?.mobile || shippingAddress?.mobileNumber || guestInfo?.phone || raw?.customerPhone || raw?.phone || '',
    email: shippingAddress?.email || guestInfo?.email || raw?.customerEmail || raw?.email || '',
    address: toAddressLine(shippingAddress) || 'Address unavailable',
    vendorName: vendorData.storeName || vendorFirst?.vendorName || 'Vendor',
    vendorAddress: vendorAddress || 'Vendor address unavailable',
    amount: Number(raw?.subtotal ?? 0),
    subtotal: Number(raw?.subtotal ?? 0),
    total: Number(raw?.total ?? 0),
    deliveryFee: Number(raw?.deliveryEarnings ?? raw?.shipping ?? 0),
    deliveryEarnings: Number(raw?.deliveryEarnings ?? 0),
    deliveryDistance: Number(raw?.deliveryDistance ?? 0),
    tax: Number(raw?.tax ?? 0),
    discount: Number(raw?.discount ?? raw?.couponDiscount ?? 0),
    status: uiStatus,
    rawStatus: backendStatus,
    deliveryType: raw?.deliveryType || 'standard',
    orderType: raw?.orderType || 'standard',
    items: Array.isArray(raw?.items) ? raw.items : [],
    itemCount,
    distance: raw?.distance || '-',
    estimatedTime: raw?.estimatedTime || '-',
    latitude: derivedLat,
    longitude: derivedLng,
    paymentMethod: raw?.paymentMethod || 'standard',
    paymentStatus: raw?.paymentStatus || 'pending',
    pickupPhoto: raw?.pickupPhoto || null,
    deliveryPhoto: raw?.deliveryPhoto || null,
    // ── Antigravity Engine fields ──
    phase: raw?.deliveryFlow?.phase || statusToPhase(backendStatus),
    deliveryFlow: raw?.deliveryFlow || null,
  };
};

const normalizeReturn = (raw) => {
  if (!raw) return null;
  const id = raw._id || raw.id;
  const status = raw.status || 'approved';
  
  // For returns, pickup is from customer, dropoff is to vendor
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
    amount: Number(raw.refundAmount || 0),
    total: Number(raw.refundAmount || 0),
    status: status === 'approved' ? 'pending' : (status === 'processing' ? 'accepted' : status),
    rawStatus: status,
    items: Array.isArray(raw.items) ? raw.items : [],
    pickupLocation: raw.pickupLocation,
    dropoffLocation: raw.dropoffLocation,
    pickupPhoto: raw.pickupPhoto || null,
    deliveryPhoto: raw.deliveryPhoto || null,
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
      ordersPagination: {
        total: 0,
        page: 1,
        limit: 20,
        pages: 1,
      },
      selectedOrder: null,
      isLoadingOrders: false,
      isLoadingOrder: false,
      isUpdatingOrderStatus: false,
      isUpdatingStatus: false,

      // Delivery boy actions
      sendOtp: async (phone) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/delivery/auth/send-otp', { phone });
          set({ isLoading: false });
          return response?.data || response;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      verifyOtpAndLogin: async (phone, otp) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/delivery/auth/verify-otp', { phone, otp });
          const payload = response?.data || response;
          const accessToken = payload?.accessToken;
          const refreshToken = payload?.refreshToken;
          const user = normalizeDeliveryBoy(payload?.deliveryBoy);

          localStorage.setItem('delivery-token', accessToken);
          localStorage.setItem('delivery-refresh-token', refreshToken);

          set({
            deliveryBoy: user,
            token: accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
          return { success: true, deliveryBoy: user };
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      sendRegistrationOtp: async (phone) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/delivery/auth/send-registration-otp', { phone });
          set({ isLoading: false });
          return response?.data || response;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      verifyRegistrationOtp: async (phone, otp) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/delivery/auth/verify-registration-otp', { phone, otp });
          set({ isLoading: false });
          return response?.data || response;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (registrationData) => {
        set({ isLoading: true });
        try {
          const formData = new FormData();
          formData.append('name', registrationData.name || '');
          formData.append('email', registrationData.email || '');
          if (registrationData.password) formData.append('password', registrationData.password);
          formData.append('phone', registrationData.phone || '');
          formData.append('emergencyContact', registrationData.emergencyContact || '');
          formData.append('aadharNumber', registrationData.aadharNumber || '');
          formData.append('address', registrationData.address || '');
          formData.append('vehicleType', registrationData.vehicleType || '');
          formData.append('vehicleNumber', registrationData.vehicleNumber || '');
          if (registrationData.drivingLicense) formData.append('drivingLicense', registrationData.drivingLicense);
          if (registrationData.drivingLicenseBack) formData.append('drivingLicenseBack', registrationData.drivingLicenseBack);
          if (registrationData.aadharCard) formData.append('aadharCard', registrationData.aadharCard);
          if (registrationData.aadharCardBack) formData.append('aadharCardBack', registrationData.aadharCardBack);

          const response = await api.post('/delivery/auth/register', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          const payload = response?.data ?? response;
          set({ isLoading: false });
          return { success: true, message: payload?.message || 'Registration submitted.' };
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/delivery/auth/login', { email, password });
          const payload = response?.data ?? response;
          const accessToken = payload?.accessToken;
          const refreshToken = payload?.refreshToken;
          const user = normalizeDeliveryBoy(payload?.deliveryBoy);

          localStorage.setItem('delivery-token', accessToken);
          localStorage.setItem('delivery-refresh-token', refreshToken);

          set({
            deliveryBoy: user,
            token: accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
          return { success: true, deliveryBoy: user };
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        const refreshToken = localStorage.getItem('delivery-refresh-token');
        if (refreshToken) {
          api.post('/delivery/auth/logout', { refreshToken }).catch(() => { });
        }
        set({
          deliveryBoy: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          orders: [],
          returns: [],
          selectedOrder: null,
        });
        localStorage.removeItem('delivery-token');
        localStorage.removeItem('delivery-refresh-token');
        localStorage.removeItem('delivery-auth-storage');
        window.location.href = '/delivery/login';
      },

      fetchProfile: async () => {
        set({ isLoading: true });
        try {
          const response = await api.get('/delivery/auth/profile');
          const payload = response?.data ?? response;
          const deliveryBoy = normalizeDeliveryBoy(payload);
          set({ deliveryBoy, isLoading: false });
          return deliveryBoy;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      fetchProfileSummary: async () => {
        set({ isLoading: true });
        try {
          const response = await api.get('/delivery/orders/profile-summary');
          const payload = response?.data ?? response;
          const currentBoy = get().deliveryBoy;
          const merged = normalizeDeliveryBoy({ ...currentBoy, ...payload });
          set({ deliveryBoy: merged, isLoading: false });
          return merged;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      updateStatus: async (status) => {
        const current = get().deliveryBoy;
        if (!current) return false;
        const isAvailable = status === 'available';

        // Optimistic update — change UI immediately
        set({
          isUpdatingStatus: true,
          deliveryBoy: normalizeDeliveryBoy({ ...current, status }),
        });

        try {
          const response = await api.put('/delivery/auth/profile', { isAvailable, status });
          const payload = response?.data ?? response;
          set({
            deliveryBoy: normalizeDeliveryBoy({ ...current, ...payload, status }),
            isUpdatingStatus: false,
          });
          return true;
        } catch (error) {
          // Rollback on failure
          set({
            deliveryBoy: normalizeDeliveryBoy(current),
            isUpdatingStatus: false,
          });
          throw error;
        }
      },

      updateLocation: async (latitude, longitude) => {
        const current = get().deliveryBoy;
        if (!current || current.status === 'offline') return;

        try {
          // GeoJSON expects [longitude, latitude]
          const response = await api.put('/delivery/auth/profile', {
            currentLocation: {
              type: 'Point',
              coordinates: [longitude, latitude],
            },
          });
          const payload = response?.data ?? response;
          set({
            deliveryBoy: normalizeDeliveryBoy({ ...current, ...payload }),
          });
        } catch (error) {
          console.error("Store Location Update Error:", error);
          // Don't throw here to avoid breaking the background watch task
        }
      },

      fetchDashboardSummary: async () => {
        const response = await api.get('/delivery/orders/dashboard-summary');
        const payload = response?.data ?? response ?? {};
        return {
          totalOrders: Number(payload?.totalOrders || 0),
          completedToday: Number(payload?.completedToday || 0),
          openOrders: Number(payload?.openOrders || 0),
          earnings: Number(payload?.earnings || 0),
          recentOrders: (payload?.recentOrders || []).map(normalizeOrder),
        };
      },

      fetchAvailableOrders: async (options = {}) => {
        set({ isLoadingOrders: true });
        try {
          const response = await api.get('/delivery/orders/available', { params: options });
          const payload = response?.data ?? response;
          const list = (payload?.orders || []).map(normalizeOrder);
          set({ orders: list, isLoadingOrders: false });
          return list;
        } catch (error) {
          set({ isLoadingOrders: false });
          throw error;
        }
      },

      acceptOrder: async (id) => {
        set({ isUpdatingOrderStatus: true });
        try {
          const response = await api.post(`/delivery/orders/${id}/accept`);
          const payload = response?.data ?? response;
          const normalized = normalizeOrder(payload?.data || payload);
          set({ isUpdatingOrderStatus: false });
          return normalized;
        } catch (error) {
          set({ isUpdatingOrderStatus: false });
          throw error;
        }
      },

      updateOrderStatus: async (id, status, options = {}) => {
        set({ isUpdatingOrderStatus: true });
        try {
          const response = await api.patch(`/delivery/orders/${id}/status`, { status, ...options });
          const payload = response?.data ?? response;
          
          const orderData = payload?.data?.order || payload?.data || payload;
          if (payload?.data?.rider) {
            const current = get().deliveryBoy;
            set({ deliveryBoy: normalizeDeliveryBoy({ ...current, ...payload.data.rider }) });
          }

          const normalized = normalizeOrder(orderData);
          set({ isUpdatingOrderStatus: false });
          return normalized;
        } catch (error) {
          set({ isUpdatingOrderStatus: false });
          throw error;
        }
      },

      fetchOrders: async (options = {}) => {
        set({ isLoadingOrders: true });
        try {
          const response = await api.get('/delivery/orders', { params: options });
          const payload = response?.data ?? response;
          const orders = (payload?.orders || (Array.isArray(payload) ? payload : [])).map(normalizeOrder);
          const pagination = payload?.pagination || { total: orders.length, page: 1, limit: 20, pages: 1 };
          set({ orders, ordersPagination: pagination, isLoadingOrders: false });
          return orders;
        } catch (error) {
          set({ isLoadingOrders: false });
          throw error;
        }
      },

      fetchDashboardSummary: async () => {
        set({ isLoadingOrders: true });
        try {
          const response = await api.get('/delivery/orders/dashboard-summary');
          const payload = response?.data ?? response;
          
          if (payload && Array.isArray(payload.recentOrders)) {
             payload.recentOrders = payload.recentOrders.map(normalizeOrder);
          }

          set({ isLoadingOrders: false });
          return payload;
        } catch (error) {
          set({ isLoadingOrders: false });
          throw error;
        }
      },

      fetchOrderById: async (id) => {
        set({ isLoadingOrder: true });
        try {
          const response = await api.get(`/delivery/orders/${id}`);
          const payload = response?.data ?? response;
          const normalized = normalizeOrder(payload);
          set({ selectedOrder: normalized, isLoadingOrder: false });
          return normalized;
        } catch (error) {
          set({ isLoadingOrder: false });
          throw error;
        }
      },

      fetchAvailableOrders: async (options = {}) => {
        set({ isLoadingOrders: true });
        try {
          const response = await api.get('/delivery/orders/available', { params: options });
          const payload = response?.data ?? response;
          const list = (payload?.orders || []).map(normalizeOrder);
          set({ isLoadingOrders: false });
          return list;
        } catch (error) {
          set({ isLoadingOrders: false });
          throw error;
        }
      },

      acceptOrder: async (id) => {
        set({ isUpdatingOrderStatus: true });
        try {
          const response = await api.post(`/delivery/orders/${id}/accept`);
          const payload = response?.data ?? response;
          const normalized = normalizeOrder(payload);
          set({ isUpdatingOrderStatus: false });
          return normalized;
        } catch (error) {
          set({ isUpdatingOrderStatus: false });
          throw error;
        }
      },

      updateOrderStatus: async (id, status, options = {}) => {
        set({ isUpdatingOrderStatus: true });
        try {
          const response = await api.patch(`/delivery/orders/${id}/status`, { status, ...options });
          const payload = response?.data ?? response;
          const normalized = normalizeOrder(payload);
          // If we are looking at the selected order, update it
          if (get().selectedOrder?.id === id) {
             set({ selectedOrder: normalized });
          }
          set({ isUpdatingOrderStatus: false });
          return normalized;
        } catch (error) {
          set({ isUpdatingOrderStatus: false });
          throw error;
        }
      },

      completeOrder: async (id, otp, options = {}) => {
        set({ isUpdatingOrderStatus: true });
        try {
          const response = await api.patch(`/delivery/orders/${id}/status`, { 
            status: 'delivered', 
            otp, 
            ...options 
          });
          const payload = response?.data ?? response;
          
          const orderData = payload.order || payload;
          if (payload.rider) {
            const current = get().deliveryBoy;
            set({ deliveryBoy: normalizeDeliveryBoy({ ...current, ...payload.rider }) });
          }

          const normalized = normalizeOrder(orderData);
          set({ isUpdatingOrderStatus: false });
          return normalized;
        } catch (error) {
          set({ isUpdatingOrderStatus: false });
          throw error;
        }
      },

      setBalance: (data) => {
        const current = get().deliveryBoy;
        if (!current) return;
        set({ 
          deliveryBoy: normalizeDeliveryBoy({ 
            ...current, 
            ...data 
          }) 
        });
      },

      resendDeliveryOtp: async (id) => {
        const response = await api.post(`/delivery/orders/${id}/resend-delivery-otp`);
        return response?.data ?? response;
      },

      markArrivedAtCustomer: async (id) => {
        set({ isUpdatingOrderStatus: true });
        try {
          const response = await api.post(`/delivery/orders/${id}/arrived`);
          const payload = response?.data ?? response;
          const normalized = normalizeOrder(payload);
          set({ isUpdatingOrderStatus: false });
          return normalized;
        } catch (error) {
          set({ isUpdatingOrderStatus: false });
          throw error;
        }
      },

      getCompanyQR: async (id) => {
        const response = await api.get(`/delivery/orders/${id}/company-qr`);
        return response?.data ?? response;
      },

      // ── Antigravity Engine API Methods ──

      getDeliveryFlow: async (id) => {
        const response = await api.get(`/delivery/orders/${id}/flow`);
        return response?.data ?? response;
      },

      enginePickup: async (id, pickupPhoto) => {
        set({ isUpdatingOrderStatus: true });
        try {
          const response = await api.patch(`/delivery/orders/${id}/pickup`, { pickupPhoto });
          const payload = response?.data ?? response;
          const normalized = normalizeOrder(payload);
          set({ isUpdatingOrderStatus: false });
          return normalized;
        } catch (error) { set({ isUpdatingOrderStatus: false }); throw error; }
      },

      engineStart: async (id) => {
        set({ isUpdatingOrderStatus: true });
        try {
          const response = await api.patch(`/delivery/orders/${id}/start`);
          const payload = response?.data ?? response;
          const normalized = normalizeOrder(payload);
          set({ isUpdatingOrderStatus: false });
          return normalized;
        } catch (error) { set({ isUpdatingOrderStatus: false }); throw error; }
      },

      engineArrived: async (id) => {
        set({ isUpdatingOrderStatus: true });
        try {
          const response = await api.patch(`/delivery/orders/${id}/arrived`);
          const payload = response?.data ?? response;
          const normalized = normalizeOrder(payload);
          set({ isUpdatingOrderStatus: false });
          return normalized;
        } catch (error) { set({ isUpdatingOrderStatus: false }); throw error; }
      },

      engineTryBuy: async (id, items) => {
        set({ isUpdatingOrderStatus: true });
        try {
          const response = await api.patch(`/delivery/orders/${id}/try-buy`, { items });
          const payload = response?.data ?? response;
          const normalized = normalizeOrder(payload);
          set({ isUpdatingOrderStatus: false });
          return normalized;
        } catch (error) { set({ isUpdatingOrderStatus: false }); throw error; }
      },

      enginePayment: async (id, method) => {
        set({ isUpdatingOrderStatus: true });
        try {
          const response = await api.patch(`/delivery/orders/${id}/payment`, { method });
          const payload = response?.data ?? response;
          const orderData = payload?.order || payload;
          const normalized = normalizeOrder(orderData);
          normalized._qrUrl = payload?.qrUrl || null;
          set({ isUpdatingOrderStatus: false });
          return normalized;
        } catch (error) { set({ isUpdatingOrderStatus: false }); throw error; }
      },

      engineComplete: async (id, otp, openBoxPhoto, deliveryProofPhoto) => {
        set({ isUpdatingOrderStatus: true });
        try {
          const response = await api.patch(`/delivery/orders/${id}/complete`, { otp, openBoxPhoto, deliveryProofPhoto });
          const payload = response?.data ?? response;
          const orderData = payload?.order || payload;
          if (payload?.rider) {
            const current = get().deliveryBoy;
            set({ deliveryBoy: normalizeDeliveryBoy({ ...current, ...payload.rider }) });
          }
          const normalized = normalizeOrder(orderData);
          set({ isUpdatingOrderStatus: false });
          return normalized;
        } catch (error) { set({ isUpdatingOrderStatus: false }); throw error; }
      },

      // Return related actions
      fetchAvailableReturns: async () => {
        set({ isLoadingOrders: true });
        try {
          const response = await api.get('/delivery/returns/available');
          const payload = response?.data ?? response;
          const list = (payload?.returns || []).map(normalizeReturn);
          set({ returns: list, isLoadingOrders: false });
          return list;
        } catch (error) {
          set({ isLoadingOrders: false });
          throw error;
        }
      },

      acceptReturn: async (id) => {
        set({ isUpdatingOrderStatus: true });
        try {
          const response = await api.post(`/delivery/returns/${id}/accept`);
          const payload = response?.data ?? response;
          const normalized = normalizeReturn(payload);
          set((state) => ({
            returns: state.returns.filter(ret => String(ret.id) !== String(id)),
            isUpdatingOrderStatus: false,
          }));
          return normalized;
        } catch (error) {
          set({ isUpdatingOrderStatus: false });
          throw error;
        }
      },

      updateReturnStatus: async (id, status, options = {}) => {
        set({ isUpdatingOrderStatus: true });
        try {
          const response = await api.patch(`/delivery/returns/${id}/status`, { status, ...options });
          const payload = response?.data ?? response;
          const normalized = normalizeReturn(payload);
          set({ isUpdatingOrderStatus: false });
          return normalized;
        } catch (error) {
          set({ isUpdatingOrderStatus: false });
          throw error;
        }
      },

      initialize: () => {
        const token = localStorage.getItem('delivery-token');
        if (token) {
          const storedState = JSON.parse(localStorage.getItem('delivery-auth-storage') || '{}');
          if (storedState.state?.deliveryBoy) {
            set({
              deliveryBoy: normalizeDeliveryBoy(storedState.state.deliveryBoy),
              token,
              refreshToken: localStorage.getItem('delivery-refresh-token') || null,
              isAuthenticated: true,
            });
          }
        }
      },
    }),
    {
      name: 'delivery-auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Listen for global auth failure (interceptor clears tokens, store clears state + redirects)
if (typeof window !== 'undefined') {
  window.addEventListener('global-auth-failure', (e) => {
    if (e.detail?.scope === 'delivery') {
      const state = useDeliveryAuthStore.getState();
      state.logout();
    }
  });
}

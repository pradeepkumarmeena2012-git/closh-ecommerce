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
    deliveryFee: Number(raw?.shipping ?? 0),
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

      // Delivery boy login action
      register: async (registrationData) => {
        set({ isLoading: true });
        try {
          const formData = new FormData();
          formData.append('name', registrationData.name || '');
          formData.append('email', registrationData.email || '');
          formData.append('password', registrationData.password || '');
          formData.append('phone', registrationData.phone || '');
          formData.append('address', registrationData.address || '');
          formData.append('vehicleType', registrationData.vehicleType || '');
          formData.append('vehicleNumber', registrationData.vehicleNumber || '');
          if (registrationData.drivingLicense) {
            formData.append('drivingLicense', registrationData.drivingLicense);
          }
          if (registrationData.drivingLicenseBack) {
            formData.append('drivingLicenseBack', registrationData.drivingLicenseBack);
          }
          if (registrationData.aadharCard) {
            formData.append('aadharCard', registrationData.aadharCard);
          }
          if (registrationData.aadharCardBack) {
            formData.append('aadharCardBack', registrationData.aadharCardBack);
          }

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

      forgotPassword: async (email) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/delivery/auth/forgot-password', { email });
          const payload = response?.data ?? response;
          set({ isLoading: false });
          return { success: true, message: payload?.message };
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      verifyResetOtp: async (email, otp) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/delivery/auth/verify-reset-otp', { email, otp });
          const payload = response?.data ?? response;
          set({ isLoading: false });
          return { success: true, message: payload?.message };
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      resetPassword: async (email, password, confirmPassword) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/delivery/auth/reset-password', { email, password, confirmPassword });
          const payload = response?.data ?? response;
          set({ isLoading: false });
          return { success: true, message: payload?.message };
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // Delivery boy login action
      login: async (email, password, rememberMe = false) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/delivery/auth/login', { email, password });
          const payload = response?.data ?? response;
          const accessToken = payload?.accessToken;
          const refreshToken = payload?.refreshToken;
          const loginDeliveryBoy = normalizeDeliveryBoy(payload?.deliveryBoy);

          if (!accessToken || !refreshToken || !loginDeliveryBoy) {
            throw new Error('Invalid login response from server.');
          }

          localStorage.setItem('delivery-token', accessToken);
          localStorage.setItem('delivery-refresh-token', refreshToken);

          let enriched = loginDeliveryBoy;
          try {
            const profileResponse = await api.get('/delivery/auth/profile');
            const profilePayload = profileResponse?.data ?? profileResponse;
            enriched = normalizeDeliveryBoy({ ...loginDeliveryBoy, ...profilePayload });
          } catch {
            // Keep login payload as fallback.
          }

          set({
            deliveryBoy: enriched,
            token: accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });

          return { success: true, deliveryBoy: enriched };
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // Delivery boy logout action
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
          ordersPagination: {
            total: 0,
            page: 1,
            limit: 20,
            pages: 1,
          },
          selectedOrder: null,
        });
        localStorage.removeItem('delivery-token');
        localStorage.removeItem('delivery-refresh-token');
      },

      // Update delivery boy status
      updateStatus: async (status) => {
        const current = get().deliveryBoy;
        if (!current) return false;

        const isAvailable = status === 'available' || status === 'busy';
        set({ isUpdatingStatus: true });
        try {
          const response = await api.put('/delivery/auth/profile', { isAvailable, status });
          const payload = response?.data ?? response;
          set({
            deliveryBoy: normalizeDeliveryBoy({
              ...current,
              ...payload,
              status,
            }),
            isUpdatingStatus: false,
          });
          return true;
        } catch (error) {
          set({ isUpdatingStatus: false });
          throw error;
        }
      },

      updateLocation: async (latitude, longitude) => {
        const current = get().deliveryBoy;
        if (!current || !latitude || !longitude) return;

        try {
          const response = await api.put('/delivery/auth/profile', {
            currentLocation: {
              type: 'Point',
              coordinates: [longitude, latitude], // GeoJSON order: [lng, lat]
            },
          });
          const payload = response?.data ?? response;
          set({
            deliveryBoy: normalizeDeliveryBoy({
              ...current,
              ...payload,
            }),
          });
        } catch (error) {
          // Silently ignore rate limit errors from GPS updates; avoid spamming toast
          if (error?.response?.status !== 429) {
            console.warn('Location update failed:', error?.response?.status, error?.message);
          }
        }
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

      updateProfile: async (profileData) => {
        set({ isLoading: true });
        try {
          const response = await api.put('/delivery/auth/profile', profileData);
          const payload = response?.data ?? response;
          const current = get().deliveryBoy || {};
          const deliveryBoy = normalizeDeliveryBoy({ ...current, ...payload });
          set({ deliveryBoy, isLoading: false });
          return deliveryBoy;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      fetchOrders: async (options = {}) => {
        set({ isLoadingOrders: true });
        try {
          const { status, page, limit } = options || {};
          const params = {};
          if (status) params.status = status;
          if (page !== undefined) params.page = page;
          if (limit !== undefined) params.limit = limit;

          const response = await api.get('/delivery/orders', { params });
          const payload = response?.data ?? response;

          const hasPaginatedPayload =
            payload &&
            !Array.isArray(payload) &&
            Array.isArray(payload.orders);

          const rawOrders = hasPaginatedPayload ? payload.orders : (Array.isArray(payload) ? payload : []);
          const list = rawOrders.map(normalizeOrder);

          const pagination = hasPaginatedPayload
            ? {
              total: Number(payload?.pagination?.total || 0),
              page: Number(payload?.pagination?.page || 1),
              limit: Number(payload?.pagination?.limit || 20),
              pages: Number(payload?.pagination?.pages || 1),
            }
            : {
              total: list.length,
              page: 1,
              limit: list.length || 20,
              pages: 1,
            };

          set({ orders: list, ordersPagination: pagination, isLoadingOrders: false });
          return list;
        } catch (error) {
          set({ isLoadingOrders: false });
          throw error;
        }
      },

      fetchAvailableOrders: async (options = {}) => {
        set({ isLoadingOrders: true });
        try {
          const { page, limit } = options || {};
          const params = {};
          if (page !== undefined) params.page = page;
          if (limit !== undefined) params.limit = limit;

          const response = await api.get('/delivery/orders/available', { params });
          const payload = response?.data ?? response;

          const hasPaginatedPayload =
            payload &&
            !Array.isArray(payload) &&
            Array.isArray(payload.orders);

          const rawOrders = hasPaginatedPayload ? payload.orders : (Array.isArray(payload) ? payload : []);
          const list = rawOrders.map(normalizeOrder);

          const pagination = hasPaginatedPayload
            ? {
              total: Number(payload?.pagination?.total || 0),
              page: Number(payload?.pagination?.page || 1),
              limit: Number(payload?.pagination?.limit || 20),
              pages: Number(payload?.pagination?.pages || 1),
            }
            : {
              total: list.length,
              page: 1,
              limit: list.length || 20,
              pages: 1,
            };

          set({ orders: list, ordersPagination: pagination, isLoadingOrders: false });
          return list;
        } catch (error) {
          set({ isLoadingOrders: false });
          throw error;
        }
      },

      fetchDashboardSummary: async () => {
        const response = await api.get('/delivery/orders/dashboard-summary');
        const payload = response?.data ?? response ?? {};
        const recentRaw = Array.isArray(payload?.recentOrders) ? payload.recentOrders : [];
        return {
          totalOrders: Number(payload?.totalOrders || 0),
          completedToday: Number(payload?.completedToday || 0),
          openOrders: Number(payload?.openOrders || 0),
          earnings: Number(payload?.earnings || 0),
          recentOrders: recentRaw.map(normalizeOrder),
        };
      },

      fetchProfileSummary: async () => {
        const response = await api.get('/delivery/orders/profile-summary');
        const payload = response?.data ?? response ?? {};
        return {
          totalDeliveries: Number(payload?.totalDeliveries || 0),
          completedToday: Number(payload?.completedToday || 0),
          earnings: Number(payload?.earnings || 0),
        };
      },

      fetchOrderById: async (id) => {
        set({ isLoadingOrder: true });
        try {
          const response = await api.get(`/delivery/orders/${id}`);
          const payload = response?.data ?? response;
          const order = normalizeOrder(payload);
          set({ selectedOrder: order, isLoadingOrder: false });
          return order;
        } catch (error) {
          set({ isLoadingOrder: false });
          throw error;
        }
      },

      updateOrderStatus: async (id, backendStatus, options = {}) => {
        set({ isUpdatingOrderStatus: true });
        try {
          const requestPayload = { status: backendStatus };
          if (options?.otp) {
            requestPayload.otp = String(options.otp).trim();
          }
          if (options?.pickupPhoto) {
            requestPayload.pickupPhoto = options.pickupPhoto;
          }
          if (options?.deliveryPhoto) {
            requestPayload.deliveryPhoto = options.deliveryPhoto;
          }

          const response = await api.patch(`/delivery/orders/${id}/status`, requestPayload);
          const responsePayload = response?.data ?? response;
          const normalized = normalizeOrder(responsePayload);
          set((state) => ({
            orders: state.orders.map((order) => (String(order.id) === String(id) ? normalized : order)),
            selectedOrder:
              state.selectedOrder && String(state.selectedOrder.id) === String(id)
                ? normalized
                : state.selectedOrder,
            isUpdatingOrderStatus: false,
          }));
          return normalized;
        } catch (error) {
          set({ isUpdatingOrderStatus: false });
          throw error;
        }
      },

      acceptOrder: async (id) => {
        set({ isUpdatingOrderStatus: true });
        try {
          const response = await api.post(`/delivery/orders/${id}/accept`);
          const payload = response?.data ?? response;
          const normalized = normalizeOrder(payload);
          set((state) => ({
            orders: state.orders.map((order) => (String(order.id) === String(id) ? normalized : order)),
            selectedOrder:
              state.selectedOrder && String(state.selectedOrder.id) === String(id)
                ? normalized
                : state.selectedOrder,
            isUpdatingOrderStatus: false,
          }));
          return normalized;
        } catch (error) {
          set({ isUpdatingOrderStatus: false });
          throw error;
        }
      },

      completeOrder: async (id, otp, deliveryPhoto) => {
        const state = get();
        const current =
          state.orders.find((order) => String(order.id) === String(id)) ||
          (state.selectedOrder && String(state.selectedOrder.id) === String(id)
            ? state.selectedOrder
            : null);
        // Allow completion when rider has already picked up the order (UI: 'picked-up' or 'out-for-delivery')
        if (current && current.status !== 'picked-up' && current.status !== 'out-for-delivery') {
          return current;
        }
        return get().updateOrderStatus(id, 'delivered', { otp, deliveryPhoto });
      },

      resendDeliveryOtp: async (id) => {
        await api.post(`/delivery/orders/${id}/resend-delivery-otp`);
        return true;
      },

      // Initialize delivery auth state from localStorage
      initialize: () => {
        const token = localStorage.getItem('delivery-token');
        if (token) {
          const storedState = JSON.parse(localStorage.getItem('delivery-auth-storage') || '{}');
          const refreshToken = localStorage.getItem('delivery-refresh-token');
          if (storedState.state?.deliveryBoy) {
            set({
              deliveryBoy: normalizeDeliveryBoy(storedState.state.deliveryBoy),
              token,
              refreshToken: refreshToken || null,
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


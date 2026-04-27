import { create } from "zustand";
import { persist, createJSONStorage, subscribeWithSelector } from "zustand/middleware";
import api from "../../../shared/utils/api";
import {
  registerVendor,
  updateVendorProfile,
  forgotVendorPassword,
  verifyVendorResetOTP,
  resetVendorPassword,
} from "../services/vendorService";
import { decodeJwtPayload } from "../../../shared/utils/helpers";

export const useVendorAuthStore = create(
  subscribeWithSelector(
    persist(
    (set, get) => ({
      vendor: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      _hasHydrated: false,
      setHasHydrated: (val) => set({ _hasHydrated: val }),

      _normalizeVendor: (vendor) => {
        if (!vendor) return null;
        const id = vendor.id || vendor._id;
        return {
          ...vendor,
          id,
          _id: id
        };
      },

      // Vendor login action
      login: async (email, password, rememberMe = false) => {
        set({ isLoading: true });
        try {
          const response = await api.post("/vendor/auth/login", {
            email,
            password,
          });
          const body = response?.data || response || {};
          const authData = body.data || body;
          const vendor = authData.vendor;
          const accessToken = authData.accessToken;
          const refreshToken = authData.refreshToken;

          if (!vendor || !accessToken || !refreshToken) {
            throw new Error("Invalid login response");
          }

          // Normalize vendor object
          const normalizedVendor = get()._normalizeVendor(vendor);

          set({
            vendor: normalizedVendor,
            token: accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });

          // Store tokens for vendor API requests
          localStorage.setItem("vendor-token", accessToken);
          localStorage.setItem("vendor-refresh-token", refreshToken);

          return { success: true, vendor: normalizedVendor };
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // Vendor registration action — calls real POST /vendor/auth/register
      // Backend sends an OTP email; vendor is NOT authenticated until OTP verified.
      register: async (vendorData) => {
        set({ isLoading: true });
        try {
          const response = await registerVendor(vendorData);
          // response is already unwrapped by api.js interceptor → response.data
          const data = response?.data ?? response;

          set({ isLoading: false });

          return {
            success: true,
            message:
              data?.message ||
              "Registration successful! Please check your email for the OTP.",
          };
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      forgotPassword: async (email) => {
        set({ isLoading: true });
        try {
          const response = await forgotVendorPassword(email);
          const data = response?.data ?? response;
          set({ isLoading: false });
          return { success: true, message: data?.message };
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      verifyResetOtp: async (email, otp) => {
        set({ isLoading: true });
        try {
          const response = await verifyVendorResetOTP(email, otp);
          const data = response?.data ?? response;
          set({ isLoading: false });
          return { success: true, message: data?.message };
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      resetPassword: async (email, password, confirmPassword) => {
        set({ isLoading: true });
        try {
          const response = await resetVendorPassword(email, password, confirmPassword);
          const data = response?.data ?? response;
          set({ isLoading: false });
          return { success: true, message: data?.message };
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // Vendor logout action
      logout: () => {
        const refreshToken = localStorage.getItem("vendor-refresh-token");
        if (refreshToken) {
          api.post("/vendor/auth/logout", { refreshToken }).catch(() => { });
        }

        set({
          vendor: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
        });
        localStorage.removeItem("vendor-token");
        localStorage.removeItem("vendor-refresh-token");
        localStorage.removeItem("vendor-auth-storage");
        window.location.href = '/vendor/login';
      },

      // Update vendor profile — calls real PUT /vendor/auth/profile
      updateProfile: async (profileData) => {
        set({ isLoading: true });
        try {
          const response = await updateVendorProfile(profileData);
          const body = response?.data || response || {};
          const data = body.data || body;
          
          // Merge returned vendor data back into state so UI stays in sync
          const rawVendor = data && (data._id || data.id) ? data : (data?.vendor || profileData);
          const updatedVendor = get()._normalizeVendor({ ...get().vendor, ...rawVendor });

          set({
            vendor: updatedVendor,
            isLoading: false,
          });

          return { success: true, vendor: updatedVendor };
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      changePassword: async (currentPassword, newPassword) => {
        set({ isLoading: true });
        try {
          const response = await api.put("/vendor/auth/change-password", {
            currentPassword,
            newPassword,
          });
          set({ isLoading: false });
          return { success: true, message: response?.data?.message || "Password changed successfully" };
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      updateLocation: async (latitude, longitude) => {
        set({ isLoading: true });
        try {
          const response = await api.put("/vendor/auth/location", {
            latitude,
            longitude,
          });
          const body = response?.data || response || {};
          const data = body.data || body;
          
          const rawVendor = data && (data._id || data.id) ? data : (data?.vendor || get().vendor);
          const updatedVendor = get()._normalizeVendor({ ...get().vendor, ...rawVendor });
          
          set({
            vendor: updatedVendor,
            isLoading: false,
          });
          return { success: true, vendor: updatedVendor };
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },
      updateOnlineStatus: async (isOnline) => {
        set({ isLoading: true });
        try {
          const { updateVendorOnlineStatus } = await import("../services/vendorService");
          const response = await updateVendorOnlineStatus(isOnline);
          const body = response?.data || response || {};
          const data = body.data || body;
          
          // data should be the vendor object or have an isOnline property
          const nextOnlineStatus = typeof data?.isOnline === 'boolean' ? data.isOnline : isOnline;
          
          const updatedVendor = get()._normalizeVendor({ 
            ...get().vendor, 
            isOnline: nextOnlineStatus 
          });
          
          set({
            vendor: updatedVendor,
            isLoading: false,
          });
          return { success: true, isOnline: nextOnlineStatus };
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },
      toggleOnlineStatus: async () => {
        const currentStatus = get().vendor?.isOnline;
        return get().updateOnlineStatus(!currentStatus);
      },

      updateOrderStatus: async (orderId, status) => {
        set({ isLoading: true });
        try {
          const { updateVendorOrderStatus } = await import("../services/vendorService");
          const response = await updateVendorOrderStatus(orderId, status);
          set({ isLoading: false });
          return { success: true, data: response?.data ?? response };
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },
      // Initialize vendor auth state from localStorage
      initialize: () => {
        const token = localStorage.getItem("vendor-token");
        if (token) {
          const storedState = JSON.parse(
            localStorage.getItem("vendor-auth-storage") || "{}"
          );
          const persistedVendor = storedState.state?.vendor;
          const refreshToken = localStorage.getItem("vendor-refresh-token");

          if (persistedVendor) {
            const normalizedVendor = get()._normalizeVendor(persistedVendor);
            
            set({
              vendor: normalizedVendor,
              token,
              refreshToken: refreshToken || null,
              isAuthenticated: true,
            });
          }
        }
      },
    }),
    {
      name: "vendor-auth-storage",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
)
);

// Listen for global auth failure (interceptor clears tokens, store clears state + redirects)
if (typeof window !== 'undefined') {
  window.addEventListener('global-auth-failure', (e) => {
    if (e.detail?.scope === 'vendor') {
      const state = useVendorAuthStore.getState();
      state.logout();
    }
  });
}

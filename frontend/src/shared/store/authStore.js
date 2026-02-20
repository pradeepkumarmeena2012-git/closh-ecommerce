import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import api from '../utils/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      pendingEmail: null,

      // Login action
      login: async (email, password, rememberMe = false) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/user/auth/login', { email, password });
          const payload = response?.data ?? response;
          const accessToken = payload?.accessToken;
          const user = payload?.user;

          if (!accessToken || !user) {
            throw new Error('Invalid login response from server.');
          }

          set({
            user,
            token: accessToken,
            isAuthenticated: true,
            pendingEmail: null,
            isLoading: false,
          });

          localStorage.setItem('token', accessToken);

          return { success: true, user };
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // Register action
      register: async (name, email, password, phone) => {
        set({ isLoading: true });
        try {
          const normalizedPhone = String(phone || '').replace(/\D/g, '').slice(-10);
          const payload = {
            name,
            email,
            password,
            ...(normalizedPhone ? { phone: normalizedPhone } : {}),
          };

          await api.post('/user/auth/register', payload);

          set({
            user: null,
            token: null,
            isAuthenticated: false,
            pendingEmail: email,
            isLoading: false,
          });

          localStorage.removeItem('token');

          return { success: true, email };
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // Verify OTP and complete login
      verifyOTP: async (email, otp) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/user/auth/verify-otp', { email, otp });
          const payload = response?.data ?? response;
          const accessToken = payload?.accessToken;
          const user = payload?.user;

          if (!accessToken || !user) {
            throw new Error('Invalid OTP verification response from server.');
          }

          set({
            user,
            token: accessToken,
            isAuthenticated: true,
            pendingEmail: null,
            isLoading: false,
          });

          localStorage.setItem('token', accessToken);
          return { success: true, user };
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // Resend OTP
      resendOTP: async (email) => {
        set({ isLoading: true });
        try {
          await api.post('/user/auth/resend-otp', { email });
          set({ isLoading: false });
          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // Logout action
      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          pendingEmail: null,
        });
        localStorage.removeItem('token');
      },

      // Update user profile
      updateProfile: async (profileData) => {
        set({ isLoading: true });
        try {
          const response = await api.put('/user/auth/profile', {
            name: profileData?.name,
            phone: profileData?.phone,
          });
          const payload = response?.data ?? response;
          const currentUser = get().user || {};
          const updatedUser = {
            ...currentUser,
            ...payload,
            email: currentUser.email || payload.email,
          };

          set({
            user: updatedUser,
            isLoading: false,
          });
          
          return { success: true, user: updatedUser };
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // Change password
      changePassword: async (currentPassword, newPassword) => {
        set({ isLoading: true });
        try {
          await api.post('/user/auth/change-password', {
            currentPassword,
            newPassword,
          });
          set({ isLoading: false });
          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // Initialize auth state from localStorage
      initialize: () => {
        const token = localStorage.getItem('token');
        if (token) {
          const storedState = JSON.parse(localStorage.getItem('auth-storage') || '{}');
          if (storedState.state?.user) {
            set({
              user: storedState.state.user,
              token,
              isAuthenticated: true,
            });
          }
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);


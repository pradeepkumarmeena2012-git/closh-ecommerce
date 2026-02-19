import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getAllVendors, getVendorById, updateVendorStatus, updateCommissionRate } from '../../Admin/services/adminService';
import toast from 'react-hot-toast';

export const useVendorStore = create(
  persist(
    (set, get) => ({
      vendors: [],
      selectedVendor: null,
      isLoading: false,

      // Initialize vendors
      initialize: async (params = {}) => {
        set({ isLoading: true });
        try {
          const response = await getAllVendors(params);
          const vendors = Array.isArray(response.data)
            ? response.data
            : (response.data?.vendors || []);
          const normalizedVendors = vendors.map(v => ({
            ...v,
            id: v.id || v._id // Alias _id to id while preserving existing id
          }));
          set({ vendors: normalizedVendors, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
        }
      },

      // Get all vendors
      getAllVendors: () => {
        const state = get();
        if (state.vendors.length === 0) {
          state.initialize();
        }
        return get().vendors;
      },

      // Get vendor by ID
      getVendor: async (id) => {
        set({ isLoading: true });
        try {
          const response = await getVendorById(id);
          const vendor = {
            ...response.data,
            id: response.data.id || response.data._id
          };
          set({ selectedVendor: vendor, isLoading: false });
          return vendor;
        } catch (error) {
          set({ isLoading: false });
          return null;
        }
      },

      // Get approved vendors only
      getApprovedVendors: () => {
        return get().vendors.filter((v) => v.status === 'approved');
      },

      // Get vendors by status
      getVendorsByStatus: (status) => {
        return get().vendors.filter((v) => v.status === status);
      },

      // Get vendor products
      getVendorProducts: (vendorId) => {
        // Since products aren't in this store, we might need to fetch them or pass them
        // For now, let's keep it simple or return empty if we don't have them
        return [];
      },

      // Get vendor statistics
      getVendorStats: (vendorId) => {
        const vendor = get().vendors.find((v) => String(v.id) === String(vendorId));
        if (!vendor) return null;

        return {
          totalProducts: 0,
          inStockProducts: 0,
          lowStockProducts: 0,
          outOfStockProducts: 0,
          totalSales: vendor.totalSales || 0,
          totalEarnings: vendor.totalEarnings || 0,
          rating: vendor.rating || 0,
          reviewCount: vendor.reviewCount || 0,
        };
      },

      // Update vendor status (admin only)
      updateVendorStatus: async (vendorId, status, reason = null) => {
        set({ isLoading: true });
        try {
          const response = await updateVendorStatus(vendorId, status, reason);
          const updatedVendor = {
            ...response.data,
            id: response.data.id || response.data._id
          };

          set((state) => ({
            vendors: state.vendors.map((v) =>
              v.id === vendorId ? updatedVendor : v
            ),
            selectedVendor: state.selectedVendor?.id === vendorId ? updatedVendor : state.selectedVendor,
            isLoading: false
          }));
          return true;
        } catch (error) {
          set({ isLoading: false });
          return false;
        }
      },

      // Update vendor commission rate (admin only)
      updateCommissionRate: async (vendorId, commissionRate) => {
        set({ isLoading: true });
        try {
          const response = await updateCommissionRate(vendorId, commissionRate);
          const updatedVendor = {
            ...response.data,
            id: response.data.id || response.data._id
          };

          set((state) => ({
            vendors: state.vendors.map((v) =>
              v.id === vendorId ? updatedVendor : v
            ),
            selectedVendor: state.selectedVendor?.id === vendorId ? updatedVendor : state.selectedVendor,
            isLoading: false
          }));
          return true;
        } catch (error) {
          set({ isLoading: false });
          return false;
        }
      },

      // Add new vendor (admin only)
      addVendor: (vendorData) => {
        const lastId = get().vendors.length > 0 ? get().vendors[get().vendors.length - 1].id : 0;
        const newId = typeof lastId === 'number' ? lastId + 1 : Date.now();
        const newVendor = {
          id: newId,
          ...vendorData,
          status: 'pending',
          rating: 0,
          reviewCount: 0,
          totalProducts: 0,
          totalSales: 0,
          totalEarnings: 0,
          isVerified: false,
          joinDate: new Date().toISOString().split('T')[0],
        };

        set((state) => ({
          vendors: [...state.vendors, newVendor],
        }));

        return newVendor;
      },

      // Update vendor profile
      updateVendorProfile: (vendorId, profileData) => {
        set((state) => ({
          vendors: state.vendors.map((v) =>
            String(v.id) === String(vendorId) ? { ...v, ...profileData } : v
          ),
        }));
      },

      // Set selected vendor
      setSelectedVendor: (vendorId) => {
        const vendor = get().vendors.find((v) => v.id === vendorId);
        set({ selectedVendor: vendor });
      },

      // Clear selected vendor
      clearSelectedVendor: () => {
        set({ selectedVendor: null });
      },
    }),
    {
      name: 'vendor-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);


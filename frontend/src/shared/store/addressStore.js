import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import api from '../utils/api';

const normalizeAddress = (address) => ({
  ...address,
  id: address?.id || address?._id,
});

export const useAddressStore = create(
  persist(
    (set, get) => ({
      addresses: [],
      isLoading: false,
      hasFetched: false,

      fetchAddresses: async () => {
        set({ isLoading: true });
        try {
          const response = await api.get('/user/addresses');
          const payload = response?.data ?? response;
          const list = Array.isArray(payload)
            ? payload.map(normalizeAddress)
            : [];
          set({ addresses: list, isLoading: false, hasFetched: true });
          return list;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // Add a new address
      addAddress: async (address) => {
        set({ isLoading: true });
        try {
          const state = get();
          const payload = {
            ...address,
            phone: String(address?.phone || '').replace(/\D/g, '').slice(-10),
            isDefault: state.addresses.length === 0 || Boolean(address?.isDefault),
          };
          const response = await api.post('/user/addresses', payload);
          const created = normalizeAddress(response?.data ?? response);

          set((curr) => ({
            addresses: payload.isDefault
              ? [...curr.addresses.map((addr) => ({ ...addr, isDefault: false })), created]
              : [...curr.addresses, created],
            isLoading: false,
          }));

          return created;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // Update an existing address
      updateAddress: async (id, updatedAddress) => {
        set({ isLoading: true });
        try {
          const payload = {
            ...updatedAddress,
            phone: String(updatedAddress?.phone || '').replace(/\D/g, '').slice(-10),
          };
          const response = await api.put(`/user/addresses/${id}`, payload);
          const updated = normalizeAddress(response?.data ?? response);

          set((state) => ({
            addresses: state.addresses.map((addr) =>
              String(addr.id) === String(id)
                ? updated
                : updated.isDefault
                  ? { ...addr, isDefault: false }
                  : addr
            ),
            isLoading: false,
          }));
          return updated;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // Delete an address
      deleteAddress: async (id) => {
        set({ isLoading: true });
        try {
          await api.delete(`/user/addresses/${id}`);
          set((state) => ({
            addresses: state.addresses.filter((addr) => String(addr.id) !== String(id)),
            isLoading: false,
          }));
          return true;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // Set default address
      setDefaultAddress: async (id) => {
        set({ isLoading: true });
        try {
          const response = await api.patch(`/user/addresses/${id}/default`);
          const updated = normalizeAddress(response?.data ?? response);

          set((state) => ({
            addresses: state.addresses.map((addr) => ({
              ...addr,
              isDefault: String(addr.id) === String(updated.id),
            })),
            isLoading: false,
          }));
          return updated;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // Get default address
      getDefaultAddress: () => {
        const state = get();
        return state.addresses.find((addr) => addr.isDefault) || state.addresses[0] || null;
      },

      // Get all addresses
      getAddresses: () => {
        const state = get();
        return state.addresses;
      },

      resetAddresses: () => {
        set({ addresses: [], hasFetched: false });
      },
    }),
    {
      name: 'address-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);


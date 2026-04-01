import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import api from '../../../shared/utils/api';

export const useDeliveryEngineStore = create(
  persist(
    (set, get) => ({
      deliveryBoy: null,
      token: null,
      isAuthenticated: false,
      
      activeBatch: null,
      isUpdatingBatch: false,
      isLoadingBatch: false,

      // Authentication
      setAuth: (deliveryProfile, token) => {
        set({ deliveryBoy: deliveryProfile, token, isAuthenticated: !!token });
      },
      logout: () => {
        set({ deliveryBoy: null, token: null, isAuthenticated: false, activeBatch: null });
      },

      // --- ENGINE APIs ---

      fetchActiveBatch: async (batchId) => {
        set({ isLoadingBatch: true });
        try {
          const res = await api.get(`/delivery/engine/batch/${batchId}/flow`);
          const batch = res?.data?.data || res?.data;
          set({ activeBatch: batch, isLoadingBatch: false });
          return batch;
        } catch (error) {
          set({ isLoadingBatch: false });
          throw error;
        }
      },

      assignBatch: async (orderIds) => {
        set({ isUpdatingBatch: true });
        try {
          const res = await api.post('/delivery/engine/batch/assign', { orderIds });
          const batch = res?.data?.data || res?.data;
          set({ activeBatch: batch, isUpdatingBatch: false });
          return batch;
        } catch(error) {
          set({ isUpdatingBatch: false });
          throw error;
        }
      },

      pickupBatch: async (batchId, proofs) => {
        set({ isUpdatingBatch: true });
        try {
          const res = await api.patch(`/delivery/engine/batch/${batchId}/pickup`, proofs);
          const batch = res?.data?.data || res?.data;
          set({ activeBatch: batch, isUpdatingBatch: false });
          return batch;
        } catch(error) {
          set({ isUpdatingBatch: false });
          throw error;
        }
      },

      startBatchDelivery: async (batchId) => {
         set({ isUpdatingBatch: true });
         try {
           const res = await api.patch(`/delivery/engine/batch/${batchId}/start`);
           const batch = res?.data?.data || res?.data;
           set({ activeBatch: batch, isUpdatingBatch: false });
           return batch;
         } catch(error) {
           set({ isUpdatingBatch: false });
           throw error;
         }
      },

      markBatchArrived: async (batchId) => {
         set({ isUpdatingBatch: true });
         try {
           const res = await api.patch(`/delivery/engine/batch/${batchId}/arrived`);
           const batch = res?.data?.data || res?.data;
           set({ activeBatch: batch, isUpdatingBatch: false });
           return batch;
         } catch(error) {
           set({ isUpdatingBatch: false });
           throw error;
         }
      },

      processTryAndBuy: async (batchId, tryAndBuyMapping) => {
         set({ isUpdatingBatch: true });
         try {
           const res = await api.patch(`/delivery/engine/batch/${batchId}/try-buy`, { tryAndBuyMapping });
           const batch = res?.data?.data || res?.data;
           set({ activeBatch: batch, isUpdatingBatch: false });
           return batch;
         } catch(error) {
           set({ isUpdatingBatch: false });
           throw error;
         }
      },

      processBatchPayment: async (batchId) => {
         set({ isUpdatingBatch: true });
         try {
           const res = await api.patch(`/delivery/engine/batch/${batchId}/payment`);
           const batch = res?.data?.data || res?.data;
           set({ activeBatch: batch, isUpdatingBatch: false });
           return batch;
         } catch(error) {
           set({ isUpdatingBatch: false });
           throw error;
         }
      },

      completeBatchDelivery: async (batchId, otp, openBoxPhoto) => {
         set({ isUpdatingBatch: true });
         try {
           const res = await api.patch(`/delivery/engine/batch/${batchId}/complete`, { otp, openBoxPhoto });
           const batch = res?.data?.data || res?.data;
           // If completed, clear active batch so UI routes back home
           set({ activeBatch: null, isUpdatingBatch: false });
           return batch;
         } catch(error) {
           set({ isUpdatingBatch: false });
           throw error;
         }
      }
    }),
    {
      name: 'delivery-engine-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

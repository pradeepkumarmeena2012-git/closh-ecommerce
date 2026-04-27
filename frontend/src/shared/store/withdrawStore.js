import { create } from 'zustand';
import api from '../utils/api';
import toast from 'react-hot-toast';

export const useWithdrawStore = create((set) => ({
    requests: [],
    isLoading: false,

    fetchRequests: async (params = {}) => {
        set({ isLoading: true });
        try {
            const response = await api.get('/admin/withdrawals', { params });
            const payload = response?.data ?? response;
            set({ requests: Array.isArray(payload) ? payload : [], isLoading: false });
        } catch (error) {
            set({ isLoading: false });
            console.error('Fetch withdrawals error:', error);
        }
    },

    updateRequestStatus: async (id, status, data = {}) => {
        set({ isLoading: true });
        try {
            const response = await api.patch(`/admin/withdrawals/${id}/status`, { status, ...data });
            const updatedRequest = response?.data?.data || response?.data || response;
            
            toast.success(`Withdrawal ${status} successfully.`);
            set((state) => ({
                requests: state.requests.map((r) => 
                    r._id === id ? { ...r, ...updatedRequest } : r
                ),
                isLoading: false
            }));
            return true;
        } catch (error) {
            set({ isLoading: false });
            const msg = error?.response?.data?.message || 'Failed to update withdrawal.';
            toast.error(msg);
            return false;
        }
    }
}));

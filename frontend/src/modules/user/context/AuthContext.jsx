import React, { createContext, useContext, useMemo } from 'react';
import { useAuthStore } from '../../../shared/store/authStore';

const AuthContext = createContext({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: async () => ({ success: false }),
    loginWithOTP: async () => ({ success: false }),
    resendOTP: async () => ({ success: false }),
    logout: () => { },
});

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        // Fallback to state store directly if context is missing during transitions
        console.warn('useAuth called outside AuthProvider - returning fallback values');
        return {};
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const user = useAuthStore(state => state.user);
    const isAuthenticated = useAuthStore(state => state.isAuthenticated);
    const isLoading = useAuthStore(state => state.isLoading);
    const storeLogin = useAuthStore(state => state.login);
    const storeVerifyOTP = useAuthStore(state => state.verifyOTP);
    const storeResendOTP = useAuthStore(state => state.resendOTP);
    const storeLogout = useAuthStore(state => state.logout);

    const value = useMemo(() => ({
        user,
        isAuthenticated,
        isLoading,
        login: storeLogin,
        loginWithOTP: storeVerifyOTP || (async () => ({ success: false })),
        resendOTP: storeResendOTP || (async () => ({ success: false })),
        logout: storeLogout,
    }), [user, isAuthenticated, isLoading, storeLogin, storeVerifyOTP, storeResendOTP, storeLogout]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

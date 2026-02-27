import React, { createContext, useContext, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAddressStore } from '../../../shared/store/addressStore';
import { useAuthStore } from '../../../shared/store/authStore';

const LocationContext = createContext();

export const LocationProvider = ({ children }) => {
    const addresses = useAddressStore(state => state.addresses);
    const storeFetchAddresses = useAddressStore(state => state.fetchAddresses);
    const storeSetDefaultAddress = useAddressStore(state => state.setDefaultAddress);
    const isAuthenticated = useAuthStore(state => state.isAuthenticated);
    const hasFetchedRef = useRef(false);

    // Fetch addresses from backend on mount (only once)
    useEffect(() => {
        if (!hasFetchedRef.current && isAuthenticated) {
            hasFetchedRef.current = true;
            storeFetchAddresses().catch(() => { });
        }
    }, [storeFetchAddresses, isAuthenticated]);

    const activeAddress = useMemo(() => {
        if (!addresses || addresses.length === 0) return null;
        return addresses.find(a => a.isDefault) || addresses[0] || null;
    }, [addresses]);

    const updateActiveAddress = useCallback((address) => {
        if (address?.id || address?._id) {
            storeSetDefaultAddress(address.id || address._id).catch(() => { });
        }
    }, [storeSetDefaultAddress]);

    const refreshAddresses = useCallback(() => {
        storeFetchAddresses().catch(() => { });
    }, [storeFetchAddresses]);

    const value = useMemo(() => ({
        addresses: addresses || [],
        activeAddress,
        updateActiveAddress,
        refreshAddresses,
    }), [addresses, activeAddress, updateActiveAddress, refreshAddresses]);

    return (
        <LocationContext.Provider value={value}>
            {children}
        </LocationContext.Provider>
    );
};

export const useLocation = () => {
    const context = useContext(LocationContext);
    if (!context) {
        throw new Error('useLocation must be used within a LocationProvider');
    }
    return context;
};

import { createContext, useContext, useEffect, useCallback, useMemo, useRef, useState } from 'react';
import { useAddressStore } from '../../../shared/store/addressStore';
import { useAuthStore } from '../../../shared/store/authStore';

const LocationContext = createContext({
    addresses: [],
    activeAddress: null,
    updateActiveAddress: () => { },
    refreshAddresses: () => { }
});

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

    const [serviceability, setServiceability] = useState({
        loading: false,
        isServiceable: true,
        message: null,
        data: null
    });

    const activeAddress = useMemo(() => {
        if (!addresses || addresses.length === 0) return null;
        return addresses.find(a => a.isDefault) || addresses[0] || null;
    }, [addresses]);

    useEffect(() => {
        if (!activeAddress) return;
        
        let isMounted = true;
        const checkServiceability = async () => {
            setServiceability(prev => ({ ...prev, loading: true }));
            try {
                // Ensure api is imported: import api from '../../../shared/utils/api';
                const { default: api } = await import('../../../shared/utils/api.js');
                const response = await api.post('/check-serviceability', {
                    pincode: activeAddress.zipCode || activeAddress.pincode,
                    city: activeAddress.city,
                    latitude: activeAddress.coordinates?.[1] || activeAddress.lat,
                    longitude: activeAddress.coordinates?.[0] || activeAddress.lng
                });
                
                if (isMounted && response?.data) {
                    setServiceability({
                        loading: false,
                        isServiceable: response.data.isServiceable,
                        message: response.data.message,
                        data: response.data
                    });
                }
            } catch (error) {
                console.error("Failed to check serviceability:", error);
                if (isMounted) {
                    setServiceability(prev => ({ 
                        ...prev, 
                        loading: false, 
                        // Default to true to prevent blocking users if API fails
                        isServiceable: true, 
                        message: null 
                    }));
                }
            }
        };

        checkServiceability();
        
        return () => {
            isMounted = false;
        };
    }, [activeAddress]);

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
        serviceability,
        updateActiveAddress,
        refreshAddresses,
    }), [addresses, activeAddress, serviceability, updateActiveAddress, refreshAddresses]);

    return (
        <LocationContext.Provider value={value}>
            {children}
        </LocationContext.Provider>
    );
};

export const useUserLocation = () => {
    const context = useContext(LocationContext);
    if (!context) {
        // Fallback to empty object instead of throwing to prevent app crash
        // though we should investigate why context is missing
        return {
            addresses: [],
            activeAddress: null,
            updateActiveAddress: () => { },
            refreshAddresses: () => { }
        };
    }
    return context;
};

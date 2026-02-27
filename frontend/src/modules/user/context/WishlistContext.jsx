import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { useWishlistStore } from '../../../shared/store/wishlistStore';

const WishlistContext = createContext();

export const WishlistProvider = ({ children }) => {
    const wishlistItems = useWishlistStore(state => state.items);
    const storeFetchWishlist = useWishlistStore(state => state.fetchWishlist);
    const storeAddItem = useWishlistStore(state => state.addItem);
    const storeRemoveItem = useWishlistStore(state => state.removeItem);
    const storeIsInWishlist = useWishlistStore(state => state.isInWishlist);

    // Fetch wishlist items on mount if authenticated
    React.useEffect(() => {
        storeFetchWishlist().catch(() => { });
    }, [storeFetchWishlist]);

    const addToWishlist = useCallback((product) => {
        storeAddItem({ ...product, id: product._id || product.id });
    }, [storeAddItem]);

    const removeFromWishlist = useCallback((productId) => {
        storeRemoveItem(productId);
    }, [storeRemoveItem]);

    const toggleWishlist = useCallback((product) => {
        const id = product._id || product.id;
        if (storeIsInWishlist(id)) {
            storeRemoveItem(id);
        } else {
            storeAddItem({ ...product, id });
        }
    }, [storeAddItem, storeRemoveItem, storeIsInWishlist]);

    const isInWishlist = useCallback((productId) => {
        return storeIsInWishlist(productId);
    }, [storeIsInWishlist]);

    const value = useMemo(() => ({
        wishlistItems,
        addToWishlist,
        removeFromWishlist,
        toggleWishlist,
        isInWishlist,
    }), [wishlistItems, addToWishlist, removeFromWishlist, toggleWishlist, isInWishlist]);

    return (
        <WishlistContext.Provider value={value}>
            {children}
        </WishlistContext.Provider>
    );
};

export const useWishlist = () => {
    const context = useContext(WishlistContext);
    if (!context) {
        throw new Error('useWishlist must be used within a WishlistProvider');
    }
    return context;
};

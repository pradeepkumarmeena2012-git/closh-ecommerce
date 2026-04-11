import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useCartStore } from '../../../shared/store/useStore';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
    const items = useCartStore(state => state.items);
    const storeAddItem = useCartStore(state => state.addItem);
    const storeRemoveItem = useCartStore(state => state.removeItem);
    const storeUpdateQuantity = useCartStore(state => state.updateQuantity);
    const storeClearCart = useCartStore(state => state.clearCart);
    const storeGetTotal = useCartStore(state => state.getTotal);
    const storeGetItemCount = useCartStore(state => state.getItemCount);
    const storeUpdateVariant = useCartStore(state => state.updateItemVariant);

    const [lastAddedItem, setLastAddedItem] = useState(null);

    const addToCart = useCallback((product) => {
        const added = storeAddItem({
            id: product._id || product.id,
            name: product.name,
            price: product.discountedPrice !== undefined ? product.discountedPrice : (product.price || 0),
            originalPrice: product.originalPrice || product.price || 0,
            image: Array.isArray(product.images) ? product.images[0] : (product.image || ''),
            images: product.images,
            brand: product.brand,
            vendorId: product.vendorId?._id || product.vendorId || 1,
            vendorName: product.vendorId?.storeName || product.vendorName || 'Store',
            stockQuantity: product.stockQuantity || product.stock,
            variant: product.selectedSize ? { size: product.selectedSize } : (product.variant || undefined),
            quantity: product.quantity || 1,
        });
        if (added) {
            setLastAddedItem(product);
            setTimeout(() => setLastAddedItem(null), 3000);
        }
    }, [storeAddItem]);

    const removeFromCart = useCallback((productId, variant = null) => {
        storeRemoveItem(productId, variant);
    }, [storeRemoveItem]);

    const updateQuantity = useCallback((productId, quantity, variant = null) => {
        storeUpdateQuantity(productId, quantity, variant);
    }, [storeUpdateQuantity]);

    const clearCart = useCallback(() => {
        storeClearCart();
    }, [storeClearCart]);

    const getCartTotal = useCallback(() => {
        return storeGetTotal();
    }, [storeGetTotal]);

    const getCartCount = useCallback(() => {
        return storeGetItemCount();
    }, [storeGetItemCount]);

    const updateVariant = useCallback((cartLineKey, newVariant) => {
        storeUpdateVariant(cartLineKey, newVariant);
    }, [storeUpdateVariant]);

    const value = useMemo(() => ({
        cart: items,
        addToCart,
        removeFromCart,
        updateQuantity,
        updateVariant,
        clearCart,
        getCartTotal,
        getCartCount,
        lastAddedItem,
    }), [items, addToCart, removeFromCart, updateQuantity, updateVariant, clearCart, getCartTotal, getCartCount, lastAddedItem]);

    return (
        <CartContext.Provider value={value}>
            {children}
        </CartContext.Provider>
    );
};

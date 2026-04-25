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
        // The caller (e.g. ProductDetailsPage) resolves the correct variant price
        // and passes it as `product.price`. We must use that resolved price.
        // Only fall back to discountedPrice when no explicit price is given.
        const resolvedPrice = Number(product.price) || Number(product.discountedPrice) || 0;
        
        const added = storeAddItem({
            id: product._id || product.id,
            name: product.name,
            price: resolvedPrice,
            originalPrice: product.originalPrice || product.price || 0,
            discountedPrice: product.discountedPrice,
            image: Array.isArray(product.images) ? product.images[0] : (product.image || ''),
            images: product.images,
            brand: product.brand,
            vendorId: product.vendorId?._id || product.vendorId || 1,
            vendorName: product.vendorId?.storeName || product.vendorName || 'Store',
            stockQuantity: product.stockQuantity || product.stock,
            variant: {
                ...(product.variant || {}),
                ...(product.selectedSize && { size: product.selectedSize }),
                ...(product.selectedColor && { color: product.selectedColor }),
            },
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

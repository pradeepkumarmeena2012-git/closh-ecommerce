import { useMemo } from 'react';
import { AuthProvider } from '../../context/AuthContext';
import { CartProvider } from '../../context/CartContext';
import { WishlistProvider } from '../../context/WishlistContext';
import { LocationProvider } from '../../context/LocationContext';
import { CategoryProvider } from '../../context/CategoryContext';

const UserProviders = ({ children }) => {
    // Memoize the stack to avoid re-rendering providers unnecessarily
    const content = useMemo(() => (
        <AuthProvider>
            <CartProvider>
                <WishlistProvider>
                    <LocationProvider>
                        <CategoryProvider>
                            {children}
                        </CategoryProvider>
                    </LocationProvider>
                </WishlistProvider>
            </CartProvider>
        </AuthProvider>
    ), [children]);

    return content;
};

export default UserProviders;

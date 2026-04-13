import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import toast from "react-hot-toast";
import { useAuthStore } from "./authStore";
import { setPostLoginAction, setPostLoginRedirect } from "../utils/postLoginAction";
import { getVariantSignature } from "../utils/variant";

const getCartLineKey = (id, variant = {}) =>
  `${String(id)}::${getVariantSignature(variant)}`;
const getCurrentAuthUserId = () => {
  const authState = useAuthStore.getState();
  return String(authState?.user?.id || authState?.user?._id || "").trim();
};

const redirectToLogin = () => {
  if (typeof window === "undefined") return;
  const currentPath = window.location.pathname || "/home";
  if (currentPath === "/login") return;

  const fromPath = `${window.location.pathname || ""}${window.location.search || ""}${window.location.hash || ""}`;
  setPostLoginRedirect(fromPath || "/home");

  // SPA-friendly redirect without full page reload.
  const nextState = { from: { pathname: fromPath || "/home" } };
  window.history.pushState(nextState, "", "/login");
  window.dispatchEvent(new PopStateEvent("popstate", { state: nextState }));
};

// Cart Store
export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      ownerUserId: null,
      addItem: (item) => {
        const authState = useAuthStore.getState();
        if (!authState?.isAuthenticated) {
          setPostLoginAction({
            type: "cart:add",
            payload: {
              ...item,
              quantity: Number(item?.quantity) > 0 ? Number(item.quantity) : 1,
            },
          });
          toast.error("Please login to add products to cart");
          redirectToLogin();
          return false;
        }
        const currentUserId = getCurrentAuthUserId();
        if (!currentUserId) {
          toast.error("Please login to add products to cart");
          redirectToLogin();
          return false;
        }

        const ownerUserId = String(get().ownerUserId || "").trim();
        if (ownerUserId && ownerUserId !== currentUserId) {
          set({ items: [], ownerUserId: currentUserId });
        }

        const availableStock = Number(item?.stockQuantity);
        if (Number.isFinite(availableStock) && availableStock <= 0) {
          toast.error("Product is out of stock");
          return false;
        }

        const lineKey = getCartLineKey(item.id, item.variant);
        const existingItem = get().items.find(
          (i) => String(i.cartLineKey || getCartLineKey(i.id, i.variant)) === lineKey
        );
        const quantityToAdd = item.quantity || 1;
        const newQuantity = existingItem
          ? existingItem.quantity + quantityToAdd
          : quantityToAdd;

        // If stock quantity is known on the item payload, keep local guard.
        if (Number.isFinite(availableStock) && newQuantity > availableStock) {
          toast.error(`Only ${availableStock} items available in stock`);
          return false;
        }

        if (newQuantity <= 0) {
          return false;
        }

        // Include vendor information from product
        const itemWithVendor = {
          ...item,
          cartLineKey: lineKey,
          vendorId: item.vendorId || 1,
          vendorName: item.vendorName || "Unknown Vendor",
        };

        set((state) => {
          if (existingItem) {
            return {
              items: state.items.map((i) =>
                String(i.id) === String(item.id)
                  && String(i.cartLineKey || getCartLineKey(i.id, i.variant)) === lineKey
                  ? {
                    ...i,
                    ...itemWithVendor,
                    quantity:
                      Number.isFinite(availableStock)
                        ? Math.min(newQuantity, availableStock)
                        : newQuantity,
                  }
                  : i
              ),
              ownerUserId: currentUserId,
            };
          }
          return {
            items: [
              ...state.items,
              {
                ...itemWithVendor,
                quantity:
                  Number.isFinite(availableStock)
                    ? Math.min(quantityToAdd, availableStock)
                    : quantityToAdd,
              },
            ],
            ownerUserId: currentUserId,
          };
        });

        if (Number.isFinite(availableStock) && newQuantity >= availableStock * 0.8) {
          toast(`Only ${availableStock} left in stock!`, { icon: "⚠️" });
        }

        // Trigger cart animation
        const { triggerCartAnimation } = useUIStore.getState();
        triggerCartAnimation();
        return true;
      },
      removeItem: (id, variant = null) =>
        set((state) => ({
          items: state.items.filter((item) => {
            if (String(item.id) !== String(id)) return true;
            if (!variant) return false; // backwards-compatible: remove all variants for this product
            const candidate = String(item.cartLineKey || getCartLineKey(item.id, item.variant));
            return candidate !== getCartLineKey(id, variant);
          }),
          ownerUserId: state.ownerUserId,
        })),
      updateQuantity: (id, quantity, variant = null) => {
        if (quantity <= 0) {
          get().removeItem(id, variant);
          return;
        }

        const targetItem = get().items.find((item) => {
          if (String(item.id) !== String(id)) return false;
          if (!variant) return true;
          const candidate = String(item.cartLineKey || getCartLineKey(item.id, item.variant));
          return candidate === getCartLineKey(id, variant);
        });
        const availableStock = Number(targetItem?.stockQuantity);
        if (Number.isFinite(availableStock) && quantity > availableStock) {
          toast.error(`Only ${availableStock} items available in stock`);
          quantity = availableStock;
        }

        set((state) => ({
          items: state.items.map((item) =>
            (() => {
              if (String(item.id) !== String(id)) return item;
              if (!variant) return { ...item, quantity };
              const candidate = String(item.cartLineKey || getCartLineKey(item.id, item.variant));
              return candidate === getCartLineKey(id, variant)
                ? { ...item, quantity }
                : item;
            })()
          ),
          ownerUserId: state.ownerUserId,
        }));
      },
      updateItemVariant: (cartLineKey, newVariant) => {
        const state = get();
        const existingItem = state.items.find((i) => (i.cartLineKey || getCartLineKey(i.id, i.variant)) === cartLineKey);
        if (!existingItem) return;

        const newLineKey = getCartLineKey(existingItem.id, newVariant);
        
        // Check if an item with the new variant already exists
        const duplicateItem = state.items.find(
          (i) => (i.cartLineKey || getCartLineKey(i.id, i.variant)) === newLineKey && (i.cartLineKey || getCartLineKey(i.id, i.variant)) !== cartLineKey
        );

        if (duplicateItem) {
          // Merge with duplicate and remove the old one
          const newQuantity = duplicateItem.quantity + existingItem.quantity;
          set((state) => ({
            items: state.items
              .filter((i) => (i.cartLineKey || getCartLineKey(i.id, i.variant)) !== cartLineKey)
              .map((i) => (i.cartLineKey || getCartLineKey(i.id, i.variant)) === newLineKey ? { ...i, quantity: newQuantity } : i),
            ownerUserId: state.ownerUserId,
          }));
        } else {
          // Update current item with new variant
          set((state) => ({
            items: state.items.map((i) =>
              (i.cartLineKey || getCartLineKey(i.id, i.variant)) === cartLineKey
                ? { 
                    ...i, 
                    variant: newVariant, 
                    cartLineKey: newLineKey,
                    selectedSize: newVariant.size // sync with convenience field
                  }
                : i
            ),
            ownerUserId: state.ownerUserId,
          }));
        }
      },
      clearCart: () => set({ items: [], ownerUserId: getCurrentAuthUserId() || null }),
      getTotal: () => {
        const authState = useAuthStore.getState();
        if (!authState?.isAuthenticated) {
          return 0;
        }
        const currentUserId = getCurrentAuthUserId();
        const ownerUserId = String(get().ownerUserId || "").trim();
        if (ownerUserId && currentUserId && ownerUserId !== currentUserId) {
          return 0;
        }
        const state = get();
        return state.items.reduce(
          (total, item) => total + item.price * item.quantity,
          0
        );
      },
      getItemCount: () => {
        const authState = useAuthStore.getState();
        if (!authState?.isAuthenticated) return 0;

        const currentUserId = getCurrentAuthUserId();
        const state = get();

        // Return 0 if data belongs to another user
        if (state.ownerUserId && currentUserId && state.ownerUserId !== currentUserId) {
          return 0;
        }

        return state.items.reduce((count, item) => count + item.quantity, 0);
      },
      // Group items by vendor
      getItemsByVendor: () => {
        const authState = useAuthStore.getState();
        if (!authState?.isAuthenticated) {
          return [];
        }
        const currentUserId = getCurrentAuthUserId();
        const ownerUserId = String(get().ownerUserId || "").trim();
        if (ownerUserId && currentUserId && ownerUserId !== currentUserId) {
          return [];
        }
        const state = get();
        const vendorGroups = {};

        state.items.forEach((item) => {
          const vendorId = String(item.vendorId || 1);
          const vendorName = item.vendorName || "Unknown Vendor";

          if (!vendorGroups[vendorId]) {
            vendorGroups[vendorId] = {
              vendorId,
              vendorName,
              items: [],
              subtotal: 0,
            };
          }

          const itemSubtotal = item.price * item.quantity;
          vendorGroups[vendorId].items.push(item);
          vendorGroups[vendorId].subtotal += itemSubtotal;
        });

        return Object.values(vendorGroups);
      },
    }),
    {
      name: "cart-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        items: state.items,
        ownerUserId: state.ownerUserId,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const currentUserId = getCurrentAuthUserId();
        if (state.ownerUserId && currentUserId && state.ownerUserId !== currentUserId) {
          state.items = [];
          state.ownerUserId = currentUserId;
        }
      },
    }
  )
);

// UI Store (for modals, loading states, etc.)
export const useUIStore = create((set) => ({
  isMenuOpen: false,
  isCartOpen: false,
  isLoading: false,
  cartAnimationTrigger: 0,
  toggleMenu: () => set((state) => ({ isMenuOpen: !state.isMenuOpen })),
  toggleCart: () => set((state) => ({ isCartOpen: !state.isCartOpen })),
  setLoading: (loading) => set({ isLoading: loading }),
  triggerCartAnimation: () =>
    set((state) => ({ cartAnimationTrigger: state.cartAnimationTrigger + 1 })),
}));

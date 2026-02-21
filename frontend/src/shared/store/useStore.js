import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { getProductById as getCatalogProductById } from "../../modules/UserApp/data/catalogData";
import toast from "react-hot-toast";

const normalizeVariantPart = (value) => String(value || "").trim().toLowerCase();
const getVariantSignature = (variant = {}) =>
  `${normalizeVariantPart(variant?.size)}|${normalizeVariantPart(variant?.color)}`;
const getCartLineKey = (id, variant = {}) =>
  `${String(id)}::${getVariantSignature(variant)}`;

// Cart Store
export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        const product = getCatalogProductById(item.id);
        if (!product) {
          toast.error("Product not found");
          return;
        }

        if (product.stock === "out_of_stock") {
          toast.error("Product is out of stock");
          return;
        }

        const lineKey = getCartLineKey(item.id, item.variant);
        const existingItem = get().items.find(
          (i) => String(i.cartLineKey || getCartLineKey(i.id, i.variant)) === lineKey
        );
        const quantityToAdd = item.quantity || 1;
        const newQuantity = existingItem
          ? existingItem.quantity + quantityToAdd
          : quantityToAdd;

        // Check stock limit
        if (newQuantity > product.stockQuantity) {
          toast.error(`Only ${product.stockQuantity} items available in stock`);
          return;
        }

        if (newQuantity <= 0) {
          return;
        }

        // Include vendor information from product
        const itemWithVendor = {
          ...item,
          cartLineKey: lineKey,
          vendorId: product.vendorId || item.vendorId || 1,
          vendorName: product.vendorName || item.vendorName || "Unknown Vendor",
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
                    quantity: Math.min(newQuantity, product.stockQuantity),
                  }
                  : i
              ),
            };
          }
          return {
            items: [
              ...state.items,
              {
                ...itemWithVendor,
                quantity: Math.min(quantityToAdd, product.stockQuantity),
              },
            ],
          };
        });

        if (
          product.stock === "low_stock" &&
          newQuantity >= product.stockQuantity * 0.8
        ) {
          toast.warning(`Only ${product.stockQuantity} left in stock!`);
        }

        // Trigger cart animation
        const { triggerCartAnimation } = useUIStore.getState();
        triggerCartAnimation();
      },
      removeItem: (id, variant = null) =>
        set((state) => ({
          items: state.items.filter((item) => {
            if (String(item.id) !== String(id)) return true;
            if (!variant) return false; // backwards-compatible: remove all variants for this product
            const candidate = String(item.cartLineKey || getCartLineKey(item.id, item.variant));
            return candidate !== getCartLineKey(id, variant);
          }),
        })),
      updateQuantity: (id, quantity, variant = null) => {
        if (quantity <= 0) {
          get().removeItem(id, variant);
          return;
        }

        const product = getCatalogProductById(id);
        if (product && quantity > product.stockQuantity) {
          toast.error(`Only ${product.stockQuantity} items available in stock`);
          quantity = product.stockQuantity;
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
        }));
      },
      clearCart: () => set({ items: [] }),
      getTotal: () => {
        const state = useCartStore.getState();
        return state.items.reduce(
          (total, item) => total + item.price * item.quantity,
          0
        );
      },
      getItemCount: () => {
        const state = useCartStore.getState();
        return state.items.reduce((count, item) => count + item.quantity, 0);
      },
      // Group items by vendor
      getItemsByVendor: () => {
        const state = useCartStore.getState();
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

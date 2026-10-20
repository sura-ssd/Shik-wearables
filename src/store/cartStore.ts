import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartColor, CartLine, Product } from "../types";

interface CartState {
  items: CartLine[];
  /** The signed-in account this cart belongs to, or null for a guest cart. */
  ownerId: string | null;
  isOpen: boolean;
  isRestoring: boolean;
  notice: string | null;
  addItem: (product: Product, size: string, color?: CartColor) => void;
  removeItem: (productId: string, size: string, colorId?: string) => void;
  setQuantity: (productId: string, size: string, quantity: number, colorId?: string) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  replaceCart: (items: CartLine[], ownerId: string | null, notice?: string | null) => void;
  /** Empties the cart on this device (used when someone signs out). */
  reset: () => void;
  setRestoring: (value: boolean) => void;
  dismissNotice: () => void;
}

// A cart line is one product in one color and one size.
const isLine = (item: CartLine, productId: string, size: string, colorId?: string) =>
  item.product.id === productId && item.size === size && (item.color?.id ?? "") === (colorId ?? "");

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      ownerId: null,
      isOpen: false,
      isRestoring: false,
      notice: null,
      addItem: (product, size, color) =>
        set((state) => {
          const existing = state.items.find((item) => isLine(item, product.id, size, color?.id));
          return {
            items: existing
              ? state.items.map((item) =>
                  isLine(item, product.id, size, color?.id)
                    ? { ...item, quantity: item.quantity + 1 }
                    : item,
                )
              : [...state.items, { product, size, color, quantity: 1 }],
            isOpen: true,
          };
        }),
      removeItem: (productId, size, colorId) =>
        set((state) => ({
          items: state.items.filter((item) => !isLine(item, productId, size, colorId)),
        })),
      setQuantity: (productId, size, quantity, colorId) =>
        set((state) => ({
          items:
            quantity < 1
              ? state.items.filter((item) => !isLine(item, productId, size, colorId))
              : state.items.map((item) =>
                  isLine(item, productId, size, colorId) ? { ...item, quantity } : item,
                ),
        })),
      clearCart: () => set({ items: [] }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      replaceCart: (items, ownerId, notice = null) => set({ items, ownerId, notice }),
      reset: () => set({ items: [], ownerId: null, notice: null, isOpen: false, isRestoring: false }),
      setRestoring: (value) => set({ isRestoring: value }),
      dismissNotice: () => set({ notice: null }),
    }),
    {
      name: "shik-shop-cart",
      // Carts saved before the shop moved to Supabase hold old product ids, so start fresh.
      version: 2,
      migrate: () => ({ items: [] }) as unknown as CartState,
      partialize: (state) => ({ items: state.items, ownerId: state.ownerId }) as CartState,
    },
  ),
);

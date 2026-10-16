import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartLine, Product } from "../types";

interface CartState {
  items: CartLine[];
  /** The signed-in account this cart belongs to, or null for a guest cart. */
  ownerId: string | null;
  isOpen: boolean;
  isRestoring: boolean;
  notice: string | null;
  addItem: (product: Product, size: string) => void;
  removeItem: (productId: string, size: string) => void;
  setQuantity: (productId: string, size: string, quantity: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  replaceCart: (items: CartLine[], ownerId: string | null, notice?: string | null) => void;
  /** Empties the cart on this device (used when someone signs out). */
  reset: () => void;
  setRestoring: (value: boolean) => void;
  dismissNotice: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      ownerId: null,
      isOpen: false,
      isRestoring: false,
      notice: null,
      addItem: (product, size) =>
        set((state) => {
          const existing = state.items.find(
            (item) => item.product.id === product.id && item.size === size,
          );
          return {
            items: existing
              ? state.items.map((item) =>
                  item.product.id === product.id && item.size === size
                    ? { ...item, quantity: item.quantity + 1 }
                    : item,
                )
              : [...state.items, { product, size, quantity: 1 }],
            isOpen: true,
          };
        }),
      removeItem: (productId, size) =>
        set((state) => ({
          items: state.items.filter(
            (item) => item.product.id !== productId || item.size !== size,
          ),
        })),
      setQuantity: (productId, size, quantity) =>
        set((state) => ({
          items:
            quantity < 1
              ? state.items.filter(
                  (item) => item.product.id !== productId || item.size !== size,
                )
              : state.items.map((item) =>
                  item.product.id === productId && item.size === size
                    ? { ...item, quantity }
                    : item,
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

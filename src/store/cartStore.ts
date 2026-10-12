import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartLine, Product } from "../types";

interface CartState {
  items: CartLine[];
  isOpen: boolean;
  addItem: (product: Product, size: string) => void;
  removeItem: (productId: string, size: string) => void;
  setQuantity: (productId: string, size: string, quantity: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      isOpen: false,
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
    }),
    {
      name: "shik-shop-cart",
      partialize: (state) => ({ items: state.items }) as CartState,
    },
  ),
);

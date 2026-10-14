import { create } from "zustand";
import { fetchProducts } from "../lib/products";
import type { Product } from "../types";

type Status = "idle" | "loading" | "ready" | "error";

interface ProductState {
  products: Product[];
  status: Status;
  error: string | null;
  /** Loads once; pass force = true to refresh (for example after posting a product). */
  load: (force?: boolean) => Promise<void>;
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  status: "idle",
  error: null,
  load: async (force = false) => {
    const { status } = get();
    if (!force && (status === "loading" || status === "ready")) return;

    set({ status: "loading", error: null });
    try {
      set({ products: await fetchProducts(), status: "ready" });
    } catch (error) {
      set({
        status: "error",
        error: error instanceof Error ? error.message : "Could not load products.",
      });
    }
  },
}));

import { create } from "zustand";
import { fetchProducts } from "../lib/products";
import type { Product } from "../types";

type Status = "idle" | "loading" | "ready" | "error";

interface ProductState {
  products: Product[];
  status: Status;
  error: string | null;
  /**
   * Loads the catalog and resolves when it is done. Calls made while a load is already running
   * wait for that same load. Pass force = true to refresh (for example after posting a product).
   */
  load: (force?: boolean) => Promise<void>;
}

let inflight: Promise<void> | null = null;

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  status: "idle",
  error: null,
  load: (force = false) => {
    if (!force) {
      if (inflight) return inflight;
      if (get().status === "ready") return Promise.resolve();
    }

    set({ status: "loading", error: null });

    const run: Promise<void> = (async () => {
      try {
        set({ products: await fetchProducts(), status: "ready" });
      } catch (error) {
        set({
          status: "error",
          error: error instanceof Error ? error.message : "Could not load products.",
        });
      }
    })().finally(() => {
      // Only clear the marker if no newer load has replaced this one.
      if (inflight === run) inflight = null;
    });

    inflight = run;
    return run;
  },
}));
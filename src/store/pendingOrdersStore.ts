import { create } from "zustand";

interface PendingOrdersState {
  /** Orders waiting for the shop to confirm them. Only filled in for admins. */
  count: number;
  setCount: (count: number) => void;
}

export const usePendingOrdersStore = create<PendingOrdersState>((set) => ({
  count: 0,
  setCount: (count) => set({ count }),
}));

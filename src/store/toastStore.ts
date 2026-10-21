import { create } from "zustand";

export type ToastKind = "success" | "error" | "info";

export interface Toast {
  id: string;
  kind: ToastKind;
  title: string;
  description?: string;
  /** How long it stays on screen, in milliseconds. */
  duration: number;
}

const MAX_TOASTS = 4;
const DURATIONS: Record<ToastKind, number> = {
  success: 4000,
  info: 5000,
  error: 7000, // errors stay a little longer so they can be read
};

let counter = 0;

interface ToastState {
  toasts: Toast[];
  show: (kind: ToastKind, title: string, description?: string) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  show: (kind, title, description) => {
    // Ignore an identical message that is already showing.
    const isDuplicate = get().toasts.some(
      (item) => item.kind === kind && item.title === title && item.description === description,
    );
    if (isDuplicate) return;

    counter += 1;
    const next: Toast = { id: `toast-${counter}`, kind, title, description, duration: DURATIONS[kind] };
    set((state) => ({ toasts: [...state.toasts, next].slice(-MAX_TOASTS) }));
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) })),
}));

/** Use from anywhere: toast.success("Saved"), toast.error("Failed", "Reason"), toast.info("Note"). */
export const toast = {
  success: (title: string, description?: string) => useToastStore.getState().show("success", title, description),
  error: (title: string, description?: string) => useToastStore.getState().show("error", title, description),
  info: (title: string, description?: string) => useToastStore.getState().show("info", title, description),
};

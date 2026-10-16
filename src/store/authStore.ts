import type { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";
import { flushCartSync, reconcileCart } from "../lib/cartSync";
import { supabase } from "../lib/supabase";

type Role = "customer" | "admin";

interface AuthState {
  user: User | null;
  role: Role | null;
  isLoading: boolean;
  /** Starts listening to sign-in state. Returns a function that stops listening. */
  init: () => () => void;
  signOut: () => Promise<void>;
}

let latestRun = 0;

async function fetchRole(userId: string): Promise<Role> {
  const { data } = await supabase.from("profiles").select("role").eq("user_id", userId).maybeSingle();
  return data?.role === "admin" ? "admin" : "customer";
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: null,
  isLoading: true,
  init: () => {
    let active = true;

    async function apply(session: Session | null) {
      const run = ++latestRun;

      if (!session) {
        // Signed out: a signed-in cart is cleared from this device (it stays saved online).
        await reconcileCart(null);
        if (active && run === latestRun) set({ user: null, role: null, isLoading: false });
        return;
      }

      const role = await fetchRole(session.user.id);
      if (!active || run !== latestRun) return;
      set({ user: session.user, role, isLoading: false });

      // Bring back this account's saved cart.
      void reconcileCart(session.user.id);
    }

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      // Run outside the callback so Supabase calls inside it cannot deadlock.
      window.setTimeout(() => void apply(session), 0);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  },
  signOut: async () => {
    // Save the latest cart changes online first, then sign out.
    await flushCartSync();
    await supabase.auth.signOut();
  },
}));

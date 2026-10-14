import type { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";
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
      if (!session) {
        if (active) set({ user: null, role: null, isLoading: false });
        return;
      }
      const role = await fetchRole(session.user.id);
      if (active) set({ user: session.user, role, isLoading: false });
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
    await supabase.auth.signOut();
  },
}));

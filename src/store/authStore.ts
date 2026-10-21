import type { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";
import { flushCartSync, reconcileCart } from "../lib/cartSync";
import { supabase } from "../lib/supabase";
import { toast } from "./toastStore";

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
// True while the person pressed "Sign out" themselves, so we can tell that apart from a session that ended.
let signingOutByChoice = false;

function announceSignOut() {
  if (signingOutByChoice) {
    signingOutByChoice = false;
    toast.success("Signed out", "Your cart stays saved to your account.");
  } else {
    // The session ended on its own: it expired, or the person signed out in another tab or device.
    toast.info("You've been signed out", "Your session ended. Sign in again to continue.");
  }
}

async function fetchRole(userId: string): Promise<Role> {
  const { data } = await supabase.from("profiles").select("role").eq("user_id", userId).maybeSingle();
  return data?.role === "admin" ? "admin" : "customer";
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  role: null,
  isLoading: true,
  init: () => {
    let active = true;

    async function apply(session: Session | null) {
      const run = ++latestRun;

      if (!session) {
        const wasSignedIn = get().user !== null;

        // Signed out: a signed-in cart is cleared from this device (it stays saved online).
        await reconcileCart(null);
        if (active && run === latestRun) {
          set({ user: null, role: null, isLoading: false });
          // Tell the person, however they ended up signed out.
          if (wasSignedIn) announceSignOut();
        }
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
    signingOutByChoice = true;
    const { error } = await supabase.auth.signOut();
    if (error) {
      signingOutByChoice = false;
      toast.error("Couldn't sign out", error.message);
    }
  },
}));

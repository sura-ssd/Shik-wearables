import { useCartStore } from "../store/cartStore";
import { useProductStore } from "../store/productStore";
import { toast } from "../store/toastStore";
import type { CartLine, Product } from "../types";
import { cartLineKey, toCartColor } from "../utils/cartLine";
import { supabase } from "./supabase";

const SAVE_DELAY_MS = 500;
const MAX_LINE_QUANTITY = 10;

interface SavedLine {
  product_id: string;
  color_id?: string | null;
  size: string;
  quantity: number;
}

function isSavedLine(value: unknown): value is SavedLine {
  const line = value as Partial<SavedLine> | null;
  return (
    typeof line?.product_id === "string" &&
    typeof line.size === "string" &&
    (line.color_id === undefined || line.color_id === null || typeof line.color_id === "string") &&
    Number.isInteger(line.quantity) &&
    (line.quantity as number) > 0
  );
}

async function fetchSavedCart(userId: string): Promise<SavedLine[]> {
  const { data, error } = await supabase
    .from("saved_carts")
    .select("items")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Array.isArray(data?.items) ? data.items.filter(isSavedLine) : [];
}

async function writeSavedCart(userId: string, items: CartLine[]): Promise<void> {
  if (items.length === 0) {
    const { error } = await supabase.from("saved_carts").delete().eq("user_id", userId);
    if (error) throw new Error(error.message);
    return;
  }
  const saved: SavedLine[] = items.map((line) => ({
    product_id: line.product.id,
    color_id: line.color?.id ?? null,
    size: line.size,
    quantity: line.quantity,
  }));
  const { error } = await supabase
    .from("saved_carts")
    .upsert({ user_id: userId, items: saved }, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
}

/**
 * Turns saved lines back into cart lines using the CURRENT catalog.
 * Hidden products and sizes that are out of stock are dropped, and prices are today's prices.
 */
function resolveLines(saved: SavedLine[], products: Product[]): { lines: CartLine[]; removed: number } {
  const lines: CartLine[] = [];
  let removed = 0;

  for (const line of saved) {
    const product = products.find((item) => item.id === line.product_id);
    if (!product) {
      removed += 1;
      continue;
    }

    // Products with colors need that exact color in stock in that size.
    const color = line.color_id ? product.colors.find((item) => item.id === line.color_id) : undefined;
    const available = product.colors.length > 0 ? color?.sizes : product.sizes;
    if (!available?.includes(line.size)) {
      removed += 1;
      continue;
    }

    lines.push({
      product,
      size: line.size,
      color: color ? toCartColor(color) : undefined,
      quantity: Math.min(line.quantity, MAX_LINE_QUANTITY),
    });
  }
  return { lines, removed };
}

function mergeLines(first: CartLine[], second: CartLine[]): CartLine[] {
  const merged = new Map<string, CartLine>();
  for (const line of [...first, ...second]) {
    const key = cartLineKey(line);
    const existing = merged.get(key);
    merged.set(key, {
      ...line,
      quantity: Math.min((existing?.quantity ?? 0) + line.quantity, MAX_LINE_QUANTITY),
    });
  }
  return [...merged.values()];
}

/**
 * Called whenever the signed-in user changes.
 * - Signed out: a cart that belonged to an account is wiped from this device (it stays saved online).
 * - Signed in: the account's saved cart comes back, merged with anything added as a guest.
 */
export async function reconcileCart(userId: string | null): Promise<void> {
  const cart = useCartStore.getState();

  if (!userId) {
    if (cart.ownerId !== null) cart.reset();
    return;
  }
  // This device already holds this account's cart, and it is kept in sync as it changes.
  if (cart.ownerId === userId) return;

  cart.setRestoring(true);
  try {
    await useProductStore.getState().load();
    const { products, status } = useProductStore.getState();
    if (status !== "ready") throw new Error("The catalog is not available.");

    const saved = await fetchSavedCart(userId);
    const { lines, removed } = resolveLines(saved, products);

    // Read the cart again now, so anything added while we were loading is kept.
    // A cart left behind by a different account is never carried over.
    const current = useCartStore.getState();
    const guestLines = current.ownerId === null ? current.items : [];

    current.replaceCart(
      mergeLines(lines, guestLines),
      userId,
      removed > 0 ? "Some items in your saved cart are no longer available and were removed." : null,
    );

    if (removed > 0) toast.info("Cart updated", "Some saved items are no longer available and were removed.");
    else if (lines.length > 0) toast.success("Welcome back", "Your saved cart has been restored.");
  } catch (error) {
    console.error("Could not restore the saved cart", error);
    useCartStore.setState({ notice: "We could not restore your saved cart. Please refresh the page." });
    toast.error("Couldn't restore your cart", "Please refresh the page and try again.");
  } finally {
    useCartStore.getState().setRestoring(false);
  }
}

let timer: number | undefined;
let lastSaveErrorAt = 0;
let pending: { userId: string; items: CartLine[] } | null = null;

async function writePending(): Promise<void> {
  if (!pending) return;
  const job = pending;
  pending = null;
  try {
    await writeSavedCart(job.userId, job.items);
  } catch (error) {
    console.error("Could not save the cart", error);
    // At most one message a minute, so a bad connection does not flood the screen.
    if (Date.now() - lastSaveErrorAt > 60_000) {
      lastSaveErrorAt = Date.now();
      toast.error("Couldn't save your cart", "Your changes may be lost if you sign out.");
    }
  }
}

/** Saves the cart online shortly after each change while someone is signed in. */
export function startCartSync(): () => void {
  const unsubscribe = useCartStore.subscribe((state, previous) => {
    if (!state.ownerId) return;
    if (state.items === previous.items && state.ownerId === previous.ownerId) return;

    pending = { userId: state.ownerId, items: state.items };
    window.clearTimeout(timer);
    timer = window.setTimeout(() => void writePending(), SAVE_DELAY_MS);
  });

  return () => {
    window.clearTimeout(timer);
    unsubscribe();
  };
}

/** Saves any change still waiting. Call this just before signing out. */
export async function flushCartSync(): Promise<void> {
  window.clearTimeout(timer);
  await writePending();
}

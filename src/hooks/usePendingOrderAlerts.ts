import { useEffect } from "react";
import { fetchPendingOrderCount } from "../lib/orders";
import { toast } from "../store/toastStore";
import { usePendingOrdersStore } from "../store/pendingOrdersStore";

const REFRESH_MS = 60_000;

/** Event the admin pages send after changing an order, so the count updates straight away. */
export const ORDERS_CHANGED_EVENT = "shik:orders-changed";

/**
 * For admins: keeps the number of orders waiting for confirmation up to date,
 * and shows a toast when a new one arrives. Use it once, in the header.
 */
export function usePendingOrderAlerts(enabled: boolean): void {
  useEffect(() => {
    const { setCount } = usePendingOrdersStore.getState();
    if (!enabled) {
      setCount(0);
      return;
    }

    let cancelled = false;
    let previous: number | null = null;

    async function refresh() {
      try {
        const next = await fetchPendingOrderCount();
        if (cancelled) return;
        if (previous !== null && next > previous) {
          const added = next - previous;
          toast.info(
            added === 1 ? "New order received" : `${added} new orders received`,
            `${next} waiting for confirmation.`,
          );
        }
        previous = next;
        setCount(next);
      } catch {
        // A failed check is not worth bothering the admin about. The next one will try again.
      }
    }

    void refresh();
    const timer = window.setInterval(() => void refresh(), REFRESH_MS);
    window.addEventListener("focus", refresh);
    window.addEventListener(ORDERS_CHANGED_EVENT, refresh);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener(ORDERS_CHANGED_EVENT, refresh);
    };
  }, [enabled]);
}

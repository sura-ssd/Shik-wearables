export type OrderStatus =
  | "pending"
  | "confirmed"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "delivery_failed";

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Waiting for confirmation",
  confirmed: "Confirmed",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  delivery_failed: "Delivery failed",
};

/** What each status means for the customer. */
export const STATUS_SUMMARY: Record<OrderStatus, string> = {
  pending: "We received your order and will call you soon to confirm it.",
  confirmed: "Your order is confirmed and being prepared.",
  out_for_delivery: "Your order is on its way. Please keep your phone close and the cash ready.",
  delivered: "Your order was delivered. Thank you for shopping with us.",
  cancelled: "This order was cancelled.",
  delivery_failed: "We could not deliver this order.",
};

// Colors come from the site's palette, so they follow light and dark mode.
export const STATUS_BADGE: Record<OrderStatus, string> = {
  pending: "border-border bg-canvas text-ink",
  confirmed: "border-accent/40 bg-accent/10 text-accent",
  out_for_delivery: "border-accent/40 bg-accent/10 text-accent",
  delivered: "border-transparent bg-accent text-accent-ink",
  cancelled: "border-danger/40 bg-danger/10 text-danger",
  delivery_failed: "border-danger/40 bg-danger/10 text-danger",
};

/** The happy path, in order. */
export const TIMELINE: OrderStatus[] = ["pending", "confirmed", "out_for_delivery", "delivered"];

export const OPEN_STATUSES: OrderStatus[] = ["pending", "confirmed", "out_for_delivery"];

export function isOpenStatus(status: OrderStatus): boolean {
  return OPEN_STATUSES.includes(status);
}

export type Viewer = "customer" | "admin";

/**
 * One line about why an order ended, worded for whoever is reading it.
 * The shop's private reasons (like "Suspected fake order") are only ever shown to the shop.
 */
export function describeReason(status: OrderStatus, reason: string | null, viewer: Viewer): string | null {
  if (status !== "cancelled" && status !== "delivery_failed") return null;

  if (status === "delivery_failed") {
    return viewer === "admin" ? (reason ? `Delivery failed. Reason: ${reason}` : "Delivery failed.") : null;
  }
  if (reason === "customer") return viewer === "admin" ? "Cancelled by the customer." : "You cancelled this order.";
  if (reason === "expired") {
    return viewer === "admin"
      ? "Cancelled automatically: it was not confirmed within 24 hours."
      : "It was not confirmed in time, so it was cancelled automatically.";
  }
  if (viewer === "customer") return null;
  return reason && reason !== "admin" ? `Cancelled by the shop. Reason: ${reason}` : "Cancelled by the shop.";
}

/** The message a customer sees at the top of a cancelled or failed order. */
export function closureNotice(status: OrderStatus, reason: string | null): { title: string; body: string } | null {
  if (status === "delivery_failed") {
    return {
      title: "We could not deliver this order",
      body: "Please contact us if you would like to try again.",
    };
  }
  if (status !== "cancelled") return null;
  if (reason === "customer") {
    return {
      title: "Your order was cancelled",
      body: "There is nothing to pay. Your items are back on sale, and you can order again any time.",
    };
  }
  if (reason === "expired") {
    return {
      title: "Your order was cancelled",
      body: "We could not confirm it in time, so it was cancelled automatically. You are welcome to order again.",
    };
  }
  return {
    title: "This order was cancelled",
    body: "The shop cancelled this order. Please contact us if you have any questions.",
  };
}

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

/** Turns the saved reason into a sentence a customer can read. */
export function describeReason(status: OrderStatus, reason: string | null): string | null {
  if (status !== "cancelled" && status !== "delivery_failed") return null;
  if (reason === "customer") return "You cancelled this order.";
  if (reason === "expired") return "It was not confirmed in time, so it was cancelled automatically.";
  if (reason === "admin" || !reason) return null;
  return `Reason: ${reason}`;
}

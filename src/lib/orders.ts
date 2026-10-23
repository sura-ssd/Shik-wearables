import type { CartLine } from "../types";
import type { OrderStatus } from "../utils/orderStatus";
import { supabase } from "./supabase";

export interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  color_name: string | null;
  size: string;
  quantity: number;
  unit_price_etb: number;
  line_total_etb: number;
}

export interface Order {
  id: string;
  order_number: number;
  user_id: string;
  status: OrderStatus;
  full_name: string;
  phone: string;
  city: string;
  sub_city: string | null;
  address: string;
  delivery_note: string;
  subtotal_etb: number;
  delivery_fee_etb: number;
  total_etb: number;
  cancellation_reason: string | null;
  created_at: string;
  confirmed_at: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  order_items: OrderItem[];
}

const ORDER_COLUMNS =
  "id, order_number, user_id, status, full_name, phone, city, sub_city, address, delivery_note, subtotal_etb, delivery_fee_etb, total_etb, cancellation_reason, created_at, confirmed_at, dispatched_at, delivered_at, cancelled_at, order_items(id, product_id, product_name, color_name, size, quantity, unit_price_etb, line_total_etb)";

export interface DeliveryDetails {
  fullName: string;
  phone: string;
  subCity: string;
  address: string;
  deliveryNote: string;
}

/** Places a cash on delivery order and returns its id. The server checks prices and stock. */
export async function placeOrder(items: CartLine[], details: DeliveryDetails): Promise<string> {
  const { data, error } = await supabase.rpc("place_order", {
    p_items: items.map((item) => ({
      product_id: item.product.id,
      color_id: item.color?.id ?? null,
      size: item.size,
      quantity: item.quantity,
    })),
    p_shipping: {
      full_name: details.fullName,
      phone: details.phone,
      sub_city: details.subCity,
      address: details.address,
      delivery_note: details.deliveryNote,
    },
  });

  if (error || typeof data !== "string") {
    // Messages the database marks as safe for customers are shown as they are.
    if (error?.hint === "user_message") throw new Error(error.message);
    if (error && /stock|unavailable/i.test(error.message)) {
      throw new Error("Some items in your cart are no longer available in that size, color or quantity. Please update your cart.");
    }
    throw new Error("We could not place your order. Please try again.");
  }
  return data;
}

export async function fetchMyOrders(userId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Order[];
}

export async function fetchOrder(orderId: string): Promise<Order | null> {
  const { data, error } = await supabase.from("orders").select(ORDER_COLUMNS).eq("id", orderId).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as unknown as Order | null) ?? null;
}

export async function cancelMyOrder(orderId: string): Promise<void> {
  const { error } = await supabase.rpc("cancel_my_order", { p_order_id: orderId });
  if (error) throw new Error(error.hint === "user_message" ? error.message : "Could not cancel the order. Please try again.");
}

export type AdminOrderTab = "pending" | "confirmed" | "out_for_delivery" | "delivered" | "closed";

const TAB_STATUSES: Record<AdminOrderTab, OrderStatus[]> = {
  pending: ["pending"],
  confirmed: ["confirmed"],
  out_for_delivery: ["out_for_delivery"],
  delivered: ["delivered"],
  closed: ["cancelled", "delivery_failed"],
};

/** Orders for one tab of the admin page. Waiting orders show oldest first, finished ones newest first. */
export async function fetchAdminOrders(tab: AdminOrderTab): Promise<Order[]> {
  const oldestFirst = tab === "pending" || tab === "confirmed" || tab === "out_for_delivery";
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_COLUMNS)
    .in("status", TAB_STATUSES[tab])
    .order("created_at", { ascending: oldestFirst })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Order[];
}

export async function updateOrderStatus(orderId: string, status: OrderStatus, reason?: string): Promise<void> {
  const { error } = await supabase.rpc("update_order_status", {
    p_order_id: orderId,
    p_status: status,
    p_reason: reason ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function fetchPendingOrderCount(): Promise<number> {
  const { count, error } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  if (error) throw new Error(error.message);
  return count ?? 0;
}

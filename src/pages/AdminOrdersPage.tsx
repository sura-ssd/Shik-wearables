import { useCallback, useEffect, useRef, useState } from "react";
import { MapPin, Phone } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { AdminNav } from "../components/AdminNav";
import { OrderItemsList } from "../components/OrderItemsList";
import { OrderStatusBadge } from "../components/OrderStatusBadge";
import { RequireAdmin } from "../components/RequireAdmin";
import { ORDERS_CHANGED_EVENT } from "../hooks/usePendingOrderAlerts";
import { fetchAdminOrders, updateOrderStatus, type AdminOrderTab, type Order } from "../lib/orders";
import { toast } from "../store/toastStore";
import { formatDateTime } from "../utils/formatDate";
import { formatPrice } from "../utils/formatPrice";
import { describeReason, type OrderStatus } from "../utils/orderStatus";

const TABS: { id: AdminOrderTab; label: string; empty: string }[] = [
  { id: "pending", label: "To confirm", empty: "No orders are waiting for confirmation." },
  { id: "confirmed", label: "Confirmed", empty: "No confirmed orders." },
  { id: "out_for_delivery", label: "Out for delivery", empty: "Nothing is out for delivery." },
  { id: "delivered", label: "Delivered", empty: "No delivered orders yet." },
  { id: "closed", label: "Cancelled or failed", empty: "No cancelled or failed orders." },
];

const CANCEL_REASONS = [
  "Customer asked to cancel",
  "Customer could not be reached",
  "Address is wrong or outside Addis Ababa",
  "Item is no longer available",
  "Suspected fake order",
  "Other",
];
const FAILED_REASONS = [
  "Customer refused the order",
  "Customer was not at the address",
  "Customer could not be reached",
  "Address could not be found",
  "Other",
];

const SUCCESS_TEXT: Record<string, string> = {
  confirmed: "Order confirmed",
  out_for_delivery: "Marked out for delivery",
  delivered: "Marked delivered, cash collected",
  cancelled: "Order cancelled, items back on sale",
  delivery_failed: "Marked failed, items back on sale",
};

const primaryButton =
  "inline-flex min-h-10 items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-accent-ink hover:bg-ink hover:text-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:bg-border disabled:text-muted";
const secondaryButton =
  "inline-flex min-h-10 items-center justify-center rounded-full border border-border px-5 text-sm font-semibold text-ink hover:border-accent hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:text-muted";

export function AdminOrdersPage() {
  return (
    <RequireAdmin redirect="/admin/orders">
      <OrdersDashboard />
    </RequireAdmin>
  );
}

function OrdersDashboard() {
  const [params, setParams] = useSearchParams();
  const requested = params.get("tab");
  const tab = TABS.find((item) => item.id === requested) ?? TABS[0];
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const latestRequest = useRef(0);

  const load = useCallback(
    async (showSpinner: boolean) => {
      const request = ++latestRequest.current;
      if (showSpinner) setIsLoading(true);
      try {
        const result = await fetchAdminOrders(tab.id);
        if (request !== latestRequest.current) return;
        setOrders(result);
        setError(null);
      } catch (loadError) {
        if (request !== latestRequest.current) return;
        setError(loadError instanceof Error ? loadError.message : "Could not load orders.");
      } finally {
        if (request === latestRequest.current) setIsLoading(false);
      }
    },
    [tab.id],
  );

  useEffect(() => {
    void load(true);
  }, [load]);

  // Also pick up orders that arrive while this page is open.
  useEffect(() => {
    const refresh = () => void load(false);
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [load]);

  return (
    <div className="mx-auto max-w-content px-4 pb-16 pt-8 sm:px-6 lg:px-10">
      <h1 className="text-4xl font-extrabold tracking-tightest text-ink">Admin</h1>
      <p className="mb-6 mt-2 text-sm text-muted">Phone each customer to confirm, then send the order out and collect the cash.</p>
      <AdminNav />

      <div aria-label="Order status" className="mb-6 flex flex-wrap gap-2" role="tablist">
        {TABS.map((item) => (
          <button
            aria-selected={item.id === tab.id}
            className={`inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              item.id === tab.id ? "border-accent bg-accent/10 text-accent" : "border-border text-muted hover:text-ink"
            }`}
            key={item.id}
            onClick={() => setParams(item.id === "pending" ? {} : { tab: item.id })}
            role="tab"
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-muted" role="status">Loading orders…</p>}
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      {!isLoading && !error && orders.length === 0 && <p className="border-y border-border py-12 text-center text-sm text-muted">{tab.empty}</p>}

      <ul className="grid gap-5 lg:grid-cols-2">
        {orders.map((order) => (
          <OrderCard key={order.id} onChanged={() => load(false)} order={order} />
        ))}
      </ul>
    </div>
  );
}

function OrderCard({ order, onChanged }: { order: Order; onChanged: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [panel, setPanel] = useState<"cancel" | "failed" | null>(null);
  const [reason, setReason] = useState("");

  async function move(status: OrderStatus, why?: string) {
    setBusy(true);
    try {
      await updateOrderStatus(order.id, status, why);
      toast.success(SUCCESS_TEXT[status] ?? "Order updated", `Order #${order.order_number}`);
      setPanel(null);
      setReason("");
      window.dispatchEvent(new Event(ORDERS_CHANGED_EVENT));
      await onChanged();
    } catch (moveError) {
      toast.error("Couldn't update the order", moveError instanceof Error ? moveError.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const reasons = panel === "failed" ? FAILED_REASONS : CANCEL_REASONS;
  const closedReason = describeReason(order.status, order.cancellation_reason);

  return (
    <li className="min-w-0 rounded-2xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-bold text-ink">Order #{order.order_number}</p>
          <p className="mt-0.5 text-xs text-muted">Placed {formatDateTime(order.created_at)}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <p className="font-semibold text-ink">{order.full_name}</p>
        <a
          className="inline-flex items-center gap-2 font-semibold text-accent underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          href={`tel:${order.phone}`}
        >
          <Phone aria-hidden="true" size={14} />
          {order.phone}
        </a>
        <p className="flex gap-2 leading-6 text-ink">
          <MapPin aria-hidden="true" className="mt-1 shrink-0 text-muted" size={14} />
          <span>{order.address}, {order.sub_city ? `${order.sub_city}, ` : ""}{order.city}</span>
        </p>
        {order.delivery_note && <p className="text-muted">Note: {order.delivery_note}</p>}
      </div>

      <div className="mt-3">
        <OrderItemsList items={order.order_items} />
      </div>
      <p className="mt-1 flex justify-between border-t border-border pt-3 text-sm">
        <span className="font-semibold text-ink">{order.status === "delivered" ? "Cash collected" : "Cash to collect"}</span>
        <span className="font-bold text-ink">{formatPrice(order.total_etb)}</span>
      </p>

      {closedReason && <p className="mt-3 text-sm text-muted">{closedReason}</p>}
      {(order.status === "cancelled" || order.status === "delivery_failed") && order.cancellation_reason && !closedReason && (
        <p className="mt-3 text-sm text-muted">Reason: {order.cancellation_reason}</p>
      )}

      {panel ? (
        <div className="mt-4 rounded-xl border border-border bg-canvas p-4">
          <label className="block text-xs font-semibold text-muted" htmlFor={`reason-${order.id}`}>
            {panel === "failed" ? "Why did the delivery fail?" : "Why is it being cancelled?"}
          </label>
          <select
            className="mt-2 min-h-10 w-full rounded-full border border-border bg-surface px-3 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            id={`reason-${order.id}`}
            onChange={(event) => setReason(event.target.value)}
            value={reason}
          >
            <option value="">Choose a reason</option>
            {reasons.map((item) => <option key={item}>{item}</option>)}
          </select>
          <p className="mt-2 text-xs text-muted">The items go back on sale.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className={primaryButton} disabled={busy || !reason} onClick={() => void move(panel === "failed" ? "delivery_failed" : "cancelled", reason)} type="button">
              {busy ? "Saving…" : panel === "failed" ? "Mark as failed" : "Cancel order"}
            </button>
            <button className={secondaryButton} disabled={busy} onClick={() => { setPanel(null); setReason(""); }} type="button">Back</button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          {order.status === "pending" && (
            <>
              <button className={primaryButton} disabled={busy} onClick={() => void move("confirmed")} type="button">Confirm order</button>
              <button className={secondaryButton} disabled={busy} onClick={() => setPanel("cancel")} type="button">Cancel</button>
            </>
          )}
          {order.status === "confirmed" && (
            <>
              <button className={primaryButton} disabled={busy} onClick={() => void move("out_for_delivery")} type="button">Out for delivery</button>
              <button className={secondaryButton} disabled={busy} onClick={() => setPanel("cancel")} type="button">Cancel</button>
            </>
          )}
          {order.status === "out_for_delivery" && (
            <>
              <button className={primaryButton} disabled={busy} onClick={() => void move("delivered")} type="button">Delivered, cash collected</button>
              <button className={secondaryButton} disabled={busy} onClick={() => setPanel("failed")} type="button">Delivery failed</button>
            </>
          )}
        </div>
      )}
    </li>
  );
}

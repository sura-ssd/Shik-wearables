import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Banknote, Check, MapPin, Phone } from "lucide-react";
import { Link, useLocation, useParams } from "react-router-dom";
import { OrderItemsList } from "../components/OrderItemsList";
import { OrderStatusBadge } from "../components/OrderStatusBadge";
import { cancelMyOrder, fetchOrder, type Order } from "../lib/orders";
import { useAuthStore } from "../store/authStore";
import { toast } from "../store/toastStore";
import { formatDateTime } from "../utils/formatDate";
import { formatPrice } from "../utils/formatPrice";
import { STATUS_LABELS, STATUS_SUMMARY, TIMELINE, closureNotice, isOpenStatus } from "../utils/orderStatus";

const smallButton =
  "inline-flex min-h-10 items-center justify-center rounded-full border border-border px-5 text-sm font-semibold text-ink hover:border-accent hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:text-muted";

export function OrderDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const justPlaced = Boolean((location.state as { justPlaced?: boolean } | null)?.justPlaced);
  const userId = useAuthStore((state) => state.user?.id);
  const authLoading = useAuthStore((state) => state.isLoading);
  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setOrder(await fetchOrder(id));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load this order.");
    }
  }, [id]);

  useEffect(() => {
    if (userId) void load();
  }, [load, userId]);

  async function handleCancel() {
    if (!order) return;
    setBusy(true);
    try {
      await cancelMyOrder(order.id);
      toast.success("Order cancelled", `Order #${order.order_number} was cancelled.`);
      setConfirmingCancel(false);
      await load();
    } catch (cancelError) {
      toast.error("Couldn't cancel the order", cancelError instanceof Error ? cancelError.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (authLoading) return <p className="px-4 py-24 text-center text-sm text-muted" role="status">Loading…</p>;

  if (!userId) {
    return (
      <section className="mx-auto max-w-content px-4 py-20 text-center sm:px-6 lg:px-10">
        <h1 className="text-3xl font-extrabold tracking-tightest text-ink">Sign in to see this order</h1>
        <Link
          className="mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-accent px-6 text-sm font-semibold text-accent-ink hover:bg-ink hover:text-surface"
          to={`/login?redirect=/orders/${id ?? ""}`}
        >
          Sign in
        </Link>
      </section>
    );
  }

  if (error) return <p className="px-4 py-24 text-center text-sm text-danger" role="alert">{error}</p>;
  if (order === undefined) return <p className="px-4 py-24 text-center text-sm text-muted" role="status">Loading your order…</p>;
  if (order === null) {
    return (
      <section className="mx-auto max-w-content px-4 py-24 text-center">
        <h1 className="text-2xl font-extrabold tracking-tightest text-ink">We could not find that order</h1>
        <Link className="mt-6 inline-block text-sm font-semibold text-accent underline underline-offset-4" to="/orders">Back to your orders</Link>
      </section>
    );
  }

  const closure = closureNotice(order.status, order.cancellation_reason);
  const stepTimes = [order.created_at, order.confirmed_at, order.dispatched_at, order.delivered_at];
  const currentStep = TIMELINE.indexOf(order.status);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-6 lg:pt-12">
      <Link
        className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        to="/orders"
      >
        <ArrowLeft aria-hidden="true" size={16} />
        All orders
      </Link>

      {/* The "we will call you" message only makes sense while the order is waiting for confirmation. */}
      {justPlaced && order.status === "pending" && (
        <div className="mt-5 rounded-2xl border border-accent/40 bg-accent/10 p-5" role="status">
          <p className="flex items-center gap-2 text-base font-bold text-ink">
            <Check aria-hidden="true" className="text-accent" size={18} /> Thank you, your order is placed
          </p>
          <p className="mt-2 text-sm leading-6 text-muted">
            We will call you on {order.phone} to confirm it. Please keep your phone close.
          </p>
        </div>
      )}

      {closure && (
        <div className="mt-5 rounded-2xl border border-border bg-surface p-5" role="status">
          <p className="text-base font-bold text-ink">{closure.title}</p>
          <p className="mt-2 text-sm leading-6 text-muted">{closure.body}</p>
          <Link
            className="mt-4 inline-flex min-h-10 items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-accent-ink hover:bg-ink hover:text-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            to="/#shop"
          >
            Continue shopping
          </Link>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-4xl font-extrabold tracking-tightest text-ink">Order #{order.order_number}</h1>
        <OrderStatusBadge status={order.status} />
      </div>
      <p className="mt-2 text-sm text-muted">Placed {formatDateTime(order.created_at)}</p>

      <section aria-label="Order progress" className="mt-8 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        {currentStep === -1 ? (
          <div>
            <p className="text-base font-semibold text-ink">{STATUS_LABELS[order.status]}</p>
            {order.cancelled_at && <p className="mt-1 text-xs text-muted">{formatDateTime(order.cancelled_at)}</p>}
          </div>
        ) : (
          <>
            <ol className="grid gap-4 sm:grid-cols-4">
              {TIMELINE.map((step, index) => {
                const done = index <= currentStep;
                return (
                  <li aria-current={index === currentStep ? "step" : undefined} className="flex gap-3 sm:block" key={step}>
                    <span
                      aria-hidden="true"
                      className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                        done ? "bg-accent text-accent-ink" : "border border-border bg-canvas text-muted"
                      }`}
                    >
                      {done ? <Check size={14} strokeWidth={3} /> : index + 1}
                    </span>
                    <div className="sm:mt-2">
                      <p className={`text-sm font-semibold ${done ? "text-ink" : "text-muted"}`}>{STATUS_LABELS[step]}</p>
                      {stepTimes[index] && <p className="mt-0.5 text-xs text-muted">{formatDateTime(stepTimes[index])}</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
            <p className="mt-5 text-sm text-muted">{STATUS_SUMMARY[order.status]}</p>
          </>
        )}
      </section>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <section className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-sm font-bold text-ink">Delivery details</h2>
          <p className="mt-3 text-sm font-medium text-ink">{order.full_name}</p>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted"><Phone aria-hidden="true" size={14} />{order.phone}</p>
          <p className="mt-3 flex gap-2 text-sm leading-6 text-ink">
            <MapPin aria-hidden="true" className="mt-1 shrink-0 text-muted" size={14} />
            <span>{order.address}, {order.sub_city ? `${order.sub_city}, ` : ""}{order.city}</span>
          </p>
          {order.delivery_note && <p className="mt-2 text-sm text-muted">Note: {order.delivery_note}</p>}
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-sm font-bold text-ink">Payment</h2>
          <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-ink">
            <Banknote aria-hidden="true" className="mt-1 shrink-0 text-muted" size={16} />
            <span>
              {order.status === "delivered" ? "Paid in cash on delivery" : "Pay in cash when your order arrives"}
            </span>
          </p>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-muted">Items</dt><dd className="font-semibold text-ink">{formatPrice(order.subtotal_etb)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Delivery</dt><dd className="font-semibold text-ink">Free</dd></div>
            <div className="flex justify-between gap-4 border-t border-border pt-2"><dt className="font-semibold text-ink">Total</dt><dd className="font-bold text-ink">{formatPrice(order.total_etb)}</dd></div>
          </dl>
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-border bg-surface px-5 py-2">
        <h2 className="pt-3 text-sm font-bold text-ink">Items</h2>
        <OrderItemsList items={order.order_items} />
      </section>

      {order.status === "pending" && (
        <div className="mt-6">
          {confirmingCancel ? (
            <div className="rounded-2xl border border-border bg-surface p-5">
              <p className="text-sm font-semibold text-ink">Cancel this order?</p>
              <p className="mt-1 text-sm text-muted">Your items will go back on sale.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button className="inline-flex min-h-10 items-center justify-center rounded-full bg-danger px-5 text-sm font-semibold text-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60" disabled={busy} onClick={() => void handleCancel()} type="button">
                  {busy ? "Cancelling…" : "Yes, cancel order"}
                </button>
                <button className={smallButton} disabled={busy} onClick={() => setConfirmingCancel(false)} type="button">Keep order</button>
              </div>
            </div>
          ) : (
            <button className={smallButton} onClick={() => setConfirmingCancel(true)} type="button">Cancel order</button>
          )}
        </div>
      )}
      {isOpenStatus(order.status) && order.status !== "pending" && (
        <p className="mt-6 text-sm text-muted">Need to change or cancel this order? Please call us.</p>
      )}
    </div>
  );
}

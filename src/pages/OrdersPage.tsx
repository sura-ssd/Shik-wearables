import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { OrderStatusBadge } from "../components/OrderStatusBadge";
import { fetchMyOrders, type Order } from "../lib/orders";
import { useAuthStore } from "../store/authStore";
import { formatDateTime } from "../utils/formatDate";
import { formatPrice } from "../utils/formatPrice";

const buttonClass =
  "mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-accent px-6 text-sm font-semibold text-accent-ink hover:bg-ink hover:text-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent";

export function OrdersPage() {
  const userId = useAuthStore((state) => state.user?.id);
  const authLoading = useAuthStore((state) => state.isLoading);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetchMyOrders(userId)
      .then((result) => !cancelled && setOrders(result))
      .catch((loadError) => !cancelled && setError(loadError instanceof Error ? loadError.message : "Could not load your orders."));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (authLoading) return <p className="px-4 py-24 text-center text-sm text-muted" role="status">Loading…</p>;

  if (!userId) {
    return (
      <section className="mx-auto max-w-content px-4 py-20 text-center sm:px-6 lg:px-10">
        <h1 className="text-3xl font-extrabold tracking-tightest text-ink">Sign in to see your orders</h1>
        <Link className={buttonClass} to="/login?redirect=/orders">Sign in</Link>
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-6 lg:pt-12">
      <h1 className="text-4xl font-extrabold tracking-tightest text-ink">Your orders</h1>

      {error && <p className="mt-6 text-sm text-danger" role="alert">{error}</p>}
      {!orders && !error && <p className="mt-6 text-sm text-muted" role="status">Loading your orders…</p>}
      {orders && orders.length === 0 && (
        <div className="mt-8 border-y border-border py-16 text-center">
          <p className="text-lg font-semibold text-ink">No orders yet</p>
          <p className="mt-2 text-sm text-muted">When you place an order, it will show up here.</p>
          <Link className={buttonClass} to="/#shop">Start shopping</Link>
        </div>
      )}

      <ul className="mt-8 space-y-4">
        {orders?.map((order) => {
          const names = order.order_items.map((item) => item.product_name);
          const summary = names.length > 2 ? `${names.slice(0, 2).join(", ")} and ${names.length - 2} more` : names.join(", ");
          return (
            <li key={order.id}>
              <Link
                className="block rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                to={`/orders/${order.id}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-base font-bold text-ink">Order #{order.order_number}</p>
                  <OrderStatusBadge status={order.status} />
                </div>
                <p className="mt-1 text-xs text-muted">{formatDateTime(order.created_at)}</p>
                <p className="mt-3 truncate text-sm text-ink">{summary}</p>
                <p className="mt-2 text-sm font-semibold text-ink">{formatPrice(order.total_etb)}</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

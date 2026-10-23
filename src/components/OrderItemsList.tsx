import type { OrderItem } from "../lib/orders";
import { formatPrice } from "../utils/formatPrice";

export function OrderItemsList({ items }: { items: OrderItem[] }) {
  return (
    <ul className="divide-y divide-border">
      {items.map((item) => (
        <li className="flex items-start justify-between gap-4 py-3" key={item.id}>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">
              {item.quantity} × {item.product_name}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {item.color_name ? `${item.color_name} · ` : ""}Size {item.size}
            </p>
          </div>
          <p className="shrink-0 text-sm font-semibold text-ink">{formatPrice(item.line_total_etb)}</p>
        </li>
      ))}
    </ul>
  );
}

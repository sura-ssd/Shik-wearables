import { STATUS_BADGE, STATUS_LABELS, type OrderStatus } from "../utils/orderStatus";

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_BADGE[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

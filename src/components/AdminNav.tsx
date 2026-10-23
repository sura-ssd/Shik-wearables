import { NavLink } from "react-router-dom";
import { usePendingOrdersStore } from "../store/pendingOrdersStore";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex min-h-10 items-center gap-2 rounded-full border px-5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
    isActive ? "border-ink bg-ink text-surface" : "border-border text-ink hover:border-accent hover:text-accent"
  }`;

export function AdminNav() {
  const pending = usePendingOrdersStore((state) => state.count);

  return (
    <nav aria-label="Admin sections" className="mb-8 flex flex-wrap gap-2">
      <NavLink className={linkClass} end to="/admin/orders">
        Orders
        {pending > 0 && (
          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold leading-5 text-accent-ink">
            {pending}
            <span className="sr-only"> waiting for confirmation</span>
          </span>
        )}
      </NavLink>
      <NavLink className={linkClass} end to="/admin">
        Products
      </NavLink>
    </nav>
  );
}

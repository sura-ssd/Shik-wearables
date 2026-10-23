import { LogOut, Moon, Package, ShoppingCart, Sun, User } from "lucide-react";
import { Link } from "react-router-dom";
import { usePendingOrderAlerts } from "../hooks/usePendingOrderAlerts";
import { useAuthStore } from "../store/authStore";
import { useCartStore } from "../store/cartStore";
import { usePendingOrdersStore } from "../store/pendingOrdersStore";

interface HeaderProps {
  isDark: boolean;
  onThemeToggle: () => void;
}

export function Header({ isDark, onThemeToggle }: HeaderProps) {
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const signOut = useAuthStore((state) => state.signOut);
  const pendingOrders = usePendingOrdersStore((state) => state.count);
  // Admins are told about new orders while they browse the site.
  usePendingOrderAlerts(role === "admin");
  const openCart = useCartStore((state) => state.openCart);
  const itemCount = useCartStore((state) =>
    state.items.reduce((total, item) => total + item.quantity, 0),
  );

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-canvas/95 backdrop-blur-sm">
      <div className="mx-auto flex h-[68px] max-w-content items-center justify-between px-4 sm:px-6 lg:px-10">
        <Link
          aria-label="Shik wearables home"
          className="flex items-baseline text-[20px] font-extrabold leading-none tracking-tightest text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          to="/"
        >
          Shik<span className="text-accent">.</span>
          <span className="ml-1.5 text-[11px] font-semibold tracking-normal text-muted">
            wearables
          </span>
        </Link>
        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-8 text-sm font-semibold text-muted sm:flex"
        >
          <Link
            className="transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            to="/#shop"
          >
            Shop all
          </Link>
          <Link
            className="transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("shik:category", { detail: "Sneakers" }),
              )
            }
            to="/#shop"
          >
            Sneakers
          </Link>
          <Link
            className="transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("shik:category", { detail: "Tops" }),
              )
            }
            to="/#shop"
          >
            Clothing
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          {role === "admin" && (
            <Link
              className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-semibold text-muted transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              to="/admin/orders"
            >
              Admin
              {pendingOrders > 0 && (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold leading-5 text-accent-ink">
                  {pendingOrders}
                  <span className="sr-only"> orders waiting for confirmation</span>
                </span>
              )}
            </Link>
          )}
          {user && (
            <Link
              aria-label="My orders"
              className="inline-flex size-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-surface hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              to="/orders"
            >
              <Package aria-hidden="true" size={19} />
            </Link>
          )}
          {user ? (
            <button
              aria-label="Sign out"
              className="inline-flex size-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-surface hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              onClick={() => void signOut()}
              type="button"
            >
              <LogOut aria-hidden="true" size={19} />
            </button>
          ) : (
            <Link
              aria-label="Sign in"
              className="inline-flex size-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-surface hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              to="/login"
            >
              <User aria-hidden="true" size={19} />
            </Link>
          )}
          <button
            aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
            className="inline-flex size-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-surface hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            onClick={onThemeToggle}
            type="button"
          >
            {isDark ? (
              <Sun aria-hidden="true" size={19} />
            ) : (
              <Moon aria-hidden="true" size={19} />
            )}
          </button>
          <button
            aria-label={`Open cart, ${itemCount} ${itemCount === 1 ? "item" : "items"}`}
            className="relative inline-flex size-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-surface hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            onClick={openCart}
            type="button"
          >
            <span
              aria-hidden="true"
              className="relative inline-flex size-7 items-center justify-center"
            >
              <ShoppingCart aria-hidden="true" size={25} strokeWidth={2} />
            </span>
            <span className="absolute right-0 top-0 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold leading-none text-accent-ink">
              {itemCount}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}

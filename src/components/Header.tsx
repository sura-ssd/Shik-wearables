import { Moon, ShoppingBag, Sun } from "lucide-react";
import { Link } from "react-router-dom";
import { useCartStore } from "../store/cartStore";

interface HeaderProps {
  isDark: boolean;
  onThemeToggle: () => void;
}

export function Header({ isDark, onThemeToggle }: HeaderProps) {
  const openCart = useCartStore((state) => state.openCart);
  const itemCount = useCartStore((state) =>
    state.items.reduce((total, item) => total + item.quantity, 0),
  );

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-canvas/95 backdrop-blur-sm">
      <div className="mx-auto flex h-[68px] max-w-content items-center justify-between px-4 sm:px-6 lg:px-10">
        <Link
          aria-label="Shik shop home"
          className="text-[23px] font-extrabold leading-none tracking-tightest text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          to="/"
        >
          shik<span className="text-accent">.</span>
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
            <ShoppingBag aria-hidden="true" size={21} strokeWidth={1.8} />
            <span className="absolute right-0 top-0 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold leading-none text-accent-ink">
              {itemCount}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}

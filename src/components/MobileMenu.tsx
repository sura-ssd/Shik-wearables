import { useEffect, useId, useRef, useState } from "react";
import { LayoutDashboard, LogOut, Menu, Moon, Package, Sun, User, X } from "lucide-react";
import { Link } from "react-router-dom";

interface MobileMenuProps {
  email?: string;
  isAdmin: boolean;
  isDark: boolean;
  isSignedIn: boolean;
  /** Orders waiting for the shop to confirm them (admins only). */
  pendingOrders: number;
  onSignOut: () => void;
  onThemeToggle: () => void;
}

const itemClass =
  "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-ink transition-colors hover:bg-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent";

function chooseCategory(category: string) {
  window.dispatchEvent(new CustomEvent("shik:category", { detail: category }));
}

/** Phone-sized header menu. It holds everything that would otherwise crowd the header with icons. */
export function MobileMenu({ email, isAdmin, isDark, isSignedIn, pendingOrders, onSignOut, onThemeToggle }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const close = () => setIsOpen(false);

  return (
    <div className="relative" ref={rootRef}>
      <button
        aria-controls={panelId}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close menu" : "Open menu"}
        className="relative inline-flex size-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-surface hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        onClick={() => setIsOpen((current) => !current)}
        ref={buttonRef}
        type="button"
      >
        {isOpen ? <X aria-hidden="true" size={22} /> : <Menu aria-hidden="true" size={22} />}
        {isAdmin && pendingOrders > 0 && !isOpen && (
          <span className="absolute right-0 top-0 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold leading-none text-accent-ink">
            {pendingOrders}
            <span className="sr-only"> orders waiting for confirmation</span>
          </span>
        )}
      </button>

      {isOpen && (
        <nav
          aria-label="Menu"
          className="absolute right-0 top-[calc(100%+12px)] z-40 w-64 animate-toast-in rounded-2xl border border-border bg-surface p-1.5 shadow-xl motion-reduce:animate-none"
          id={panelId}
        >
          {email && <p className="truncate px-3 pb-1 pt-2 text-xs text-muted">{email}</p>}

          <Link className={itemClass} onClick={close} to="/#shop">Shop all</Link>
          <Link className={itemClass} onClick={() => { chooseCategory("Sneakers"); close(); }} to="/#shop">Sneakers</Link>
          <Link className={itemClass} onClick={() => { chooseCategory("Tops"); close(); }} to="/#shop">Clothing</Link>

          <div aria-hidden="true" className="my-1.5 h-px bg-border" />

          {isAdmin && (
            <Link className={itemClass} onClick={close} to="/admin/orders">
              <LayoutDashboard aria-hidden="true" className="text-muted" size={18} />
              <span className="flex-1">Admin</span>
              {pendingOrders > 0 && (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold leading-5 text-accent-ink">
                  {pendingOrders}
                  <span className="sr-only"> orders waiting for confirmation</span>
                </span>
              )}
            </Link>
          )}
          {isSignedIn && (
            <Link className={itemClass} onClick={close} to="/orders">
              <Package aria-hidden="true" className="text-muted" size={18} />
              My orders
            </Link>
          )}
          <button className={itemClass} onClick={onThemeToggle} type="button">
            {isDark ? <Sun aria-hidden="true" className="text-muted" size={18} /> : <Moon aria-hidden="true" className="text-muted" size={18} />}
            {isDark ? "Light mode" : "Dark mode"}
          </button>

          <div aria-hidden="true" className="my-1.5 h-px bg-border" />

          {isSignedIn ? (
            <button className={itemClass} onClick={() => { close(); onSignOut(); }} type="button">
              <LogOut aria-hidden="true" className="text-muted" size={18} />
              Sign out
            </button>
          ) : (
            <Link className={itemClass} onClick={close} to="/login">
              <User aria-hidden="true" className="text-muted" size={18} />
              Sign in
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}

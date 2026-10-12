import { useEffect, useRef } from "react";
import { ArrowRight, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useCartStore } from "../store/cartStore";
import { formatPrice } from "../utils/formatPrice";
import { CartItem } from "./CartItem";

export function CartDrawer() {
  const isOpen = useCartStore((state) => state.isOpen);
  const items = useCartStore((state) => state.items);
  const closeCart = useCartStore((state) => state.closeCart);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const subtotal = items.reduce((total, item) => total + item.product.price * item.quantity, 0);

  useEffect(() => {
    if (!isOpen) return;
    closeButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeCart();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeCart, isOpen]);

  return (
    <div
      aria-hidden={!isOpen}
      className={`fixed inset-0 z-50 overflow-hidden ${isOpen ? "visible" : "invisible pointer-events-none"}`}
    >
      <button
        aria-label="Close cart"
        className={`absolute inset-0 bg-ink/45 transition-opacity duration-200 motion-reduce:transition-none ${isOpen ? "opacity-100" : "opacity-0"}`}
        onClick={closeCart}
        tabIndex={isOpen ? 0 : -1}
        type="button"
      />
      <aside
        aria-label="Your shopping cart"
        aria-modal="true"
        className={`absolute right-0 top-0 flex h-full w-full max-w-[460px] flex-col rounded-l-3xl bg-canvas shadow-2xl transition-transform duration-200 motion-reduce:transition-none ${isOpen ? "translate-x-0" : "translate-x-full"}`}
        role="dialog"
      >
        <div className="flex min-h-[68px] items-center justify-between border-b border-border px-5 sm:px-7">
          <h2 className="text-lg font-bold tracking-tight text-ink">Your cart</h2>
          <button
            aria-label="Close cart"
            className="inline-flex size-10 items-center justify-center text-ink hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            onClick={closeCart}
            ref={closeButtonRef}
            type="button"
          >
            <X aria-hidden="true" size={21} />
          </button>
        </div>
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <p className="text-lg font-semibold text-ink">Your cart is empty</p>
            <p className="mt-2 text-sm text-muted">Find something you will reach for every day.</p>
            <button
              className="mt-6 inline-flex min-h-11 items-center gap-2 bg-accent px-5 text-sm font-semibold text-accent-ink hover:bg-ink hover:text-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              onClick={closeCart}
              type="button"
            >
              Keep shopping <ArrowRight aria-hidden="true" size={16} />
            </button>
          </div>
        ) : (
          <>
            <ul className="flex-1 overflow-y-auto px-5 sm:px-7">
              {items.map((item) => (
                <CartItem
                  item={item}
                  key={`${item.product.id}-${item.size}`}
                  onQuantityChange={(quantity) => setQuantity(item.product.id, item.size, quantity)}
                  onRemove={() => removeItem(item.product.id, item.size)}
                />
              ))}
            </ul>
            <div className="border-t border-border px-5 pb-6 pt-5 sm:px-7">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Subtotal</span>
                <span className="font-semibold text-ink">{formatPrice(subtotal)}</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted">Delivery options and fees are confirmed during checkout.</p>
              <Link
                className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-accent-ink hover:bg-ink hover:text-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                onClick={closeCart}
                to="/checkout"
              >
                Checkout <ArrowRight aria-hidden="true" size={17} />
              </Link>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

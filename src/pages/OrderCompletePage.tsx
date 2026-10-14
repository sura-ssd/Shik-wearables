import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/authStore";
import { useCartStore } from "../store/cartStore";

type Result = "checking" | "paid" | "failed" | "signin";

const buttonClass =
  "mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-accent px-6 text-sm font-semibold text-accent-ink hover:bg-ink hover:text-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent";

/** Chapa sends customers here after payment. The server double-checks the payment with Chapa. */
export function OrderCompletePage() {
  const [params] = useSearchParams();
  const orderId = params.get("orderId");
  const txRef = params.get("txRef");
  const user = useAuthStore((state) => state.user);
  const authLoading = useAuthStore((state) => state.isLoading);
  const clearCart = useCartStore((state) => state.clearCart);
  const [result, setResult] = useState<Result>("checking");

  useEffect(() => {
    if (authLoading) return;
    if (!orderId || !txRef) {
      setResult("failed");
      return;
    }
    if (!user) {
      setResult("signin");
      return;
    }

    let cancelled = false;
    void supabase.functions
      .invoke<{ status?: string }>("verify-chapa-payment", { body: { orderId, txRef } })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data?.status === "paid") {
          clearCart();
          setResult("paid");
        } else {
          setResult("failed");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, clearCart, orderId, txRef, user]);

  return (
    <section className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6" role="status">
      {result === "checking" && (
        <>
          <h1 className="text-3xl font-extrabold tracking-tightest text-ink">Confirming your payment…</h1>
          <p className="mt-3 text-sm text-muted">Please do not close this page.</p>
        </>
      )}
      {result === "paid" && (
        <>
          <h1 className="text-3xl font-extrabold tracking-tightest text-ink">Thank you, your order is paid</h1>
          <p className="mt-3 text-sm text-muted">Order reference: {orderId}</p>
          <Link className={buttonClass} to="/">Keep shopping</Link>
        </>
      )}
      {result === "failed" && (
        <>
          <h1 className="text-3xl font-extrabold tracking-tightest text-ink">We could not confirm your payment</h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            If you were charged, contact us and quote this reference{orderId ? `: ${orderId}` : ""}. If you did not
            finish paying, your items are held for a short time and then released.
          </p>
          <Link className={buttonClass} to="/checkout">Back to checkout</Link>
        </>
      )}
      {result === "signin" && (
        <>
          <h1 className="text-3xl font-extrabold tracking-tightest text-ink">Sign in to confirm your payment</h1>
          <p className="mt-3 text-sm text-muted">We need to know it is you before we check the order.</p>
          <Link className={buttonClass} to={`/login?redirect=${encodeURIComponent(`/order-complete?orderId=${orderId ?? ""}&txRef=${txRef ?? ""}`)}`}>Sign in</Link>
        </>
      )}
    </section>
  );
}

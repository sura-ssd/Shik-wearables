import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

/** Shows its content only to signed-in admins. (The database also enforces this.) */
export function RequireAdmin({ children, redirect }: { children: ReactNode; redirect: string }) {
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const isLoading = useAuthStore((state) => state.isLoading);

  if (isLoading) return <p className="px-4 py-20 text-center text-sm text-muted" role="status">Loading…</p>;
  if (!user) return <Navigate replace to={`/login?redirect=${redirect}`} />;
  if (role !== "admin") {
    return (
      <section className="mx-auto max-w-content px-4 py-24 text-center">
        <h1 className="text-2xl font-extrabold tracking-tightest text-ink">No access</h1>
        <p className="mt-3 text-sm text-muted">This page is only for shop admins.</p>
      </section>
    );
  }
  return <>{children}</>;
}

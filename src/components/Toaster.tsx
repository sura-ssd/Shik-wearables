import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Info, X } from "lucide-react";
import { useToastStore, type Toast, type ToastKind } from "../store/toastStore";

const ICONS = { success: Check, error: AlertTriangle, info: Info } as const;

// Colors come from the site's own palette, so toasts follow light and dark mode.
const BADGE_STYLES: Record<ToastKind, string> = {
  success: "bg-accent text-accent-ink",
  error: "bg-danger text-surface",
  info: "bg-ink text-surface",
};

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useToastStore((state) => state.dismiss);
  const [isPaused, setIsPaused] = useState(false);
  const remaining = useRef(toast.duration);
  const startedAt = useRef(0);
  const Icon = ICONS[toast.kind];

  // Closes itself after its time is up. Hovering or focusing it pauses the countdown.
  useEffect(() => {
    if (isPaused) return;
    startedAt.current = Date.now();
    const timer = window.setTimeout(() => dismiss(toast.id), remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current -= Date.now() - startedAt.current;
    };
  }, [dismiss, isPaused, toast.id]);

  return (
    <li className="pointer-events-auto w-full max-w-md animate-toast-in motion-reduce:animate-none">
      <div
        className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4 shadow-lg shadow-black/10"
        onBlur={() => setIsPaused(false)}
        onFocus={() => setIsPaused(true)}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        role={toast.kind === "error" ? "alert" : "status"}
      >
        <span
          aria-hidden="true"
          className={`mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full ${BADGE_STYLES[toast.kind]}`}
        >
          <Icon size={16} strokeWidth={2.5} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">{toast.title}</p>
          {toast.description && <p className="mt-0.5 break-words text-sm leading-5 text-muted">{toast.description}</p>}
        </div>
        <button
          aria-label="Dismiss notification"
          className="-mr-1 -mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          onClick={() => dismiss(toast.id)}
          type="button"
        >
          <X aria-hidden="true" size={16} />
        </button>
      </div>
    </li>
  );
}

/** Shows the toasts. Add it once, near the end of App. */
export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);

  return (
    <section
      aria-label="Notifications"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      <ol className="flex flex-col items-center gap-2">
        {toasts.map((item) => (
          <ToastItem key={item.id} toast={item} />
        ))}
      </ol>
    </section>
  );
}

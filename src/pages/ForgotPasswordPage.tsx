import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { toast } from "../store/toastStore";

const inputClass =
  "min-h-12 w-full rounded-full border border-border bg-surface px-4 text-sm text-ink outline-none placeholder:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const address = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(address)) return setError("Enter a valid email address.");

    setBusy(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(address, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);

    if (resetError) {
      toast.error("Couldn't send the email", resetError.message);
      return;
    }
    setSentTo(address);
    toast.success("Check your email", "If an account exists for that address, we sent a reset link.");
  }

  return (
    <section className="mx-auto max-w-md px-4 py-14 sm:px-6">
      <h1 className="text-4xl font-extrabold tracking-tightest text-ink">Forgot your password?</h1>

      {sentTo ? (
        <div className="mt-6 rounded-2xl border border-border bg-surface p-5" role="status">
          <p className="text-sm font-semibold text-ink">Check your email</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            If an account exists for {sentTo}, we sent a link to choose a new password. It can take a few minutes, so also look in your spam folder.
          </p>
        </div>
      ) : (
        <>
          <p className="mt-3 text-sm text-muted">Enter your email and we will send you a link to choose a new password.</p>
          <form className="mt-8 space-y-5" noValidate onSubmit={handleSubmit}>
            <div>
              <label className="mb-2 block text-sm font-semibold text-ink" htmlFor="email">Email</label>
              <input autoComplete="email" className={inputClass} id="email" onChange={(event) => setEmail(event.target.value)} type="email" value={email} />
            </div>
            {error && <p className="text-sm text-danger" role="alert">{error}</p>}
            <button
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-accent px-6 text-sm font-semibold text-accent-ink hover:bg-ink hover:text-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:bg-border disabled:text-muted"
              disabled={busy}
              type="submit"
            >
              {busy ? "Sending…" : "Send reset link"}
            </button>
          </form>
        </>
      )}

      <Link
        className="mt-6 inline-block text-sm font-semibold text-accent underline decoration-transparent underline-offset-4 hover:decoration-current focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        to="/login"
      >
        Back to sign in
      </Link>
    </section>
  );
}

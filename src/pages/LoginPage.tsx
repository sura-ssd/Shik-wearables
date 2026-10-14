import { useState, type FormEvent } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/authStore";

const inputClass =
  "min-h-12 w-full rounded-full border border-border bg-surface px-4 text-sm text-ink outline-none placeholder:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent";

function safeRedirect(value: string | null): string {
  // Only allow paths inside this site.
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export function LoginPage() {
  const [params] = useSearchParams();
  const redirectTo = safeRedirect(params.get("redirect"));
  const user = useAuthStore((state) => state.user);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (user) return <Navigate replace to={redirectTo} />;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (mode === "signup" && fullName.trim().length < 2) return setError("Enter your full name.");
    if (password.length < 8) return setError("Use a password with at least 8 characters.");

    setBusy(true);
    if (mode === "signin") {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) setError(signInError.message);
    } else {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: fullName.trim() } },
      });
      if (signUpError) setError(signUpError.message);
      else if (!data.session) setNotice("Account created. Check your email to confirm it, then sign in.");
    }
    setBusy(false);
  }

  return (
    <section className="mx-auto max-w-md px-4 py-14 sm:px-6">
      <h1 className="text-4xl font-extrabold tracking-tightest text-ink">
        {mode === "signin" ? "Sign in" : "Create account"}
      </h1>
      <p className="mt-3 text-sm text-muted">
        {mode === "signin" ? "Welcome back to Shik." : "An account lets you check out and track your orders."}
      </p>

      <form className="mt-8 space-y-5" noValidate onSubmit={handleSubmit}>
        {mode === "signup" && (
          <div>
            <label className="mb-2 block text-sm font-semibold text-ink" htmlFor="fullName">Full name</label>
            <input autoComplete="name" className={inputClass} id="fullName" onChange={(event) => setFullName(event.target.value)} type="text" value={fullName} />
          </div>
        )}
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink" htmlFor="email">Email</label>
          <input autoComplete="email" className={inputClass} id="email" onChange={(event) => setEmail(event.target.value)} type="email" value={email} />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink" htmlFor="password">Password</label>
          <input autoComplete={mode === "signin" ? "current-password" : "new-password"} className={inputClass} id="password" onChange={(event) => setPassword(event.target.value)} type="password" value={password} />
        </div>

        {error && <p className="text-sm text-danger" role="alert">{error}</p>}
        {notice && <p className="text-sm text-ink" role="status">{notice}</p>}

        <button
          className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-accent px-6 text-sm font-semibold text-accent-ink hover:bg-ink hover:text-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:bg-border disabled:text-muted"
          disabled={busy}
          type="submit"
        >
          {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>

      <button
        className="mt-6 text-sm font-semibold text-accent underline decoration-transparent underline-offset-4 hover:decoration-current focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); setNotice(null); }}
        type="button"
      >
        {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
      </button>
    </section>
  );
}

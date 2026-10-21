import { useMemo, useState, type FormEvent } from "react";
import { Check, Eye, EyeOff, X } from "lucide-react";
import { Navigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/authStore";
import { toast } from "../store/toastStore";
import { checkPassword } from "../utils/passwordStrength";

const inputClass =
  "min-h-12 w-full rounded-full border border-border bg-surface px-4 text-sm text-ink outline-none placeholder:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent";

// Bar color for each strength score (0 to 4).
const METER_COLORS = ["bg-border", "bg-danger", "bg-muted", "bg-accent", "bg-accent"];

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
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const strength = useMemo(
    () => checkPassword(password, { email, fullName }),
    [password, email, fullName],
  );

  if (user) return <Navigate replace to={redirectTo} />;

  const isSignup = mode === "signup";

  function switchMode() {
    setMode(isSignup ? "signin" : "signup");
    setError(null);
    setNotice(null);
    setConfirmPassword("");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Enter a valid email address.");

    if (isSignup) {
      if (fullName.trim().length < 2) return setError("Enter your full name.");
      if (!strength.isStrong) {
        return setError("Choose a stronger password. Every item in the checklist must be ticked.");
      }
      if (password !== confirmPassword) return setError("The two passwords do not match.");
    } else if (!password) {
      return setError("Enter your password.");
    }

    setBusy(true);
    if (!isSignup) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) toast.error("Couldn't sign in", signInError.message);
      else toast.success("Signed in", "Welcome back to Shik.");
    } else {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: fullName.trim() } },
      });
      if (signUpError) {
        toast.error("Couldn't create your account", signUpError.message);
      } else if (!data.session) {
        setNotice("Account created. Check your email to confirm it, then sign in.");
        toast.success("Account created", "Check your email to confirm it, then sign in.");
      } else {
        toast.success("Account created", "Welcome to Shik.");
      }
    }
    setBusy(false);
  }

  const passwordType = showPassword ? "text" : "password";

  return (
    <section className="mx-auto max-w-md px-4 py-14 sm:px-6">
      <h1 className="text-4xl font-extrabold tracking-tightest text-ink">
        {isSignup ? "Create account" : "Sign in"}
      </h1>
      <p className="mt-3 text-sm text-muted">
        {isSignup ? "An account lets you check out and track your orders." : "Welcome back to Shik."}
      </p>

      <form className="mt-8 space-y-5" noValidate onSubmit={handleSubmit}>
        {isSignup && (
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
          <div className="relative">
            <input
              aria-describedby={isSignup ? "password-help" : undefined}
              autoComplete={isSignup ? "new-password" : "current-password"}
              className={`${inputClass} pr-12`}
              id="password"
              onChange={(event) => setPassword(event.target.value)}
              type={passwordType}
              value={password}
            />
            <button
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute right-2 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              onClick={() => setShowPassword((current) => !current)}
              type="button"
            >
              {showPassword ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
            </button>
          </div>

          {isSignup && (
            <div className="mt-3" id="password-help">
              <div aria-hidden="true" className="flex gap-1">
                {[1, 2, 3, 4].map((level) => (
                  <span
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      password && strength.score >= level ? METER_COLORS[strength.score] : "bg-border"
                    }`}
                    key={level}
                  />
                ))}
              </div>
              <p aria-live="polite" className="mt-2 text-xs font-semibold text-ink">
                {password ? `Password strength: ${strength.label}` : "Choose a strong password"}
              </p>
              <ul className="mt-2 space-y-1">
                {strength.checks.map((check) => (
                  <li
                    className={`flex items-center gap-2 text-xs ${check.passed ? "text-ink" : "text-muted"}`}
                    key={check.id}
                  >
                    {check.passed ? (
                      <Check aria-hidden="true" className="shrink-0 text-accent" size={14} />
                    ) : (
                      <X aria-hidden="true" className="shrink-0" size={14} />
                    )}
                    <span>
                      {check.label}
                      <span className="sr-only">{check.passed ? " (done)" : " (not met yet)"}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {isSignup && (
          <div>
            <label className="mb-2 block text-sm font-semibold text-ink" htmlFor="confirmPassword">Confirm password</label>
            <input
              autoComplete="new-password"
              className={inputClass}
              id="confirmPassword"
              onChange={(event) => setConfirmPassword(event.target.value)}
              type={passwordType}
              value={confirmPassword}
            />
            {confirmPassword && password !== confirmPassword && (
              <p className="mt-1.5 text-xs text-danger">The two passwords do not match yet.</p>
            )}
          </div>
        )}

        {error && <p className="text-sm text-danger" role="alert">{error}</p>}
        {notice && <p className="text-sm text-ink" role="status">{notice}</p>}

        <button
          className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-accent px-6 text-sm font-semibold text-accent-ink hover:bg-ink hover:text-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:bg-border disabled:text-muted"
          disabled={busy}
          type="submit"
        >
          {busy ? "Please wait…" : isSignup ? "Create account" : "Sign in"}
        </button>
      </form>

      <button
        className="mt-6 text-sm font-semibold text-accent underline decoration-transparent underline-offset-4 hover:decoration-current focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        onClick={switchMode}
        type="button"
      >
        {isSignup ? "Already have an account? Sign in" : "New here? Create an account"}
      </button>
    </section>
  );
}

import { useMemo, useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { PasswordStrengthMeter } from "../components/PasswordStrengthMeter";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/authStore";
import { toast } from "../store/toastStore";
import { checkPassword } from "../utils/passwordStrength";

const inputClass =
  "min-h-12 w-full rounded-full border border-border bg-surface px-4 text-sm text-ink outline-none placeholder:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent";

/** Where the link in the reset email leads. The link signs the person in just long enough to choose a new password. */
export function ResetPasswordPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const authLoading = useAuthStore((state) => state.isLoading);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strength = useMemo(() => checkPassword(password, { email: user?.email }), [password, user?.email]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!strength.isStrong) return setError("Choose a stronger password. Every item in the checklist must be ticked.");
    if (password !== confirmPassword) return setError("The two passwords do not match.");

    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (updateError) {
      toast.error("Couldn't change your password", updateError.message);
      return;
    }
    toast.success("Password changed", "You are signed in with your new password.");
    navigate("/", { replace: true });
  }

  if (authLoading) {
    return <p className="px-4 py-24 text-center text-sm text-muted" role="status">Checking your link…</p>;
  }

  if (!user) {
    return (
      <section className="mx-auto max-w-md px-4 py-14 text-center sm:px-6">
        <h1 className="text-3xl font-extrabold tracking-tightest text-ink">This link has expired</h1>
        <p className="mt-3 text-sm leading-6 text-muted">The reset link is no longer valid. Links work once and only for a short time.</p>
        <Link
          className="mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-accent px-6 text-sm font-semibold text-accent-ink hover:bg-ink hover:text-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          to="/forgot-password"
        >
          Send a new link
        </Link>
      </section>
    );
  }

  const passwordType = showPassword ? "text" : "password";

  return (
    <section className="mx-auto max-w-md px-4 py-14 sm:px-6">
      <h1 className="text-4xl font-extrabold tracking-tightest text-ink">Choose a new password</h1>
      <p className="mt-3 text-sm text-muted">For {user.email}</p>

      <form className="mt-8 space-y-5" noValidate onSubmit={handleSubmit}>
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink" htmlFor="password">New password</label>
          <div className="relative">
            <input
              aria-describedby="password-help"
              autoComplete="new-password"
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
          <PasswordStrengthMeter id="password-help" password={password} result={strength} />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-ink" htmlFor="confirmPassword">Confirm new password</label>
          <input autoComplete="new-password" className={inputClass} id="confirmPassword" onChange={(event) => setConfirmPassword(event.target.value)} type={passwordType} value={confirmPassword} />
          {confirmPassword && password !== confirmPassword && <p className="mt-1.5 text-xs text-danger">The two passwords do not match yet.</p>}
        </div>

        {error && <p className="text-sm text-danger" role="alert">{error}</p>}

        <button
          className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-accent px-6 text-sm font-semibold text-accent-ink hover:bg-ink hover:text-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:bg-border disabled:text-muted"
          disabled={busy}
          type="submit"
        >
          {busy ? "Saving…" : "Change password"}
        </button>
      </form>
    </section>
  );
}

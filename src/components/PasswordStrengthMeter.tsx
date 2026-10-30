import { Check, X } from "lucide-react";
import type { PasswordResult } from "../utils/passwordStrength";

// Bar color for each strength score (0 to 4).
const METER_COLORS = ["bg-border", "bg-danger", "bg-muted", "bg-accent", "bg-accent"];

interface PasswordStrengthMeterProps {
  id: string;
  password: string;
  result: PasswordResult;
}

/** The strength bar and the checklist of password rules. */
export function PasswordStrengthMeter({ id, password, result }: PasswordStrengthMeterProps) {
  return (
    <div className="mt-3" id={id}>
      <div aria-hidden="true" className="flex gap-1">
        {[1, 2, 3, 4].map((level) => (
          <span
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              password && result.score >= level ? METER_COLORS[result.score] : "bg-border"
            }`}
            key={level}
          />
        ))}
      </div>
      <p aria-live="polite" className="mt-2 text-xs font-semibold text-ink">
        {password ? `Password strength: ${result.label}` : "Choose a strong password"}
      </p>
      <ul className="mt-2 space-y-1">
        {result.checks.map((check) => (
          <li className={`flex items-center gap-2 text-xs ${check.passed ? "text-ink" : "text-muted"}`} key={check.id}>
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
  );
}

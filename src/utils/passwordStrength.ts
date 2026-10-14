export interface PasswordCheck {
  id: string;
  label: string;
  passed: boolean;
}

export interface PasswordContext {
  email?: string;
  fullName?: string;
}

export interface PasswordResult {
  checks: PasswordCheck[];
  /** True only when every rule is met. */
  isStrong: boolean;
  /** 0 = too weak ... 4 = strong */
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
}

export const MIN_PASSWORD_LENGTH = 10;

const SCORE_LABELS = ["Too weak", "Weak", "Fair", "Good", "Strong"];

const COMMON_PASSWORDS = [
  "password",
  "passw0rd",
  "qwerty",
  "letmein",
  "welcome",
  "admin",
  "iloveyou",
  "abc123",
  "123456",
  "111111",
  "monkey",
  "dragon",
];

// Pieces of the person's name and email that should not appear in the password.
function personalParts(context: PasswordContext): string[] {
  const parts: string[] = [];
  const emailName = context.email?.split("@")[0];
  if (emailName) parts.push(...emailName.split(/[^a-z0-9]+/i));
  if (context.fullName) parts.push(...context.fullName.split(/\s+/));
  return parts.map((part) => part.toLowerCase()).filter((part) => part.length >= 3);
}

export function checkPassword(password: string, context: PasswordContext = {}): PasswordResult {
  const lower = password.toLowerCase();
  const hasText = password.length > 0;

  const checks: PasswordCheck[] = [
    {
      id: "length",
      label: `At least ${MIN_PASSWORD_LENGTH} characters`,
      passed: password.length >= MIN_PASSWORD_LENGTH,
    },
    { id: "lower", label: "A lowercase letter (a-z)", passed: /[a-z]/.test(password) },
    { id: "upper", label: "An uppercase letter (A-Z)", passed: /[A-Z]/.test(password) },
    { id: "number", label: "A number (0-9)", passed: /\d/.test(password) },
    { id: "symbol", label: "A symbol, like ! ? # $ %", passed: /[^A-Za-z0-9\s]/.test(password) },
    {
      id: "common",
      label: "Not a common password",
      passed: hasText && !COMMON_PASSWORDS.some((word) => lower.includes(word)),
    },
    {
      id: "personal",
      label: "Does not contain your name or email",
      passed: hasText && !personalParts(context).some((part) => lower.includes(part)),
    },
  ];

  const passedCount = checks.filter((check) => check.passed).length;
  const isStrong = passedCount === checks.length;

  let score: PasswordResult["score"] = 0;
  if (hasText) {
    if (isStrong) score = password.length >= 14 ? 4 : 3;
    else if (passedCount >= 5) score = 2;
    else if (passedCount >= 3) score = 1;
  }

  return { checks, isStrong, score, label: SCORE_LABELS[score] };
}
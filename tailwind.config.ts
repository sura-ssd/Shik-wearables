import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "media",
  theme: {
    extend: {
      colors: {
        canvas: "rgb(var(--color-canvas) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        muted: "rgb(var(--color-muted) / <alpha-value>)",
        border: "rgb(var(--color-border) / <alpha-value>)",
        accent: "rgb(var(--color-accent) / <alpha-value>)",
        danger: "rgb(var(--color-danger) / <alpha-value>)",
        "accent-ink": "rgb(var(--color-accent-ink) / <alpha-value>)"
      },
      fontFamily: {
        sans: ["Archivo", "sans-serif"]
      },
      keyframes: {
        progress: {
          from: { transform: "scaleX(0)" },
          to: { transform: "scaleX(0.85)" }
        },
        "page-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "none" }
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" }
        },
        "toast-in": {
          from: { opacity: "0", transform: "translateY(12px) scale(0.98)" },
          to: { opacity: "1", transform: "none" }
        }
      },
      animation: {
        progress: "progress 2.5s ease-out forwards",
        // "backwards" keeps the page free of leftover transforms once the animation ends.
        "page-in": "page-in 0.35s ease-out backwards",
        // Waits 150ms first, so quick page loads never flash the loading message.
        "fade-in": "fade-in 0.2s ease-out 0.15s backwards",
        "toast-in": "toast-in 0.25s ease-out backwards"
      },
      letterSpacing: {
        tightest: "-0.045em"
      },
      maxWidth: {
        content: "1440px"
      }
    }
  },
  plugins: []
} satisfies Config;

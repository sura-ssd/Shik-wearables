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
        }
      },
      animation: {
        progress: "progress 2.5s ease-out forwards"
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

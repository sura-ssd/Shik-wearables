import type { ProductColor } from "../types";

interface ColorSwatchesProps {
  colors: ProductColor[];
  /** Id of the selected color. */
  value: string;
  onChange: (colorId: string) => void;
  /** Product name, for screen readers. */
  label: string;
  /** "sm" fits a product card, "md" fits the product page. */
  size?: "sm" | "md";
}

export function ColorSwatches({ colors, value, onChange, label, size = "sm" }: ColorSwatchesProps) {
  const dimension = size === "md" ? "size-9" : "size-6";

  return (
    <div aria-label={`Choose color for ${label}`} className="flex flex-wrap items-center gap-2.5" role="radiogroup">
      {colors.map((color) => {
        const soldOut = color.sizes.length === 0;
        const selected = color.id === value;

        return (
          <button
            aria-checked={selected}
            aria-label={soldOut ? `${color.name}, sold out` : color.name}
            className={`relative ${dimension} shrink-0 overflow-hidden rounded-full border border-border transition-shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed ${
              selected
                ? "ring-2 ring-accent ring-offset-2 ring-offset-canvas"
                : "hover:ring-2 hover:ring-border hover:ring-offset-2 hover:ring-offset-canvas"
            } ${soldOut ? "opacity-50" : ""}`}
            disabled={soldOut}
            key={color.id}
            onClick={() => onChange(color.id)}
            role="radio"
            style={{ backgroundColor: color.hex }}
            title={soldOut ? `${color.name} (sold out)` : color.name}
            type="button"
          >
            {soldOut && (
              <span
                aria-hidden="true"
                className="absolute left-1/2 top-1/2 h-px w-full -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-ink"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

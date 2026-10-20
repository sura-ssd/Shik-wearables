import { Minus, Plus, X } from "lucide-react";
import type { CartLine } from "../types";
import { formatPrice } from "../utils/formatPrice";
import { SmoothImage } from "./SmoothImage";

interface CartItemProps {
  item: CartLine;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
}

export function CartItem({ item, onQuantityChange, onRemove }: CartItemProps) {
  return (
    <li className="flex gap-4 border-b border-border py-5">
      <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-surface">
        <SmoothImage
          alt={item.color?.imageAlt ?? item.product.imageAlt}
          className="size-full object-contain"
          height="160"
          key={item.color?.image ?? item.product.image}
          loading="lazy"
          src={item.color?.image ?? item.product.image}
          width="160"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-ink">{item.product.name}</h3>
            <p className="mt-1 flex items-center gap-2 text-xs text-muted">
              {item.color && (
                <span
                  aria-hidden="true"
                  className="size-3 shrink-0 rounded-full border border-border"
                  style={{ backgroundColor: item.color.hex }}
                />
              )}
              <span>
                {item.color ? `${item.color.name} · ` : ""}Size {item.size}
              </span>
            </p>
          </div>
          <button
            aria-label={`Remove ${item.product.name}${item.color ? `, ${item.color.name}` : ""}, size ${item.size}`}
            className="-mr-2 -mt-2 inline-flex size-9 shrink-0 items-center justify-center text-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            onClick={onRemove}
            type="button"
          >
            <X aria-hidden="true" size={17} />
          </button>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <div aria-label={`Quantity ${item.quantity}`} className="flex items-center border border-border" role="group">
            <button
              aria-label={`Decrease quantity of ${item.product.name}`}
              className="inline-flex size-8 items-center justify-center text-ink hover:bg-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              onClick={() => onQuantityChange(item.quantity - 1)}
              type="button"
            >
              <Minus aria-hidden="true" size={14} />
            </button>
            <span className="min-w-7 text-center text-xs font-semibold text-ink">{item.quantity}</span>
            <button
              aria-label={`Increase quantity of ${item.product.name}`}
              className="inline-flex size-8 items-center justify-center text-ink hover:bg-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              onClick={() => onQuantityChange(item.quantity + 1)}
              type="button"
            >
              <Plus aria-hidden="true" size={14} />
            </button>
          </div>
          <p className="text-sm font-semibold text-ink">{formatPrice(item.product.price * item.quantity)}</p>
        </div>
      </div>
    </li>
  );
}

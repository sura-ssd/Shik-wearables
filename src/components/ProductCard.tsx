import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import { useCartStore } from "../store/cartStore";
import type { Product } from "../types";
import { formatPrice } from "../utils/formatPrice";
import { SizePicker } from "./SizePicker";
import { SmoothImage } from "./SmoothImage";
import { Link } from "react-router-dom";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const [size, setSize] = useState("");
  const addItem = useCartStore((state) => state.addItem);

  function handleAdd() {
    if (!size) return;
    addItem(product, size);
    setSize("");
  }

  return (
    <article className="group min-w-0">
      <Link
        aria-hidden="true"
        className="relative block aspect-[4/4.5] overflow-hidden rounded-[20px] bg-surface"
        tabIndex={-1}
        to={`/product/${product.id}`}
      >
        <SmoothImage
          alt={product.imageAlt}
          className="size-full object-cover group-hover:scale-[1.025]"
          height="900"
          loading="lazy"
          src={product.image}
          width="800"
        />
        {product.badge && (
          <span className="absolute left-3 top-3 rounded-full bg-canvas/95 px-3 py-1.5 text-[11px] font-semibold text-ink">
            {product.badge}
          </span>
        )}
      </Link>
      <div className="pt-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted">{product.category}</p>
            <h3 className="mt-1 text-sm font-semibold text-ink">
              <Link
                className="hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                to={`/product/${product.id}`}
              >
                {product.name}
              </Link>
            </h3>
          </div>
          <p className="shrink-0 pt-4 text-sm font-semibold text-ink">
            {formatPrice(product.price)}
          </p>
        </div>
        {product.sizes.length === 0 ? (
          <p className="mt-3 text-sm font-semibold text-muted">Sold out</p>
        ) : (
        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          <SizePicker
            label={product.name}
            onChange={setSize}
            sizes={product.sizes}
            value={size}
          />
          <button
            aria-label={`Add ${product.name}${size ? `, size ${size},` : ","} to cart`}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-accent px-4 text-xs font-semibold text-accent-ink transition-colors hover:bg-ink hover:text-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:bg-border disabled:text-muted sm:px-5 sm:text-sm"
            disabled={!size}
            onClick={handleAdd}
            type="button"
          >
            <ShoppingBag aria-hidden="true" size={16} />
            <span className="hidden sm:inline">Add to cart</span>
          </button>
        </div>
        )}
      </div>
    </article>
  );
}

import { useEffect, useState } from "react";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { ColorSwatches } from "../components/ColorSwatches";
import { ProductGrid } from "../components/ProductGrid";
import { SizePicker } from "../components/SizePicker";
import { SmoothImage } from "../components/SmoothImage";
import { useProducts } from "../hooks/useProducts";
import { useCartStore } from "../store/cartStore";
import { toCartColor } from "../utils/cartLine";
import { formatPrice } from "../utils/formatPrice";

export function ProductPage() {
  const { id } = useParams();
  const { products, isLoading } = useProducts();
  const product = products.find((item) => item.id === id);
  const [size, setSize] = useState("");
  const [colorId, setColorId] = useState("");
  const addItem = useCartStore((state) => state.addItem);
  const openCart = useCartStore((state) => state.openCart);

  // Start fresh when moving from one product to another.
  useEffect(() => {
    setSize("");
    setColorId("");
  }, [id]);

  useEffect(() => {
    if (!product) return;
    const previousTitle = document.title;
    document.title = `${product.name} | Shik wearables`;
    return () => {
      document.title = previousTitle;
    };
  }, [product]);

  if (isLoading) {
    return (
      <section className="mx-auto max-w-content px-4 py-24 text-center sm:px-6 lg:px-10">
        <p className="text-sm text-muted" role="status">Loading product…</p>
      </section>
    );
  }

  if (!product) {
    return (
      <section className="mx-auto max-w-content px-4 py-24 text-center sm:px-6 lg:px-10">
        <h1 className="text-2xl font-extrabold tracking-tightest text-ink">We could not find that product</h1>
        <p className="mt-3 text-sm text-muted">It may have been removed or the link is wrong.</p>
        <Link
          className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-accent px-6 text-sm font-semibold text-accent-ink hover:bg-ink hover:text-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          to="/#shop"
        >
          Back to the shop
        </Link>
      </section>
    );
  }

  // Same category first, then fill up with other pieces.
  const others = products.filter((item) => item.id !== product.id);
  const related = [
    ...others.filter((item) => item.category === product.category),
    ...others.filter((item) => item.category !== product.category),
  ].slice(0, 4);
  const soldOut = product.sizes.length === 0;

  // Until a color is picked, use the first color that is in stock.
  const color =
    product.colors.find((item) => item.id === colorId) ??
    product.colors.find((item) => item.sizes.length > 0) ??
    product.colors[0];
  const sizes = color ? color.sizes : product.sizes;
  const image = color?.image ?? product.image;

  function handleColorChange(nextColorId: string) {
    setColorId(nextColorId);
    setSize("");
  }

  function handleAdd() {
    if (!product || !size) return;
    addItem(product, size, color ? toCartColor(color) : undefined);
    openCart();
  }

  return (
    <div className="mx-auto max-w-content px-4 pb-14 pt-6 sm:px-6 lg:px-10">
      <Link
        className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        to="/#shop"
      >
        <ArrowLeft aria-hidden="true" size={16} />
        All products
      </Link>

      <div className="mt-4 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
        <div className="relative aspect-[4/4.5] overflow-hidden rounded-[28px] bg-surface">
          <SmoothImage
            alt={color?.imageAlt ?? product.imageAlt}
            className="size-full object-contain"
            height="1125"
            key={image}
            src={image.replace("w=900", "w=1400")}
            width="1000"
          />
          {product.badge && (
            <span className="absolute left-4 top-4 rounded-full bg-canvas/95 px-3 py-1.5 text-xs font-semibold text-ink">
              {product.badge}
            </span>
          )}
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{product.category}</p>
          <h1 className="mt-2 text-4xl font-extrabold leading-tight tracking-tightest text-ink sm:text-5xl">
            {product.name}
          </h1>
          <p className="mt-3 text-2xl font-semibold text-ink">{formatPrice(product.price)}</p>

          {product.colors.length > 0 && color && (
            <div className="mt-8">
              <p className="mb-3 text-sm font-semibold text-ink">
                Color: <span className="font-medium text-muted">{color.name}</span>
              </p>
              <ColorSwatches
                colors={product.colors}
                label={product.name}
                onChange={handleColorChange}
                size="md"
                value={color.id}
              />
            </div>
          )}

          <div className="mt-6">
            <p className="mb-3 text-sm font-semibold text-ink">Select a size</p>
            <SizePicker label={product.name} onChange={setSize} sizes={sizes} value={size} />
          </div>

          <button
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-accent px-6 text-sm font-semibold text-accent-ink transition-colors hover:bg-ink hover:text-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:bg-border disabled:text-muted"
            disabled={!size || soldOut}
            onClick={handleAdd}
            type="button"
          >
            <ShoppingBag aria-hidden="true" size={18} />
            {soldOut ? "Sold out" : size ? `Add ${color && product.colors.length > 1 ? `${color.name}, ` : ""}size ${size} to cart` : "Select a size to add"}
          </button>

          <dl className="mt-8 divide-y divide-border border-y border-border text-sm">
            <div className="flex justify-between gap-4 py-3">
              <dt className="text-muted">Category</dt>
              <dd className="font-medium text-ink">{product.category}</dd>
            </div>
            <div className="flex justify-between gap-4 py-3">
              <dt className="text-muted">Sizes</dt>
              <dd className="font-medium text-ink">{soldOut ? "Sold out" : sizes.length > 0 ? sizes.join(", ") : "Sold out in this color"}</dd>
            </div>
            {product.colors.length > 0 && (
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-muted">Colors</dt>
                <dd className="font-medium text-ink">{product.colors.map((item) => item.name).join(", ")}</dd>
              </div>
            )}
            <div className="flex justify-between gap-4 py-3">
              <dt className="text-muted">Delivery and returns</dt>
              <dd className="font-medium text-ink">Confirmed at checkout</dd>
            </div>
          </dl>
        </div>
      </div>

      <section aria-labelledby="related-heading" className="mt-16">
        <h2 className="mb-6 text-2xl font-extrabold tracking-tightest text-ink" id="related-heading">
          You may also like
        </h2>
        <ProductGrid products={related} />
      </section>
    </div>
  );
}
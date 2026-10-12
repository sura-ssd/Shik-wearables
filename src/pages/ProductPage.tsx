import { useEffect, useState } from "react";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { ProductGrid } from "../components/ProductGrid";
import { SizePicker } from "../components/SizePicker";
import { SmoothImage } from "../components/SmoothImage";
import { products } from "../data/products";
import { useCartStore } from "../store/cartStore";
import { formatPrice } from "../utils/formatPrice";

export function ProductPage() {
  const { id } = useParams();
  const product = products.find((item) => item.id === id);
  const [size, setSize] = useState("");
  const addItem = useCartStore((state) => state.addItem);
  const openCart = useCartStore((state) => state.openCart);

  // Start fresh when moving from one product to another.
  useEffect(() => {
    setSize("");
  }, [id]);

  useEffect(() => {
    if (!product) return;
    const previousTitle = document.title;
    document.title = `${product.name} | Shik shop`;
    return () => {
      document.title = previousTitle;
    };
  }, [product]);

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

  function handleAdd() {
    if (!product || !size) return;
    addItem(product, size);
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
            alt={product.imageAlt}
            className="size-full object-cover"
            height="1125"
            src={product.image.replace("w=900", "w=1400")}
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

          <div className="mt-8">
            <p className="mb-3 text-sm font-semibold text-ink">Select a size</p>
            <SizePicker label={product.name} onChange={setSize} sizes={product.sizes} value={size} />
          </div>

          <button
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-accent px-6 text-sm font-semibold text-accent-ink transition-colors hover:bg-ink hover:text-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:bg-border disabled:text-muted"
            disabled={!size}
            onClick={handleAdd}
            type="button"
          >
            <ShoppingBag aria-hidden="true" size={18} />
            {size ? `Add size ${size} to cart` : "Select a size to add"}
          </button>

          <dl className="mt-8 divide-y divide-border border-y border-border text-sm">
            <div className="flex justify-between gap-4 py-3">
              <dt className="text-muted">Category</dt>
              <dd className="font-medium text-ink">{product.category}</dd>
            </div>
            <div className="flex justify-between gap-4 py-3">
              <dt className="text-muted">Sizes</dt>
              <dd className="font-medium text-ink">{product.sizes.join(", ")}</dd>
            </div>
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
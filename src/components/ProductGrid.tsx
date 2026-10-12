import type { Product } from "../types";
import { ProductCard } from "./ProductCard";
import { Skeleton } from "./Skeleton";

interface ProductGridProps {
  products: Product[];
  isLoading?: boolean;
}

const SKELETON_COUNT = 8;
const gridClassName = "grid grid-cols-2 gap-x-3 gap-y-9 sm:gap-x-5 sm:gap-y-12 lg:grid-cols-3 xl:grid-cols-4";

function ProductGridSkeleton() {
  return (
    <div aria-hidden="true" className={gridClassName}>
      {Array.from({ length: SKELETON_COUNT }, (_, index) => (
        <div className="min-w-0" key={index}>
          <Skeleton className="aspect-[4/4.5] rounded-[20px]" />
          <div className="pt-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-2 h-4 w-3/4" />
            <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <Skeleton className="h-10 rounded-full" />
              <Skeleton className="h-10 w-10 rounded-full sm:w-32" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProductGrid({ products, isLoading = false }: ProductGridProps) {
  if (isLoading) {
    return <ProductGridSkeleton />;
  }

  if (products.length === 0) {
    return (
      <div className="border-y border-border py-16 text-center">
        <h3 className="text-lg font-semibold text-ink">No products found</h3>
        <p className="mt-2 text-sm text-muted">Try another search or category.</p>
      </div>
    );
  }

  return (
    <div className={gridClassName}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

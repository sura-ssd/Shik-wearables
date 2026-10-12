import { useEffect, useMemo, useState } from "react";
import { CartDrawer } from "./components/CartDrawer";
import { FilterBar, type CategoryFilter, type SortOrder } from "./components/FilterBar";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { ProductGrid } from "./components/ProductGrid";
import { Skeleton } from "./components/Skeleton";
import { TopLoader } from "./components/TopLoader";
import { heroSlides } from "./data/heroSlides";
import { products } from "./data/products";
import { useInitialLoad } from "./hooks/useInitialLoad";

export default function App() {
  const [category, setCategory] = useState<CategoryFilter>("All");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOrder>("featured");
  const isLoading = !useInitialLoad(heroSlides[0]?.image);
  const [isDark, setIsDark] = useState(() => {
    const savedTheme = localStorage.getItem("shik-shop-theme");
    return savedTheme ? savedTheme === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
    localStorage.setItem("shik-shop-theme", isDark ? "dark" : "light");
  }, [isDark]);

  useEffect(() => {
    const handleCategoryChange = (event: Event) => {
      const nextCategory = (event as CustomEvent<string>).detail;
      if (nextCategory === "Sneakers" || nextCategory === "Tops" || nextCategory === "Bottoms") {
        setCategory(nextCategory);
      }
    };

    window.addEventListener("shik:category", handleCategoryChange);
    return () => window.removeEventListener("shik:category", handleCategoryChange);
  }, []);

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = products.filter((product) => {
      const matchesCategory = category === "All" || product.category === category;
      const matchesSearch =
        query.length === 0 ||
        product.name.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });

    return [...filtered].sort((left, right) => {
      switch (sort) {
        case "price-ascending":
          return left.price - right.price;
        case "price-descending":
          return right.price - left.price;
        case "name":
          return left.name.localeCompare(right.name);
        default:
          return 0;
      }
    });
  }, [category, search, sort]);

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <TopLoader isLoading={isLoading} />
      <p className="sr-only" role="status">
        {isLoading ? "Loading the shop" : ""}
      </p>
      <Header isDark={isDark} onThemeToggle={() => setIsDark((current) => !current)} />

      <main aria-busy={isLoading}>
        <Hero isLoading={isLoading} />

        <section className="mx-auto max-w-content px-4 pb-14 sm:px-6 lg:px-10" id="shop">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">The collection</p>
              <h2 className="mt-1 text-2xl font-extrabold tracking-tightest text-ink sm:text-3xl">Wear on repeat</h2>
            </div>
            {isLoading ? (
              <Skeleton className="mb-1 h-4 w-16" />
            ) : (
              <p className="pb-1 text-sm text-muted">{visibleProducts.length} pieces</p>
            )}
          </div>
          <FilterBar
            category={category}
            onCategoryChange={setCategory}
            onSearchChange={setSearch}
            onSortChange={setSort}
            search={search}
            sort={sort}
          />

          <div className="mt-8">
            <ProductGrid isLoading={isLoading} products={visibleProducts} />
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-canvas">
        <div className="mx-auto grid max-w-content gap-8 px-4 py-10 text-sm text-muted sm:px-6 lg:grid-cols-3 lg:px-10">
          <div>
            <p className="text-base font-bold uppercase tracking-[0.12em] text-ink">Shik shop</p>
            <p className="mt-3 max-w-[28ch]">Sneakers and everyday layers for the rhythm of Addis.</p>
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-ink">Contact</p>
            <ul className="mt-3 space-y-2">
              <li>hello@shikshop.com</li>
              <li>+251 91 234 5678</li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-ink">Support</p>
            <ul className="mt-3 space-y-2">
              <li>Shipping</li>
              <li>Returns</li>
              <li>Care guide</li>
            </ul>
          </div>
        </div>
      </footer>

      <CartDrawer />
    </div>
  );
}

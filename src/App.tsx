import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { CartDrawer } from "./components/CartDrawer";
import {
  FilterBar,
  type CategoryFilter,
  type SortOrder,
} from "./components/FilterBar";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { PageFallback } from "./components/PageFallback";
import { ProductGrid } from "./components/ProductGrid";
import { Skeleton } from "./components/Skeleton";
import { Toaster } from "./components/Toaster";
import { TopLoader } from "./components/TopLoader";
import { buildHeroSlides } from "./data/heroSlides";
import { useProducts } from "./hooks/useProducts";
import { startCartSync } from "./lib/cartSync";
import { useInitialLoad } from "./hooks/useInitialLoad";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
// import { ScrollManager } from "./components/ScrollManager";
import { useAuthStore } from "./store/authStore";

// These pages load only when someone opens them, which keeps the first download small.
const ProductPage = lazy(() =>
  import("./pages/ProductPage").then((module) => ({ default: module.ProductPage })),
);
const CheckoutPage = lazy(() =>
  import("./pages/CheckoutPage").then((module) => ({ default: module.CheckoutPage })),
);
const AdminPage = lazy(() =>
  import("./pages/AdminPage").then((module) => ({ default: module.AdminPage })),
);
const LoginPage = lazy(() =>
  import("./pages/LoginPage").then((module) => ({ default: module.LoginPage })),
);
const OrdersPage = lazy(() =>
  import("./pages/OrdersPage").then((module) => ({ default: module.OrdersPage })),
);
const OrderDetailPage = lazy(() =>
  import("./pages/OrderDetailPage").then((module) => ({ default: module.OrderDetailPage })),
);
const AdminOrdersPage = lazy(() =>
  import("./pages/AdminOrdersPage").then((module) => ({ default: module.AdminOrdersPage })),
);

export default function App() {
  const location = useLocation();
  const [category, setCategory] = useState<CategoryFilter>("All");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOrder>("featured");
  const {
    products,
    isLoading: productsLoading,
    error: productsError,
    reload,
  } = useProducts();
  const slides = useMemo(() => buildHeroSlides(products), [products]);
  const isReady = useInitialLoad(slides[0]?.image);
  const isLoading = !isReady || productsLoading;
  const [isDark, setIsDark] = useState(() => {
    const savedTheme = localStorage.getItem("shik-shop-theme");
    return savedTheme
      ? savedTheme === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
    localStorage.setItem("shik-shop-theme", isDark ? "dark" : "light");
  }, [isDark]);

  useEffect(() => {
    const handleCategoryChange = (event: Event) => {
      const nextCategory = (event as CustomEvent<string>).detail;
      if (
        nextCategory === "Sneakers" ||
        nextCategory === "Tops" ||
        nextCategory === "Bottoms"
      ) {
        setCategory(nextCategory);
      }
    };

    window.addEventListener("shik:category", handleCategoryChange);
    return () =>
      window.removeEventListener("shik:category", handleCategoryChange);
  }, []);

  // Start listening for sign-in / sign-out once for the whole app.
  useEffect(() => useAuthStore.getState().init(), []);

  // Save the cart online while someone is signed in.
  useEffect(() => startCartSync(), []);

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = products.filter((product) => {
      const matchesCategory =
        category === "All" || product.category === category;
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
  }, [category, products, search, sort]);

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <TopLoader isLoading={isLoading} />
      <p className="sr-only" role="status">
        {isLoading ? "Loading the shop" : ""}
      </p>
      <Header
        isDark={isDark}
        onThemeToggle={() => setIsDark((current) => !current)}
      />

      <main aria-busy={isLoading}>
        <Suspense fallback={<PageFallback />}>
          {/* A new key on every page change makes the page fade in each time it appears. */}
          <div
            className="animate-page-in motion-reduce:animate-none"
            key={location.pathname}
          >
            <Routes>
              <Route
                element={
                  <>
                    <Hero isLoading={isLoading} slides={slides} />

                    <section
                      className="mx-auto max-w-content px-4 pb-14 sm:px-6 lg:px-10"
                      id="shop"
                    >
                      <div className="mb-6 flex items-end justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                            The collection
                          </p>
                          <h2 className="mt-1 text-2xl font-extrabold tracking-tightest text-ink sm:text-3xl">
                            Wear on repeat
                          </h2>
                        </div>
                        {isLoading ? (
                          <Skeleton className="mb-1 h-4 w-16" />
                        ) : (
                          <p className="pb-1 text-sm text-muted">
                            {visibleProducts.length} pieces
                          </p>
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
                        {productsError ? (
                          <div className="border-y border-border py-16 text-center" role="alert">
                            <h3 className="text-lg font-semibold text-ink">
                              We could not load the shop
                            </h3>
                            <p className="mt-2 text-sm text-muted">{productsError}</p>
                            <button
                              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-accent-ink hover:bg-ink hover:text-surface"
                              onClick={() => void reload()}
                              type="button"
                            >
                              Try again
                            </button>
                          </div>
                        ) : !isLoading && products.length === 0 ? (
                          <div className="border-y border-border py-16 text-center">
                            <h3 className="text-lg font-semibold text-ink">
                              New pieces are coming soon
                            </h3>
                            <p className="mt-2 text-sm text-muted">
                              Check back shortly for our first collection.
                            </p>
                          </div>
                        ) : (
                          <ProductGrid
                            isLoading={isLoading}
                            products={visibleProducts}
                          />
                        )}
                      </div>
                    </section>
                  </>
                }
                path="/"
              />
              <Route element={<ProductPage />} path="/product/:id" />
              <Route element={<CheckoutPage />} path="/checkout" />
              <Route element={<LoginPage />} path="/login" />
              <Route element={<AdminPage />} path="/admin" />
              <Route element={<AdminOrdersPage />} path="/admin/orders" />
              <Route element={<OrdersPage />} path="/orders" />
              <Route element={<OrderDetailPage />} path="/orders/:id" />
              <Route element={<Navigate replace to="/" />} path="*" />
            </Routes>
          </div>
        </Suspense>
      </main>

      <footer className="border-t border-border bg-canvas">
        <div className="mx-auto grid max-w-content gap-8 px-4 py-10 text-sm text-muted sm:px-6 lg:grid-cols-3 lg:px-10">
          <div>
            <p className="text-base font-bold uppercase tracking-[0.12em] text-ink">
              Shik wearables
            </p>
            <p className="mt-3 max-w-[28ch]">
              Sneakers and everyday layers for the rhythm of Addis.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-ink">
              Contact
            </p>
            <ul className="mt-3 space-y-2">
              <li>hello@shikshop.com</li>
              <li>+251 91 234 5678</li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-ink">
              Support
            </p>
            <ul className="mt-3 space-y-2">
              <li>Shipping</li>
              <li>Returns</li>
              <li>Care guide</li>
            </ul>
          </div>
        </div>
      </footer>

      <CartDrawer />
      <Toaster />
    </div>
  );
}

import { Search } from "lucide-react";
import type { ProductCategory } from "../types";

export type CategoryFilter = "All" | ProductCategory;
export type SortOrder = "featured" | "price-ascending" | "price-descending" | "name";

interface FilterBarProps {
  category: CategoryFilter;
  onCategoryChange: (category: CategoryFilter) => void;
  search: string;
  onSearchChange: (search: string) => void;
  sort: SortOrder;
  onSortChange: (sort: SortOrder) => void;
}

const categories: CategoryFilter[] = ["All", "Sneakers", "Tops", "Bottoms"];

export function FilterBar({
  category,
  onCategoryChange,
  search,
  onSearchChange,
  sort,
  onSortChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-col gap-4 border-y border-border py-4 lg:flex-row lg:items-center lg:justify-between">
      <div aria-label="Filter by category" className="flex gap-2 overflow-x-auto pb-1 lg:pb-0" role="group">
        {categories.map((option) => (
          <button
            aria-pressed={category === option}
            className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${category === option ? "bg-accent text-accent-ink" : "bg-surface text-ink hover:bg-border/50"}`}
            key={option}
            onClick={() => onCategoryChange(option)}
            type="button"
          >
            {option}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(200px,280px)_auto]">
        <label className="flex min-h-11 items-center gap-2 rounded-full border border-border bg-surface px-4 focus-within:outline focus-within:outline-2 focus-within:outline-accent">
          <Search aria-hidden="true" className="shrink-0 text-muted" size={17} />
          <span className="sr-only">Search products</span>
          <input
            className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search the shop"
            type="search"
            value={search}
          />
        </label>
        <label className="flex min-h-11 items-center rounded-full border border-border bg-surface px-4">
          <span className="sr-only">Sort products</span>
          <select
            className="max-w-full bg-transparent text-sm font-medium text-ink outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            onChange={(event) => onSortChange(event.target.value as SortOrder)}
            value={sort}
          >
            <option value="featured">Featured</option>
            <option value="price-ascending">Price: low to high</option>
            <option value="price-descending">Price: high to low</option>
            <option value="name">Name: A to Z</option>
          </select>
        </label>
      </div>
    </div>
  );
}

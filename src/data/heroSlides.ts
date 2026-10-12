import { products } from "./products";
import type { Product, ProductCategory } from "../types";

// Products shown in the hero, in order. Change this list to feature different pieces.
const heroProductIds = ["street-high", "daily-hoodie", "relaxed-trouser", "court-low-white"];

export interface HeroSlide {
  id: string;
  image: string;
  alt: string;
  name: string;
  category: ProductCategory;
  cta: string;
}

const ctaByCategory: Record<ProductCategory, string> = {
  Sneakers: "Shop sneakers",
  Tops: "Shop tops",
  Bottoms: "Shop bottoms",
};

function toSlide(product: Product): HeroSlide {
  return {
    id: product.id,
    // Catalog images are 900px wide; ask for a larger version for the hero.
    image: product.image.replace("w=900", "w=1400"),
    alt: product.imageAlt,
    name: product.name,
    category: product.category,
    cta: ctaByCategory[product.category],
  };
}

export const heroSlides: HeroSlide[] = heroProductIds.flatMap((id) => {
  const product = products.find((item) => item.id === id);
  return product ? [toSlide(product)] : [];
});

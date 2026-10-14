import type { Product, ProductCategory } from "../types";

export interface HeroSlide {
  id: string;
  image: string;
  alt: string;
  name: string;
  category: ProductCategory;
  cta: string;
}

const MAX_SLIDES = 4;
const CATEGORIES: ProductCategory[] = ["Sneakers", "Tops", "Bottoms"];

const ctaByCategory: Record<ProductCategory, string> = {
  Sneakers: "Shop sneakers",
  Tops: "Shop tops",
  Bottoms: "Shop bottoms",
};

function toSlide(product: Product): HeroSlide {
  return {
    id: product.id,
    image: product.image,
    alt: product.imageAlt,
    name: product.name,
    category: product.category,
    cta: ctaByCategory[product.category],
  };
}

/** Newest product from each category first, then more of the newest, up to four slides. */
export function buildHeroSlides(products: Product[]): HeroSlide[] {
  const picked: Product[] = [];

  for (const category of CATEGORIES) {
    const first = products.find((product) => product.category === category);
    if (first) picked.push(first);
  }
  for (const product of products) {
    if (picked.length >= MAX_SLIDES) break;
    if (!picked.includes(product)) picked.push(product);
  }

  return picked.slice(0, MAX_SLIDES).map(toSlide);
}

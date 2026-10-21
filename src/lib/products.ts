import { supabase } from "./supabase";
import type { Product, ProductCategory, ProductColor } from "../types";

interface ColorRow {
  id: string;
  name: string;
  hex: string;
  image_url: string | null;
  image_urls: string[] | null;
  image_alt: string | null;
  sort_order: number;
}

interface VariantRow {
  color_id: string | null;
  size: string;
  stock: number;
}

interface ProductRow {
  id: string;
  name: string;
  category: ProductCategory;
  price_etb: number;
  image_url: string;
  image_alt: string;
  badge: string | null;
  product_colors: ColorRow[] | null;
  variants: VariantRow[] | null;
}

const LETTER_SIZES = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL"];

export function compareSizes(left: string, right: string): number {
  const leftNumber = Number(left);
  const rightNumber = Number(right);
  if (!Number.isNaN(leftNumber) && !Number.isNaN(rightNumber)) return leftNumber - rightNumber;

  const leftIndex = LETTER_SIZES.indexOf(left.toUpperCase());
  const rightIndex = LETTER_SIZES.indexOf(right.toUpperCase());
  if (leftIndex !== -1 && rightIndex !== -1) return leftIndex - rightIndex;

  return left.localeCompare(right);
}

function toProduct(row: ProductRow): Product {
  const inStock = (row.variants ?? []).filter((variant) => variant.stock > 0);

  const colors: ProductColor[] = [...(row.product_colors ?? [])]
    .sort((left, right) => left.sort_order - right.sort_order)
    .map((color) => {
      // A color without its own photos shows the product's main photo.
      const own = color.image_urls?.length ? color.image_urls : color.image_url ? [color.image_url] : [];
      const images = own.length > 0 ? own : [row.image_url];

      return {
        id: color.id,
        name: color.name,
        hex: color.hex,
        image: images[0],
        images,
        imageAlt: color.image_alt || `${row.name}, ${color.name}`,
        sizes: inStock
          .filter((variant) => variant.color_id === color.id)
          .map((variant) => variant.size)
          .sort(compareSizes),
      };
    });

  // Only sizes that are in stock can be chosen. An empty list means "sold out".
  const sizes =
    colors.length > 0
      ? [...new Set(colors.flatMap((color) => color.sizes))].sort(compareSizes)
      : inStock
          .filter((variant) => variant.color_id === null)
          .map((variant) => variant.size)
          .sort(compareSizes);

  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: row.price_etb,
    image: row.image_url,
    imageAlt: row.image_alt,
    badge: row.badge ?? undefined,
    sizes,
    colors,
  };
}

/** Active products posted by the admin, newest first. */
export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, name, category, price_etb, image_url, image_alt, badge, product_colors(id, name, hex, image_url, image_urls, image_alt, sort_order), variants(color_id, size, stock)",
    )
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as ProductRow[]).map(toProduct);
}

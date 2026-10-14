import { supabase } from "./supabase";
import type { Product, ProductCategory } from "../types";

interface ProductRow {
  id: string;
  name: string;
  category: ProductCategory;
  price_etb: number;
  image_url: string;
  image_alt: string;
  badge: string | null;
  variants: { size: string; stock: number }[] | null;
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
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: row.price_etb,
    image: row.image_url,
    imageAlt: row.image_alt,
    badge: row.badge ?? undefined,
    // Only sizes that are in stock can be chosen. An empty list means "sold out".
    sizes: (row.variants ?? [])
      .filter((variant) => variant.stock > 0)
      .map((variant) => variant.size)
      .sort(compareSizes),
  };
}

/** Active products posted by the admin, newest first. */
export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, category, price_etb, image_url, image_alt, badge, variants(size, stock)")
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as ProductRow[]).map(toProduct);
}

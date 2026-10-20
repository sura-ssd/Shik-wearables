import { optimizeImage } from "./imageOptimize";
import { compareSizes } from "./products";
import { supabase } from "./supabase";
import type { ProductCategory } from "../types";

const IMAGE_BUCKET = "product-images";
// Largest photo someone may choose. It is shrunk before upload.
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
// Storage limit for the optimized photo (set in the storage migration).
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export interface AdminVariant {
  id: string;
  size: string;
  stock: number;
}

export interface AdminProduct {
  id: string;
  name: string;
  category: ProductCategory;
  priceEtb: number;
  imageUrl: string;
  active: boolean;
  variants: AdminVariant[];
}

export interface NewProductInput {
  name: string;
  category: ProductCategory;
  priceEtb: number;
  badge: string;
  imageAlt: string;
  image: File;
  variants: { size: string; stock: number }[];
}

interface AdminProductRow {
  id: string;
  name: string;
  category: ProductCategory;
  price_etb: number;
  image_url: string;
  active: boolean;
  variants: AdminVariant[] | null;
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "product";
}

function extensionFor(file: File): string {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

/** Every product (including hidden ones) with its sizes and stock. Admins only. */
export async function fetchAdminProducts(): Promise<AdminProduct[]> {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, category, price_etb, image_url, active, variants(id, size, stock)")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as AdminProductRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    priceEtb: row.price_etb,
    imageUrl: row.image_url,
    active: row.active,
    variants: [...(row.variants ?? [])].sort((left, right) => compareSizes(left.size, right.size)),
  }));
}

/** Uploads the photo, then posts the product and its sizes. Rolls back if a step fails. */
export async function createProduct(input: NewProductInput): Promise<string> {
  const baseId = slugify(input.name);
  const image = await optimizeImage(input.image);
  if (image.size > MAX_UPLOAD_BYTES) {
    throw new Error("That photo is still too large after compressing. Please choose a smaller one.");
  }
  const imagePath = `${baseId}/${Date.now()}.${extensionFor(image)}`;
  const bucket = supabase.storage.from(IMAGE_BUCKET);

  const upload = await bucket.upload(imagePath, image, {
    contentType: image.type,
    cacheControl: "31536000",
  });
  if (upload.error) throw new Error(`Image upload failed: ${upload.error.message}`);
  const imageUrl = bucket.getPublicUrl(imagePath).data.publicUrl;

  let productId = baseId;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { error } = await supabase.from("products").insert({
      id: productId,
      name: input.name.trim(),
      category: input.category,
      price_etb: input.priceEtb,
      image_url: imageUrl,
      image_alt: input.imageAlt.trim() || input.name.trim(),
      badge: input.badge.trim() || null,
    });

    if (!error) break;

    // A product with this name already exists: retry once with a short suffix.
    if (error.code === "23505" && attempt === 0) {
      productId = `${baseId}-${Math.random().toString(36).slice(2, 6)}`;
      continue;
    }

    await bucket.remove([imagePath]);
    throw new Error(error.message);
  }

  const { error: variantError } = await supabase.from("variants").insert(
    input.variants.map((variant) => ({
      product_id: productId,
      size: variant.size.trim(),
      stock: variant.stock,
    })),
  );

  if (variantError) {
    await supabase.from("products").delete().eq("id", productId);
    await bucket.remove([imagePath]);
    throw new Error(variantError.message);
  }

  return productId;
}

export async function updateStock(variantId: string, stock: number): Promise<void> {
  const { error } = await supabase.from("variants").update({ stock }).eq("id", variantId);
  if (error) throw new Error(error.message);
}

export async function setProductActive(productId: string, active: boolean): Promise<void> {
  const { error } = await supabase.from("products").update({ active }).eq("id", productId);
  if (error) throw new Error(error.message);
}

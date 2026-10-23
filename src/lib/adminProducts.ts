import { optimizeImage } from "./imageOptimize";
import { compareSizes } from "./products";
import { supabase } from "./supabase";
import type { ProductCategory } from "../types";

const IMAGE_BUCKET = "product-images";
// Largest photo someone may choose. It is shrunk before upload.
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
// Photos allowed for each color.
export const MAX_PHOTOS_PER_COLOR = 6;
// Storage limit for the optimized photo (set in the storage migration).
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export interface AdminColor {
  id: string;
  name: string;
  hex: string;
  imageUrls: string[];
}

export interface AdminVariant {
  id: string;
  colorId: string | null;
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
  colors: AdminColor[];
  variants: AdminVariant[];
}

export interface NewColorInput {
  name: string;
  hex: string;
  /** Photos of this color, cover first. Optional: the main photo is used when there are none. */
  images: File[];
}

export interface NewVariantInput {
  /** Position in the colors list, or null for a product without colors. */
  colorIndex: number | null;
  size: string;
  stock: number;
}

export interface NewProductInput {
  name: string;
  category: ProductCategory;
  priceEtb: number;
  badge: string;
  imageAlt: string;
  image: File;
  colors: NewColorInput[];
  variants: NewVariantInput[];
}

interface AdminProductRow {
  id: string;
  name: string;
  category: ProductCategory;
  price_etb: number;
  image_url: string;
  active: boolean;
  product_colors: { id: string; name: string; hex: string; image_urls: string[] | null; sort_order: number }[] | null;
  variants: { id: string; color_id: string | null; size: string; stock: number }[] | null;
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

/** Every product (including hidden ones) with its colors, sizes and stock. Admins only. */
export async function fetchAdminProducts(): Promise<AdminProduct[]> {
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, name, category, price_etb, image_url, active, product_colors(id, name, hex, image_urls, sort_order), variants(id, color_id, size, stock)",
    )
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as AdminProductRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    priceEtb: row.price_etb,
    imageUrl: row.image_url,
    active: row.active,
    colors: [...(row.product_colors ?? [])]
      .sort((left, right) => left.sort_order - right.sort_order)
      .map((color) => ({ id: color.id, name: color.name, hex: color.hex, imageUrls: color.image_urls ?? [] })),
    variants: [...(row.variants ?? [])]
      .sort((left, right) => compareSizes(left.size, right.size))
      .map((variant) => ({
        id: variant.id,
        colorId: variant.color_id,
        size: variant.size,
        stock: variant.stock,
      })),
  }));
}

async function uploadPhoto(file: File, folder: string): Promise<{ path: string; url: string }> {
  const optimized = await optimizeImage(file);
  if (optimized.size > MAX_UPLOAD_BYTES) {
    throw new Error("A photo is still too large after compressing. Please choose a smaller one.");
  }

  const bucket = supabase.storage.from(IMAGE_BUCKET);
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${extensionFor(optimized)}`;
  const { error } = await bucket.upload(path, optimized, {
    contentType: optimized.type,
    cacheControl: "31536000",
  });
  if (error) throw new Error(`Image upload failed: ${error.message}`);

  return { path, url: bucket.getPublicUrl(path).data.publicUrl };
}

/**
 * Uploads the photos, then posts the product, its colors, and the stock for every color and size.
 * If any step fails, everything already saved is removed again.
 */
export async function createProduct(input: NewProductInput): Promise<string> {
  const baseId = slugify(input.name);
  const name = input.name.trim();
  const uploadedPaths: string[] = [];
  let productId = baseId;
  let productSaved = false;

  try {
    const mainPhoto = await uploadPhoto(input.image, baseId);
    uploadedPaths.push(mainPhoto.path);

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const { error } = await supabase.from("products").insert({
        id: productId,
        name,
        category: input.category,
        price_etb: input.priceEtb,
        image_url: mainPhoto.url,
        image_alt: input.imageAlt.trim() || name,
        badge: input.badge.trim() || null,
      });

      if (!error) {
        productSaved = true;
        break;
      }

      // A product with this name already exists: retry once with a short suffix.
      if (error.code === "23505" && attempt === 0) {
        productId = `${baseId}-${Math.random().toString(36).slice(2, 6)}`;
        continue;
      }
      throw new Error(error.message);
    }

    const colorIds: string[] = [];
    if (input.colors.length > 0) {
      const colorRows = [];
      for (const [index, color] of input.colors.entries()) {
        const imageUrls: string[] = [];
        for (const file of color.images.slice(0, MAX_PHOTOS_PER_COLOR)) {
          const photo = await uploadPhoto(file, `${baseId}/colors`);
          uploadedPaths.push(photo.path);
          imageUrls.push(photo.url);
        }
        colorRows.push({
          product_id: productId,
          name: color.name.trim(),
          hex: color.hex.toLowerCase(),
          image_url: imageUrls[0] ?? null,
          image_urls: imageUrls,
          image_alt: `${name}, ${color.name.trim()}`,
          sort_order: index,
        });
      }

      const { data, error } = await supabase.from("product_colors").insert(colorRows).select("id, sort_order");
      if (error) throw new Error(error.message);
      for (const row of data ?? []) colorIds[row.sort_order] = row.id;
    }

    const { error: variantError } = await supabase.from("variants").insert(
      input.variants.map((variant) => ({
        product_id: productId,
        color_id: variant.colorIndex === null ? null : colorIds[variant.colorIndex],
        size: variant.size.trim(),
        stock: variant.stock,
      })),
    );
    if (variantError) throw new Error(variantError.message);

    return productId;
  } catch (error) {
    // Undo whatever was saved, so a failed post leaves nothing behind.
    if (productSaved) {
      await supabase.from("variants").delete().eq("product_id", productId);
      await supabase.from("product_colors").delete().eq("product_id", productId);
      await supabase.from("products").delete().eq("id", productId);
    }
    if (uploadedPaths.length > 0) {
      await supabase.storage.from(IMAGE_BUCKET).remove(uploadedPaths);
    }
    throw error;
  }
}

export async function updateStock(variantId: string, stock: number): Promise<void> {
  const { error } = await supabase.from("variants").update({ stock }).eq("id", variantId);
  if (error) throw new Error(error.message);
}

/** Works out where a photo lives in storage from its public address. Photos from elsewhere return null. */
function storagePathFromUrl(url: string): string | null {
  const marker = `/${IMAGE_BUCKET}/`;
  const index = url.indexOf(marker);
  return url.includes("/storage/v1/object/") && index !== -1 ? decodeURIComponent(url.slice(index + marker.length)) : null;
}

/**
 * Deletes a product. If customers already ordered it, it cannot be erased from the order history,
 * so it is archived instead (removed from the shop and from this list).
 */
export async function deleteProduct(product: AdminProduct): Promise<"deleted" | "archived"> {
  const { data, error } = await supabase.rpc("delete_product", { p_product_id: product.id });
  if (error) throw new Error(error.message);

  const outcome = data === "archived" ? "archived" : "deleted";

  // A fully deleted product no longer needs its photos.
  if (outcome === "deleted") {
    const paths = [product.imageUrl, ...product.colors.flatMap((color) => color.imageUrls)]
      .map(storagePathFromUrl)
      .filter((path): path is string => path !== null);
    if (paths.length > 0) await supabase.storage.from(IMAGE_BUCKET).remove(paths);
  }
  return outcome;
}

export async function setProductActive(productId: string, active: boolean): Promise<void> {
  const { error } = await supabase.from("products").update({ active }).eq("id", productId);
  if (error) throw new Error(error.message);
}

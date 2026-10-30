import { IMAGE_BUCKET, storagePathFromUrl, uploadPhoto } from "./adminProducts";
import { compareSizes } from "./products";
import { supabase } from "./supabase";
import type { ProductCategory } from "../types";

/** A product as it is saved now, for the edit page. */
export interface ProductDetail {
  id: string;
  name: string;
  category: ProductCategory;
  priceEtb: number;
  badge: string;
  imageUrl: string;
  imageAlt: string;
  active: boolean;
  colors: { id: string; name: string; hex: string; imageUrls: string[] }[];
  variants: { colorId: string | null; size: string; stock: number }[];
}

interface DetailRow {
  id: string;
  name: string;
  category: ProductCategory;
  price_etb: number;
  badge: string | null;
  image_url: string;
  image_alt: string;
  active: boolean;
  product_colors: { id: string; name: string; hex: string; image_urls: string[] | null; sort_order: number }[] | null;
  variants: { color_id: string | null; size: string; stock: number }[] | null;
}

export async function fetchProductDetail(id: string): Promise<ProductDetail | null> {
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, name, category, price_etb, badge, image_url, image_alt, active, product_colors(id, name, hex, image_urls, sort_order), variants(color_id, size, stock)",
    )
    .eq("id", id)
    .is("archived_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = data as unknown as DetailRow;
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    priceEtb: row.price_etb,
    badge: row.badge ?? "",
    imageUrl: row.image_url,
    imageAlt: row.image_alt,
    active: row.active,
    colors: [...(row.product_colors ?? [])]
      .sort((left, right) => left.sort_order - right.sort_order)
      .map((color) => ({ id: color.id, name: color.name, hex: color.hex, imageUrls: color.image_urls ?? [] })),
    variants: [...(row.variants ?? [])]
      .sort((left, right) => compareSizes(left.size, right.size))
      .map((variant) => ({ colorId: variant.color_id, size: variant.size, stock: variant.stock })),
  };
}

/** One photo of a color: already saved (has a url) or newly chosen (has a file). */
export interface SavePhoto {
  url?: string;
  file?: File;
}

export interface SaveColor {
  /** The color's id when it already exists, or a temporary name for a new color. */
  key: string;
  id: string | null;
  name: string;
  hex: string;
  photos: SavePhoto[];
}

export interface SaveVariant {
  colorKey: string | null;
  size: string;
  /** null means "leave the stock as it is". */
  stock: number | null;
}

export interface SaveProductInput {
  original: ProductDetail;
  name: string;
  category: ProductCategory;
  priceEtb: number;
  badge: string;
  imageAlt: string;
  active: boolean;
  newMainImage: File | null;
  colors: SaveColor[];
  variants: SaveVariant[];
}

/**
 * Uploads new photos, saves everything in one step on the server, then removes photos that are no longer used.
 * If saving fails, the photos uploaded for it are removed again.
 */
export async function saveProductEdits(input: SaveProductInput): Promise<void> {
  const bucket = supabase.storage.from(IMAGE_BUCKET);
  const uploadedPaths: string[] = [];
  const name = input.name.trim();

  try {
    let imageUrl = input.original.imageUrl;
    if (input.newMainImage) {
      const photo = await uploadPhoto(input.newMainImage, input.original.id);
      uploadedPaths.push(photo.path);
      imageUrl = photo.url;
    }

    const colors = [];
    for (const color of input.colors) {
      const urls: string[] = [];
      for (const photo of color.photos) {
        if (photo.url) {
          urls.push(photo.url);
        } else if (photo.file) {
          const uploaded = await uploadPhoto(photo.file, `${input.original.id}/colors`);
          uploadedPaths.push(uploaded.path);
          urls.push(uploaded.url);
        }
      }
      colors.push({
        id: color.id,
        key: color.key,
        name: color.name.trim(),
        hex: color.hex.toLowerCase(),
        image_urls: urls,
        image_alt: `${name}, ${color.name.trim()}`,
      });
    }

    const { error } = await supabase.rpc("update_product", {
      p_product_id: input.original.id,
      p_data: {
        name,
        category: input.category,
        price_etb: input.priceEtb,
        badge: input.badge.trim() || null,
        image_url: imageUrl,
        image_alt: input.imageAlt.trim() || name,
        active: input.active,
        colors,
        variants: input.variants.map((variant) => ({
          color_key: variant.colorKey,
          size: variant.size.trim(),
          stock: variant.stock,
        })),
      },
    });

    if (error) {
      if (error.hint === "user_message") throw new Error(error.message);
      console.error("Could not save the product", error);
      throw new Error("Could not save the changes. Please try again.");
    }

    // The save worked: delete photos that are not used any more.
    const stillUsed = new Set([imageUrl, ...colors.flatMap((color) => color.image_urls)]);
    const unused = [input.original.imageUrl, ...input.original.colors.flatMap((color) => color.imageUrls)]
      .filter((url) => !stillUsed.has(url))
      .map(storagePathFromUrl)
      .filter((path): path is string => path !== null);
    if (unused.length > 0) await bucket.remove(unused);
  } catch (error) {
    if (uploadedPaths.length > 0) await bucket.remove(uploadedPaths);
    throw error;
  }
}

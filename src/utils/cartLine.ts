import type { CartColor, ProductColor } from "../types";

/** One cart line is one product in one color and one size. */
export function cartLineKey(line: { product: { id: string }; size: string; color?: { id: string } }): string {
  return `${line.product.id}::${line.color?.id ?? ""}::${line.size}`;
}

export function toCartColor(color: ProductColor): CartColor {
  return {
    id: color.id,
    name: color.name,
    hex: color.hex,
    image: color.image,
    imageAlt: color.imageAlt,
  };
}

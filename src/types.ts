export type ProductCategory = "Sneakers" | "Tops" | "Bottoms";

export interface ProductColor {
  id: string;
  name: string;
  /** Swatch color, like #1f2937. */
  hex: string;
  /** Photo of this color. Falls back to the product's main photo. */
  image: string;
  imageAlt: string;
  /** Sizes of this color that are in stock. Empty means this color is sold out. */
  sizes: string[];
}

export type CartColor = Pick<ProductColor, "id" | "name" | "hex" | "image" | "imageAlt">;

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  image: string;
  imageAlt: string;
  /** Sizes in stock. For products with colors, every size that is in stock in at least one color. */
  sizes: string[];
  /** Empty when the product has no color options. */
  colors: ProductColor[];
  badge?: string;
}

export interface CartLine {
  product: Product;
  size: string;
  color?: CartColor;
  quantity: number;
}

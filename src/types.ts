export type ProductCategory = "Sneakers" | "Tops" | "Bottoms";

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  image: string;
  imageAlt: string;
  sizes: string[];
  badge?: string;
}

export interface CartLine {
  product: Product;
  size: string;
  quantity: number;
}

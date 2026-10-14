import { useEffect } from "react";
import { useProductStore } from "../store/productStore";

export function useProducts() {
  const products = useProductStore((state) => state.products);
  const status = useProductStore((state) => state.status);
  const error = useProductStore((state) => state.error);
  const load = useProductStore((state) => state.load);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    products,
    error,
    isLoading: status === "idle" || status === "loading",
    reload: () => load(true),
  };
}

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Product } from "@/types";

type CatalogContextValue = {
  ready: boolean;
  products: Product[];
  getProduct: (idOrSlug: string) => Product | undefined;
  refresh: () => Promise<void>;
};

const CatalogContext = createContext<CatalogContextValue | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/catalog/products", { cache: "no-store" });
      if (!res.ok) {
        setProducts([]);
        return;
      }
      const data = (await res.json()) as { products?: Product[] };
      setProducts(Array.isArray(data.products) ? data.products : []);
    } catch {
      setProducts([]);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const getProduct = useCallback(
    (idOrSlug: string) =>
      products.find((p) => p.id === idOrSlug || p.slug === idOrSlug),
    [products],
  );

  const value = useMemo(
    () => ({ ready, products, getProduct, refresh }),
    [ready, products, getProduct, refresh],
  );

  return (
    <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
  );
}

export function useCatalog(): CatalogContextValue {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog must be used within CatalogProvider");
  return ctx;
}

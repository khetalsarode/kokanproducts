"use client";

import { useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { useCatalog } from "@/context/CatalogContext";
import { categoryMeta, categoryOrder } from "@/data/categories";
import type { Category } from "@/types";

export function ProductsClient() {
  const params = useSearchParams();
  const router = useRouter();
  const { products, ready } = useCatalog();
  const q = params.get("q") ?? "";
  const category = params.get("category") ?? "";
  const tag = params.get("tag") ?? "";
  const sort = params.get("sort") ?? "featured";
  const fulfillment = params.get("fulfillment") ?? "";

  const filtered = useMemo(() => {
    let list = [...products];
    if (category && category in categoryMeta) {
      list = list.filter((p) => p.category === category);
    }
    if (tag) {
      list = list.filter((p) => p.tags.includes(tag));
    }
    if (fulfillment === "internal" || fulfillment === "seller") {
      list = list.filter((p) => p.fulfillment === fulfillment);
    }
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(needle) ||
          p.description.toLowerCase().includes(needle) ||
          p.tags.some((t) => t.includes(needle)) ||
          p.category.includes(needle),
      );
    }
    if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
    else if (sort === "rating") list.sort((a, b) => b.rating - a.rating);
    return list;
  }, [products, category, tag, q, sort, fulfillment]);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (!value) next.delete(key);
    else next.set(key, value);
    router.push(`/products?${next.toString()}`);
  }

  const title = category
    ? categoryMeta[category as Category]?.label ?? "Shop"
    : tag === "bestseller"
      ? "Bestsellers"
      : q
        ? `Results for “${q}”`
        : "All products";

  if (!ready) {
    return <div className="section text-ink/50">Loading catalog…</div>;
  }

  return (
    <div className="section !pt-8">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-lagoon">Catalog</p>
        <h1 className="mt-1 font-display text-4xl text-ink">{title}</h1>
        <p className="mt-2 text-ink/60">
          {filtered.length} item{filtered.length === 1 ? "" : "s"} · live from database · prices in ₹
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          className="chip"
          data-active={!category ? "true" : "false"}
          onClick={() => setParam("category", "")}
        >
          All
        </button>
        {categoryOrder.map((key) => (
          <button
            key={key}
            type="button"
            className="chip"
            data-active={category === key ? "true" : "false"}
            onClick={() => setParam("category", key)}
          >
            {categoryMeta[key].label}
          </button>
        ))}
      </div>

      <div className="mb-8 flex flex-wrap items-center gap-3">
        <label className="text-sm text-ink/60">
          Sort{" "}
          <select
            className="field ml-1 !inline-block !py-1.5 !w-auto"
            value={sort}
            onChange={(e) => setParam("sort", e.target.value)}
          >
            <option value="featured">Featured</option>
            <option value="price-asc">Price ↑</option>
            <option value="price-desc">Price ↓</option>
            <option value="rating">Top rated</option>
          </select>
        </label>
        <label className="text-sm text-ink/60">
          Fulfilment{" "}
          <select
            className="field ml-1 !inline-block !py-1.5 !w-auto"
            value={fulfillment}
            onChange={(e) => setParam("fulfillment", e.target.value)}
          >
            <option value="">Any</option>
            <option value="internal">KokanProducts stock</option>
            <option value="seller">Seller dispatch</option>
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-sm bg-white/50 p-8 text-center text-ink/60">
          No products match. Try another category or clear filters.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

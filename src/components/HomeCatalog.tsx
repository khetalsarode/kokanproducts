"use client";

import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { useCatalog } from "@/context/CatalogContext";

export function HomeBestsellers() {
  const { products, ready } = useCatalog();
  const bestsellers = products.filter((p) => p.tags.includes("bestseller")).slice(0, 8);
  const list = bestsellers.length > 0 ? bestsellers : products.slice(0, 8);

  if (!ready) {
    return <p className="text-ink/50">Loading products…</p>;
  }

  if (list.length === 0) {
    return (
      <p className="rounded-sm bg-white/50 p-6 text-ink/60">
        No products in the database yet. Add some from the Admin dashboard.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
      {list.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}

export function HomeFeatured() {
  const { products, ready } = useCatalog();
  const featured = products.slice(0, 4);

  if (!ready) {
    return <p className="text-ink/50">Loading products…</p>;
  }

  if (featured.length === 0) return null;

  return (
    <>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-lagoon">Fresh picks</p>
          <h2 className="mt-1 font-display text-3xl text-ink">Just landed</h2>
        </div>
        <Link href="/customer/register" className="text-sm font-medium text-sea hover:underline">
          Create account →
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
        {featured.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </>
  );
}

"use client";

import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { useCatalog } from "@/context/CatalogContext";
import { useShop } from "@/context/ShopContext";

export default function WishlistPage() {
  const { wishlist, ready } = useShop();
  const { getProduct } = useCatalog();
  const items = wishlist.map((id) => getProduct(id)).filter(Boolean);

  if (!ready) return <div className="section text-ink/50">Loading wishlist…</div>;

  return (
    <div className="section !pt-8">
      <h1 className="font-display text-4xl text-ink">Wishlist</h1>
      <p className="mt-2 text-ink/60">Saved for later from the Konkan pantry.</p>

      {items.length === 0 ? (
        <div className="mt-10 text-center">
          <p className="text-ink/60">No saved items yet.</p>
          <Link href="/products" className="btn-primary mt-4 inline-flex">
            Discover products
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
          {items.map((p) => p && <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}

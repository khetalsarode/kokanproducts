"use client";

import Link from "next/link";
import { useState } from "react";
import { ProductArt } from "@/components/ProductArt";
import { ProductCard } from "@/components/ProductCard";
import { Stars } from "@/components/Stars";
import { useShop } from "@/context/ShopContext";
import { getSeller } from "@/data/sellers";
import { formatINR, discountPercent, formatDate } from "@/lib/format";
import type { Product } from "@/types";

export function ProductDetail({
  product,
  related,
}: {
  product: Product;
  related: Product[];
}) {
  const { addToCart, toggleWishlist, isWishlisted } = useShop();
  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const seller = getSeller(product.sellerId);
  const off = discountPercent(product.price, product.mrp);
  const wish = isWishlisted(product.id);

  function handleAdd() {
    if (product.stock <= 0 || justAdded) return;
    addToCart(product.id, qty);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1800);
  }

  return (
    <div className="section !pt-8">
      <nav className="mb-6 text-sm text-ink/50">
        <Link href="/products" className="hover:text-sea">
          Shop
        </Link>
        <span className="mx-2">/</span>
        <Link href={`/products?category=${product.category}`} className="hover:text-sea capitalize">
          {product.category}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-ink/80">{product.shortName}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <ProductArt product={product} size="lg" className="rounded-sm !h-[22rem] sm:!h-[28rem]" />

        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-lagoon">{product.category}</p>
          <h1 className="mt-2 font-display text-3xl text-ink sm:text-4xl">{product.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Stars rating={product.rating} size="md" />
            <span className="text-sm text-ink/55">{product.reviewCount} reviews</span>
            {product.fssai && (
              <span className="rounded-sm bg-mist px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sea">
                FSSAI aligned
              </span>
            )}
          </div>

          <div className="mt-5 flex items-baseline gap-3">
            <span className="font-display text-3xl text-ink">{formatINR(product.price)}</span>
            {off > 0 && (
              <>
                <span className="text-ink/40 line-through">{formatINR(product.mrp)}</span>
                <span className="text-sm font-semibold text-spice">{off}% off</span>
              </>
            )}
          </div>
          <p className="mt-1 text-sm text-ink/50">
            {product.weight} · {product.unit}
          </p>

          <p className="mt-5 leading-relaxed text-ink/75">{product.description}</p>

          <div className="mt-6 space-y-2 rounded-sm bg-white/55 p-4 text-sm">
            <p>
              <span className="text-ink/50">Sold by </span>
              <strong>{seller.name}</strong>
              <span className="text-ink/50"> · {seller.location}</span>
            </p>
            <p>
              <span className="text-ink/50">Fulfilment </span>
              <strong>
                {product.fulfillment === "internal"
                  ? "KokanProducts stock — we pack & ship"
                  : "Third-party seller dispatch"}
              </strong>
            </p>
            <p>
              <span className="text-ink/50">Stock </span>
              <strong className={product.stock < 20 ? "text-spice" : "text-lagoon"}>
                {product.stock > 0 ? `${product.stock} available` : "Out of stock"}
              </strong>
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-full border border-sea/20 bg-white/70">
              <button
                type="button"
                className="px-3 py-2 text-sea"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="min-w-8 text-center font-medium">{qty}</span>
              <button
                type="button"
                className="px-3 py-2 text-sea"
                onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
            <button
              type="button"
              className="btn-primary min-w-[9rem]"
              disabled={product.stock <= 0}
              data-testid="add-to-bag"
              onClick={handleAdd}
            >
              {justAdded ? "Added ✓" : "Add to bag"}
            </button>
            <button type="button" className="btn-outline" onClick={() => toggleWishlist(product.id)}>
              {wish ? "♥ Saved" : "♡ Wishlist"}
            </button>
          </div>
        </div>
      </div>

      <section className="mt-14">
        <h2 className="font-display text-2xl text-ink">Reviews</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {product.reviews.map((r) => (
            <blockquote key={r.id} className="border-l-2 border-lagoon/40 bg-white/40 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <Stars rating={r.rating} />
                <time className="text-xs text-ink/40">{formatDate(r.date)}</time>
              </div>
              <p className="mt-2 text-sm text-ink/80">{r.comment}</p>
              <footer className="mt-2 text-xs font-medium text-sea">{r.author}</footer>
            </blockquote>
          ))}
        </div>
      </section>

      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="font-display text-2xl text-ink">More from this pantry</h2>
          <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

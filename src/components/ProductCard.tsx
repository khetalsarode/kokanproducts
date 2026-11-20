"use client";

import Link from "next/link";
import type { Product } from "@/types";
import { formatINR, discountPercent } from "@/lib/format";
import { ProductArt } from "./ProductArt";
import { Stars } from "./Stars";
import { useAuth } from "@/context/AuthContext";
import { useShop } from "@/context/ShopContext";

export function ProductCard({ product }: { product: Product }) {
  const { customer } = useAuth();
  const { addToCart, toggleWishlist, isWishlisted } = useShop();
  const off = discountPercent(product.price, product.mrp);
  const wish = isWishlisted(product.id);
  const isStaff = customer?.role === "admin" || customer?.role === "seller";

  return (
    <article className="group relative flex flex-col">
      <Link href={`/products/${product.slug}`} className="block overflow-hidden rounded-sm">
        <div className="relative overflow-hidden rounded-sm transition-transform duration-500 group-hover:scale-[1.02]">
          <ProductArt product={product} size="md" />
          {product.tags.includes("bestseller") && (
            <span className="absolute left-2 top-2 bg-sea/90 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-foam">
              Bestseller
            </span>
          )}
          {off > 0 && (
            <span className="absolute bottom-2 left-2 bg-spice px-2 py-0.5 text-[10px] font-semibold text-white">
              {off}% off
            </span>
          )}
        </div>
      </Link>
      {!isStaff && (
        <button
          type="button"
          onClick={() => toggleWishlist(product.id)}
          className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/85 text-sm text-sea shadow-sm backdrop-blur transition hover:bg-white"
          aria-label={wish ? "Remove from wishlist" : "Add to wishlist"}
        >
          {wish ? "♥" : "♡"}
        </button>
      )}
      <div className="mt-3 flex flex-1 flex-col gap-1">
        <p className="text-[10px] uppercase tracking-[0.18em] text-lagoon">
          {product.category}
        </p>
        <Link href={`/products/${product.slug}`} className="font-display text-lg leading-snug text-ink hover:text-sea">
          {product.name}
        </Link>
        <div className="flex items-center gap-2">
          <Stars rating={product.rating} />
          <span className="text-xs text-ink/50">({product.reviewCount})</span>
        </div>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div>
            <p className="font-semibold text-ink">{formatINR(product.price)}</p>
            {off > 0 && (
              <p className="text-xs text-ink/40 line-through">{formatINR(product.mrp)}</p>
            )}
          </div>
          {!isStaff && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                addToCart(product.id);
              }}
              disabled={product.stock <= 0}
              data-testid={`add-${product.id}`}
              className="btn-primary relative z-10 !px-3 !py-2 text-xs disabled:opacity-40"
            >
              {product.stock <= 0 ? "Sold out" : "Add"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

"use client";

import Image from "next/image";
import { useState, type CSSProperties } from "react";
import type { Product } from "@/types";

const glyphs: Record<string, string> = {
  kokum: "◎",
  mango: "◆",
  coconut: "●",
  spices: "✦",
  seafood: "∿",
  sweets: "✧",
  rice: "☰",
  pickles: "◈",
};

export function ProductArt({
  product,
  size = "md",
  className = "",
  imageIndex = 0,
  priority = false,
}: {
  product: Product;
  size?: "sm" | "md" | "lg" | "hero";
  className?: string;
  imageIndex?: number;
  priority?: boolean;
}) {
  const dims = {
    sm: "h-20 w-20",
    md: "h-44 w-full",
    lg: "h-72 w-full",
    hero: "min-h-[28rem] w-full",
  }[size];

  const src = product.images[imageIndex] ?? product.images[0];
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      <div
        className={`product-art relative overflow-hidden bg-mist/40 ${dims} ${className}`}
        style={{ "--accent": product.accent } as CSSProperties}
      >
        <Image
          src={src}
          alt={product.name}
          fill
          sizes={
            size === "sm"
              ? "80px"
              : size === "lg" || size === "hero"
                ? "(max-width: 1024px) 100vw, 50vw"
                : "(max-width: 768px) 50vw, 25vw"
          }
          className="object-cover transition duration-500 group-hover:scale-[1.03]"
          priority={priority}
          onError={() => setFailed(true)}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            background: `linear-gradient(160deg, transparent 40%, color-mix(in srgb, ${product.accent} 55%, transparent))`,
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={`product-art relative overflow-hidden ${dims} ${className}`}
      style={{ "--accent": product.accent } as CSSProperties}
      aria-hidden
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,color-mix(in_srgb,var(--accent)_55%,white),transparent_55%),radial-gradient(ellipse_at_80%_80%,color-mix(in_srgb,var(--accent)_35%,#0c4a46),transparent_50%),linear-gradient(160deg,#0a3d3a_0%,color-mix(in_srgb,var(--accent)_40%,#163d38)_45%,#1a2f2c_100%)]" />
      <div className="wave-overlay absolute inset-0 opacity-40" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
        <span className="font-display text-4xl text-white/90 drop-shadow-md sm:text-5xl">
          {glyphs[product.category] ?? "◎"}
        </span>
        <span className="max-w-[12ch] font-display text-sm tracking-wide text-white/85 sm:text-base">
          {product.shortName}
        </span>
        <span className="text-[10px] uppercase tracking-[0.2em] text-white/55">
          {product.weight}
        </span>
      </div>
    </div>
  );
}

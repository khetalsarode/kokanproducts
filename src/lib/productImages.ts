import type { Category } from "@/types";

export function productImages(slug: string): string[] {
  return [`/products/${slug}.jpg`, `/products/${slug}-2.jpg`];
}

export function categoryImage(category: Category): string {
  return `/sections/category-${category}.jpg`;
}

export const sectionImages = {
  hero: "/sections/hero-coast.jpg",
  market: "/sections/hero-market.jpg",
  why: "/sections/why-konkan.jpg",
  farm: "/sections/trust-farm.jpg",
} as const;

import { products as seedProducts } from "@/data/products";
import { sql } from "@/lib/db";
import { ensureSeeded } from "@/lib/seed";
import type { Category, Fulfillment, Product } from "@/types";

type CatalogRow = {
  id: string;
  slug: string;
  name: string;
  short_name: string;
  category: string;
  description: string;
  price: number;
  mrp: number;
  unit: string;
  weight: string;
  stock: number;
  seller_user_id: string | null;
  fulfillment: string;
  rating: number | string;
  review_count: number;
  tags: string;
  accent: string;
  image_url: string;
  image_url_2: string;
  fssai: boolean;
  active: boolean;
};

export function mapCatalogRow(row: CatalogRow): Product {
  const images = [row.image_url, row.image_url_2].filter(Boolean);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    shortName: row.short_name,
    category: row.category as Category,
    description: row.description,
    price: Number(row.price),
    mrp: Number(row.mrp),
    unit: row.unit,
    weight: row.weight,
    stock: Number(row.stock),
    sellerId: row.seller_user_id || "kp-internal",
    fulfillment: (row.fulfillment as Fulfillment) || "internal",
    rating: Number(row.rating),
    reviewCount: Number(row.review_count),
    tags: row.tags ? row.tags.split(",").filter(Boolean) : [],
    accent: row.accent,
    imageHint: row.short_name,
    images: images.length ? images : [`/products/${row.slug}.jpg`],
    fssai: Boolean(row.fssai),
    reviews: [],
  };
}

export async function listCatalogProducts(opts?: {
  sellerUserId?: string;
  includeInactive?: boolean;
}): Promise<Product[]> {
  await ensureSeeded();
  const params: unknown[] = [];
  const where: string[] = [];
  if (!opts?.includeInactive) where.push(`active = true`);
  if (opts?.sellerUserId) {
    params.push(opts.sellerUserId);
    where.push(`seller_user_id = $${params.length}`);
  }
  const clause = where.length ? `where ${where.join(" and ")}` : "";
  const rows = await sql<CatalogRow>(
    `select * from catalog_products ${clause} order by name asc`,
    params,
  );
  if (rows.length === 0) return seedProducts;
  return rows.map(mapCatalogRow);
}

export async function getCatalogProduct(
  idOrSlug: string,
): Promise<Product | undefined> {
  await ensureSeeded();
  const rows = await sql<CatalogRow>(
    `select * from catalog_products where id = $1 or slug = $1 limit 1`,
    [idOrSlug],
  );
  if (rows[0]) return mapCatalogRow(rows[0]);
  return seedProducts.find((p) => p.id === idOrSlug || p.slug === idOrSlug);
}

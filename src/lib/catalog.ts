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
  warehouse_stock?: number | null;
  warehouse_location?: string | null;
  shelf_life_days?: number | null;
  manufactured_on?: Date | string | null;
  best_before?: Date | string | null;
  batch_number?: string | null;
  storage_instructions?: string | null;
  temperature_zone?: string | null;
  packaging_type?: string | null;
  ingredients?: string | null;
  allergens?: string | null;
  fssai_license?: string | null;
};

function dateOnly(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

export function mapCatalogRow(row: CatalogRow): Product {
  const images = [row.image_url, row.image_url_2].filter(Boolean);
  const zoneRaw = String(row.temperature_zone || "ambient");
  const temperatureZone =
    zoneRaw === "chilled" || zoneRaw === "frozen" ? zoneRaw : "ambient";
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
    warehouseStock: Number(row.warehouse_stock ?? row.stock ?? 0),
    warehouseLocation: row.warehouse_location || "",
    shelfLifeDays: Number(row.shelf_life_days ?? 0),
    manufacturedOn: dateOnly(row.manufactured_on),
    bestBefore: dateOnly(row.best_before),
    batchNumber: row.batch_number || "",
    storageInstructions: row.storage_instructions || "",
    temperatureZone,
    packagingType: row.packaging_type || "",
    ingredients: row.ingredients || "",
    allergens: row.allergens || "",
    fssaiLicense: row.fssai_license || "",
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
  return rows.map(mapCatalogRow);
}

export async function getCatalogProduct(
  idOrSlug: string,
): Promise<Product | undefined> {
  await ensureSeeded();
  const rows = await sql<CatalogRow>(
    `select * from catalog_products where (id = $1 or slug = $1) and active = true limit 1`,
    [idOrSlug],
  );
  return rows[0] ? mapCatalogRow(rows[0]) : undefined;
}

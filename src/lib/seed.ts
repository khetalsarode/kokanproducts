import { products } from "@/data/products";
import { newId, type UserRole } from "@/lib/auth";
import { sql } from "@/lib/db";
import { hashPassword } from "@/lib/password";

let seeding: Promise<void> | null = null;

async function ensureUserFromEnv(input: {
  emailEnv: string;
  passwordEnv: string;
  name: string;
  phone: string;
  role: UserRole;
  shop?: { name: string; location: string; bio?: string };
}) {
  const email = process.env[input.emailEnv]?.trim().toLowerCase() ?? "";
  const password = process.env[input.passwordEnv] ?? "";
  if (!email || !password) return;
  if (password.length < 8) {
    console.error(`seed: ${input.passwordEnv} too short; skipped`);
    return;
  }

  const rows = await sql<{ id: string }>(
    `select id from customers where lower(email) = lower($1) limit 1`,
    [email],
  );
  let id = rows[0]?.id;
  if (!id) {
    id = newId();
    await sql(
      `insert into customers (id, email, password_hash, name, phone, role, status)
       values ($1,$2,$3,$4,$5,$6,'active')`,
      [id, email, await hashPassword(password), input.name, input.phone, input.role],
    );
  } else {
    await sql(`update customers set role = $1 where id = $2`, [input.role, id]);
  }
  if (input.shop) {
    await sql(
      `insert into seller_profiles (user_id, shop_name, location, bio, approved)
       values ($1,$2,$3,$4,true)
       on conflict (user_id) do update set
         shop_name = excluded.shop_name,
         location = excluded.location,
         approved = true`,
      [id, input.shop.name, input.shop.location, input.shop.bio || ""],
    );
  }
}

async function ensureCatalog() {
  const count = await sql<{ n: string | number }>(
    `select count(*)::int as n from catalog_products`,
  );
  const n = Number(count[0]?.n ?? 0);
  if (n > 0) return;
  for (const p of products) {
    await sql(
      `insert into catalog_products (
        id, slug, name, short_name, category, description, price, mrp, unit, weight,
        stock, fulfillment, rating, review_count, tags, accent, image_url, image_url_2, fssai, active
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,true
      )
      on conflict (id) do nothing`,
      [
        p.id,
        p.slug,
        p.name,
        p.shortName,
        p.category,
        p.description,
        p.price,
        p.mrp,
        p.unit,
        p.weight,
        p.stock,
        p.fulfillment,
        p.rating,
        p.reviewCount,
        p.tags.join(","),
        p.accent,
        p.images[0] || "",
        p.images[1] || "",
        p.fssai,
      ],
    );
  }
}

async function runSeed() {
  try {
    // Role accounts only when the platform/operator supplies secrets — never hardcoded.
    await ensureUserFromEnv({
      emailEnv: "SEED_ADMIN_EMAIL",
      passwordEnv: "SEED_ADMIN_PASSWORD",
      name: "Kokan Admin",
      phone: "",
      role: "admin",
    });
    await ensureUserFromEnv({
      emailEnv: "SEED_SELLER_EMAIL",
      passwordEnv: "SEED_SELLER_PASSWORD",
      name: "Seeded Seller",
      phone: "",
      role: "seller",
      shop: {
        name: process.env.SEED_SELLER_SHOP?.trim() || "Konkan Seller",
        location: process.env.SEED_SELLER_LOCATION?.trim() || "Konkan",
      },
    });
    await ensureCatalog();
  } catch (error) {
    console.error("seed failed", error instanceof Error ? error.message : "unknown");
  }
}

/** Idempotent catalog seed; optional admin/seller only via SEED_* env vars. */
export function ensureSeeded(): Promise<void> {
  seeding ??= runSeed().finally(() => {
    /* keep resolved promise cached */
  });
  return seeding;
}

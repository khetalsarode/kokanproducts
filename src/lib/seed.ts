import { products } from "@/data/products";
import { newId, type UserRole } from "@/lib/auth";
import { sql } from "@/lib/db";
import { hashPassword } from "@/lib/password";

let seeding: Promise<void> | null = null;

/** Emails reserved for SEED_* provisioning — registration must not claim them. */
export function reservedSeedEmails(): Set<string> {
  const emails = [
    process.env.SEED_ADMIN_EMAIL,
    process.env.SEED_SELLER_EMAIL,
    process.env.SEED_CUSTOMER_EMAIL,
  ]
    .map((v) => v?.trim().toLowerCase() ?? "")
    .filter(Boolean);
  return new Set(emails);
}

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

  const passwordHash = await hashPassword(password);
  const rows = await sql<{ id: string; role: string }>(
    `select id, role from customers where lower(email) = lower($1) limit 1`,
    [email],
  );
  let id = rows[0]?.id;

  if (!id) {
    id = newId();
    await sql(
      `insert into customers (id, email, password_hash, name, phone, role, status)
       values ($1,$2,$3,$4,$5,$6,'active')`,
      [id, email, passwordHash, input.name, input.phone, input.role],
    );
  } else {
    // Always overwrite password_hash when promoting — never leave a
    // self-registered password in place for a seeded privileged role.
    await sql(
      `update customers
       set role = $1,
           password_hash = $2,
           name = $3,
           phone = coalesce(nullif($4, ''), phone),
           status = 'active',
           updated_at = now()
       where id = $5`,
      [input.role, passwordHash, input.name, input.phone, id],
    );
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
      phone: "9999900001",
      role: "admin",
    });
    await ensureUserFromEnv({
      emailEnv: "SEED_SELLER_EMAIL",
      passwordEnv: "SEED_SELLER_PASSWORD",
      name: "Konkan Seller",
      phone: "9999900002",
      role: "seller",
      shop: {
        name: process.env.SEED_SELLER_SHOP?.trim() || "Konkan Seller Shop",
        location: process.env.SEED_SELLER_LOCATION?.trim() || "Konkan, Maharashtra",
      },
    });
    await ensureUserFromEnv({
      emailEnv: "SEED_CUSTOMER_EMAIL",
      passwordEnv: "SEED_CUSTOMER_PASSWORD",
      name: "Demo Customer",
      phone: "9999900003",
      role: "customer",
    });
    await ensureCatalog();
  } catch (error) {
    console.error("seed failed", error instanceof Error ? error.message : "unknown");
  }
}

/** Idempotent catalog seed; optional role accounts only via SEED_* env vars. */
export function ensureSeeded(): Promise<void> {
  seeding ??= runSeed().finally(() => {
    /* keep resolved promise cached */
  });
  return seeding;
}

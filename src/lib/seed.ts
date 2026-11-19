import { products } from "@/data/products";
import { newId, type UserRole } from "@/lib/auth";
import { DEMO_ADMIN, DEMO_SELLER } from "@/lib/demoCredentials";
import { sql } from "@/lib/db";
import { hashPassword } from "@/lib/password";

let catalogDone = false;
/** Re-run role seed when demo / SEED_* fingerprint changes. */
let lastRoleFingerprint = "";
let roleSeedInFlight: Promise<void> | null = null;

/** Emails reserved for provisioning — registration must not claim them. */
export function reservedSeedEmails(): Set<string> {
  return new Set([DEMO_ADMIN.email, DEMO_SELLER.email]);
}

function roleSeedFingerprint(): string {
  return [
    DEMO_ADMIN.email,
    DEMO_ADMIN.password,
    DEMO_SELLER.email,
    DEMO_SELLER.password,
    DEMO_SELLER.shopName,
    DEMO_SELLER.location,
  ].join("\0");
}

export function matchesSeedAdminCredentials(email: string, password: string): boolean {
  return (
    email.trim().toLowerCase() === DEMO_ADMIN.email &&
    password === DEMO_ADMIN.password
  );
}

export function matchesSeedSellerCredentials(email: string, password: string): boolean {
  return (
    email.trim().toLowerCase() === DEMO_SELLER.email &&
    password === DEMO_SELLER.password
  );
}

export function seedAdminConfigured(): boolean {
  return DEMO_ADMIN.password.length >= 8;
}

export function demoAdminEmail(): string {
  return DEMO_ADMIN.email;
}

async function upsertDemoRole(input: {
  email: string;
  password: string;
  name: string;
  phone: string;
  role: Extract<UserRole, "admin" | "seller">;
  shop?: { name: string; location: string; bio?: string };
  /** When true, demote every other account still holding this role. */
  exclusiveRole?: boolean;
}) {
  const email = input.email.trim().toLowerCase();
  const passwordHash = await hashPassword(input.password);

  const byEmail = await sql<{ id: string; role: string }>(
    `select id, role from customers where lower(email) = lower($1) limit 1`,
    [email],
  );
  const byRole = await sql<{ id: string; email: string }>(
    `select id, email from customers where role = $1 order by created_at asc`,
    [input.role],
  );

  let id = byEmail[0]?.id;

  if (!id && byRole[0]) {
    // Reset the oldest existing account for this role onto the new credentials.
    id = byRole[0].id;
    await sql(
      `update customers
       set email = $1,
           password_hash = $2,
           name = $3,
           phone = $4,
           role = $5,
           status = 'active',
           updated_at = now()
       where id = $6`,
      [email, passwordHash, input.name, input.phone, input.role, id],
    );
  } else if (!id) {
    id = newId();
    await sql(
      `insert into customers (id, email, password_hash, name, phone, role, status)
       values ($1,$2,$3,$4,$5,$6,'active')`,
      [id, email, passwordHash, input.name, input.phone, input.role],
    );
  } else {
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

  if (input.exclusiveRole) {
    await sql(
      `update customers
       set role = 'customer', updated_at = now()
       where role = $1 and id <> $2`,
      [input.role, id],
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
  if (catalogDone) return;
  const count = await sql<{ n: string | number }>(
    `select count(*)::int as n from catalog_products`,
  );
  const n = Number(count[0]?.n ?? 0);
  if (n > 0) {
    catalogDone = true;
    return;
  }
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
  catalogDone = true;
}

async function ensureRoleAccounts(force = false) {
  const fingerprint = roleSeedFingerprint();
  if (!force && fingerprint === lastRoleFingerprint) return;
  if (roleSeedInFlight) {
    await roleSeedInFlight;
    if (!force) return;
  }

  roleSeedInFlight = (async () => {
    try {
      await upsertDemoRole({
        email: DEMO_ADMIN.email,
        password: DEMO_ADMIN.password,
        name: DEMO_ADMIN.name,
        phone: DEMO_ADMIN.phone,
        role: "admin",
        exclusiveRole: true,
      });
      await upsertDemoRole({
        email: DEMO_SELLER.email,
        password: DEMO_SELLER.password,
        name: DEMO_SELLER.name,
        phone: DEMO_SELLER.phone,
        role: "seller",
        shop: {
          name: DEMO_SELLER.shopName,
          location: DEMO_SELLER.location,
        },
      });
      lastRoleFingerprint = fingerprint;
    } finally {
      roleSeedInFlight = null;
    }
  })();

  await roleSeedInFlight;
}

/** Force recreate/update seeded role accounts from built-in demo credentials. */
export async function forceReseedRoleAccounts(): Promise<void> {
  lastRoleFingerprint = "";
  await ensureRoleAccounts(true);
}

/**
 * Idempotent catalog seed; role accounts sync whenever demo credentials change.
 */
export async function ensureSeeded(): Promise<void> {
  try {
    await ensureRoleAccounts();
    await ensureCatalog();
  } catch (error) {
    console.error("seed failed", error instanceof Error ? error.message : "unknown");
  }
}

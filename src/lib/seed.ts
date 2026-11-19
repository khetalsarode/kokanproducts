import { products } from "@/data/products";
import { newId, type UserRole } from "@/lib/auth";
import { sql } from "@/lib/db";
import { hashPassword } from "@/lib/password";

let seeding: Promise<void> | null = null;

async function ensureUser(input: {
  email: string;
  name: string;
  phone: string;
  role: UserRole;
  password: string;
  shop?: { name: string; location: string; bio?: string };
}) {
  const rows = await sql<{ id: string }>(
    `select id from customers where lower(email) = lower($1) limit 1`,
    [input.email],
  );
  let id = rows[0]?.id;
  if (!id) {
    id = newId();
    await sql(
      `insert into customers (id, email, password_hash, name, phone, role, status)
       values ($1,$2,$3,$4,$5,$6,'active')`,
      [
        id,
        input.email.toLowerCase(),
        await hashPassword(input.password),
        input.name,
        input.phone,
        input.role,
      ],
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
    await ensureUser({
      email: "admin@kokanproducts.com",
      name: "Kokan Admin",
      phone: "9999990001",
      role: "admin",
      password: "Admin@Kokan1",
    });
    await ensureUser({
      email: "seller@kokanproducts.com",
      name: "Devgad Orchards",
      phone: "9999990002",
      role: "seller",
      password: "Seller@Kokan1",
      shop: {
        name: "Devgad Orchards",
        location: "Devgad, Maharashtra",
        bio: "Hapus & coastal pantry",
      },
    });
    await ensureCatalog();
  } catch (error) {
    console.error("seed failed", error instanceof Error ? error.message : "unknown");
  }
}

/** Idempotent demo seed — admin, seller, catalog rows. */
export function ensureSeeded(): Promise<void> {
  seeding ??= runSeed().finally(() => {
    /* keep resolved promise cached */
  });
  return seeding;
}

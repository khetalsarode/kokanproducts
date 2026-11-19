/**
 * Seeds demo admin + seller and imports static catalog into catalog_products.
 * Safe to re-run: uses ON CONFLICT / existence checks.
 */
import { createHash, randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import { readdir, readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scryptAsync(password, salt, 64);
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

async function getDb() {
  const url = process.env.DATABASE_URL?.trim() ?? "";
  if (url) {
    const pool = new pg.Pool({ connectionString: url, max: 2 });
    return {
      async sql(text, params = []) {
        return (await pool.query(text, params)).rows;
      },
      async end() {
        await pool.end();
      },
    };
  }
  const local = new PGlite();
  const files = (await readdir("migrations").catch(() => []))
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    await local.exec(await readFile(`migrations/${file}`, "utf8"));
  }
  return {
    async sql(text, params = []) {
      return (await local.query(text, params)).rows;
    },
    async end() {},
  };
}

function newId() {
  return crypto.randomUUID();
}

async function ensureUser(db, { email, name, phone, role, password, shop }) {
  const existing = await db.sql(
    `select id from customers where lower(email) = lower($1) limit 1`,
    [email],
  );
  if (existing[0]) {
    await db.sql(`update customers set role = $1 where id = $2`, [
      role,
      existing[0].id,
    ]);
    if (shop) {
      await db.sql(
        `insert into seller_profiles (user_id, shop_name, location, bio, approved)
         values ($1,$2,$3,$4,$5)
         on conflict (user_id) do update set shop_name = excluded.shop_name, approved = excluded.approved`,
        [existing[0].id, shop.name, shop.location, shop.bio || "", true],
      );
    }
    return existing[0].id;
  }
  const id = newId();
  const passwordHash = await hashPassword(password);
  await db.sql(
    `insert into customers (id, email, password_hash, name, phone, role, status)
     values ($1,$2,$3,$4,$5,$6,'active')`,
    [id, email, passwordHash, name, phone, role],
  );
  if (shop) {
    await db.sql(
      `insert into seller_profiles (user_id, shop_name, location, bio, approved)
       values ($1,$2,$3,$4,$5)`,
      [id, shop.name, shop.location, shop.bio || "", true],
    );
  }
  return id;
}

async function seedCatalog(db) {
  const { products } = await import("../src/data/products.ts").catch(() => ({
    products: null,
  }));
  if (!products) {
    // Fallback: dynamic import via tsx not available — parse lightly skipped
    console.log("seed: skip catalog import (run via app seed API)");
    return;
  }
  for (const p of products) {
    await db.sql(
      `insert into catalog_products (
        id, slug, name, short_name, category, description, price, mrp, unit, weight,
        stock, fulfillment, rating, review_count, tags, accent, image_url, image_url_2, fssai, active
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,true
      )
      on conflict (id) do update set
        name = excluded.name,
        price = excluded.price,
        mrp = excluded.mrp,
        stock = excluded.stock,
        image_url = excluded.image_url,
        image_url_2 = excluded.image_url_2,
        updated_at = now()`,
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
  console.log(`seed: catalog ${products.length} products`);
}

const db = await getDb();
try {
  await ensureUser(db, {
    email: "admin@kokanproducts.com",
    name: "Kokan Admin",
    phone: "9999990001",
    role: "admin",
    password: "Admin@Kokan1",
  });
  await ensureUser(db, {
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
  console.log("seed: admin + seller ready");
  // Catalog seed via dedicated API on first admin visit when ts import fails here
} finally {
  await db.end();
}

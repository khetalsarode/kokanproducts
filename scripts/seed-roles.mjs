/**
 * Optional role seed for production/staging when SEED_* env vars are set.
 * Never embeds passwords. Skips entirely when vars are absent.
 *
 * SEED_ADMIN_EMAIL + SEED_ADMIN_PASSWORD
 * SEED_SELLER_EMAIL + SEED_SELLER_PASSWORD (optional)
 * SEED_CUSTOMER_EMAIL + SEED_CUSTOMER_PASSWORD (optional)
 * SEED_SELLER_SHOP / SEED_SELLER_LOCATION (optional)
 */
import { randomBytes, scrypt } from "node:crypto";
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
  const passwordHash = await hashPassword(password);
  const existing = await db.sql(
    `select id from customers where lower(email) = lower($1) limit 1`,
    [email],
  );
  if (existing[0]) {
    // Always overwrite password when promoting a seed role — never keep a
    // self-registered password for admin/seller emails.
    await db.sql(
      `update customers
       set role = $1, password_hash = $2, name = $3, status = 'active'
       where id = $4`,
      [role, passwordHash, name, existing[0].id],
    );
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
  await db.sql(
    `insert into customers (id, email, password_hash, name, phone, role, status)
     values ($1,$2,$3,$4,$5,$6,'active')`,
    [id, email, passwordHash, name, phone, role],
  );
  if (shop) {
    await db.sql(
      `insert into seller_profiles (user_id, shop_name, location, bio, approved)
       values ($1,$2,$3,$4,true)`,
      [id, shop.name, shop.location, shop.bio || ""],
    );
  }
  return id;
}

const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase() ?? "";
const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "";
const sellerEmail = process.env.SEED_SELLER_EMAIL?.trim().toLowerCase() ?? "";
const sellerPassword = process.env.SEED_SELLER_PASSWORD ?? "";
const customerEmail = process.env.SEED_CUSTOMER_EMAIL?.trim().toLowerCase() ?? "";
const customerPassword = process.env.SEED_CUSTOMER_PASSWORD ?? "";

if (!adminEmail && !sellerEmail && !customerEmail) {
  console.log(
    "seed-roles: skipped (set SEED_ADMIN_*, SEED_SELLER_*, and/or SEED_CUSTOMER_* to provision)",
  );
  process.exit(0);
}

const db = await getDb();
try {
  if (adminEmail && adminPassword.length >= 8) {
    await ensureUser(db, {
      email: adminEmail,
      name: "Kokan Admin",
      phone: "",
      role: "admin",
      password: adminPassword,
    });
    console.log("seed-roles: admin provisioned from env");
  } else if (adminEmail || adminPassword) {
    console.log("seed-roles: admin skipped (need both email and password ≥8 chars)");
  }

  if (sellerEmail && sellerPassword.length >= 8) {
    await ensureUser(db, {
      email: sellerEmail,
      name: "Seeded Seller",
      phone: "",
      role: "seller",
      password: sellerPassword,
      shop: {
        name: process.env.SEED_SELLER_SHOP?.trim() || "Konkan Seller",
        location: process.env.SEED_SELLER_LOCATION?.trim() || "Konkan",
      },
    });
    console.log("seed-roles: seller provisioned from env");
  } else if (sellerEmail || sellerPassword) {
    console.log("seed-roles: seller skipped (need both email and password ≥8 chars)");
  }

  if (customerEmail && customerPassword.length >= 8) {
    await ensureUser(db, {
      email: customerEmail,
      name: "Demo Customer",
      phone: "9999900003",
      role: "customer",
      password: customerPassword,
    });
    console.log("seed-roles: customer provisioned from env");
  } else if (customerEmail || customerPassword) {
    console.log("seed-roles: customer skipped (need both email and password ≥8 chars)");
  }
} finally {
  await db.end();
}

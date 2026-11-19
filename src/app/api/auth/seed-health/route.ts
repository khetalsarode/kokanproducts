import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensureSeeded, seedAdminConfigured } from "@/lib/seed";

export const dynamic = "force-dynamic";

/**
 * Public, non-sensitive health: whether SEED_* role secrets are present and
 * whether matching customer rows exist. Never returns emails or passwords.
 */
export async function GET() {
  await ensureSeeded();

  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase() ?? "";
  const sellerEmail = process.env.SEED_SELLER_EMAIL?.trim().toLowerCase() ?? "";
  const adminPasswordOk = (process.env.SEED_ADMIN_PASSWORD?.length ?? 0) >= 8;
  const sellerPasswordOk = (process.env.SEED_SELLER_PASSWORD?.length ?? 0) >= 8;

  let adminUserReady = false;
  let sellerUserReady = false;
  let adminRole: string | null = null;
  let sellerRole: string | null = null;

  if (adminEmail) {
    const rows = await sql<{ role: string }>(
      `select role from customers where lower(email) = lower($1) limit 1`,
      [adminEmail],
    );
    if (rows[0]) {
      adminUserReady = true;
      adminRole = rows[0].role;
    }
  }
  if (sellerEmail) {
    const rows = await sql<{ role: string }>(
      `select role from customers where lower(email) = lower($1) limit 1`,
      [sellerEmail],
    );
    if (rows[0]) {
      sellerUserReady = true;
      sellerRole = rows[0].role;
    }
  }

  return NextResponse.json(
    {
      adminSecretPresent: seedAdminConfigured(),
      sellerSecretPresent: Boolean(sellerEmail && sellerPasswordOk),
      adminUserReady,
      sellerUserReady,
      adminRole,
      sellerRole,
      adminPasswordOk,
      sellerPasswordOk,
    },
    { headers: { "cache-control": "private, no-store" } },
  );
}

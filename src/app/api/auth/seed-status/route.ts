import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { ensureSeeded, seedAdminConfigured } from "@/lib/seed";

export const dynamic = "force-dynamic";

/** Admin-only diagnostics: whether admin seed env is present and if that user row exists. */
export async function GET() {
  await ensureSeeded();
  const user = await requireUser(["admin"]);
  if (user instanceof NextResponse) return user;

  const configured = seedAdminConfigured();
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase() ?? "";
  let adminPresent = false;
  let adminRole: string | null = null;
  if (email) {
    const rows = await sql<{ role: string }>(
      `select role from customers where lower(email) = lower($1) limit 1`,
      [email],
    );
    if (rows[0]) {
      adminPresent = true;
      adminRole = rows[0].role;
    }
  }
  return NextResponse.json(
    {
      adminSeedConfigured: configured,
      adminUserPresent: adminPresent,
      adminRole,
    },
    { headers: { "cache-control": "private, no-store" } },
  );
}

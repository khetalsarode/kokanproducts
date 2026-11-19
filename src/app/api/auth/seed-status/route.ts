import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { ensureSeeded, seedAdminConfigured, seedAdminEmail } from "@/lib/seed";

export const dynamic = "force-dynamic";

/** Admin-only diagnostics: whether SEED_ADMIN_* is set and if that user row exists. */
export async function GET() {
  await ensureSeeded();
  const user = await requireUser(["admin"]);
  if (user instanceof NextResponse) return user;

  const configured = seedAdminConfigured();
  const email = seedAdminEmail();
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

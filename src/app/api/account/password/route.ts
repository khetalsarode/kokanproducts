import { NextResponse } from "next/server";
import { getCustomerByEmail, getRequestCustomer } from "@/lib/auth";
import { sql } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const customer = await getRequestCustomer();
  if (!customer) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const body = (await request.json()) as {
    currentPassword?: string;
    newPassword?: string;
  };
  const currentPassword = body.currentPassword ?? "";
  const newPassword = body.newPassword ?? "";
  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "New password must be at least 8 characters." },
      { status: 400 },
    );
  }

  const full = await getCustomerByEmail(customer.email);
  if (!full || !(await verifyPassword(currentPassword, full.passwordHash))) {
    return NextResponse.json(
      { error: "Current password is incorrect." },
      { status: 400 },
    );
  }

  const passwordHash = await hashPassword(newPassword);
  await sql(
    `update customers set password_hash = $1, updated_at = now() where id = $2`,
    [passwordHash, customer.id],
  );

  return NextResponse.json(
    { ok: true },
    { headers: { "cache-control": "private, no-store" } },
  );
}

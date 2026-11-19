import { NextResponse } from "next/server";
import { getRequestCustomer } from "@/lib/auth";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  const customer = await getRequestCustomer();
  if (!customer) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const body = (await request.json()) as { name?: string; phone?: string };
  const name = (body.name ?? customer.name).trim();
  const phone = (body.phone ?? customer.phone).trim();
  if (name.length < 2) {
    return NextResponse.json({ error: "Enter your full name." }, { status: 400 });
  }

  await sql(
    `update customers set name = $1, phone = $2, updated_at = now() where id = $3`,
    [name, phone, customer.id],
  );

  return NextResponse.json(
    { customer: { ...customer, name, phone } },
    { headers: { "cache-control": "private, no-store" } },
  );
}

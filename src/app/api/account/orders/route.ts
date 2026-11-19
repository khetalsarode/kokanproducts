import { NextResponse } from "next/server";
import { getRequestCustomer } from "@/lib/auth";
import { sql } from "@/lib/db";
import type { Order } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const customer = await getRequestCustomer();
  if (!customer) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const rows = await sql<{ payload: Order | string }>(
    `select payload from customer_orders
     where customer_id = $1
     order by created_at desc`,
    [customer.id],
  );
  const orders = rows.map((r) =>
    typeof r.payload === "string" ? (JSON.parse(r.payload) as Order) : r.payload,
  );
  return NextResponse.json(
    { orders },
    { headers: { "cache-control": "private, no-store" } },
  );
}

export async function POST(request: Request) {
  const customer = await getRequestCustomer();
  if (!customer) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const body = (await request.json()) as { order?: Order };
  if (!body.order?.id) {
    return NextResponse.json({ error: "Missing order." }, { status: 400 });
  }
  await sql(
    `insert into customer_orders (id, customer_id, payload)
     values ($1, $2, $3::jsonb)
     on conflict (id) do update set payload = excluded.payload`,
    [body.order.id, customer.id, JSON.stringify(body.order)],
  );
  return NextResponse.json(
    { ok: true },
    { headers: { "cache-control": "private, no-store" } },
  );
}

export async function PATCH(request: Request) {
  const customer = await getRequestCustomer();
  if (!customer) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const body = (await request.json()) as { order?: Order };
  if (!body.order?.id) {
    return NextResponse.json({ error: "Missing order." }, { status: 400 });
  }
  await sql(
    `update customer_orders set payload = $1::jsonb
     where id = $2 and customer_id = $3`,
    [JSON.stringify(body.order), body.order.id, customer.id],
  );
  return NextResponse.json(
    { ok: true },
    { headers: { "cache-control": "private, no-store" } },
  );
}

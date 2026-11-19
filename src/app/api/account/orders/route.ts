import { NextResponse } from "next/server";
import { getRequestCustomer } from "@/lib/auth";
import { getShopOrder, mapShopOrder, type ShopOrderRow } from "@/lib/orders";
import { sql } from "@/lib/db";
import type { Order } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const customer = await getRequestCustomer();
  if (!customer) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  // Prefer authoritative shop_orders; fall back to customer_orders payload.
  const shopRows = await sql<ShopOrderRow>(
    `select * from shop_orders
     where customer_id = $1
     order by created_at desc
     limit 100`,
    [customer.id],
  );

  if (shopRows.length > 0) {
    return NextResponse.json(
      { orders: shopRows.map(mapShopOrder) },
      { headers: { "cache-control": "private, no-store" } },
    );
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

/** Client may only refresh a payload that already belongs to them from shop_orders. */
export async function POST() {
  return NextResponse.json(
    { error: "Orders are created through checkout only." },
    { status: 405 },
  );
}

export async function PATCH(request: Request) {
  const customer = await getRequestCustomer();
  if (!customer) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const body = (await request.json()) as { orderId?: string };
  if (!body.orderId) {
    return NextResponse.json({ error: "Missing orderId." }, { status: 400 });
  }
  const shop = await getShopOrder(body.orderId);
  if (!shop || shop.customerId !== customer.id) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }
  await sql(
    `insert into customer_orders (id, customer_id, payload)
     values ($1, $2, $3::jsonb)
     on conflict (id) do update set payload = excluded.payload
     where customer_orders.customer_id = $2`,
    [shop.id, customer.id, JSON.stringify(shop)],
  );
  return NextResponse.json(
    { ok: true, order: shop },
    { headers: { "cache-control": "private, no-store" } },
  );
}

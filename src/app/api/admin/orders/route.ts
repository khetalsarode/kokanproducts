import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { ensureSeeded } from "@/lib/seed";
import type { Order, OrderStatus } from "@/types";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  customer_id: string | null;
  status: string;
  payment_method: string;
  payment_status: string;
  subtotal: number;
  discount: number;
  delivery_fee: number;
  total: number;
  coupon_code: string | null;
  tracking_id: string;
  courier: string;
  estimated_delivery: Date | string | null;
  address_json: unknown;
  items_json: unknown;
  created_at: Date | string;
};

function mapOrder(row: Row): Order & { paymentStatus: string; customerId: string | null } {
  const address =
    typeof row.address_json === "string"
      ? JSON.parse(row.address_json)
      : row.address_json;
  const items =
    typeof row.items_json === "string" ? JSON.parse(row.items_json) : row.items_json;
  return {
    id: row.id,
    customerId: row.customer_id,
    createdAt:
      typeof row.created_at === "string" ? row.created_at : row.created_at.toISOString(),
    status: row.status as OrderStatus,
    items,
    address,
    paymentMethod: row.payment_method === "cod" ? "cod" : "upi",
    paymentStatus: row.payment_status,
    subtotal: Number(row.subtotal),
    discount: Number(row.discount),
    deliveryFee: Number(row.delivery_fee),
    total: Number(row.total),
    couponCode: row.coupon_code || undefined,
    trackingId: row.tracking_id,
    courier: row.courier,
    estimatedDelivery: row.estimated_delivery
      ? typeof row.estimated_delivery === "string"
        ? row.estimated_delivery
        : row.estimated_delivery.toISOString()
      : new Date().toISOString(),
  };
}

export async function GET() {
  await ensureSeeded();
  const user = await requireUser(["admin", "seller"]);
  if (user instanceof NextResponse) return user;
  const rows = await sql<Row>(
    `select * from shop_orders order by created_at desc limit 200`,
  );
  let orders = rows.map(mapOrder);
  if (user.role === "seller") {
    const owned = await sql<{ id: string }>(
      `select id from catalog_products where seller_user_id = $1`,
      [user.id],
    );
    const ids = new Set(owned.map((o) => o.id));
    orders = orders.filter((o) =>
      o.items.some(
        (i) => ids.has(i.productId) || i.sellerName === user.id,
      ),
    );
  }
  return NextResponse.json(
    { orders },
    { headers: { "cache-control": "private, no-store" } },
  );
}

export async function PATCH(request: Request) {
  await ensureSeeded();
  const user = await requireUser(["admin", "seller"]);
  if (user instanceof NextResponse) return user;
  const body = (await request.json()) as { id?: string; status?: OrderStatus };
  if (!body.id || !body.status) {
    return NextResponse.json({ error: "Missing id or status." }, { status: 400 });
  }

  if (user.role === "seller") {
    const rows = await sql<{ items_json: unknown; customer_id: string | null }>(
      `select items_json, customer_id from shop_orders where id = $1`,
      [body.id],
    );
    if (!rows[0]) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    const items =
      typeof rows[0].items_json === "string"
        ? JSON.parse(rows[0].items_json)
        : rows[0].items_json;
    const owned = await sql<{ id: string }>(
      `select id from catalog_products where seller_user_id = $1`,
      [user.id],
    );
    const ids = new Set(owned.map((o) => o.id));
    // Seller may update status only when every line item is theirs.
    const allMine =
      Array.isArray(items) &&
      items.length > 0 &&
      items.every(
        (i: { productId?: string; sellerName?: string }) =>
          (i.productId && ids.has(i.productId)) || i.sellerName === user.id,
      );
    if (!allMine) {
      return NextResponse.json(
        {
          error:
            "Sellers can only update status on orders that contain solely their products.",
        },
        { status: 403 },
      );
    }
  }

  await sql(
    `update shop_orders set status = $1, updated_at = now() where id = $2`,
    [body.status, body.id],
  );

  // Keep customer_orders payload in sync when present
  const full = await sql<Row>(`select * from shop_orders where id = $1`, [body.id]);
  if (full[0]?.customer_id) {
    const mapped = mapOrder(full[0]);
    await sql(
      `update customer_orders set payload = $1::jsonb
       where id = $2 and customer_id = $3`,
      [JSON.stringify(mapped), body.id, full[0].customer_id],
    );
  }

  return NextResponse.json(
    { ok: true },
    { headers: { "cache-control": "private, no-store" } },
  );
}

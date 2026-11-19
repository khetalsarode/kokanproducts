import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { ensureSeeded } from "@/lib/seed";
import type { Order, OrderLine, OrderStatus } from "@/types";

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

type SellerOrder = Omit<Order, "address" | "items" | "subtotal" | "total"> & {
  paymentStatus: string;
  customerId: string | null;
  items: OrderLine[];
  /** Seller-scoped subtotal for their lines only. */
  subtotal: number;
  total: number;
  /** Redacted — sellers do not receive full delivery address. */
  address: { city?: string; state?: string; pincode?: string };
};

function parseItems(raw: unknown): OrderLine[] {
  const items = typeof raw === "string" ? JSON.parse(raw) : raw;
  return Array.isArray(items) ? (items as OrderLine[]) : [];
}

function mapOrder(row: Row): Order & { paymentStatus: string; customerId: string | null } {
  const address =
    typeof row.address_json === "string"
      ? JSON.parse(row.address_json)
      : row.address_json;
  return {
    id: row.id,
    customerId: row.customer_id,
    createdAt:
      typeof row.created_at === "string" ? row.created_at : row.created_at.toISOString(),
    status: row.status as OrderStatus,
    items: parseItems(row.items_json),
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

function sellerOwnsLine(
  line: OrderLine,
  productIds: Set<string>,
  sellerUserId: string,
): boolean {
  return productIds.has(line.productId) || line.sellerName === sellerUserId;
}

function scopeOrderForSeller(
  order: Order & { paymentStatus: string; customerId: string | null },
  productIds: Set<string>,
  sellerUserId: string,
): SellerOrder | null {
  const mine = order.items.filter((i) => sellerOwnsLine(i, productIds, sellerUserId));
  if (mine.length === 0) return null;
  const subtotal = mine.reduce((sum, i) => sum + i.price * i.qty, 0);
  const addr = order.address || {};
  return {
    id: order.id,
    customerId: order.customerId,
    createdAt: order.createdAt,
    status: order.status,
    items: mine,
    address: {
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
    },
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    subtotal,
    discount: 0,
    deliveryFee: 0,
    total: subtotal,
    couponCode: undefined,
    trackingId: order.trackingId,
    courier: order.courier,
    estimatedDelivery: order.estimatedDelivery,
  };
}

export async function GET() {
  await ensureSeeded();
  const user = await requireUser(["admin", "seller"]);
  if (user instanceof NextResponse) return user;
  const rows = await sql<Row>(
    `select * from shop_orders order by created_at desc limit 200`,
  );
  const mapped = rows.map(mapOrder);

  if (user.role === "admin") {
    return NextResponse.json(
      { orders: mapped },
      { headers: { "cache-control": "private, no-store" } },
    );
  }

  const owned = await sql<{ id: string }>(
    `select id from catalog_products where seller_user_id = $1`,
    [user.id],
  );
  const ids = new Set(owned.map((o) => o.id));
  const orders = mapped
    .map((o) => scopeOrderForSeller(o, ids, user.id))
    .filter(Boolean);

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
    const rows = await sql<{ items_json: unknown }>(
      `select items_json from shop_orders where id = $1`,
      [body.id],
    );
    if (!rows[0]) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    const items = parseItems(rows[0].items_json);
    const owned = await sql<{ id: string }>(
      `select id from catalog_products where seller_user_id = $1`,
      [user.id],
    );
    const ids = new Set(owned.map((o) => o.id));
    // Seller may update status only when every line item is theirs.
    const allMine =
      items.length > 0 &&
      items.every((i) => sellerOwnsLine(i, ids, user.id));
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

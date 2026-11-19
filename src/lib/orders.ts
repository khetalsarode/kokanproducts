import { sql } from "@/lib/db";
import type { Order, OrderStatus } from "@/types";

export type ShopOrderRow = {
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

export function mapShopOrder(row: ShopOrderRow): Order & {
  paymentStatus: string;
  customerId: string | null;
} {
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

export async function getShopOrder(orderId: string) {
  const rows = await sql<ShopOrderRow>(`select * from shop_orders where id = $1 limit 1`, [
    orderId,
  ]);
  return rows[0] ? mapShopOrder(rows[0]) : null;
}

export async function markOrderPaid(orderId: string) {
  const rows = await sql<ShopOrderRow>(
    `update shop_orders
     set payment_status = 'paid', status = case when status = 'placed' then 'confirmed' else status end,
         updated_at = now()
     where id = $1
     returning *`,
    [orderId],
  );
  if (!rows[0]) return null;
  const mapped = mapShopOrder(rows[0]);
  if (rows[0].customer_id) {
    await sql(
      `update customer_orders set payload = $1::jsonb
       where id = $2 and customer_id = $3`,
      [JSON.stringify(mapped), orderId, rows[0].customer_id],
    );
  }
  return mapped;
}

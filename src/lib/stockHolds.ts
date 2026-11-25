import { sql } from "@/lib/db";
import type { OrderLine } from "@/types";

const HOLD_MINUTES = 30;

export function paymentHoldUntil(from = new Date()): Date {
  const d = new Date(from);
  d.setMinutes(d.getMinutes() + HOLD_MINUTES);
  return d;
}

/**
 * Release stock for online orders that never completed payment before the hold expired.
 * Safe to call on checkout / catalog paths (idempotent).
 */
export async function releaseAbandonedPaymentHolds(): Promise<number> {
  const rows = await sql<{
    id: string;
    items_json: OrderLine[] | string;
  }>(
    `select id, items_json
     from shop_orders
     where payment_status = 'awaiting_gateway'
       and (
         (payment_hold_until is not null and payment_hold_until < now())
         or (payment_hold_until is null and created_at < now() - interval '30 minutes')
       )
     limit 50`,
  );

  let released = 0;
  for (const row of rows) {
    const items: OrderLine[] =
      typeof row.items_json === "string"
        ? (JSON.parse(row.items_json) as OrderLine[])
        : row.items_json;
    for (const line of items) {
      await sql(
        `update catalog_products set stock = stock + $1, updated_at = now() where id = $2`,
        [line.qty, line.productId],
      );
    }
    await sql(
      `update shop_orders
       set payment_status = 'expired',
           status = 'cancelled',
           payment_hold_until = null,
           updated_at = now()
       where id = $1 and payment_status = 'awaiting_gateway'`,
      [row.id],
    );
    released += 1;
  }
  return released;
}

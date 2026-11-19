import { NextResponse } from "next/server";
import { markOrderPaid } from "@/lib/orders";
import { fetchCashfreeOrderStatus } from "@/lib/payments";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

/**
 * Cashfree notify_url webhook.
 * Always re-checks order status with Cashfree — never trusts payload alone for "paid".
 */
export async function POST(request: Request) {
  await ensureSeeded();
  try {
    const payload = (await request.json()) as {
      data?: { order?: { order_id?: string; order_status?: string } };
      order_id?: string;
      order?: { order_id?: string };
    };

    const orderId =
      payload.data?.order?.order_id ||
      payload.order?.order_id ||
      payload.order_id ||
      "";

    if (!orderId) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const cf = await fetchCashfreeOrderStatus(orderId);
    if (cf.paymentStatus === "paid") {
      await markOrderPaid(orderId);
    }

    return NextResponse.json({ ok: true, paymentStatus: cf.paymentStatus });
  } catch (error) {
    console.error("cashfree webhook", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

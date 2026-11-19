import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { markOrderPaid } from "@/lib/orders";
import { fetchCashfreeOrderStatus } from "@/lib/payments";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

function verifyCashfreeSignature(
  rawBody: string,
  signature: string | null,
  timestamp: string | null,
): boolean {
  const secret = process.env.CASHFREE_SECRET_KEY?.trim() ?? "";
  if (!secret || !signature || !timestamp) return false;

  const signedPayload = `${timestamp}${rawBody}`;
  const expected = createHmac("sha256", secret).update(signedPayload).digest("base64");

  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Cashfree notify_url webhook.
 * Requires HMAC signature (x-webhook-signature + x-webhook-timestamp) and
 * always re-checks order status with Cashfree — never trusts payload alone.
 */
export async function POST(request: Request) {
  await ensureSeeded();
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-webhook-signature");
    const timestamp = request.headers.get("x-webhook-timestamp");

    if (!verifyCashfreeSignature(rawBody, signature, timestamp)) {
      return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
    }

    const payload = JSON.parse(rawBody) as {
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

    // Defense in depth: confirm with Cashfree API before marking paid.
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

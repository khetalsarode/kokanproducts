import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth";
import { getShopOrder, markOrderPaid } from "@/lib/orders";
import { fetchCashfreeOrderStatus } from "@/lib/payments";
import { rateLimit } from "@/lib/rateLimit";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await ensureSeeded();
  const user = await getRequestUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const limited = rateLimit(`checkout-verify:${user.id}`, 20, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Too many payment checks. Try again in ${limited.retryAfterSec}s.` },
      { status: 429 },
    );
  }

  const orderId = new URL(request.url).searchParams.get("order_id")?.trim();
  if (!orderId) {
    return NextResponse.json({ error: "Missing order_id." }, { status: 400 });
  }

  const local = await getShopOrder(orderId);
  if (!local || (local.customerId && local.customerId !== user.id && user.role !== "admin")) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  if (local.paymentStatus === "paid") {
    return NextResponse.json(
      { order: local, paymentStatus: "paid" },
      { headers: { "cache-control": "private, no-store" } },
    );
  }

  if (local.paymentMethod === "cod") {
    return NextResponse.json(
      { order: local, paymentStatus: local.paymentStatus },
      { headers: { "cache-control": "private, no-store" } },
    );
  }

  const cf = await fetchCashfreeOrderStatus(orderId);
  if (cf.paymentStatus === "paid") {
    const updated = await markOrderPaid(orderId);
    return NextResponse.json(
      { order: updated || local, paymentStatus: "paid", gateway: cf.orderStatus },
      { headers: { "cache-control": "private, no-store" } },
    );
  }

  return NextResponse.json(
    {
      order: local,
      paymentStatus: cf.paymentStatus,
      gateway: cf.orderStatus,
    },
    { headers: { "cache-control": "private, no-store" } },
  );
}

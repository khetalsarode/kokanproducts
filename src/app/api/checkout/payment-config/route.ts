import { NextResponse } from "next/server";
import { cashfreeMode, isOnlinePaymentConfigured } from "@/lib/payments";

export const dynamic = "force-dynamic";

export async function GET() {
  const onlineEnabled = isOnlinePaymentConfigured();
  return NextResponse.json(
    {
      onlineEnabled,
      provider: onlineEnabled ? "cashfree" : null,
      mode: onlineEnabled ? cashfreeMode() : null,
    },
    { headers: { "cache-control": "private, no-store" } },
  );
}

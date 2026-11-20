import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getSellerAnalytics, type AnalyticsRange } from "@/lib/analytics";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

const RANGES: AnalyticsRange[] = ["day", "week", "month", "year"];

export async function GET(request: Request) {
  await ensureSeeded();
  const user = await requireUser(["seller", "admin"]);
  if (user instanceof NextResponse) return user;
  if (user.role === "seller" && !user.shopApproved) {
    return NextResponse.json(
      { error: "Seller account pending approval." },
      { status: 403 },
    );
  }
  const raw = new URL(request.url).searchParams.get("range") || "month";
  const range = RANGES.includes(raw as AnalyticsRange)
    ? (raw as AnalyticsRange)
    : "month";
  const sellerId =
    user.role === "admin"
      ? new URL(request.url).searchParams.get("sellerId") || user.id
      : user.id;
  const data = await getSellerAnalytics(sellerId, range);
  return NextResponse.json(data, {
    headers: { "cache-control": "private, no-store" },
  });
}

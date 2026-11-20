import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getAdminAnalytics, type AnalyticsRange } from "@/lib/analytics";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

const RANGES: AnalyticsRange[] = ["day", "week", "month", "year"];

export async function GET(request: Request) {
  await ensureSeeded();
  const user = await requireUser(["admin"]);
  if (user instanceof NextResponse) return user;
  const raw = new URL(request.url).searchParams.get("range") || "month";
  const range = RANGES.includes(raw as AnalyticsRange)
    ? (raw as AnalyticsRange)
    : "month";
  const data = await getAdminAnalytics(range);
  return NextResponse.json(data, {
    headers: { "cache-control": "private, no-store" },
  });
}

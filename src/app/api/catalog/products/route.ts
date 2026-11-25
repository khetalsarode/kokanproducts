import { NextResponse } from "next/server";
import { listCatalogProducts } from "@/lib/catalog";
import { ensureSeeded } from "@/lib/seed";
import { releaseAbandonedPaymentHolds } from "@/lib/stockHolds";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeeded();
  await releaseAbandonedPaymentHolds().catch(() => 0);
  const products = await listCatalogProducts();
  return NextResponse.json(
    { products },
    { headers: { "cache-control": "public, max-age=30, stale-while-revalidate=60" } },
  );
}

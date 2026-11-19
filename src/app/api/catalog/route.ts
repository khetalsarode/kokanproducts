import { NextResponse } from "next/server";
import { listCatalogProducts } from "@/lib/catalog";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeeded();
  const products = await listCatalogProducts();
  return NextResponse.json(
    { products },
    { headers: { "cache-control": "private, no-store" } },
  );
}

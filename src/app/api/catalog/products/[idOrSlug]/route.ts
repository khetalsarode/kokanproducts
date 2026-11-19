import { NextResponse } from "next/server";
import { getCatalogProduct, listCatalogProducts } from "@/lib/catalog";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ idOrSlug: string }> },
) {
  await ensureSeeded();
  const { idOrSlug } = await context.params;
  const product = await getCatalogProduct(idOrSlug);
  if (!product) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }
  const related = (await listCatalogProducts())
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);
  return NextResponse.json(
    { product, related },
    { headers: { "cache-control": "public, max-age=30, stale-while-revalidate=60" } },
  );
}

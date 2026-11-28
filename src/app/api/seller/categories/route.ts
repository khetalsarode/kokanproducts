import { NextResponse } from "next/server";
import { listBusinessCategories } from "@/lib/sellerAgreements";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

/** Public list for seller registration. */
export async function GET() {
  await ensureSeeded();
  const categories = await listBusinessCategories(true);
  return NextResponse.json(
    { categories },
    { headers: { "cache-control": "public, max-age=60" } },
  );
}

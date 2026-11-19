import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeeded();
  const customer = await getRequestUser();
  return NextResponse.json(
    { customer },
    { headers: { "cache-control": "private, no-store" } },
  );
}

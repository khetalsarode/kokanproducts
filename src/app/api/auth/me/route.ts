import { NextResponse } from "next/server";
import { getRequestCustomer } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const customer = await getRequestCustomer();
  return NextResponse.json(
    { customer },
    { headers: { "cache-control": "private, no-store" } },
  );
}

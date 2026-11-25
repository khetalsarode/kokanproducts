import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth";
import { isPhoneAccountEmail } from "@/lib/phone";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeeded();
  const customer = await getRequestUser();
  const safe = customer
    ? {
        ...customer,
        email: isPhoneAccountEmail(customer.email) ? "" : customer.email,
      }
    : null;
  return NextResponse.json(
    { customer: safe },
    { headers: { "cache-control": "private, no-store" } },
  );
}

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  getSellerOnboardingState,
  recordAgreementAcceptance,
} from "@/lib/sellerAgreements";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  await ensureSeeded();
  const user = await requireUser(["seller"]);
  if (user instanceof NextResponse) return user;

  const body = (await request.json()) as { agreementId?: string; accepted?: boolean };
  if (!body.accepted) {
    return NextResponse.json(
      { error: "You must explicitly agree to the terms." },
      { status: 400 },
    );
  }
  const agreementId = (body.agreementId || "").trim();
  if (!agreementId) {
    return NextResponse.json({ error: "Missing agreement id." }, { status: 400 });
  }

  const forwarded = request.headers.get("x-forwarded-for") || "";
  const ip = forwarded.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "";
  const userAgent = request.headers.get("user-agent") || "";

  const result = await recordAgreementAcceptance({
    sellerUserId: user.id,
    agreementId,
    ipAddress: ip,
    userAgent,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const onboarding = await getSellerOnboardingState(user.id);
  return NextResponse.json(
    { ok: true, onboarding },
    { headers: { "cache-control": "private, no-store" } },
  );
}

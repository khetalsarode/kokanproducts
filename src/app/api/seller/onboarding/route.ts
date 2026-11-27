import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getSellerOnboardingState } from "@/lib/sellerAgreements";
import { ensureSeeded } from "@/lib/seed";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeeded();
  const user = await requireUser(["seller", "admin"]);
  if (user instanceof NextResponse) return user;
  if (user.role !== "seller") {
    return NextResponse.json(
      { error: "Seller onboarding is only for seller accounts." },
      { status: 403 },
    );
  }
  const state = await getSellerOnboardingState(user.id);
  const kycRows = await sql<{
    status: string;
    legal_name: string;
    business_pan: string;
    document_notes: string;
    rejection_reason: string;
    submitted_at: Date | string | null;
  }>(`select * from seller_kyc where seller_user_id = $1`, [user.id]);
  const kyc = kycRows[0];
  return NextResponse.json(
    {
      onboarding: state,
      kyc: kyc
        ? {
            status: kyc.status,
            legalName: kyc.legal_name,
            businessPan: kyc.business_pan,
            documentNotes: kyc.document_notes,
            rejectionReason: kyc.rejection_reason,
            submittedAt:
              typeof kyc.submitted_at === "string"
                ? kyc.submitted_at
                : kyc.submitted_at?.toISOString(),
          }
        : {
            status: state.kycStatus,
            legalName: "",
            businessPan: "",
            documentNotes: "",
            rejectionReason: "",
          },
    },
    { headers: { "cache-control": "private, no-store" } },
  );
}

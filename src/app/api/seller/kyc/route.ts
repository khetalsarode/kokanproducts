import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getSellerOnboardingState } from "@/lib/sellerAgreements";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeeded();
  const user = await requireUser(["seller"]);
  if (user instanceof NextResponse) return user;
  const state = await getSellerOnboardingState(user.id);
  if (!state.canAccessKyc) {
    return NextResponse.json(
      {
        error: "Accept the current Terms & Conditions before accessing KYC.",
        onboarding: state,
      },
      { status: 403 },
    );
  }
  const rows = await sql<{
    status: string;
    legal_name: string;
    business_pan: string;
    document_notes: string;
    rejection_reason: string;
    submitted_at: Date | string | null;
  }>(`select * from seller_kyc where seller_user_id = $1`, [user.id]);
  const kyc = rows[0];
  return NextResponse.json(
    {
      kyc: {
        status: kyc?.status || state.kycStatus,
        legalName: kyc?.legal_name || "",
        businessPan: kyc?.business_pan || "",
        documentNotes: kyc?.document_notes || "",
        rejectionReason: kyc?.rejection_reason || "",
        submittedAt:
          typeof kyc?.submitted_at === "string"
            ? kyc.submitted_at
            : kyc?.submitted_at?.toISOString(),
      },
      onboarding: state,
    },
    { headers: { "cache-control": "private, no-store" } },
  );
}

export async function POST(request: Request) {
  await ensureSeeded();
  const user = await requireUser(["seller"]);
  if (user instanceof NextResponse) return user;

  const state = await getSellerOnboardingState(user.id);
  if (!state.canAccessKyc) {
    return NextResponse.json(
      {
        error: "Accept the current Terms & Conditions before submitting KYC.",
        onboarding: state,
      },
      { status: 403 },
    );
  }

  const body = (await request.json()) as {
    legalName?: string;
    businessPan?: string;
    documentNotes?: string;
  };
  const legalName = (body.legalName || "").trim();
  const businessPan = (body.businessPan || "").trim().toUpperCase();
  const documentNotes = (body.documentNotes || "").trim();
  if (legalName.length < 2) {
    return NextResponse.json({ error: "Enter the legal business name." }, { status: 400 });
  }

  await sql(
    `insert into seller_kyc
       (seller_user_id, status, legal_name, business_pan, document_notes, submitted_at, updated_at)
     values ($1,'submitted',$2,$3,$4,now(),now())
     on conflict (seller_user_id) do update set
       status = 'submitted',
       legal_name = excluded.legal_name,
       business_pan = excluded.business_pan,
       document_notes = excluded.document_notes,
       rejection_reason = '',
       submitted_at = now(),
       updated_at = now()`,
    [user.id, legalName, businessPan, documentNotes],
  );
  await sql(
    `update seller_profiles set kyc_status = 'submitted', updated_at = now() where user_id = $1`,
    [user.id],
  );

  return NextResponse.json(
    { ok: true, status: "submitted" },
    { headers: { "cache-control": "private, no-store" } },
  );
}

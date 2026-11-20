import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { setSellerRegistrationStatus, type RegistrationStatus } from "@/lib/approvals";
import { sql } from "@/lib/db";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeeded();
  const user = await requireUser(["admin"]);
  if (user instanceof NextResponse) return user;
  const rows = await sql<{
    id: string;
    email: string;
    name: string;
    phone: string;
    role: string;
    status: string;
    created_at: Date | string;
    shop_name: string | null;
    location: string | null;
    bio: string | null;
    approved: boolean | null;
    registration_status: string | null;
    rejection_reason: string | null;
    reviewed_at: Date | string | null;
  }>(
    `select c.id, c.email, c.name, c.phone, c.role, c.status, c.created_at,
            sp.shop_name, sp.location, sp.bio, sp.approved,
            sp.registration_status, sp.rejection_reason, sp.reviewed_at
     from customers c
     left join seller_profiles sp on sp.user_id = c.id
     order by c.created_at desc
     limit 300`,
  );
  return NextResponse.json(
    {
      users: rows.map((r) => {
        const registrationStatus = (r.registration_status ||
          (r.approved ? "approved" : r.role === "seller" ? "pending" : null)) as
          | RegistrationStatus
          | null;
        return {
          id: r.id,
          email: r.email,
          name: r.name,
          phone: r.phone,
          role: r.role,
          status: r.status,
          shopName: r.shop_name,
          location: r.location,
          bio: r.bio,
          shopApproved: r.approved,
          registrationStatus,
          rejectionReason: r.rejection_reason || "",
          reviewedAt:
            r.reviewed_at == null
              ? null
              : typeof r.reviewed_at === "string"
                ? r.reviewed_at
                : r.reviewed_at.toISOString(),
          createdAt:
            typeof r.created_at === "string" ? r.created_at : r.created_at.toISOString(),
        };
      }),
    },
    { headers: { "cache-control": "private, no-store" } },
  );
}

export async function PATCH(request: Request) {
  await ensureSeeded();
  const user = await requireUser(["admin"]);
  if (user instanceof NextResponse) return user;
  const body = (await request.json()) as {
    id?: string;
    status?: string;
    approved?: boolean;
    registrationStatus?: RegistrationStatus;
    reason?: string;
  };
  if (!body.id) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }
  if (body.status) {
    await sql(`update customers set status = $1, updated_at = now() where id = $2`, [
      body.status,
      body.id,
    ]);
  }

  const nextStatus: RegistrationStatus | undefined =
    body.registrationStatus ||
    (typeof body.approved === "boolean"
      ? body.approved
        ? "approved"
        : "rejected"
      : undefined);

  if (nextStatus) {
    await setSellerRegistrationStatus({
      sellerUserId: body.id,
      status: nextStatus,
      reason: body.reason,
      actorId: user.id,
    });
  }
  return NextResponse.json({ ok: true }, { headers: { "cache-control": "private, no-store" } });
}

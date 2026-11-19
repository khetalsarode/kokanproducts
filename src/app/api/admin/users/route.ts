import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
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
    approved: boolean | null;
  }>(
    `select c.id, c.email, c.name, c.phone, c.role, c.status, c.created_at,
            sp.shop_name, sp.approved
     from customers c
     left join seller_profiles sp on sp.user_id = c.id
     order by c.created_at desc
     limit 300`,
  );
  return NextResponse.json(
    {
      users: rows.map((r) => ({
        id: r.id,
        email: r.email,
        name: r.name,
        phone: r.phone,
        role: r.role,
        status: r.status,
        shopName: r.shop_name,
        shopApproved: r.approved,
        createdAt:
          typeof r.created_at === "string" ? r.created_at : r.created_at.toISOString(),
      })),
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
  if (typeof body.approved === "boolean") {
    await sql(`update seller_profiles set approved = $1 where user_id = $2`, [
      body.approved,
      body.id,
    ]);
  }
  return NextResponse.json({ ok: true }, { headers: { "cache-control": "private, no-store" } });
}

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  applyApprovedProductRequest,
  listProductRequests,
  rejectProductRequest,
  type RequestStatus,
} from "@/lib/approvals";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await ensureSeeded();
  const user = await requireUser(["admin", "seller"]);
  if (user instanceof NextResponse) return user;
  const status = (new URL(request.url).searchParams.get("status") ||
    "all") as RequestStatus | "all";
  const requests = await listProductRequests({
    status,
    sellerUserId: user.role === "seller" ? user.id : undefined,
  });
  return NextResponse.json(
    { requests },
    { headers: { "cache-control": "private, no-store" } },
  );
}

export async function PATCH(request: Request) {
  await ensureSeeded();
  const user = await requireUser(["admin"]);
  if (user instanceof NextResponse) return user;
  const body = (await request.json()) as {
    id?: string;
    action?: "approve" | "reject";
    reason?: string;
  };
  if (!body.id || !body.action) {
    return NextResponse.json({ error: "Missing id or action." }, { status: 400 });
  }
  if (body.action === "approve") {
    const result = await applyApprovedProductRequest(body.id, user.id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
  } else {
    const result = await rejectProductRequest(
      body.id,
      user.id,
      body.reason || "Rejected by admin",
    );
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
  }
  return NextResponse.json({ ok: true }, { headers: { "cache-control": "private, no-store" } });
}

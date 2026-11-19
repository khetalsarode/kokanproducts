import { NextResponse } from "next/server";
import {
  createSession,
  getUserByEmail,
  setSessionCookie,
} from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await ensureSeeded();
    const body = (await request.json()) as { email?: string; password?: string };
    const email = (body.email ?? "").trim().toLowerCase();
    const password = body.password ?? "";

    const user = await getUserByEmail(email);
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }
    if (user.status !== "active") {
      return NextResponse.json({ error: "Account is disabled." }, { status: 403 });
    }

    const token = await createSession(user.id);
    await setSessionCookie(token);

    const { passwordHash: _, ...customer } = user;
    return NextResponse.json(
      { customer },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    console.error("login failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Could not sign in." }, { status: 500 });
  }
}

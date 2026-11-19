import { NextResponse } from "next/server";
import {
  createSession,
  getUserByEmail,
  setSessionCookie,
  type UserRole,
} from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { rateLimit } from "@/lib/rateLimit";
import {
  ensureSeeded,
  forceReseedRoleAccounts,
  matchesSeedAdminCredentials,
  matchesSeedSellerCredentials,
} from "@/lib/seed";

export const dynamic = "force-dynamic";

const ROLES: UserRole[] = ["customer", "seller", "admin"];

export async function POST(request: Request) {
  try {
    await ensureSeeded();
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      expectedRole?: string;
    };
    const email = (body.email ?? "").trim().toLowerCase();
    const password = body.password ?? "";
    const expectedRole = ROLES.includes(body.expectedRole as UserRole)
      ? (body.expectedRole as UserRole)
      : undefined;

    const limited = rateLimit(`login:${email || "unknown"}`, 10, 60_000);
    if (!limited.ok) {
      return NextResponse.json(
        { error: `Too many sign-in attempts. Try again in ${limited.retryAfterSec}s.` },
        { status: 429 },
      );
    }

    // Always sync seeded admin/seller rows from env when that email is attempted,
    // so Cursor SEED_* secrets create/update the account before password check.
    const seedEmailAttempt =
      matchesSeedAdminCredentials(email, password) ||
      matchesSeedSellerCredentials(email, password) ||
      email === (process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase() ?? "") ||
      email === (process.env.SEED_SELLER_EMAIL?.trim().toLowerCase() ?? "");

    if (seedEmailAttempt) {
      await forceReseedRoleAccounts();
    }

    let user = await getUserByEmail(email);
    let passwordOk = user ? await verifyPassword(password, user.passwordHash) : false;

    // Retry once if typed password matches SEED_* after sync.
    if (
      !passwordOk &&
      (matchesSeedAdminCredentials(email, password) ||
        matchesSeedSellerCredentials(email, password))
    ) {
      await forceReseedRoleAccounts();
      user = await getUserByEmail(email);
      passwordOk = user ? await verifyPassword(password, user.passwordHash) : false;
    }

    if (!user || !passwordOk) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }
    if (user.status !== "active") {
      return NextResponse.json({ error: "Account is disabled." }, { status: 403 });
    }
    if (expectedRole && user.role !== expectedRole) {
      return NextResponse.json(
        {
          error: `This sign-in is for ${expectedRole} accounts only. Use the ${user.role} portal instead.`,
        },
        { status: 403 },
      );
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

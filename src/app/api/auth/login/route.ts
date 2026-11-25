import { NextResponse } from "next/server";
import {
  createSession,
  getUserByLoginIdentifier,
  setSessionCookie,
  type UserRole,
} from "@/lib/auth";
import { isPhoneAccountEmail } from "@/lib/phone";
import { verifyPassword } from "@/lib/password";
import { rateLimit } from "@/lib/rateLimit";
import {
  ensureSeeded,
  seedAdminConfigured,
  syncSeedAccountPassword,
} from "@/lib/seed";

export const dynamic = "force-dynamic";

const ROLES: UserRole[] = ["customer", "seller", "admin"];

function matchesSeedPair(
  email: string,
  password: string,
  emailEnv: string,
  passwordEnv: string,
): boolean {
  const seedEmail = process.env[emailEnv]?.trim().toLowerCase() ?? "";
  const seedPassword = process.env[passwordEnv] ?? "";
  return (
    seedEmail.length > 0 &&
    seedPassword.length >= 8 &&
    email === seedEmail &&
    password === seedPassword
  );
}

export async function POST(request: Request) {
  try {
    await ensureSeeded();
    const body = (await request.json()) as {
      email?: string;
      identifier?: string;
      password?: string;
      expectedRole?: string;
    };
    const identifier = (body.identifier ?? body.email ?? "").trim();
    const loginKey = identifier.includes("@")
      ? identifier.toLowerCase()
      : identifier;
    const password = body.password ?? "";
    const expectedRole = ROLES.includes(body.expectedRole as UserRole)
      ? (body.expectedRole as UserRole)
      : undefined;

    const limited = rateLimit(`login:${loginKey || "unknown"}`, 10, 60_000);
    if (!limited.ok) {
      return NextResponse.json(
        { error: `Too many sign-in attempts. Try again in ${limited.retryAfterSec}s.` },
        { status: 429 },
      );
    }

    // If the typed pair equals owner SEED_* secrets, sync that account into
    // the DB so hashes match after secret updates. Never runs on wrong passwords.
    if (loginKey.includes("@")) {
      if (
        matchesSeedPair(loginKey, password, "SEED_ADMIN_EMAIL", "SEED_ADMIN_PASSWORD") ||
        matchesSeedPair(loginKey, password, "SEED_SELLER_EMAIL", "SEED_SELLER_PASSWORD")
      ) {
        await syncSeedAccountPassword(loginKey, password);
      }
    }

    const user = await getUserByLoginIdentifier(identifier);
    const passwordOk = user ? await verifyPassword(password, user.passwordHash) : false;

    if (!user || !passwordOk) {
      const hint =
        expectedRole === "admin" || expectedRole === "seller"
          ? seedAdminConfigured() ||
            Boolean(process.env.SEED_SELLER_EMAIL?.trim())
            ? " Invalid email or password. Use the exact values saved in Cursor Secrets for this role."
            : " Role secrets are not configured yet. Set SEED_ADMIN_* / SEED_SELLER_* in Cursor Secrets, then try again."
          : "Invalid email, mobile number, or password.";
      return NextResponse.json(
        { error: hint.trim() },
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
    const safe = {
      ...customer,
      email: isPhoneAccountEmail(customer.email) ? "" : customer.email,
    };
    return NextResponse.json(
      { customer: safe },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    console.error("login failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Could not sign in." }, { status: 500 });
  }
}

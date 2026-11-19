import { NextResponse } from "next/server";
import {
  createSession,
  getUserByEmail,
  newId,
  setSessionCookie,
  type UserRole,
} from "@/lib/auth";
import { sql } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { rateLimit } from "@/lib/rateLimit";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await ensureSeeded();
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      phone?: string;
      password?: string;
      role?: string;
      shopName?: string;
      location?: string;
    };
    const name = (body.name ?? "").trim();
    const email = (body.email ?? "").trim().toLowerCase();
    const phone = (body.phone ?? "").trim();
    const password = body.password ?? "";
    const wantSeller = body.role === "seller";
    const role: UserRole = wantSeller ? "seller" : "customer";

    const limited = rateLimit(`register:${email || "unknown"}`, 5, 60_000);
    if (!limited.ok) {
      return NextResponse.json(
        { error: `Too many registrations. Try again in ${limited.retryAfterSec}s.` },
        { status: 429 },
      );
    }

    if (name.length < 2) {
      return NextResponse.json({ error: "Enter your full name." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 },
      );
    }
    if (wantSeller && !(body.shopName ?? "").trim()) {
      return NextResponse.json({ error: "Enter your shop name." }, { status: 400 });
    }
    if (await getUserByEmail(email)) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    const id = newId();
    const passwordHash = await hashPassword(password);
    await sql(
      `insert into customers (id, email, password_hash, name, phone, role, status)
       values ($1, $2, $3, $4, $5, $6, 'active')`,
      [id, email, passwordHash, name, phone, role],
    );
    if (wantSeller) {
      await sql(
        `insert into seller_profiles (user_id, shop_name, location, bio, approved)
         values ($1, $2, $3, $4, false)`,
        [
          id,
          (body.shopName ?? "").trim(),
          (body.location ?? "Konkan").trim(),
          "",
        ],
      );
    }

    const token = await createSession(id);
    await setSessionCookie(token);

    return NextResponse.json(
      {
        customer: {
          id,
          email,
          name,
          phone,
          role,
          status: "active",
          createdAt: new Date().toISOString(),
          shopName: wantSeller ? (body.shopName ?? "").trim() : undefined,
          shopApproved: wantSeller ? false : undefined,
        },
      },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    console.error("register failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Could not create account." }, { status: 500 });
  }
}

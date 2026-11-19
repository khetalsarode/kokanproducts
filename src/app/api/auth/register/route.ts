import { NextResponse } from "next/server";
import {
  createSession,
  getCustomerByEmail,
  newId,
  setSessionCookie,
} from "@/lib/auth";
import { sql } from "@/lib/db";
import { hashPassword } from "@/lib/password";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      phone?: string;
      password?: string;
    };
    const name = (body.name ?? "").trim();
    const email = (body.email ?? "").trim().toLowerCase();
    const phone = (body.phone ?? "").trim();
    const password = body.password ?? "";

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

    if (await getCustomerByEmail(email)) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    const id = newId();
    const passwordHash = await hashPassword(password);
    await sql(
      `insert into customers (id, email, password_hash, name, phone)
       values ($1, $2, $3, $4, $5)`,
      [id, email, passwordHash, name, phone],
    );

    const token = await createSession(id);
    await setSessionCookie(token);

    return NextResponse.json(
      { customer: { id, email, name, phone, createdAt: new Date().toISOString() } },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    console.error("register failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Could not create account." }, { status: 500 });
  }
}

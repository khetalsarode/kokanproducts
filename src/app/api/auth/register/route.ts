import { NextResponse } from "next/server";
import {
  createSession,
  getUserByEmail,
  getUserByPhone,
  newId,
  setSessionCookie,
  type UserRole,
} from "@/lib/auth";
import { consumeVerificationToken } from "@/lib/authVerification";
import { sql } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import {
  isPhoneAccountEmail,
  isValidEmail,
  isValidPhone,
  normalizePhone,
  phoneAccountEmail,
} from "@/lib/phone";
import { rateLimit } from "@/lib/rateLimit";
import { ensureSeeded, reservedSeedEmails } from "@/lib/seed";

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
      businessAddress?: string;
      gstin?: string;
      fssaiLicense?: string;
      channel?: string;
      verificationToken?: string;
    };
    const name = (body.name ?? "").trim();
    const password = body.password ?? "";
    const channel = body.channel === "phone" ? "phone" : "email";
    const verificationToken = (body.verificationToken ?? "").trim();

    // Public registration is customer or seller only.
    if (body.role === "admin") {
      return NextResponse.json(
        {
          error:
            "Admin accounts cannot be self-registered. Use the seeded admin login.",
        },
        { status: 403 },
      );
    }

    const wantSeller = body.role === "seller";
    const role: UserRole = wantSeller ? "seller" : "customer";

    let email = (body.email ?? "").trim().toLowerCase();
    let phone = (body.phone ?? "").trim();
    if (phone) phone = normalizePhone(phone);

    if (role === "customer") {
      if (channel === "email") {
        if (!isValidEmail(email)) {
          return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
        }
      } else {
        if (!isValidPhone(phone)) {
          return NextResponse.json(
            { error: "Enter a valid mobile number." },
            { status: 400 },
          );
        }
        email = phoneAccountEmail(phone);
      }

      if (!verificationToken) {
        return NextResponse.json(
          { error: "Complete email or mobile verification first." },
          { status: 400 },
        );
      }
      const destination = channel === "email" ? email : phone;
      const verified = await consumeVerificationToken({
        token: verificationToken,
        channel,
        destination,
        purpose: "register",
      });
      if (!verified) {
        return NextResponse.json(
          { error: "Verification expired or invalid. Request a new code." },
          { status: 400 },
        );
      }
    } else {
      // Sellers always register with email (+ optional phone).
      if (!isValidEmail(email) || isPhoneAccountEmail(email)) {
        return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
      }
      if (phone && !isValidPhone(phone)) {
        return NextResponse.json(
          { error: "Enter a valid mobile number." },
          { status: 400 },
        );
      }
      if (phone) phone = normalizePhone(phone);
    }

    const limited = rateLimit(`register:${email || phone || "unknown"}`, 5, 60_000);
    if (!limited.ok) {
      return NextResponse.json(
        { error: `Too many registrations. Try again in ${limited.retryAfterSec}s.` },
        { status: 429 },
      );
    }

    if (name.length < 2) {
      return NextResponse.json({ error: "Enter your full name." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 },
      );
    }
    if (reservedSeedEmails().has(email)) {
      return NextResponse.json(
        { error: "This email is reserved. Choose another address." },
        { status: 403 },
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
    if (phone && (await getUserByPhone(phone))) {
      return NextResponse.json(
        { error: "An account with this mobile number already exists." },
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
    if (role === "seller") {
      await sql(
        `insert into seller_profiles
           (user_id, shop_name, location, bio, approved, registration_status,
            business_address, gstin, fssai_license)
         values ($1, $2, $3, $4, false, 'pending', $5, $6, $7)`,
        [
          id,
          (body.shopName ?? "").trim(),
          (body.location ?? "Konkan").trim(),
          "",
          (body.businessAddress ?? "").trim(),
          (body.gstin ?? "").trim(),
          (body.fssaiLicense ?? "").trim(),
        ],
      );
    }

    const token = await createSession(id);
    await setSessionCookie(token);

    return NextResponse.json(
      {
        customer: {
          id,
          email: isPhoneAccountEmail(email) ? "" : email,
          name,
          phone,
          role,
          status: "active",
          createdAt: new Date().toISOString(),
          shopName: role === "seller" ? (body.shopName ?? "").trim() : undefined,
          shopApproved: role === "seller" ? false : undefined,
          registrationStatus: role === "seller" ? "pending" : undefined,
        },
      },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    console.error("register failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Could not create account." }, { status: 500 });
  }
}

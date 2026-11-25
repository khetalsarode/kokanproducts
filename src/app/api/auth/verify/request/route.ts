import { NextResponse } from "next/server";
import { getUserByEmail, getUserByPhone } from "@/lib/auth";
import {
  issueVerificationCode,
  type VerifyChannel,
  type VerifyPurpose,
} from "@/lib/authVerification";
import { isValidEmail, isValidPhone, normalizePhone } from "@/lib/phone";
import { rateLimit } from "@/lib/rateLimit";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await ensureSeeded();
    const body = (await request.json()) as {
      channel?: string;
      destination?: string;
      purpose?: string;
    };
    const channel = body.channel === "phone" ? "phone" : "email";
    const purpose: VerifyPurpose =
      body.purpose === "login" ? "login" : "register";
    let destination = (body.destination ?? "").trim();

    if (channel === "email") {
      destination = destination.toLowerCase();
      if (!isValidEmail(destination)) {
        return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
      }
    } else {
      if (!isValidPhone(destination)) {
        return NextResponse.json(
          { error: "Enter a valid 10-digit mobile number." },
          { status: 400 },
        );
      }
      destination = normalizePhone(destination);
    }

    const limited = await rateLimit(`otp:${channel}:${destination}`, 5, 60_000);
    if (!limited.ok) {
      return NextResponse.json(
        { error: `Too many codes requested. Try again in ${limited.retryAfterSec}s.` },
        { status: 429 },
      );
    }

    if (purpose === "register") {
      const existing =
        channel === "email"
          ? await getUserByEmail(destination)
          : await getUserByPhone(destination);
      if (existing) {
        return NextResponse.json(
          {
            error:
              channel === "email"
                ? "An account with this email already exists. Sign in instead."
                : "An account with this mobile number already exists. Sign in instead.",
          },
          { status: 409 },
        );
      }
    }

    const issued = await issueVerificationCode({
      channel: channel as VerifyChannel,
      destination,
      purpose,
    });
    if (!issued.ok) {
      return NextResponse.json({ error: issued.error }, { status: 503 });
    }

    return NextResponse.json(
      {
        ok: true,
        channel,
        destination,
        purpose,
        delivery: "live",
        message:
          channel === "email"
            ? "Verification code sent to your email. Check your inbox."
            : "OTP sent to your mobile number.",
      },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    console.error(
      "verify request failed",
      error instanceof Error ? error.message : "unknown",
    );
    return NextResponse.json({ error: "Could not send verification code." }, { status: 500 });
  }
}

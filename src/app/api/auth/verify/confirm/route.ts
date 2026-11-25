import { NextResponse } from "next/server";
import {
  confirmVerificationCode,
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
      code?: string;
    };
    const channel: VerifyChannel = body.channel === "phone" ? "phone" : "email";
    const purpose: VerifyPurpose =
      body.purpose === "login" ? "login" : "register";
    let destination = (body.destination ?? "").trim();
    const code = (body.code ?? "").trim();

    if (channel === "email") {
      destination = destination.toLowerCase();
      if (!isValidEmail(destination)) {
        return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
      }
    } else {
      if (!isValidPhone(destination)) {
        return NextResponse.json(
          { error: "Enter a valid mobile number." },
          { status: 400 },
        );
      }
      destination = normalizePhone(destination);
    }

    const limited = rateLimit(`otp-confirm:${channel}:${destination}`, 20, 60_000);
    if (!limited.ok) {
      return NextResponse.json(
        { error: `Too many attempts. Try again in ${limited.retryAfterSec}s.` },
        { status: 429 },
      );
    }

    const result = await confirmVerificationCode({
      channel,
      destination,
      purpose,
      code,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(
      { ok: true, verificationToken: result.verificationToken },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    console.error(
      "verify confirm failed",
      error instanceof Error ? error.message : "unknown",
    );
    return NextResponse.json({ error: "Could not verify code." }, { status: 500 });
  }
}

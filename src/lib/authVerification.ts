import { createHash, randomInt } from "node:crypto";
import { newId, hashToken } from "@/lib/auth";
import {
  deliverEmailOtp,
  deliverSmsOtp,
  emailOtpConfigured,
  smsOtpConfigured,
} from "@/lib/otpDelivery";
import { sql } from "@/lib/db";

export type VerifyChannel = "email" | "phone";
export type VerifyPurpose = "register" | "login";

const CODE_TTL_MS = 10 * 60 * 1000;
const TOKEN_TTL_MS = 30 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function hashCode(code: string): string {
  return createHash("sha256").update(`kp-otp:${code}`).digest("hex");
}

function generateCode(): string {
  return String(randomInt(100000, 999999));
}

export async function issueVerificationCode(input: {
  channel: VerifyChannel;
  destination: string;
  purpose: VerifyPurpose;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const destination =
    input.channel === "email"
      ? input.destination.trim().toLowerCase()
      : input.destination.trim();
  if (!destination) return { ok: false, error: "Enter a valid destination." };

  if (input.channel === "email" && !emailOtpConfigured()) {
    return {
      ok: false,
      error:
        "Email verification is not configured yet. Add RESEND_API_KEY and AUTH_OTP_FROM_EMAIL in Secrets, then try again.",
    };
  }
  if (input.channel === "phone" && !smsOtpConfigured()) {
    return {
      ok: false,
      error:
        "Mobile OTP is not configured yet. Register with email, or add Twilio SMS secrets.",
    };
  }

  // Invalidate prior open codes for this destination/purpose
  await sql(
    `update auth_verification_codes
     set consumed_at = now()
     where channel = $1 and destination = $2 and purpose = $3 and consumed_at is null`,
    [input.channel, destination, input.purpose],
  );

  const code = generateCode();
  const expires = new Date(Date.now() + CODE_TTL_MS);
  await sql(
    `insert into auth_verification_codes
       (id, channel, destination, purpose, code_hash, expires_at)
     values ($1,$2,$3,$4,$5,$6)`,
    [newId(), input.channel, destination, input.purpose, hashCode(code), expires.toISOString()],
  );

  try {
    if (input.channel === "email") {
      await deliverEmailOtp(destination, code);
    } else {
      await deliverSmsOtp(destination, code);
    }
  } catch (err) {
    await sql(`update auth_verification_codes set consumed_at = now() where code_hash = $1`, [
      hashCode(code),
    ]);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not deliver verification code.",
    };
  }

  return { ok: true };
}

export async function confirmVerificationCode(input: {
  channel: VerifyChannel;
  destination: string;
  purpose: VerifyPurpose;
  code: string;
}): Promise<{ ok: true; verificationToken: string } | { ok: false; error: string }> {
  const destination =
    input.channel === "email"
      ? input.destination.trim().toLowerCase()
      : input.destination.trim();
  const code = input.code.trim();
  if (!/^\d{6}$/.test(code)) {
    return { ok: false, error: "Enter the 6-digit verification code." };
  }

  const rows = await sql<{
    id: string;
    code_hash: string;
    attempts: number;
    expires_at: Date | string;
  }>(
    `select id, code_hash, attempts, expires_at
     from auth_verification_codes
     where channel = $1 and destination = $2 and purpose = $3 and consumed_at is null
     order by created_at desc
     limit 1`,
    [input.channel, destination, input.purpose],
  );
  const row = rows[0];
  if (!row) {
    return { ok: false, error: "No active verification code. Request a new one." };
  }

  const expiresAt =
    typeof row.expires_at === "string" ? new Date(row.expires_at) : row.expires_at;
  if (expiresAt.getTime() < Date.now()) {
    await sql(`update auth_verification_codes set consumed_at = now() where id = $1`, [
      row.id,
    ]);
    return { ok: false, error: "Code expired. Request a new one." };
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    await sql(`update auth_verification_codes set consumed_at = now() where id = $1`, [
      row.id,
    ]);
    return { ok: false, error: "Too many attempts. Request a new code." };
  }

  if (row.code_hash !== hashCode(code)) {
    await sql(
      `update auth_verification_codes set attempts = attempts + 1 where id = $1`,
      [row.id],
    );
    return { ok: false, error: "Incorrect verification code." };
  }

  await sql(`update auth_verification_codes set consumed_at = now() where id = $1`, [
    row.id,
  ]);

  const rawToken = `${newId()}${newId()}`.replace(/-/g, "");
  const tokenExpires = new Date(Date.now() + TOKEN_TTL_MS);
  await sql(
    `insert into auth_verification_tokens
       (id, channel, destination, purpose, token_hash, expires_at)
     values ($1,$2,$3,$4,$5,$6)`,
    [
      newId(),
      input.channel,
      destination,
      input.purpose,
      hashToken(rawToken),
      tokenExpires.toISOString(),
    ],
  );

  return { ok: true, verificationToken: rawToken };
}

export async function consumeVerificationToken(input: {
  token: string;
  channel: VerifyChannel;
  destination: string;
  purpose: VerifyPurpose;
}): Promise<boolean> {
  const destination =
    input.channel === "email"
      ? input.destination.trim().toLowerCase()
      : input.destination.trim();
  const rows = await sql<{ id: string; expires_at: Date | string }>(
    `select id, expires_at from auth_verification_tokens
     where token_hash = $1
       and channel = $2
       and destination = $3
       and purpose = $4
       and consumed_at is null
     limit 1`,
    [hashToken(input.token), input.channel, destination, input.purpose],
  );
  const row = rows[0];
  if (!row) return false;
  const expiresAt =
    typeof row.expires_at === "string" ? new Date(row.expires_at) : row.expires_at;
  if (expiresAt.getTime() < Date.now()) return false;
  await sql(`update auth_verification_tokens set consumed_at = now() where id = $1`, [
    row.id,
  ]);
  return true;
}

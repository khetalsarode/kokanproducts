/**
 * Out-of-band OTP delivery. Codes are never returned to the browser.
 * Email: Resend API when RESEND_API_KEY + AUTH_OTP_FROM_EMAIL are set.
 * Phone: Twilio when TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_FROM_NUMBER are set.
 */

export function emailOtpConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() && process.env.AUTH_OTP_FROM_EMAIL?.trim(),
  );
}

export function smsOtpConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID?.trim() &&
      process.env.TWILIO_AUTH_TOKEN?.trim() &&
      process.env.TWILIO_FROM_NUMBER?.trim(),
  );
}

export async function deliverEmailOtp(to: string, code: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.AUTH_OTP_FROM_EMAIL?.trim();
  if (!apiKey || !from) {
    throw new Error("Email verification is not configured.");
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Your KonkanProducts verification code",
      text: `Your verification code is ${code}. It expires in 10 minutes. If you did not request this, ignore this email.`,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("resend otp failed", res.status, detail.slice(0, 200));
    throw new Error("Could not send verification email.");
  }
}

export async function deliverSmsOtp(to: string, code: string): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_FROM_NUMBER?.trim();
  if (!sid || !token || !from) {
    throw new Error("SMS verification is not configured.");
  }
  const body = new URLSearchParams({
    To: to,
    From: from,
    Body: `KonkanProducts code: ${code}. Expires in 10 minutes.`,
  });
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body,
    },
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("twilio otp failed", res.status, detail.slice(0, 200));
    throw new Error("Could not send verification SMS.");
  }
}

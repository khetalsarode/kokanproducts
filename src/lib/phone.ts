/** Normalize Indian-style phone numbers to digits with optional leading +91. */
export function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (digits.length > 10 && trimmed.startsWith("+")) return `+${digits}`;
  return `+${digits}`;
}

export function isValidPhone(raw: string): boolean {
  const n = normalizePhone(raw);
  // E.164-ish: + and 10–15 digits
  return /^\+\d{10,15}$/.test(n);
}

export function isValidEmail(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim());
}

/** Synthetic email for phone-only customer accounts (email column is required). */
export function phoneAccountEmail(phone: string): string {
  const n = normalizePhone(phone).replace(/\D/g, "");
  return `m${n}@mobile.konkanproducts.local`;
}

export function isPhoneAccountEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith("@mobile.konkanproducts.local");
}

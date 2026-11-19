/**
 * Resolve a safe app origin for payment return/notify URLs.
 * Never trusts an arbitrary client-supplied host.
 */
export function safeAppOrigin(request: Request, claimed?: string): string {
  const requestOrigin = new URL(request.url).origin;
  const envOrigin = (process.env.APP_ORIGIN || process.env.NEXT_PUBLIC_APP_URL || "")
    .trim()
    .replace(/\/$/, "");

  const allowed = new Set<string>([requestOrigin]);
  if (envOrigin) {
    try {
      allowed.add(new URL(envOrigin).origin);
    } catch {
      /* ignore invalid APP_ORIGIN */
    }
  }

  const candidate = (claimed || "").trim().replace(/\/$/, "");
  if (candidate) {
    try {
      const origin = new URL(candidate).origin;
      if (allowed.has(origin)) return origin;
    } catch {
      /* ignore invalid claimed origin */
    }
  }

  return envOrigin ? new URL(envOrigin).origin : requestOrigin;
}

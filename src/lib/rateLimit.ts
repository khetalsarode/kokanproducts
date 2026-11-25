import { sql } from "@/lib/db";

/**
 * Durable rate limiter backed by Postgres (shared across instances).
 * Falls back to a process-local Map only if the DB write fails.
 */
const memoryFallback = new Map<string, { count: number; resetAt: number }>();

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ ok: true } | { ok: false; retryAfterSec: number }> {
  const now = Date.now();
  const resetAt = new Date(now + windowMs);

  try {
    const rows = await sql<{ hit_count: number; reset_at: Date | string }>(
      `insert into rate_limit_buckets (bucket_key, hit_count, reset_at)
       values ($1, 1, $2)
       on conflict (bucket_key) do update set
         hit_count = case
           when rate_limit_buckets.reset_at <= now() then 1
           else rate_limit_buckets.hit_count + 1
         end,
         reset_at = case
           when rate_limit_buckets.reset_at <= now() then excluded.reset_at
           else rate_limit_buckets.reset_at
         end
       returning hit_count, reset_at`,
      [key, resetAt.toISOString()],
    );
    const row = rows[0];
    if (!row) return { ok: true };
    const end =
      typeof row.reset_at === "string" ? new Date(row.reset_at) : row.reset_at;
    if (row.hit_count > limit) {
      return {
        ok: false,
        retryAfterSec: Math.max(1, Math.ceil((end.getTime() - now) / 1000)),
      };
    }
    return { ok: true };
  } catch {
    const bucket = memoryFallback.get(key);
    if (!bucket || bucket.resetAt <= now) {
      memoryFallback.set(key, { count: 1, resetAt: now + windowMs });
      return { ok: true };
    }
    if (bucket.count >= limit) {
      return {
        ok: false,
        retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000),
      };
    }
    bucket.count += 1;
    return { ok: true };
  }
}

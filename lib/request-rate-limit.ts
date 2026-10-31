import { NextRequest } from "next/server";
import { db, rateLimits } from "@/db";
import { and, eq, sql } from "drizzle-orm";
import { clientIpFromHeaders, rateLimitBucket } from "@/lib/client-ip";

// See client-ip.ts: behind Cloudflare the visitor is in CF-Connecting-IP, not X-Forwarded-For.
export function clientIp(req: NextRequest): string {
  return clientIpFromHeaders(req.headers);
}

/**
 * Fixed-window per-IP rate limit backed by a single row per (key, window).
 * windowMinutes buckets are aligned to the epoch, so all requests in the same
 * window share one row and the increment is a single atomic upsert.
 */
export async function checkRateLimit(
  req: NextRequest,
  route: string,
  limit: number,
  windowMinutes: number
): Promise<{ ok: boolean; remaining: number }> {
  const ip = clientIp(req);
  const key = `${route}:${rateLimitBucket(ip)}`;
  const windowMs = windowMinutes * 60 * 1000;
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);

  const [row] = await db
    .insert(rateLimits)
    .values({ key, windowStart, count: 1 })
    .onConflictDoUpdate({
      target: [rateLimits.key, rateLimits.windowStart],
      set: { count: sql`${rateLimits.count} + 1` },
    })
    .returning({ count: rateLimits.count });

  const count = row?.count ?? 1;
  return { ok: count <= limit, remaining: Math.max(0, limit - count) };
}

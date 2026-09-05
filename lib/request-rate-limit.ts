import { NextRequest } from "next/server";
import { db, rateLimits } from "@/db";
import { and, eq, sql } from "drizzle-orm";

function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
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
  const key = `${route}:${ip}`;
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

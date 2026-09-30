import { NextRequest, NextResponse } from "next/server";
import { db, specials } from "@/db";
import { and, eq, gt, sql } from "drizzle-orm";
import { checkRateLimit } from "@/lib/request-rate-limit";

// Purely informational ("14 of 20 claimed") -- see db/schema.ts's flashClaimCount
// comment for why this is never a verified/enforced claim. One tap per IP per
// special, same shape as /api/specials/[id]/confirm's rate limit, just a much
// lower cap since "I'm claiming this" should realistically happen once, not up to
// 3 times a day like a confirm might across separate visits.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const specialId = Number(id);
  if (!Number.isInteger(specialId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const { ok: withinLimit } = await checkRateLimit(req, `special-claim-flash-${specialId}`, 1, 60 * 24);
  if (!withinLimit) {
    return NextResponse.json({ error: "already claimed" }, { status: 429 });
  }

  // Only increments a still-live flash special -- a claim tap that lands the instant
  // after expiry (or after the venue ended it early) shouldn't nudge a stale count.
  const [updated] = await db
    .update(specials)
    .set({ flashClaimCount: sql`${specials.flashClaimCount} + 1` })
    .where(and(eq(specials.id, specialId), gt(specials.flashExpiresAt, sql`now()`)))
    .returning({ flashClaimCount: specials.flashClaimCount });

  if (!updated) {
    return NextResponse.json({ error: "not found or expired" }, { status: 400 });
  }

  return NextResponse.json({ ok: true, flashClaimCount: updated.flashClaimCount });
}

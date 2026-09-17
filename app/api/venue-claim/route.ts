import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, venues, venueClaimRequests } from "@/db";
import { eq } from "drizzle-orm";
import { checkRateLimit } from "@/lib/request-rate-limit";

const claimSchema = z.object({
  venueId: z.number().int().positive(),
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(300),
  phone: z.string().trim().max(50).nullable(),
  role: z.string().trim().max(100).nullable(),
  message: z.string().trim().max(2000).nullable(),
});

export async function POST(req: NextRequest) {
  // A claim gates real access to editing a venue's live listing -- same posture as
  // /api/submit's rate limit, tight enough to block abuse without bothering a genuine
  // one-time claimant.
  const { ok: withinLimit } = await checkRateLimit(req, "venue-claim", 5, 60);
  if (!withinLimit) {
    return NextResponse.json({ error: "too many requests, try again later" }, { status: 429 });
  }

  const parsed = claimSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "invalid payload" }, {
      status: 400,
    });
  }
  const { venueId, name, email, phone, role, message } = parsed.data;

  const [venue] = await db.select({ id: venues.id, claimedAt: venues.claimedAt }).from(venues).where(eq(venues.id, venueId)).limit(1);
  if (!venue) {
    return NextResponse.json({ error: "unknown venue" }, { status: 400 });
  }
  if (venue.claimedAt !== null) {
    return NextResponse.json({ error: "this venue has already been claimed" }, { status: 409 });
  }

  await db.insert(venueClaimRequests).values({ venueId, name, email, phone, role, message });

  return NextResponse.json({ ok: true });
}

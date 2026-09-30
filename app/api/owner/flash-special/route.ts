import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, specials, venues, regions, specialCategory } from "@/db";
import { and, eq, isNull, gt, sql } from "drizzle-orm";
import { getOwnerSession } from "@/lib/venue-owner-auth";
import { sendPushToRegion } from "@/lib/push-send";
import { formatPrice } from "@/lib/format";

// Presets rather than a free-form minutes input -- a flash special is meant to be
// posted in seconds from a phone behind the bar, not filled out like a form. 15
// min covers a genuine "next 15 minutes only" rush; 4 hr covers "the rest of
// tonight" without ever silently running into tomorrow.
const ALLOWED_DURATION_MINUTES = [15, 30, 60, 120, 240] as const;

const createSchema = z.object({
  venueId: z.number().int().positive(),
  title: z.string().trim().min(1).max(200),
  priceCents: z.number().int().nonnegative().nullable(),
  category: z.enum(specialCategory),
  durationMinutes: z.number().int().refine((v) => (ALLOWED_DURATION_MINUTES as readonly number[]).includes(v)),
  // Null = no cap, just a time limit ("happy hour from 4-6"). Set = "first N
  // people" -- see db/schema.ts's flashClaimLimit comment for why this is never
  // enforced as a hard cutoff.
  claimLimit: z.number().int().positive().max(999).nullable(),
});

// Mirrors app/api/owner/specials/route.ts's ownership check exactly (session.venueIds
// membership, never trusting the body's venueId alone) -- see that route's comment for
// the full reasoning. Kept as its own route rather than folded into the general
// specials POST because a flash special's shape (duration preset, claim limit, no
// dayOfWeek/startTime/endTime) is different enough that sharing one schema would mean
// a pile of fields that are only sometimes meaningful.
export async function POST(req: NextRequest) {
  const session = await getOwnerSession(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "invalid payload" }, {
      status: 400,
    });
  }
  const { venueId, durationMinutes, claimLimit, ...data } = parsed.data;
  if (!session.venueIds.includes(venueId)) {
    return NextResponse.json({ error: "not your venue" }, { status: 403 });
  }

  const [venue] = await db
    .select({ regionId: venues.regionId, name: venues.name, regionSlug: regions.slug })
    .from(venues)
    .innerJoin(regions, eq(venues.regionId, regions.id))
    .where(eq(venues.id, venueId))
    .limit(1);
  if (!venue) {
    return NextResponse.json({ error: "venue not found" }, { status: 400 });
  }

  // One live flash special per venue at a time -- stacking several would compete
  // for the same "this is urgent" attention the whole feature depends on, and a
  // venue posting a second one almost always means they meant to replace the
  // first, not run both. Checked here rather than a DB constraint since "live"
  // depends on flashExpiresAt vs now(), not a fixed column value a unique index
  // could enforce.
  const [existing] = await db
    .select({ id: specials.id })
    .from(specials)
    .where(
      and(
        eq(specials.venueId, venueId),
        isNull(specials.archivedAt),
        gt(specials.flashExpiresAt, sql`now()`)
      )
    )
    .limit(1);
  if (existing) {
    return NextResponse.json({ error: "already have a live flash special -- end it first" }, { status: 409 });
  }

  const flashExpiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

  const [created] = await db
    .insert(specials)
    .values({
      venueId,
      regionId: venue.regionId,
      ...data,
      dayOfWeek: null,
      isMonthly: false,
      sourceUrl: null,
      lastVerifiedAt: new Date(),
      flashExpiresAt,
      flashClaimLimit: claimLimit,
    })
    .returning({ id: specials.id });

  // Fire-and-forget from the caller's perspective -- sendPushToRegion never throws
  // (see its own comment) and is a no-op until VAPID keys are configured, so this
  // never affects whether posting the flash special itself succeeds. Awaited rather
  // than truly backgrounded because serverless/edge runtimes can kill work after the
  // response is sent; this route isn't hot enough for the extra latency to matter.
  const price = formatPrice(data.priceCents);
  await sendPushToRegion(venue.regionId, {
    title: `Flash deal at ${venue.name}`,
    body: price ? `${data.title} — ${price}` : data.title,
    url: `/${venue.regionSlug}`,
  });

  return NextResponse.json({ ok: true, id: created.id, flashExpiresAt });
}

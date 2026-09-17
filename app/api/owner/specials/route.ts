import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, specials, venues, specialCategory } from "@/db";
import { eq } from "drizzle-orm";
import { getOwnerSession } from "@/lib/venue-owner-auth";

const createSchema = z.object({
  venueId: z.number().int().positive(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).nullable(),
  priceCents: z.number().int().nonnegative().nullable(),
  dayOfWeek: z.number().int().min(0).max(6).nullable(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  category: z.enum(specialCategory),
});

// Every owner-created row is scoped to a venueId the session actually owns -- never
// trusted from the request body alone (moat layer 3: an owner can have several venues,
// so the body must say which one, but membership in session.venueIds is what actually
// authorizes it) -- and always written with sourceUrl: null, the exact convention
// cron/upsert.ts's replaceVenueSpecials already treats as protected from the nightly
// scrape overwrite (see the plan this shipped from: "Why sourceUrl: null is enough").
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
  const { venueId, ...data } = parsed.data;
  if (!session.venueIds.includes(venueId)) {
    return NextResponse.json({ error: "not your venue" }, { status: 403 });
  }

  const [venue] = await db.select({ regionId: venues.regionId }).from(venues).where(eq(venues.id, venueId)).limit(1);
  if (!venue) {
    return NextResponse.json({ error: "venue not found" }, { status: 400 });
  }

  const [created] = await db
    .insert(specials)
    .values({
      venueId,
      regionId: venue.regionId,
      ...data,
      sourceUrl: null,
      lastVerifiedAt: new Date(),
    })
    .returning({ id: specials.id });

  return NextResponse.json({ ok: true, id: created.id });
}

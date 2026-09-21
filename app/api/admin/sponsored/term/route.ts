import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, chatTermSponsors, monetizationSettings } from "@/db";
import { and, eq, gt, sql } from "drizzle-orm";
import { isAdminAuthed } from "@/lib/admin-auth";

// null venueId clears the sponsorship for this (region, term); non-null replaces
// whatever was active before -- at most one active sponsor per (regionId, term) at a
// time, same "set, not add" shape as category sponsors. Either way, the currently-active
// row (if any) is soft-expired (until = now), never deleted -- preserves the sale record
// and revenue history instead of losing it the moment a term gets cleared or resold.
const bodySchema = z.object({
  regionId: z.number().int().positive(),
  term: z.string().trim().min(1).max(100),
  venueId: z.number().int().positive().nullable(),
  days: z.number().int().positive().max(365).nullable(),
});

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
  const { regionId, term, venueId, days } = parsed.data;

  const activeScope = and(
    eq(chatTermSponsors.regionId, regionId),
    sql`lower(${chatTermSponsors.term}) = lower(${term})`,
    gt(chatTermSponsors.until, new Date())
  );

  await db.update(chatTermSponsors).set({ until: new Date() }).where(activeScope);

  if (venueId === null) {
    return NextResponse.json({ ok: true, cleared: true });
  }
  if (!days) {
    return NextResponse.json({ error: "days is required to sponsor a term" }, { status: 400 });
  }

  // Flat rate, not typed per sale -- same monetization_settings row every other
  // product's price lives in (app/api/admin/settings/route.ts), editable there.
  const [settings] = await db
    .select({ priceCentsPerDay: monetizationSettings.priceCentsPerDay })
    .from(monetizationSettings)
    .where(eq(monetizationSettings.productType, "chat_term_sponsor"));
  if (!settings) {
    return NextResponse.json({ error: "chat_term_sponsor pricing isn't configured" }, { status: 500 });
  }

  const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const totalPriceCents = settings.priceCentsPerDay * days;

  const [created] = await db
    .insert(chatTermSponsors)
    .values({
      regionId,
      term,
      venueId,
      priceCentsPerDay: settings.priceCentsPerDay,
      totalPriceCents,
      until,
    })
    .returning();

  return NextResponse.json({ ok: true, sponsor: created });
}

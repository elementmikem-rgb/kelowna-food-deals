import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, categorySponsors } from "@/db";
import { specialCategory, eventType, sponsorCategoryKind, type SpecialCategory, type EventType } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { isAdminAuthed } from "@/lib/admin-auth";

// null sponsorName clears the sponsor for this (region, kind, category) (deletes the
// row); non-null replaces whatever was there before -- at most one sponsor per
// (region, kind, category) is meaningful at a time, so this is a set, not an add.
const bodySchema = z.object({
  regionId: z.number().int().positive(),
  kind: z.enum(sponsorCategoryKind),
  sponsorName: z.string().trim().min(1).max(200).nullable(),
  sponsorUrl: z.string().trim().url().max(500).nullable().optional(),
  days: z.number().int().positive().max(365).nullable().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ category: string }> }
) {
  if (!(await isAdminAuthed(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
  const { regionId, kind, sponsorName, sponsorUrl, days } = parsed.data;

  const { category: rawCategory } = await params;
  const validCategory =
    kind === "event"
      ? eventType.includes(rawCategory as EventType)
      : specialCategory.includes(rawCategory as SpecialCategory);
  if (!validCategory) {
    return NextResponse.json({ error: "invalid category" }, { status: 400 });
  }
  const category = rawCategory as SpecialCategory | EventType;

  const scope = and(
    eq(categorySponsors.regionId, regionId),
    eq(categorySponsors.kind, kind),
    eq(categorySponsors.category, category)
  );

  await db.delete(categorySponsors).where(scope);

  if (sponsorName === null) {
    return NextResponse.json({ ok: true, cleared: true });
  }

  const sponsorUntil = days ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null;
  const [created] = await db
    .insert(categorySponsors)
    .values({ regionId, kind, category, sponsorName, sponsorUrl: sponsorUrl ?? null, sponsorUntil })
    .returning();

  return NextResponse.json({ ok: true, sponsor: created });
}

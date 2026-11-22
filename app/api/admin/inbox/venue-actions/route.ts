import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { db, specials, specialCategory, venues } from "@/db";
import { isAdminAuthed } from "@/lib/admin-auth";
import { appendNote, buildSpecialRows, normalizePhone } from "@/lib/venue-write";
import { dayName } from "@/lib/inbox-venue-format";

// "Apply from the reply": writes one confirmed detail from a venue's email onto its listing. Called only when
// the admin clicks Save after reviewing an editable form, never automatically.
const specialSchema = z.object({
  title: z.string().trim().min(1).max(80),
  description: z.string().max(300).nullable().optional(),
  priceCents: z.number().int().min(0).max(100000).nullable().optional(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).max(7),
  startTime: z.string().max(5).nullable().optional(),
  endTime: z.string().max(5).nullable().optional(),
  category: z.enum(specialCategory),
});

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("set_phone"), venueId: z.number().int().positive(), phone: z.string().min(7).max(30) }),
  z.object({ action: z.literal("add_special"), venueId: z.number().int().positive(), special: specialSchema }),
]);

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "invalid payload" }, { status: 400 });
  }
  const body = parsed.data;

  const [venue] = await db
    .select({ id: venues.id, name: venues.name, regionId: venues.regionId, phone: venues.phone, note: venues.checkedNoListingsNote })
    .from(venues)
    .where(eq(venues.id, body.venueId))
    .limit(1);
  if (!venue) return NextResponse.json({ error: "venue not found" }, { status: 404 });

  const now = new Date();
  const isoDate = now.toISOString().slice(0, 10);

  if (body.action === "set_phone") {
    const phone = normalizePhone(body.phone);
    if (!phone) return NextResponse.json({ error: "that is not a ten digit phone number" }, { status: 400 });
    if (phone === venue.phone) return NextResponse.json({ ok: true, unchanged: true });
    await db
      .update(venues)
      .set({
        phone,
        checkedNoListingsNote: appendNote(venue.note, isoDate, `phone changed from ${venue.phone ?? "none"} to ${phone} per the owner's email reply.`),
      })
      .where(eq(venues.id, venue.id));
    return NextResponse.json({ ok: true, phone });
  }

  // add_special
  if (venue.regionId === null) return NextResponse.json({ error: "venue has no region" }, { status: 400 });
  const rows = buildSpecialRows({ id: venue.id, regionId: venue.regionId }, body.special, now, isoDate);

  // Skip a day that already has an active special with the same title, so a double click cannot duplicate it.
  const existing = await db
    .select({ title: specials.title, dayOfWeek: specials.dayOfWeek })
    .from(specials)
    .where(and(eq(specials.venueId, venue.id), isNull(specials.archivedAt)));
  const has = (title: string, dow: number | null) =>
    existing.some((e) => e.title.trim().toLowerCase() === title.toLowerCase() && (e.dayOfWeek ?? null) === dow);
  const fresh = rows.filter((r) => !has(r.title, r.dayOfWeek));
  if (fresh.length === 0) return NextResponse.json({ ok: true, added: 0, alreadyThere: true });

  const inserted = await db.insert(specials).values(fresh).returning({ id: specials.id });
  const when = fresh.map((r) => dayName(r.dayOfWeek)).join(", ");
  await db
    .update(venues)
    .set({ checkedNoListingsNote: appendNote(venue.note, isoDate, `owner's email reply confirmed "${rows[0].title}" (${when}); special hand-entered.`) })
    .where(eq(venues.id, venue.id));
  return NextResponse.json({ ok: true, added: inserted.length, ids: inserted.map((i) => i.id) });
}

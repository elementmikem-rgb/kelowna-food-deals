import { and, eq, isNull } from "drizzle-orm";
import { db, specials, venues } from "@/db";
import { appendNote, buildSpecialRows, normalizePhone, type SpecialInput } from "@/lib/venue-write";
import { dayName } from "@/lib/inbox-venue-format";

// The two writes the admin inbox can make to a listing. Shared by the "apply from the reply" buttons
// (app/api/admin/inbox/venue-actions) and by approving a proposal (app/api/admin/inbox/proposals/[id]/apply).
// Callers are responsible for the human confirmation; nothing here runs on its own.

async function loadVenue(venueId: number) {
  const [venue] = await db
    .select({ id: venues.id, name: venues.name, regionId: venues.regionId, phone: venues.phone, note: venues.checkedNoListingsNote })
    .from(venues)
    .where(eq(venues.id, venueId))
    .limit(1);
  return venue ?? null;
}

export type ApplyResult<T = Record<string, never>> =
  | ({ ok: true } & T)
  | { ok: false; status: number; error: string };

export async function setVenuePhone(
  venueId: number,
  rawPhone: string,
  now: Date = new Date()
): Promise<ApplyResult<{ phone?: string; unchanged?: boolean }>> {
  const venue = await loadVenue(venueId);
  if (!venue) return { ok: false, status: 404, error: "venue not found" };
  const phone = normalizePhone(rawPhone);
  if (!phone) return { ok: false, status: 400, error: "that is not a ten digit phone number" };
  if (phone === venue.phone) return { ok: true, unchanged: true };
  const isoDate = now.toISOString().slice(0, 10);
  await db
    .update(venues)
    .set({
      phone,
      checkedNoListingsNote: appendNote(venue.note, isoDate, `phone changed from ${venue.phone ?? "none"} to ${phone} per the owner's email reply.`),
    })
    .where(eq(venues.id, venue.id));
  return { ok: true, phone };
}

export async function addSpecialToVenue(
  venueId: number,
  input: SpecialInput,
  now: Date = new Date()
): Promise<ApplyResult<{ added: number; alreadyThere?: boolean; ids?: number[] }>> {
  const venue = await loadVenue(venueId);
  if (!venue) return { ok: false, status: 404, error: "venue not found" };
  if (venue.regionId === null) return { ok: false, status: 400, error: "venue has no region" };
  const isoDate = now.toISOString().slice(0, 10);
  const rows = buildSpecialRows({ id: venue.id, regionId: venue.regionId }, input, now, isoDate);

  // Skip a day that already has an active special with the same title, so a double click cannot duplicate it.
  const existing = await db
    .select({ title: specials.title, dayOfWeek: specials.dayOfWeek })
    .from(specials)
    .where(and(eq(specials.venueId, venue.id), isNull(specials.archivedAt)));
  const has = (title: string, dow: number | null) =>
    existing.some((e) => e.title.trim().toLowerCase() === title.toLowerCase() && (e.dayOfWeek ?? null) === dow);
  const fresh = rows.filter((r) => !has(r.title, r.dayOfWeek));
  if (fresh.length === 0) return { ok: true, added: 0, alreadyThere: true };

  const inserted = await db.insert(specials).values(fresh).returning({ id: specials.id });
  const when = fresh.map((r) => dayName(r.dayOfWeek)).join(", ");
  await db
    .update(venues)
    .set({ checkedNoListingsNote: appendNote(venue.note, isoDate, `owner's email reply confirmed "${rows[0].title}" (${when}); special hand-entered.`) })
    .where(eq(venues.id, venue.id));
  return { ok: true, added: inserted.length, ids: inserted.map((i) => i.id) };
}

import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db, venues, specials, events, venuePhotos, outreachSends } from "@/db";
import { formatSpecialLine } from "@/lib/inbox-venue-format";

// A read-only snapshot of a venue for the inbox side panel, so a reply can be compared with what the
// listing currently says. Nothing here writes.
export interface VenuePanelData {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  contactEmail: string | null;
  claimed: boolean;
  unsubscribed: boolean;
  specials: string[]; // one line each, see formatSpecialLine
  eventCount: number;
  photoCount: number;
  note: string | null; // the audit note (checked_no_listings_note), trimmed
  sends: { kind: string; status: string; at: string; opened: boolean; clicked: boolean }[];
}

export async function getVenuePanel(venueId: number): Promise<VenuePanelData | null> {
  const [v] = await db
    .select({
      id: venues.id,
      name: venues.name,
      address: venues.address,
      phone: venues.phone,
      website: venues.website,
      contactEmail: venues.contactEmail,
      claimedAt: venues.claimedAt,
      unsubscribedAt: venues.unsubscribedAt,
      note: venues.checkedNoListingsNote,
    })
    .from(venues)
    .where(eq(venues.id, venueId))
    .limit(1);
  if (!v) return null;

  const [activeSpecials, [eventRow], [photoRow], sends] = await Promise.all([
    db
      .select({
        title: specials.title,
        dayOfWeek: specials.dayOfWeek,
        startTime: specials.startTime,
        endTime: specials.endTime,
        priceCents: specials.priceCents,
      })
      .from(specials)
      .where(and(eq(specials.venueId, venueId), isNull(specials.archivedAt)))
      .orderBy(specials.dayOfWeek)
      .limit(12),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(events)
      .where(and(eq(events.venueId, venueId), isNull(events.archivedAt))),
    db.select({ n: sql<number>`count(*)::int` }).from(venuePhotos).where(eq(venuePhotos.venueId, venueId)),
    db
      .select({
        kind: outreachSends.kind,
        status: outreachSends.status,
        createdAt: outreachSends.createdAt,
        openedAt: outreachSends.openedAt,
        clickedAt: outreachSends.clickedAt,
      })
      .from(outreachSends)
      .where(and(eq(outreachSends.venueId, venueId), eq(outreachSends.hiddenFromInbox, false)))
      .orderBy(desc(outreachSends.createdAt))
      .limit(4),
  ]);

  return {
    id: v.id,
    name: v.name,
    address: v.address,
    phone: v.phone,
    website: v.website,
    contactEmail: v.contactEmail,
    claimed: v.claimedAt !== null,
    unsubscribed: v.unsubscribedAt !== null,
    specials: activeSpecials.map(formatSpecialLine),
    eventCount: eventRow?.n ?? 0,
    photoCount: photoRow?.n ?? 0,
    note: v.note ? v.note.slice(0, 400) : null,
    sends: sends.map((s) => ({
      kind: s.kind,
      status: s.status,
      at: s.createdAt.toISOString(),
      opened: s.openedAt !== null,
      clicked: s.clickedAt !== null,
    })),
  };
}

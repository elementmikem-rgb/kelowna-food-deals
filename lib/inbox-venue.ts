import { and, desc, eq, isNull, ne, or, sql } from "drizzle-orm";
import { db, venues, specials, events, venuePhotos, outreachSends, inboundEmails } from "@/db";
import { emailBasis, type EmailBasis } from "@/lib/email-basis";
import { formatSpecialLine, formatOwnerFunnel } from "@/lib/inbox-venue-format";
import { siblingLine, summarizeSiblings } from "@/lib/inbox-siblings";

// A read-only snapshot of a venue for the inbox side panel, so a reply can be compared with what the
// listing currently says. Nothing here writes.
export interface VenuePanelData {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  contactEmail: string | null;
  emailBasis: EmailBasis | null; // how well we can show we may email that address (null when there is none)
  claimed: boolean;
  unsubscribed: boolean;
  specials: string[]; // one line each, see formatSpecialLine
  eventCount: number;
  photoCount: number;
  siblings: string | null; // other locations in the same chain or sharing this email address, as one line
  ownerFunnel: string | null; // credits, live Boosts and photos for a claimed venue (see formatOwnerFunnel)
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
      contactEmailSource: venues.contactEmailSource,
      contactEmailVerifiedAt: venues.contactEmailVerifiedAt,
      creditBalance: venues.creditBalance,
      chainId: venues.chainId,
    })
    .from(venues)
    .where(eq(venues.id, venueId))
    .limit(1);
  if (!v) return null;

  const wroteUs = v.contactEmail
    ? (
        await db
          .select({ id: inboundEmails.id })
          .from(inboundEmails)
          .where(and(eq(inboundEmails.venueId, venueId), sql`lower(${inboundEmails.fromEmail}) = lower(${v.contactEmail})`))
          .limit(1)
      ).length > 0
    : false;

  // Other locations in the same chain or with the same contact email. Active venues only, capped.
  const sameChain = v.chainId !== null ? eq(venues.chainId, v.chainId) : undefined;
  const sameEmail = v.contactEmail ? sql`lower(${venues.contactEmail}) = lower(${v.contactEmail})` : undefined;
  const siblingCondition = or(sameChain, sameEmail);
  const siblingRows = siblingCondition
    ? await db
        .select({
          id: venues.id,
          name: venues.name,
          city: venues.city,
          viaChain: v.chainId !== null ? sql<boolean>`${venues.chainId} = ${v.chainId}` : sql<boolean>`false`,
          viaEmail: v.contactEmail ? sql<boolean>`lower(${venues.contactEmail}) = lower(${v.contactEmail})` : sql<boolean>`false`,
        })
        .from(venues)
        .where(and(ne(venues.id, venueId), eq(venues.active, true), siblingCondition))
        .orderBy(venues.name)
        .limit(60)
    : [];

  const [activeSpecials, [eventRow], [photoRow], sends, [boostSpecials], [boostEvents]] = await Promise.all([
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
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(specials)
      .where(and(eq(specials.venueId, venueId), isNull(specials.archivedAt), sql`${specials.boostedUntil} > now()`)),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(events)
      .where(and(eq(events.venueId, venueId), isNull(events.archivedAt), sql`${events.boostedUntil} > now()`)),
  ]);

  return {
    id: v.id,
    name: v.name,
    address: v.address,
    phone: v.phone,
    website: v.website,
    contactEmail: v.contactEmail,
    emailBasis: v.contactEmail
      ? emailBasis({ contactEmail: v.contactEmail, website: v.website, wroteUs, verifiedAt: v.contactEmailVerifiedAt, source: v.contactEmailSource })
      : null,
    claimed: v.claimedAt !== null,
    unsubscribed: v.unsubscribedAt !== null,
    specials: activeSpecials.map(formatSpecialLine),
    eventCount: eventRow?.n ?? 0,
    photoCount: photoRow?.n ?? 0,
    siblings: siblingLine(summarizeSiblings(siblingRows.map((r) => ({ ...r, viaChain: Boolean(r.viaChain), viaEmail: Boolean(r.viaEmail) })), venueId)),
    ownerFunnel: formatOwnerFunnel({
      claimed: v.claimedAt !== null,
      creditBalance: v.creditBalance,
      activeBoosts: (boostSpecials?.n ?? 0) + (boostEvents?.n ?? 0),
      photoCount: photoRow?.n ?? 0,
    }),
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

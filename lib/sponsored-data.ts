import { db, venues, specials, events, categorySponsors, chatTermSponsors, regions } from "@/db";
import { and, asc, eq, gt, gte, lt, isNotNull, isNull, sql } from "drizzle-orm";
import type { SpecialCategory, EventType, SponsorCategoryKind } from "@/db/schema";
import { regionScopeCondition } from "@/lib/admin-region";

export interface FeaturedVenue {
  id: number;
  name: string;
  featuredUntil: Date;
}

export interface PartnerVenue {
  id: number;
  name: string;
  partnerSince: Date;
}

export interface CategorySponsor {
  id: number;
  regionId: number;
  kind: SponsorCategoryKind;
  category: SpecialCategory | EventType;
  sponsorName: string;
  sponsorUrl: string | null;
  sponsorUntil: Date | null;
}

export interface BoostedSpecial {
  id: number;
  venueId: number;
  venueName: string;
  title: string;
  boostedUntil: Date;
}

export interface BoostedEvent {
  id: number;
  venueId: number;
  venueName: string;
  title: string;
  boostedUntil: Date;
}

// Separate, independently-purchasable add-on from the "boost"/Featured placement above --
// see specials.chatBoostedUntil in db/schema.ts. A venue can have either, both, or
// neither.
export interface ChatBoostedSpecial {
  id: number;
  venueId: number;
  venueName: string;
  title: string;
  chatBoostedUntil: Date;
}

export interface ChatBoostedEvent {
  id: number;
  venueId: number;
  venueName: string;
  title: string;
  chatBoostedUntil: Date;
}

export interface VenueOption {
  id: number;
  name: string;
  regionId: number;
}

export interface ChatTermSponsor {
  id: number;
  regionId: number;
  term: string;
  venueId: number;
  venueName: string;
  priceCentsPerDay: number;
  totalPriceCents: number;
  until: Date;
}

export interface ExpiringSoonItem {
  kind: "Featured" | "Boosted special" | "Boosted event" | "Promoted special (chat)" | "Promoted event (chat)" | "Term sponsor (chat)";
  venueName: string;
  detail: string | null; // e.g. the special/event title, or the term
  expiresAt: Date;
}

export interface RegionOption {
  id: number;
  brandName: string;
}

export interface SpecialOption {
  id: number;
  venueId: number;
  title: string;
}

// Only venue-owned events (venueId not null) can be boosted -- a boost's capacity
// scoping resolves its region through bookings.venueId (see booking-availability.ts),
// which a non-venue event (a winery hosting a concert, say) has no way to provide.
export interface EventOption {
  id: number;
  venueId: number;
  title: string;
}

export async function getFeaturedVenues(regionIds: number[] | "all"): Promise<FeaturedVenue[]> {
  const rows = await db
    .select({ id: venues.id, name: venues.name, featuredUntil: venues.featuredUntil })
    .from(venues)
    .where(
      and(
        eq(venues.active, true),
        gt(venues.featuredUntil, new Date()),
        regionScopeCondition(venues.regionId, regionIds)
      )
    )
    .orderBy(asc(venues.featuredUntil));
  return rows as FeaturedVenue[];
}

export async function getBoostedSpecials(regionIds: number[] | "all"): Promise<BoostedSpecial[]> {
  const rows = await db
    .select({
      id: specials.id,
      venueId: specials.venueId,
      venueName: venues.name,
      title: specials.title,
      boostedUntil: specials.boostedUntil,
    })
    .from(specials)
    .innerJoin(venues, eq(specials.venueId, venues.id))
    .where(
      and(
        isNull(specials.archivedAt),
        gt(specials.boostedUntil, new Date()),
        regionScopeCondition(specials.regionId, regionIds)
      )
    )
    .orderBy(asc(specials.boostedUntil));
  return rows as BoostedSpecial[];
}

export async function getBoostedEvents(regionIds: number[] | "all"): Promise<BoostedEvent[]> {
  const rows = await db
    .select({
      id: events.id,
      venueId: events.venueId,
      venueName: venues.name,
      title: events.title,
      boostedUntil: events.boostedUntil,
    })
    .from(events)
    .innerJoin(venues, eq(events.venueId, venues.id))
    .where(
      and(
        isNull(events.archivedAt),
        gt(events.boostedUntil, new Date()),
        regionScopeCondition(events.regionId, regionIds)
      )
    )
    .orderBy(asc(events.boostedUntil));
  return rows as BoostedEvent[];
}

export async function getChatBoostedSpecials(regionIds: number[] | "all"): Promise<ChatBoostedSpecial[]> {
  const rows = await db
    .select({
      id: specials.id,
      venueId: specials.venueId,
      venueName: venues.name,
      title: specials.title,
      chatBoostedUntil: specials.chatBoostedUntil,
    })
    .from(specials)
    .innerJoin(venues, eq(specials.venueId, venues.id))
    .where(
      and(
        isNull(specials.archivedAt),
        gt(specials.chatBoostedUntil, new Date()),
        regionScopeCondition(specials.regionId, regionIds)
      )
    )
    .orderBy(asc(specials.chatBoostedUntil));
  return rows as ChatBoostedSpecial[];
}

export async function getChatBoostedEvents(regionIds: number[] | "all"): Promise<ChatBoostedEvent[]> {
  const rows = await db
    .select({
      id: events.id,
      venueId: events.venueId,
      venueName: venues.name,
      title: events.title,
      chatBoostedUntil: events.chatBoostedUntil,
    })
    .from(events)
    .innerJoin(venues, eq(events.venueId, venues.id))
    .where(
      and(
        isNull(events.archivedAt),
        gt(events.chatBoostedUntil, new Date()),
        regionScopeCondition(events.regionId, regionIds)
      )
    )
    .orderBy(asc(events.chatBoostedUntil));
  return rows as ChatBoostedEvent[];
}

export async function getPartnerVenues(regionIds: number[] | "all"): Promise<PartnerVenue[]> {
  const rows = await db
    .select({ id: venues.id, name: venues.name, partnerSince: venues.partnerSince })
    .from(venues)
    .where(
      and(
        eq(venues.active, true),
        isNotNull(venues.partnerSince),
        regionScopeCondition(venues.regionId, regionIds)
      )
    )
    .orderBy(asc(venues.partnerSince));
  return rows as PartnerVenue[];
}

// One row per category that currently has a sponsor (sponsorUntil null or in the
// future) -- callers needing "is category X sponsored right now" filter this list
// themselves rather than re-querying per category.
export async function getActiveCategorySponsors(regionIds: number[] | "all"): Promise<CategorySponsor[]> {
  const rows = await db
    .select({
      id: categorySponsors.id,
      regionId: categorySponsors.regionId,
      kind: categorySponsors.kind,
      category: categorySponsors.category,
      sponsorName: categorySponsors.sponsorName,
      sponsorUrl: categorySponsors.sponsorUrl,
      sponsorUntil: categorySponsors.sponsorUntil,
    })
    .from(categorySponsors)
    .where(regionScopeCondition(categorySponsors.regionId, regionIds))
    .orderBy(asc(categorySponsors.kind), asc(categorySponsors.category));
  const now = Date.now();
  return rows.filter((r) => r.sponsorUntil === null || r.sponsorUntil.getTime() > now) as CategorySponsor[];
}

// For the admin category-sponsor panel's region picker -- a manual sponsor grant isn't
// necessarily tied to one of our own venues (sponsorName/sponsorUrl are free text there),
// so unlike every other admin panel here it needs its own explicit region choice rather
// than deriving one from a picked venue.
export async function getRegionOptions(regionIds: number[] | "all"): Promise<RegionOption[]> {
  return db
    .select({ id: regions.id, brandName: regions.brandName })
    .from(regions)
    .where(and(eq(regions.active, true), regionScopeCondition(regions.id, regionIds)))
    .orderBy(asc(regions.brandName));
}

export async function getVenueOptions(regionIds: number[] | "all"): Promise<VenueOption[]> {
  return db
    .select({ id: venues.id, name: venues.name, regionId: venues.regionId })
    .from(venues)
    .where(and(eq(venues.active, true), regionScopeCondition(venues.regionId, regionIds)))
    .orderBy(asc(venues.name));
}

export async function getChatTermSponsors(regionIds: number[] | "all"): Promise<ChatTermSponsor[]> {
  const rows = await db
    .select({
      id: chatTermSponsors.id,
      regionId: chatTermSponsors.regionId,
      term: chatTermSponsors.term,
      venueId: chatTermSponsors.venueId,
      venueName: venues.name,
      priceCentsPerDay: chatTermSponsors.priceCentsPerDay,
      totalPriceCents: chatTermSponsors.totalPriceCents,
      until: chatTermSponsors.until,
    })
    .from(chatTermSponsors)
    .innerJoin(venues, eq(chatTermSponsors.venueId, venues.id))
    .where(and(gt(chatTermSponsors.until, new Date()), regionScopeCondition(chatTermSponsors.regionId, regionIds)))
    .orderBy(asc(chatTermSponsors.term));
  return rows;
}

// Single-region lookup for the chat itself (lib/region-chat.ts) -- not admin-scoped, just
// this one region's active term sponsorships.
export async function getChatTermSponsorsForRegion(regionId: number): Promise<ChatTermSponsor[]> {
  const rows = await db
    .select({
      id: chatTermSponsors.id,
      regionId: chatTermSponsors.regionId,
      term: chatTermSponsors.term,
      venueId: chatTermSponsors.venueId,
      venueName: venues.name,
      priceCentsPerDay: chatTermSponsors.priceCentsPerDay,
      totalPriceCents: chatTermSponsors.totalPriceCents,
      until: chatTermSponsors.until,
    })
    .from(chatTermSponsors)
    .innerJoin(venues, eq(chatTermSponsors.venueId, venues.id))
    .where(and(eq(chatTermSponsors.regionId, regionId), gt(chatTermSponsors.until, new Date())));
  return rows;
}

// Sums totalPriceCents for term sponsorships sold within [from, to) -- "sold" meaning
// createdAt falls in range, same convention lib/revenue-data.ts's getRevenueInRange uses
// for bookings. Independent of the bookings table entirely (see db/schema.ts's comment
// on chatTermSponsors -- this product has no real Stripe checkout yet).
export async function getChatTermSponsorRevenue(
  regionIds: number[] | "all",
  from: Date,
  to: Date
): Promise<{ totalCents: number; count: number }> {
  const [row] = await db
    .select({
      totalCents: sql<number>`coalesce(sum(${chatTermSponsors.totalPriceCents}), 0)::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(chatTermSponsors)
    .where(
      and(
        gte(chatTermSponsors.createdAt, from),
        lt(chatTermSponsors.createdAt, to),
        regionScopeCondition(chatTermSponsors.regionId, regionIds)
      )
    );
  return { totalCents: row?.totalCents ?? 0, count: row?.count ?? 0 };
}

// Unified "about to lapse" view across every paid-placement kind, for the admin
// /admin/sponsored "Expiring soon" panel. One query per kind (same shape as
// getFeaturedVenues/getBoostedSpecials/etc. above, but bounded above as well as below),
// merged and sorted soonest-first.
export async function getExpiringSoon(
  regionIds: number[] | "all",
  withinDays = 3
): Promise<ExpiringSoonItem[]> {
  const now = new Date();
  const cutoff = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);

  const [featuredRows, boostedSpecialRows, boostedEventRows, chatSpecialRows, chatEventRows, termRows] =
    await Promise.all([
      db
        .select({ name: venues.name, until: venues.featuredUntil })
        .from(venues)
        .where(
          and(
            gt(venues.featuredUntil, now),
            lt(venues.featuredUntil, cutoff),
            regionScopeCondition(venues.regionId, regionIds)
          )
        ),
      db
        .select({ venueName: venues.name, title: specials.title, until: specials.boostedUntil })
        .from(specials)
        .innerJoin(venues, eq(specials.venueId, venues.id))
        .where(
          and(
            gt(specials.boostedUntil, now),
            lt(specials.boostedUntil, cutoff),
            regionScopeCondition(specials.regionId, regionIds)
          )
        ),
      db
        .select({ venueName: venues.name, title: events.title, until: events.boostedUntil })
        .from(events)
        .innerJoin(venues, eq(events.venueId, venues.id))
        .where(
          and(
            gt(events.boostedUntil, now),
            lt(events.boostedUntil, cutoff),
            regionScopeCondition(events.regionId, regionIds)
          )
        ),
      db
        .select({ venueName: venues.name, title: specials.title, until: specials.chatBoostedUntil })
        .from(specials)
        .innerJoin(venues, eq(specials.venueId, venues.id))
        .where(
          and(
            gt(specials.chatBoostedUntil, now),
            lt(specials.chatBoostedUntil, cutoff),
            regionScopeCondition(specials.regionId, regionIds)
          )
        ),
      db
        .select({ venueName: venues.name, title: events.title, until: events.chatBoostedUntil })
        .from(events)
        .innerJoin(venues, eq(events.venueId, venues.id))
        .where(
          and(
            gt(events.chatBoostedUntil, now),
            lt(events.chatBoostedUntil, cutoff),
            regionScopeCondition(events.regionId, regionIds)
          )
        ),
      db
        .select({ venueName: venues.name, term: chatTermSponsors.term, until: chatTermSponsors.until })
        .from(chatTermSponsors)
        .innerJoin(venues, eq(chatTermSponsors.venueId, venues.id))
        .where(
          and(
            gt(chatTermSponsors.until, now),
            lt(chatTermSponsors.until, cutoff),
            regionScopeCondition(chatTermSponsors.regionId, regionIds)
          )
        ),
    ]);

  const items: ExpiringSoonItem[] = [
    ...featuredRows
      .filter((r): r is { name: string; until: Date } => r.until !== null)
      .map((r) => ({ kind: "Featured" as const, venueName: r.name, detail: null, expiresAt: r.until })),
    ...boostedSpecialRows
      .filter((r): r is { venueName: string; title: string; until: Date } => r.until !== null)
      .map((r) => ({ kind: "Boosted special" as const, venueName: r.venueName, detail: r.title, expiresAt: r.until })),
    ...boostedEventRows
      .filter((r): r is { venueName: string; title: string; until: Date } => r.until !== null)
      .map((r) => ({ kind: "Boosted event" as const, venueName: r.venueName, detail: r.title, expiresAt: r.until })),
    ...chatSpecialRows
      .filter((r): r is { venueName: string; title: string; until: Date } => r.until !== null)
      .map((r) => ({
        kind: "Promoted special (chat)" as const,
        venueName: r.venueName,
        detail: r.title,
        expiresAt: r.until,
      })),
    ...chatEventRows
      .filter((r): r is { venueName: string; title: string; until: Date } => r.until !== null)
      .map((r) => ({
        kind: "Promoted event (chat)" as const,
        venueName: r.venueName,
        detail: r.title,
        expiresAt: r.until,
      })),
    ...termRows.map((r) => ({
      kind: "Term sponsor (chat)" as const,
      venueName: r.venueName,
      detail: `"${r.term}"`,
      expiresAt: r.until,
    })),
  ];

  return items.sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime());
}

// All active specials, not just one venue's -- cheap enough (id/venueId/title only)
// to ship in full and let the client filter by venue as it's picked, rather than
// adding a round trip per venue selection.
export async function getSpecialOptions(regionIds: number[] | "all"): Promise<SpecialOption[]> {
  return db
    .select({ id: specials.id, venueId: specials.venueId, title: specials.title })
    .from(specials)
    .where(and(isNull(specials.archivedAt), regionScopeCondition(specials.regionId, regionIds)))
    .orderBy(asc(specials.title));
}

// Mirrors getSpecialOptions -- see EventOption's comment on why non-venue events
// (venueId null) are excluded here.
export async function getEventOptions(regionIds: number[] | "all"): Promise<EventOption[]> {
  const rows = await db
    .select({ id: events.id, venueId: events.venueId, title: events.title })
    .from(events)
    .where(
      and(
        isNull(events.archivedAt),
        isNotNull(events.venueId),
        regionScopeCondition(events.regionId, regionIds)
      )
    )
    .orderBy(asc(events.title));
  return rows as EventOption[];
}

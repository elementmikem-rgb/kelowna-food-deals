import { cache } from "react";
import { and, eq } from "drizzle-orm";
import { db, venues } from "@/db";
import { getAllSpecialsWithVenue } from "@/lib/data";
import { getRecurringEvents, getUpcomingOneOffEvents } from "@/lib/events-data";
import { isLateSpecial, nightEventKind, nightVenueEventKind, type NightEventKind } from "@/lib/nightlife";

// One row on the nightlife page, whether it came from a special or an event. Only plain
// fields the page renders, so the client payload stays small.
export interface NightItem {
  key: string;
  kind: "special" | NightEventKind;
  title: string;
  description: string | null;
  venueId: number | null;
  venueName: string;
  venueCity: string | null;
  // null on a recurring row means "every day" (specials only); events always carry one.
  dayOfWeek: number | null;
  // Set for one-off events, null for weekly rows.
  specificDate: string | null;
  startTime: string | null;
  endTime: string | null;
  priceCents: number | null;
  coverChargeCents: number | null;
  lastVerifiedAt: Date;
}

// cache(): the page and its generateMetadata both need this within one request.
export const getNightlife = cache(async (regionId: number, timezone: string): Promise<{ weekly: NightItem[]; upcoming: NightItem[] }> => {
  const [specials, recurring, oneOffs] = await Promise.all([
    getAllSpecialsWithVenue(regionId),
    getRecurringEvents(regionId),
    getUpcomingOneOffEvents(regionId, timezone, 14),
  ]);

  // Venues hand-flagged as nightclubs, strip clubs or concert halls: all their events show.
  const flaggedRows = await db
    .select({ id: venues.id })
    .from(venues)
    .where(and(eq(venues.regionId, regionId), eq(venues.active, true), eq(venues.nightlife, true)));
  const flagged = new Set(flaggedRows.map((v) => v.id));
  const kindFor = (e: (typeof recurring)[number]) =>
    nightEventKind(e) ?? (e.venueId !== null && flagged.has(e.venueId) ? nightVenueEventKind(e.eventType, e.teamCode) : null);

  const weekly: NightItem[] = [];

  for (const s of specials) {
    if (s.isMonthly || s.flashExpiresAt) continue;
    if (!isLateSpecial(s.startTime, s.endTime)) continue;
    weekly.push({
      key: `s${s.id}`,
      kind: "special",
      title: s.title,
      description: s.description,
      venueId: s.venueId,
      venueName: s.venueName,
      venueCity: s.venueCity,
      dayOfWeek: s.dayOfWeek,
      specificDate: null,
      startTime: s.startTime,
      endTime: s.endTime,
      priceCents: s.priceCents,
      coverChargeCents: null,
      lastVerifiedAt: s.lastVerifiedAt,
    });
  }

  const toItem = (e: (typeof recurring)[number], kind: NightEventKind): NightItem => ({
    key: `e${e.id}`,
    kind,
    title: e.title,
    description: e.description,
    venueId: e.venueId,
    venueName: e.venueName,
    venueCity: e.venueCity ?? null,
    dayOfWeek: e.dayOfWeek,
    specificDate: e.specificDate,
    startTime: e.startTime,
    endTime: e.endTime,
    priceCents: null,
    coverChargeCents: e.coverChargeCents,
    lastVerifiedAt: e.lastVerifiedAt,
  });

  for (const e of recurring) {
    const kind = kindFor(e);
    if (kind) weekly.push(toItem(e, kind));
  }

  const upcoming: NightItem[] = [];
  for (const e of oneOffs) {
    const kind = kindFor(e);
    if (kind) upcoming.push(toItem(e, kind));
  }
  upcoming.sort((a, b) => (a.specificDate ?? "").localeCompare(b.specificDate ?? "") || (a.startTime ?? "").localeCompare(b.startTime ?? ""));

  return { weekly, upcoming };
});

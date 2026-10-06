import type { SpecialWithVenue } from "@/lib/data";

// Next.js preserves real Date objects across the server/client boundary for props
// passed into a Server Component's JSX (its RSC "flight" protocol knows how to revive
// them) -- a plain `fetch(...).then(r => r.json())` call, like SpecialsBoard's day-tab
// switch hits, does not: JSON.stringify turns every Date field into an ISO string on
// the way out of an API route, and nothing turns it back on the way in. Confirmed live
// 2026-10-06: clicking a day tab threw "lastVerifiedAt.getTime is not a function" and
// crashed the page, because the sort comparator in SpecialsBoard assumes a real Date.
// Any client code consuming /api/specials/by-day's JSON must run its rows through this
// first. Deliberately its own file, not part of lib/data.ts -- that module imports the
// server-only `db` Postgres client at module scope, which a "use client" component
// can't safely pull in even to use one date-only helper from the same file.
const SPECIAL_DATE_FIELDS = [
  "lastVerifiedAt",
  "venueFeaturedUntil",
  "boostedUntil",
  "chatBoostedUntil",
  "venuePartnerSince",
  "venueClaimedAt",
  "venueConfirmedAt",
  "lastConfirmedAt",
  "venueMapPinBoostedUntil",
  "flashExpiresAt",
] as const satisfies readonly (keyof SpecialWithVenue)[];

export function reviveSpecialWithVenueDates(
  rows: Record<string, unknown>[]
): SpecialWithVenue[] {
  return rows.map((row) => {
    const revived = { ...row };
    for (const field of SPECIAL_DATE_FIELDS) {
      const value = revived[field];
      revived[field] = typeof value === "string" ? new Date(value) : value;
    }
    return revived;
  }) as unknown as SpecialWithVenue[];
}

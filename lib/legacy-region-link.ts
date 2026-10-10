import { db, outreachSends } from "@/db";
import { and, eq, inArray, sql } from "drizzle-orm";

// A venue's page lives at /[region]/venues/[id], and the page 404s when the venue's region
// differs from the region in the address (so one region's venue can't be reached under another's).
// But outreach emails embed that address at send time, and venues are sometimes moved to a
// different region afterwards -- the emailed link then 404s (Hansen Distillery, 2026-10-10:
// emailed /calgary-nw/venues/3351, later moved to st-albert-spruce-grove).
//
// To repair exactly those links without loosening the isolation rule for everything else, a
// mismatched address only redirects when WE emailed that venue a link to that exact old address.

export type VenueRegionRouting = "show" | "redirect" | "notFound";

export function decideVenueRegionRouting(input: {
  venueRegionId: number;
  requestRegionId: number;
  wasEmailedThisLink: boolean;
}): VenueRegionRouting {
  if (input.venueRegionId === input.requestRegionId) return "show";
  return input.wasEmailedThisLink ? "redirect" : "notFound";
}

// Postgres/JS-compatible regex matching "/{slug}/venues/{id}" in an email body, with the id ending
// at a non-digit so venue 3351 doesn't match venue 33510.
export function emailedLinkRegex(regionSlug: string, venueId: number): string {
  if (!/^[a-z0-9-]+$/.test(regionSlug)) throw new Error(`invalid region slug: ${regionSlug}`);
  if (!Number.isInteger(venueId) || venueId <= 0) throw new Error(`invalid venue id: ${venueId}`);
  return `/${regionSlug}/venues/${venueId}([^0-9]|$)`;
}

export async function wasEmailedLinkTo(venueId: number, requestedRegionSlug: string): Promise<boolean> {
  if (!/^[a-z0-9-]+$/.test(requestedRegionSlug)) return false;
  const [row] = await db
    .select({ id: outreachSends.id })
    .from(outreachSends)
    .where(
      and(
        eq(outreachSends.venueId, venueId),
        inArray(outreachSends.status, ["sent", "replied", "bounced"]),
        sql`${outreachSends.htmlBody} ~ ${emailedLinkRegex(requestedRegionSlug, venueId)}`
      )
    )
    .limit(1);
  return Boolean(row);
}

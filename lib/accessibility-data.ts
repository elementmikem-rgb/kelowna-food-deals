import { eq } from "drizzle-orm";
import { db, accessibilityVotes, venues } from "@/db";
import { rollupAccessibility, accessibleVenueIds, type AccessFeature, type AccessShown } from "@/lib/accessibility";
import { regionScopeCondition } from "@/lib/admin-region";

// Venue ids in one region that have a confirmed accessibility note, for the board's "Accessible" filter.
export async function getAccessibleVenueIds(regionId: number): Promise<number[]> {
  try {
    const rows = await db
      .select({
        venueId: accessibilityVotes.venueId,
        feature: accessibilityVotes.feature,
        answer: accessibilityVotes.answer,
        tokenHash: accessibilityVotes.tokenHash,
        createdAt: accessibilityVotes.createdAt,
      })
      .from(accessibilityVotes)
      .innerJoin(venues, eq(venues.id, accessibilityVotes.venueId))
      .where(eq(venues.regionId, regionId));
    return accessibleVenueIds(
      rows.map((r) => ({ venueId: r.venueId, token: r.tokenHash, feature: r.feature, answer: r.answer, createdAt: r.createdAt })),
      new Date()
    );
  } catch (err) {
    console.error("getAccessibleVenueIds failed", regionId, err);
    return [];
  }
}

// What a visitor sees on a venue page: only the features enough different browsers confirmed.
// A failed read hides the line rather than breaking the venue page.
export async function getVenueAccessibility(venueId: number): Promise<AccessShown[]> {
  try {
    const rows = await db.select().from(accessibilityVotes).where(eq(accessibilityVotes.venueId, venueId));
    return rollupAccessibility(
      rows.map((r) => ({ token: r.tokenHash, feature: r.feature, answer: r.answer, createdAt: r.createdAt })),
      new Date()
    ).shown;
  } catch (err) {
    console.error("getVenueAccessibility failed", venueId, err);
    return [];
  }
}

export type AccessibilityAdminRow = {
  venueId: number;
  venueName: string;
  voters: number;
  lastVoteAt: Date;
  features: { feature: AccessFeature; yes: number; no: number; unsure: number }[];
};

// Admin view: every venue that has votes, newest activity first, so abusive or mistaken votes can be cleared.
export async function getAccessibilityAdminRows(regionIds: number[] | "all"): Promise<AccessibilityAdminRow[]> {
  const rows = await db
    .select({
      venueId: accessibilityVotes.venueId,
      venueName: venues.name,
      feature: accessibilityVotes.feature,
      answer: accessibilityVotes.answer,
      tokenHash: accessibilityVotes.tokenHash,
      createdAt: accessibilityVotes.createdAt,
    })
    .from(accessibilityVotes)
    .innerJoin(venues, eq(venues.id, accessibilityVotes.venueId))
    .where(regionScopeCondition(venues.regionId, regionIds));
  const byVenue = new Map<number, AccessibilityAdminRow & { tokens: Set<string> }>();
  for (const r of rows) {
    let v = byVenue.get(r.venueId);
    if (!v) {
      v = { venueId: r.venueId, venueName: r.venueName, voters: 0, lastVoteAt: r.createdAt, features: [], tokens: new Set() };
      byVenue.set(r.venueId, v);
    }
    v.tokens.add(r.tokenHash);
    if (r.createdAt > v.lastVoteAt) v.lastVoteAt = r.createdAt;
    let f = v.features.find((x) => x.feature === r.feature);
    if (!f) {
      f = { feature: r.feature, yes: 0, no: 0, unsure: 0 };
      v.features.push(f);
    }
    f[r.answer]++;
  }
  return [...byVenue.values()]
    .map(({ tokens, ...v }) => ({ ...v, voters: tokens.size }))
    .sort((a, b) => b.lastVoteAt.getTime() - a.lastVoteAt.getTime())
    .slice(0, 200);
}

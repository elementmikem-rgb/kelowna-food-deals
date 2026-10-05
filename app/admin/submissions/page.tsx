import { db, submissions, venues } from "@/db";
import { and, asc, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { AdminSubmissionRow } from "@/components/AdminSubmissionRow";
import { AdminShell } from "@/components/AdminShell";
import { getSelectedAdminScope } from "@/lib/admin-region";
import { findSimilarVenues, type SimilarVenue } from "@/lib/string-similarity";

export const dynamic = "force-dynamic";

export default async function AdminSubmissionsPage() {
  const { regionIds } = await getSelectedAdminScope();

  const rows = await db
    .select({
      id: submissions.id,
      // A submission for a venue that doesn't exist yet has no venues row to join --
      // fall back to the free-text name/address the submitter typed in.
      venueName: sql<string>`coalesce(${venues.name}, ${submissions.venueName})`,
      venueAddress: submissions.venueAddress,
      isNewVenue: sql<boolean>`${submissions.venueId} is null`,
      // Region to scope the duplicate-venue similarity check against below -- an
      // existing-venue submission uses that venue's own region; a new-venue one uses
      // submissions.regionId directly (set from the region-aware /submit page).
      submissionRegionId: sql<number | null>`coalesce(${venues.regionId}, ${submissions.regionId})`,
      // A currently-featured venue's own submissions jump the queue -- sold
      // alongside featured placement, not as a separate purchase.
      isPriority: sql<boolean>`${venues.featuredUntil} is not null and ${venues.featuredUntil} > now()`,
      rawText: submissions.rawText,
      // Only whether a photo exists — the bytes are fetched on demand from
      // /api/admin/submission-photos/[id] instead of being inlined per row.
      hasPhoto: sql<boolean>`${submissions.photoData} is not null and ${submissions.photoMimeType} is not null`,
      aiExtracted: submissions.aiExtracted,
      aiNotes: submissions.aiNotes,
      resolvedItemKeys: submissions.resolvedItemKeys,
      createdAt: submissions.createdAt,
    })
    .from(submissions)
    .leftJoin(venues, eq(submissions.venueId, venues.id))
    .where(
      and(
        eq(submissions.status, "needs_review"),
        // A submission for an existing venue scopes by that venue's own region.
        // A new-venue submission (no venues row to join through) scopes by
        // submissions.regionId, set from the region-aware /submit page for every
        // submission going forward -- only fall back to showing it under any
        // scope for rows that predate that column (regionId still null there).
        regionIds === "all"
          ? undefined
          : or(
              inArray(venues.regionId, regionIds),
              and(isNull(submissions.venueId), isNull(submissions.regionId)),
              and(isNull(submissions.venueId), inArray(submissions.regionId, regionIds))
            )
      )
    )
    // Priority submissions first, then oldest-first within each group so a rush
    // request doesn't itself sit waiting behind other rush requests forever.
    .orderBy(
      desc(sql`${venues.featuredUntil} is not null and ${venues.featuredUntil} > now()`),
      asc(submissions.createdAt)
    );

  const priorityCount = rows.filter((r) => r.isPriority).length;

  // Duplicate-venue warning for new-venue submissions: compare the submitter's free-text
  // name against every active venue already in that same region, so an admin can catch a
  // near-miss (typo, missing/extra word) before clicking "Create venue" and ending up with
  // two rows for the same real place -- findOrCreateVenue only does an exact
  // case-insensitive match, so anything short of that currently sails through unflagged.
  const newVenueRegionIds = [
    ...new Set(
      rows
        .filter((r) => r.isNewVenue && r.submissionRegionId !== null)
        .map((r) => r.submissionRegionId as number)
    ),
  ];
  const candidatesByRegion = new Map<number, { id: number; name: string }[]>();
  if (newVenueRegionIds.length > 0) {
    const candidateVenues = await db
      .select({ id: venues.id, name: venues.name, regionId: venues.regionId })
      .from(venues)
      .where(and(eq(venues.active, true), inArray(venues.regionId, newVenueRegionIds)));
    for (const v of candidateVenues) {
      const list = candidatesByRegion.get(v.regionId) ?? [];
      list.push({ id: v.id, name: v.name });
      candidatesByRegion.set(v.regionId, list);
    }
  }
  const similarVenuesBySubmission = new Map<number, SimilarVenue[]>();
  for (const r of rows) {
    if (!r.isNewVenue || r.submissionRegionId === null) continue;
    const candidates = candidatesByRegion.get(r.submissionRegionId) ?? [];
    const matches = findSimilarVenues(r.venueName, candidates);
    if (matches.length > 0) similarVenuesBySubmission.set(r.id, matches);
  }

  return (
    <AdminShell active="submissions" maxWidth="max-w-3xl">
      <h1 className="font-display text-2xl text-foreground">
        Submissions needing review
        {rows.length > 0 && <span className="text-accent"> ({rows.length})</span>}
      </h1>
      {priorityCount > 0 && (
        <p className="text-xs text-gold font-medium -mt-3">
          {priorityCount} from featured venues -- shown first
        </p>
      )}

      {rows.length === 0 ? (
        <p className="text-muted-2 text-sm">Nothing waiting -- you&apos;re caught up.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((r) => (
            <AdminSubmissionRow
              key={r.id}
              submission={{
                id: r.id,
                venueName: r.venueName,
                venueAddress: r.venueAddress,
                isNewVenue: r.isNewVenue,
                isPriority: r.isPriority,
                rawText: r.rawText,
                hasPhoto: r.hasPhoto,
                aiExtracted: r.aiExtracted,
                aiNotes: r.aiNotes,
                resolvedItemKeys: r.resolvedItemKeys,
                createdAt: r.createdAt.toISOString(),
              }}
              similarVenues={similarVenuesBySubmission.get(r.id) ?? []}
            />
          ))}
        </div>
      )}
    </AdminShell>
  );
}

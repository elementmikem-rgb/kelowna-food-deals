import { db, submissions, venues } from "@/db";
import { and, asc, eq, sql } from "drizzle-orm";
import { AdminSubmissionRow } from "@/components/AdminSubmissionRow";
import { AdminShell } from "@/components/AdminShell";

export const dynamic = "force-dynamic";

export default async function AdminSubmissionsPage() {
  const rows = await db
    .select({
      id: submissions.id,
      // A submission for a venue that doesn't exist yet has no venues row to join --
      // fall back to the free-text name/address the submitter typed in.
      venueName: sql<string>`coalesce(${venues.name}, ${submissions.venueName})`,
      venueAddress: submissions.venueAddress,
      isNewVenue: sql<boolean>`${submissions.venueId} is null`,
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
    .where(and(eq(submissions.status, "needs_review")))
    .orderBy(asc(submissions.createdAt));

  return (
    <AdminShell active="submissions" maxWidth="max-w-3xl">
      <h1 className="font-display text-2xl text-foreground">
        Submissions needing review
        {rows.length > 0 && <span className="text-accent"> ({rows.length})</span>}
      </h1>

      {rows.length === 0 ? (
        <p className="text-muted-2 text-sm">Nothing waiting — you&apos;re caught up.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((r) => (
            <AdminSubmissionRow
              key={r.id}
              submission={{ ...r, createdAt: r.createdAt.toISOString() }}
            />
          ))}
        </div>
      )}
    </AdminShell>
  );
}

import Link from "next/link";
import { db, submissions, venues } from "@/db";
import { and, asc, eq, sql } from "drizzle-orm";
import { AdminSubmissionRow } from "@/components/AdminSubmissionRow";

export const dynamic = "force-dynamic";

export default async function AdminSubmissionsPage() {
  const rows = await db
    .select({
      id: submissions.id,
      venueName: venues.name,
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
    .innerJoin(venues, eq(submissions.venueId, venues.id))
    .where(and(eq(submissions.status, "needs_review")))
    .orderBy(asc(submissions.createdAt));

  return (
    <div className="flex flex-col flex-1 max-w-3xl mx-auto w-full px-4 py-6 gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-foreground">
          Submissions needing review ({rows.length})
        </h1>
        <div className="flex gap-3">
          <Link href="/admin/analytics" className="text-sm text-accent-dim underline">
            Analytics
          </Link>
          <Link href="/admin/outreach" className="text-sm text-accent-dim underline">
            Outreach
          </Link>
        </div>
      </div>

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
    </div>
  );
}

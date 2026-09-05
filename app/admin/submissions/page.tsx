import { db, submissions, venues } from "@/db";
import { and, asc, eq } from "drizzle-orm";
import { AdminSubmissionRow } from "@/components/AdminSubmissionRow";

export const dynamic = "force-dynamic";

export default async function AdminSubmissionsPage() {
  const rows = await db
    .select({
      id: submissions.id,
      venueName: venues.name,
      submissionType: submissions.submissionType,
      rawText: submissions.rawText,
      photoData: submissions.photoData,
      photoMimeType: submissions.photoMimeType,
      aiExtracted: submissions.aiExtracted,
      aiConfidence: submissions.aiConfidence,
      aiNotes: submissions.aiNotes,
      createdAt: submissions.createdAt,
    })
    .from(submissions)
    .innerJoin(venues, eq(submissions.venueId, venues.id))
    .where(and(eq(submissions.status, "needs_review")))
    .orderBy(asc(submissions.createdAt));

  return (
    <div className="flex flex-col flex-1 max-w-3xl mx-auto w-full px-4 py-6 gap-6">
      <h1 className="font-display text-2xl text-foreground">
        Submissions needing review ({rows.length})
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
    </div>
  );
}

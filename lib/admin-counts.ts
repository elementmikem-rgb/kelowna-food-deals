import { db, submissions, inboundEmails } from "@/db";
import { and, count, eq } from "drizzle-orm";
import { getFlaggedSpecials, getFlaggedEvents } from "./flagged-data";

// Cheap, count-only queries for the admin nav badges -- deliberately not reusing
// getInboxThreads()/the submissions page's full row query, which both join and
// shape far more data than a badge needs.
export async function getAdminNavCounts(): Promise<{
  pendingSubmissions: number;
  unreadInbox: number;
  flaggedCount: number;
}> {
  const [[submissionRow], [inboxRow], flaggedSpecials, flaggedEvents] = await Promise.all([
    db
      .select({ n: count() })
      .from(submissions)
      .where(and(eq(submissions.status, "needs_review"))),
    db.select({ n: count() }).from(inboundEmails).where(eq(inboundEmails.read, false)),
    // flaggedCount is computed from the same filtered queries the flagged queue
    // itself renders (rather than a third, separately-filtered count query) so the
    // badge can never drift from what the queue actually shows.
    getFlaggedSpecials(),
    getFlaggedEvents(),
  ]);
  return {
    pendingSubmissions: submissionRow?.n ?? 0,
    unreadInbox: inboxRow?.n ?? 0,
    flaggedCount: flaggedSpecials.length + flaggedEvents.length,
  };
}

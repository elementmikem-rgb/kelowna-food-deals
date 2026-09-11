import { db, submissions, inboundEmails, venues } from "@/db";
import { and, count, eq, isNull } from "drizzle-orm";
import { getFlaggedSpecials, getFlaggedEvents } from "./flagged-data";
import { regionScopeCondition } from "./admin-region";

// Cheap, count-only queries for the admin nav badges -- deliberately not reusing
// getInboxThreads()/the submissions page's full row query, which both join and
// shape far more data than a badge needs.
export async function getAdminNavCounts(regionIds: number[] | "all"): Promise<{
  pendingSubmissions: number;
  unreadInbox: number;
  flaggedCount: number;
}> {
  const [[submissionRow], [inboxRow], flaggedSpecials, flaggedEvents] = await Promise.all([
    db
      .select({ n: count() })
      .from(submissions)
      .where(and(eq(submissions.status, "needs_review"))),
    // Same leftJoin(venues) + regionScopeCondition shape as getInboxThreads()
    // (lib/inbox-data.ts) so this badge can never disagree with what the
    // scoped inbox page itself renders.
    db
      .select({ n: count() })
      .from(inboundEmails)
      .leftJoin(venues, eq(inboundEmails.venueId, venues.id))
      .where(
        and(
          eq(inboundEmails.read, false),
          isNull(inboundEmails.archivedAt),
          regionScopeCondition(venues.regionId, regionIds)
        )
      ),
    // flaggedCount is computed from the same filtered queries the flagged queue
    // itself renders (rather than a third, separately-filtered count query) so the
    // badge can never drift from what the queue actually shows.
    getFlaggedSpecials(regionIds),
    getFlaggedEvents(regionIds),
  ]);
  return {
    pendingSubmissions: submissionRow?.n ?? 0,
    unreadInbox: inboxRow?.n ?? 0,
    flaggedCount: flaggedSpecials.length + flaggedEvents.length,
  };
}

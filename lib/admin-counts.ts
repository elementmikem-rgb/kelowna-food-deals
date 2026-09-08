import { db, submissions, inboundEmails, dealFeedback } from "@/db";
import { and, count, eq } from "drizzle-orm";

// Cheap, count-only queries for the admin nav badges -- deliberately not reusing
// getInboxThreads()/the submissions page's full row query, which both join and
// shape far more data than a badge needs.
export async function getAdminNavCounts(): Promise<{
  pendingSubmissions: number;
  unreadInbox: number;
  flaggedCount: number;
}> {
  const [[submissionRow], [inboxRow], [flaggedRow]] = await Promise.all([
    db
      .select({ n: count() })
      .from(submissions)
      .where(and(eq(submissions.status, "needs_review"))),
    db.select({ n: count() }).from(inboundEmails).where(eq(inboundEmails.read, false)),
    db.select({ n: count() }).from(dealFeedback).where(eq(dealFeedback.feedbackType, "dispute")),
  ]);
  return {
    pendingSubmissions: submissionRow?.n ?? 0,
    unreadInbox: inboxRow?.n ?? 0,
    flaggedCount: flaggedRow?.n ?? 0,
  };
}

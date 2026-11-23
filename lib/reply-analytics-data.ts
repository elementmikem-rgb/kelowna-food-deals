import { db, outreachSends, inboundEmails, venues, regions } from "@/db";
import { and, eq, isNotNull } from "drizzle-orm";
import { regionScopeCondition } from "@/lib/admin-region";
import { classifyInbound } from "@/lib/inbound-classify";
import { analyzeReplies, type ReplyRow, type SendRow, type VenueInfo } from "@/lib/reply-analytics";

// Loads the rows for the admin reply-stats page and runs the calculation. Read-only.
export async function getReplyAnalytics(regionIds: number[] | "all") {
  const [sendRows, inboundRows, venueRows] = await Promise.all([
    db
      .select({
        venueId: outreachSends.venueId,
        kind: outreachSends.kind,
        variant: outreachSends.variant,
        status: outreachSends.status,
        sentAt: outreachSends.sentAt,
        createdAt: outreachSends.createdAt,
        subject: outreachSends.subject,
        openedAt: outreachSends.openedAt,
        clickedAt: outreachSends.clickedAt,
      })
      .from(outreachSends)
      .innerJoin(venues, eq(outreachSends.venueId, venues.id))
      .where(and(isNotNull(outreachSends.venueId), regionScopeCondition(venues.regionId, regionIds))),
    db
      .select({
        venueId: inboundEmails.venueId,
        fromEmail: inboundEmails.fromEmail,
        subject: inboundEmails.subject,
        receivedAt: inboundEmails.receivedAt,
      })
      .from(inboundEmails)
      .innerJoin(venues, eq(inboundEmails.venueId, venues.id))
      .where(and(isNotNull(inboundEmails.venueId), regionScopeCondition(venues.regionId, regionIds))),
    db
      .select({ id: venues.id, regionLabel: regions.brandName, language: regions.language })
      .from(venues)
      .innerJoin(regions, eq(venues.regionId, regions.id))
      .where(regionScopeCondition(venues.regionId, regionIds)),
  ]);

  const sends: SendRow[] = sendRows.map((s) => ({
    venueId: s.venueId!,
    kind: s.kind,
    variant: s.variant,
    status: s.status,
    at: s.sentAt ?? s.createdAt,
    subject: s.subject,
    openedAt: s.openedAt,
    clickedAt: s.clickedAt,
  }));
  // Auto-replies, out-of-office and bounce notices are not replies. Archived real replies still count.
  const replies: ReplyRow[] = inboundRows
    .filter((r) => classifyInbound({ headers: null, subject: r.subject, fromEmail: r.fromEmail }).kind === "reply")
    .map((r) => ({ venueId: r.venueId!, at: r.receivedAt }));
  const venueMap = new Map<number, VenueInfo>(venueRows.map((v) => [v.id, { regionLabel: v.regionLabel, language: v.language }]));

  return analyzeReplies({ sends, replies, venues: venueMap });
}

import { and, inArray, isNotNull, sql } from "drizzle-orm";
import { db, venues, blockedSenders, outreachSends } from "@/db";

// Address-level suppression for every cold outreach path (first contact, follow-up, weekend promo).
//
// Unsubscribes are recorded on a venue row (venues.unsubscribed_at), but one inbox is often the contact for several
// venues (a chain's info@ address). Checking only the venue being emailed meant an address that had unsubscribed on
// one location kept receiving mail for the others (audit 2026-11-22: 14 emails to one such address). This asks the
// question by ADDRESS instead: if any venue sharing it unsubscribed, if it is a blocked sender, or if it bounced,
// nothing further goes out. It only ever reduces sending.

export function normalizeAddress(email: string): string {
  return email.trim().toLowerCase();
}

export interface SuppressionFacts {
  unsubscribedVenues: number; // venues with this contact address that have unsubscribed
  blocked: boolean; // address is in blocked_senders
  bounced: boolean; // a send to this address bounced (hard bounce, or three soft bounces)
}

// Why an address must not be emailed, or null if it may be.
export function decideSuppression(f: SuppressionFacts): string | null {
  if (f.unsubscribedVenues > 0) return "this email address has unsubscribed (on this or another venue that shares it)";
  if (f.blocked) return "this address is on the blocked senders list";
  if (f.bounced) return "an earlier email to this address bounced";
  return null;
}

export async function suppressionReason(email: string): Promise<string | null> {
  const addr = normalizeAddress(email);
  const [unsub, blocked, bounced] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(venues)
      .where(and(isNotNull(venues.unsubscribedAt), sql`lower(${venues.contactEmail}) = ${addr}`)),
    db.select({ id: blockedSenders.id }).from(blockedSenders).where(sql`lower(${blockedSenders.email}) = ${addr}`).limit(1),
    db
      .select({ id: outreachSends.id })
      .from(outreachSends)
      .where(and(sql`lower(${outreachSends.toEmail}) = ${addr}`, inArray(outreachSends.status, ["bounced"])))
      .limit(1),
  ]);
  return decideSuppression({
    unsubscribedVenues: unsub[0]?.n ?? 0,
    blocked: blocked.length > 0,
    bounced: bounced.length > 0,
  });
}

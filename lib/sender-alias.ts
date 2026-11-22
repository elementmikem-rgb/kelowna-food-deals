import { and, isNull, sql } from "drizzle-orm";
import { db, inboundEmails, outreachSends } from "@/db";

// Remembering which venue an unmatched sender belongs to. A reply often comes from an address we never mailed (a
// staff member, a parent company desk). Assigning it records an alias, so future mail from that address lands in
// the venue's thread. It deliberately does NOT touch venues.contactEmail: that column decides who we send outreach
// to, and a reply is not consent.

export function normalizeSender(email: string): string | null {
  const e = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null;
}

// A venue whose contact email matches always wins; a remembered alias is the fallback.
export function pickVenueId(m: { contactVenueId: number | null; aliasVenueId: number | null }): number | null {
  return m.contactVenueId ?? m.aliasVenueId ?? null;
}

export type AssignResult =
  | { ok: true; email: string; movedReplies: number; movedSent: number }
  | { ok: false; error: string };

export async function assignSenderToVenue(rawEmail: string, venueId: number): Promise<AssignResult> {
  const email = normalizeSender(rawEmail);
  if (!email) return { ok: false, error: "not an email address" };

  await db.execute(sql`
    insert into specials.sender_aliases (email, venue_id) values (${email}, ${venueId})
    on conflict (lower(email)) do update set venue_id = excluded.venue_id
  `);

  // Only messages not already attached to a venue are moved; nothing already matched is touched.
  const movedIn = await db
    .update(inboundEmails)
    .set({ venueId })
    .where(and(isNull(inboundEmails.venueId), sql`lower(${inboundEmails.fromEmail}) = ${email}`))
    .returning({ id: inboundEmails.id });
  const movedOut = await db
    .update(outreachSends)
    .set({ venueId })
    .where(and(isNull(outreachSends.venueId), sql`lower(${outreachSends.toEmail}) = ${email}`))
    .returning({ id: outreachSends.id });

  return { ok: true, email, movedReplies: movedIn.length, movedSent: movedOut.length };
}

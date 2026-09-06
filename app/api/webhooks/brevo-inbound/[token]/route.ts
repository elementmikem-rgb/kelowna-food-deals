import { NextRequest, NextResponse } from "next/server";
import { db, inboundEmails, outreachSends, venues } from "@/db";
import { eq, sql } from "drizzle-orm";

interface BrevoInboundItem {
  MessageId?: string;
  InReplyTo?: string;
  From?: { Address?: string; Name?: string };
  Subject?: string;
  RawTextBody?: string;
  RawHtmlBody?: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const secret = process.env.BREVO_INBOUND_TOKEN;
  const { token } = await params;

  // Fail closed: refuse all traffic if the secret isn't configured, rather
  // than accepting unauthenticated inbound mail.
  if (!secret || token !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const items: BrevoInboundItem[] = body?.items ?? [];

  for (const item of items) {
    const fromEmail = item.From?.Address?.toLowerCase().trim();
    if (!fromEmail) continue;

    const messageId = item.MessageId ?? null;

    // Brevo retries webhook deliveries on any non-2xx or timeout. Without this
    // check the same reply would be inserted twice and show as a duplicate in
    // the admin inbox.
    if (messageId) {
      const [duplicate] = await db
        .select({ id: inboundEmails.id })
        .from(inboundEmails)
        .where(eq(inboundEmails.brevoMessageId, messageId))
        .limit(1);
      if (duplicate) continue;
    }

    // venues.contactEmail is never case-normalized on write, so compare both
    // sides lowercased or "Info@Venue.com" never matches a lowercased reply.
    const [matchedVenue] = await db
      .select({ id: venues.id })
      .from(venues)
      .where(sql`lower(${venues.contactEmail}) = ${fromEmail}`)
      .limit(1);

    // Replies very often come from a different address than the one we mailed
    // (owner replies personally to a message sent to info@). Fall back to the
    // outreach send this is a reply to so the message still lands in the right
    // thread instead of an orphan one.
    let venueId = matchedVenue?.id ?? null;
    const inReplyTo = item.InReplyTo ?? null;
    if (venueId === null && inReplyTo) {
      const [originalSend] = await db
        .select({ venueId: outreachSends.venueId })
        .from(outreachSends)
        .where(eq(outreachSends.brevoMessageId, inReplyTo))
        .limit(1);
      venueId = originalSend?.venueId ?? null;
    }

    await db.insert(inboundEmails).values({
      venueId,
      brevoMessageId: messageId,
      inReplyTo,
      fromEmail,
      fromName: item.From?.Name ?? null,
      subject: item.Subject ?? null,
      textBody: item.RawTextBody ?? null,
      htmlBody: item.RawHtmlBody ?? null,
    });
  }

  return NextResponse.json({ ok: true });
}

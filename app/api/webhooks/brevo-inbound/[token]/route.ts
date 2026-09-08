import { NextRequest, NextResponse } from "next/server";
import { db, inboundEmails, outreachSends, venues, blockedSenders, emailAttachments } from "@/db";
import { eq, sql } from "drizzle-orm";

const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024; // 4MB, matches app/api/submit/route.ts's MAX_PHOTO_BYTES

// ContentType is sender-controlled MIME text from the reply's own email
// headers -- it's later echoed back as the Content-Type on an admin-facing
// route that serves it inline (app/api/admin/inbox/attachments/[id]). An
// unfiltered value there is a stored-XSS vector (e.g. a "photo" whose real
// type is text/html). Mirror app/api/submit/route.ts's ALLOWED_MIME, plus
// PDF since a menu update is often one.
const ALLOWED_ATTACHMENT_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];

interface BrevoInboundItem {
  MessageId?: string;
  InReplyTo?: string;
  From?: { Address?: string; Name?: string };
  Subject?: string;
  RawTextBody?: string;
  RawHtmlBody?: string;
  Attachments?: { Name: string; ContentType: string; ContentLength: number; DownloadToken: string }[];
}

async function fetchAndStoreAttachments(inboundEmailId: number, attachments: BrevoInboundItem["Attachments"]) {
  if (!attachments || attachments.length === 0) return;
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return;

  for (const att of attachments) {
    try {
      if (att.ContentLength > MAX_ATTACHMENT_BYTES) {
        console.error(`Skipping oversized attachment "${att.Name}": ${att.ContentLength} bytes`);
        continue;
      }
      if (!ALLOWED_ATTACHMENT_MIME.includes(att.ContentType)) {
        console.error(`Skipping attachment "${att.Name}" with disallowed content type: ${att.ContentType}`);
        continue;
      }
      const res = await fetch(`https://api.brevo.com/v3/inbound/attachments/${att.DownloadToken}`, {
        headers: { "api-key": apiKey },
      });
      if (!res.ok) {
        console.error(`Failed to fetch attachment "${att.Name}": HTTP ${res.status}`);
        continue;
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      // ContentLength above is sender-declared; re-check the actual downloaded
      // size before writing a base64 blob into the row.
      if (buffer.length > MAX_ATTACHMENT_BYTES) {
        console.error(`Skipping oversized attachment "${att.Name}": actual size ${buffer.length} bytes`);
        continue;
      }
      await db.insert(emailAttachments).values({
        inboundEmailId,
        fileName: att.Name,
        contentType: att.ContentType,
        fileData: buffer.toString("base64"),
        sizeBytes: buffer.length,
      });
    } catch (err) {
      console.error(`Error fetching attachment "${att.Name}":`, err instanceof Error ? err.message : err);
    }
  }
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

    const [blocked] = await db
      .select({ id: blockedSenders.id })
      .from(blockedSenders)
      .where(eq(blockedSenders.email, fromEmail))
      .limit(1);

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
    let venueId: number | null = matchedVenue?.id ?? null;
    const inReplyTo = item.InReplyTo ?? null;
    if (venueId === null && inReplyTo) {
      const [originalSend] = await db
        .select({ venueId: outreachSends.venueId })
        .from(outreachSends)
        .where(eq(outreachSends.brevoMessageId, inReplyTo))
        .limit(1);
      venueId = originalSend?.venueId ?? null;
    }

    const [inserted] = await db
      .insert(inboundEmails)
      .values({
        venueId,
        brevoMessageId: messageId,
        inReplyTo,
        fromEmail,
        fromName: item.From?.Name ?? null,
        subject: item.Subject ?? null,
        textBody: item.RawTextBody ?? null,
        htmlBody: item.RawHtmlBody ?? null,
        archivedAt: blocked ? new Date() : null,
      })
      .returning({ id: inboundEmails.id });

    await fetchAndStoreAttachments(inserted.id, item.Attachments);
  }

  return NextResponse.json({ ok: true });
}

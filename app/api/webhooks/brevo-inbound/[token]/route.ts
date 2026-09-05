import { NextRequest, NextResponse } from "next/server";
import { db, inboundEmails, venues } from "@/db";
import { eq } from "drizzle-orm";

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

    const [matchedVenue] = await db
      .select({ id: venues.id })
      .from(venues)
      .where(eq(venues.contactEmail, fromEmail))
      .limit(1);

    await db.insert(inboundEmails).values({
      venueId: matchedVenue?.id ?? null,
      brevoMessageId: item.MessageId ?? null,
      inReplyTo: item.InReplyTo ?? null,
      fromEmail,
      fromName: item.From?.Name ?? null,
      subject: item.Subject ?? null,
      textBody: item.RawTextBody ?? null,
      htmlBody: item.RawHtmlBody ?? null,
    });
  }

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, venues, outreachSends } from "@/db";
import { eq } from "drizzle-orm";
import { sendOutreachEmail } from "@/lib/outreach-email";

const sendSchema = z.object({ venueId: z.number().int().positive() });

function buildOutreachHtml(venueName: string): string {
  return `
    <p>Hi there,</p>
    <p>We've listed <strong>${venueName}</strong> on
    <a href="https://kelownafooddeals.shop">Kelowna Daily Specials</a> — a site that tracks
    real, current food/drink specials and events at spots around Kelowna, West Kelowna,
    Peachland, and Lake Country.</p>
    <p>If anything we have listed is wrong, out of date, or you'd like to share your current
    specials or upcoming events directly, just reply to this email — a real person reads
    replies here — or use our <a href="https://kelownafooddeals.shop/submit">submission form</a>.</p>
    <p>Thanks,<br>Kelowna Daily Specials</p>
  `;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const [venue] = await db
    .select({ id: venues.id, name: venues.name, contactEmail: venues.contactEmail })
    .from(venues)
    .where(eq(venues.id, parsed.data.venueId))
    .limit(1);

  if (!venue || !venue.contactEmail) {
    return NextResponse.json({ error: "venue has no contact email on file" }, { status: 400 });
  }

  const subject = `Your specials on Kelowna Daily Specials`;
  const htmlBody = buildOutreachHtml(venue.name);

  const [sendRow] = await db
    .insert(outreachSends)
    .values({
      venueId: venue.id,
      toEmail: venue.contactEmail,
      subject,
      htmlBody,
      status: "queued",
    })
    .returning({ id: outreachSends.id });

  try {
    const { messageId } = await sendOutreachEmail({
      to: venue.contactEmail,
      subject,
      htmlContent: htmlBody,
    });
    await db
      .update(outreachSends)
      .set({ status: "sent", brevoMessageId: messageId, sentAt: new Date() })
      .where(eq(outreachSends.id, sendRow.id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db
      .update(outreachSends)
      .set({ status: "failed", errorMessage: message })
      .where(eq(outreachSends.id, sendRow.id));
    return NextResponse.json({ error: "failed to send" }, { status: 502 });
  }
}

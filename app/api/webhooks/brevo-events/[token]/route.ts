import { NextRequest, NextResponse } from "next/server";
import { db, outreachSends } from "@/db";
import { eq, isNull, and } from "drizzle-orm";

// Brevo's transactional-webhook payload uses snake_case event names
// ("hard_bounce", "soft_bounce") even though the API used to CREATE the
// webhook takes camelCase ones ("hardBounce", "softBounce") -- these two
// spellings are not a typo, they're just how Brevo's own API is inconsistent
// with itself. Brevo can deliver either one object per request or an array
// (depending on the "batched webhooks" toggle on the webhook config), so
// this accepts both shapes.
interface BrevoEventItem {
  event?: string;
  "message-id"?: string;
  reason?: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const secret = process.env.BREVO_EVENTS_TOKEN;
  const { token } = await params;

  // Fail closed: refuse all traffic if the secret isn't configured, rather
  // than accepting unauthenticated event data (same pattern as
  // app/api/webhooks/brevo-inbound/[token]/route.ts).
  if (!secret || token !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const items: BrevoEventItem[] = Array.isArray(body) ? body : body ? [body] : [];

  for (const item of items) {
    const messageId = item["message-id"];
    const event = item.event?.toLowerCase();
    if (!messageId || !event) continue;

    if (event === "opened" || event === "unique_opened") {
      // Brevo fires "opened" on every open (image reloads, forwards, etc.),
      // not just the first -- only record the first one, so this stays a
      // real "did they ever open it" signal instead of a noisy counter.
      await db
        .update(outreachSends)
        .set({ openedAt: new Date() })
        .where(and(eq(outreachSends.brevoMessageId, messageId), isNull(outreachSends.openedAt)));
    } else if (event === "click") {
      // A click implies an open even if the "opened" pixel itself got
      // blocked (common with image-blocking mail clients), so backfill
      // openedAt here too if it's still unset.
      await db
        .update(outreachSends)
        .set({ clickedAt: new Date() })
        .where(and(eq(outreachSends.brevoMessageId, messageId), isNull(outreachSends.clickedAt)));
      await db
        .update(outreachSends)
        .set({ openedAt: new Date() })
        .where(and(eq(outreachSends.brevoMessageId, messageId), isNull(outreachSends.openedAt)));
    } else if (event === "hard_bounce") {
      // Only a hard bounce is permanent -- a soft bounce (mailbox full,
      // temporary server issue) may still get delivered on retry, so it
      // isn't treated as a final status here.
      await db
        .update(outreachSends)
        .set({ status: "bounced", errorMessage: item.reason ?? "hard bounce" })
        .where(eq(outreachSends.brevoMessageId, messageId));
    }
  }

  return NextResponse.json({ ok: true });
}

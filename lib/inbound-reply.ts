// Pure decision logic for app/api/webhooks/brevo-inbound/[token]/route.ts,
// kept free of the db import so it is unit-testable.
import type { InboundClassification } from "@/lib/inbound-classify";

type InboundKind = InboundClassification["kind"];

// Replies very often come from a different address than the one we mailed
// (owner replies personally to a message sent to info@). When the sender
// matched no venue, fall back to the outreach send this is a reply to.
export function shouldLookUpVenueByInReplyTo(venueId: number | null, inReplyTo: string | null): boolean {
  return venueId === null && !!inReplyTo;
}

export type ReplyAttribution =
  | { mode: "in_reply_to"; inReplyTo: string }
  | { mode: "latest_sent"; venueId: number }
  | { mode: "none" };

// Which outreachSends row (if any) flips to "replied". Prefer the exact row
// this message is In-Reply-To; fall back to the venue's most recent "sent" row
// when the reply carries no In-Reply-To (a forward, or a client that drops the
// header). A blocked sender, an auto reply and a bounce notice never count,
// so they cannot inflate reply-rate numbers.
export function replyAttribution(input: {
  blocked: boolean;
  kind: InboundKind;
  inReplyTo: string | null;
  venueId: number | null;
}): ReplyAttribution {
  if (input.blocked || input.kind !== "reply") return { mode: "none" };
  if (input.inReplyTo) return { mode: "in_reply_to", inReplyTo: input.inReplyTo };
  if (input.venueId !== null) return { mode: "latest_sent", venueId: input.venueId };
  return { mode: "none" };
}

// Blocked senders, auto replies and bounce notices are stored but archived, so
// they stay out of the live inbox and the unread count (lib/inbox-data.ts only
// counts unread rows whose archivedAt is null).
export function inboundArchivedAt(input: { blocked: boolean; kind: InboundKind }, now: Date): Date | null {
  return input.blocked || input.kind !== "reply" ? now : null;
}

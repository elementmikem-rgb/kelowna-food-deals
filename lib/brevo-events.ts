// Pure decision logic for app/api/webhooks/brevo-events/[token]/route.ts, kept
// free of the db import so it is unit-testable.

export function extractSendId(tags: string[] | undefined): number | null {
  for (const tag of tags ?? []) {
    const match = /^send-(\d+)$/.exec(tag);
    if (match) return Number(match[1]);
  }
  return null;
}

export type BrevoEventAction =
  | { type: "open" }
  | { type: "click" }
  // The send is marked "bounced". The venue is NOT unsubscribed (same as the
  // original hard_bounce handling): the address is dead, but the venue may
  // still have a working one.
  | { type: "hard_failure"; errorMessage: string }
  // The recipient asked us to stop (spam complaint or Brevo's own unsubscribe
  // link): the venue gets venues.unsubscribedAt, the same column the public
  // unsubscribe link and the admin inbox's Unsubscribe action set. The send's
  // status is left as is (there is no "complained" status) and errorMessage
  // records why.
  | { type: "suppress"; errorMessage: string }
  // The send's soft_bounce_count is incremented atomically by the route.
  // Once it reaches SOFT_BOUNCE_LIMIT the route promotes the send to "bounced".
  | { type: "soft_bounce" }
  | { type: "ignore" };

// After incrementing soft_bounce_count, return "bounce" once the new count
// reaches or exceeds this limit -- the route then promotes the send to "bounced".
export const SOFT_BOUNCE_LIMIT = 3;

export function softBounceOutcome(newCount: number): "count" | "bounce" {
  return newCount >= SOFT_BOUNCE_LIMIT ? "bounce" : "count";
}

// Event names are Brevo's transactional-webhook payload spellings (snake_case,
// see the route's comment). "complaint" and "unsubscribe" are accepted as
// aliases in case Brevo ever changes the spelling.
export function classifyBrevoEvent(event: string | undefined, reason?: string): BrevoEventAction {
  switch (event?.toLowerCase()) {
    case "opened":
    case "unique_opened":
      return { type: "open" };
    case "click":
      return { type: "click" };
    case "hard_bounce":
      return { type: "hard_failure", errorMessage: reason ?? "hard bounce" };
    case "blocked":
      return { type: "hard_failure", errorMessage: reason ?? "blocked by Brevo" };
    case "invalid_email":
      return { type: "hard_failure", errorMessage: reason ?? "invalid email" };
    case "spam":
    case "complaint":
      return { type: "suppress", errorMessage: "spam complaint" };
    case "unsubscribed":
    case "unsubscribe":
      return { type: "suppress", errorMessage: "unsubscribed via Brevo" };
    case "soft_bounce":
      return { type: "soft_bounce" };
    default:
      return { type: "ignore" };
  }
}

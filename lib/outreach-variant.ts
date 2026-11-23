// Which style of first-contact email a venue gets. From 2026-10-09 to 2026-11-23 this was an even split by venue number
// (even gets branded, odd gets plain) to compare them. Result over about 2,900 venues: the plain, personal-looking email
// got 3 to 4 times the replies of the designed one (3.7% against 1.1% in English, 4.8% against 2.2% in French). So from
// 2026-11-23 about 90% get plain, and every tenth venue stays on branded as a control so the comparison keeps running.
//
// Deterministic (by venue number, not random) so a retried send, for example after a temporary Brevo failure, lands the
// same style it would have the first time.

export const PLAIN_SHARE = 0.9;

export function pickOutreachVariant(venueId: number): "branded" | "plain" {
  return venueId % 10 === 0 ? "branded" : "plain";
}

import { getStripe } from "./stripe";

export interface TipRecord {
  id: string;
  amountCents: number;
  createdAt: Date;
}

export interface TipsSummary {
  totalCents: number;
  count: number;
  tips: TipRecord[];
}

// STRIPE_SECRET_KEY is one live account shared across every project on it
// (TodaysTab, Photaro, Callova, etc, confirmed 2026-10-02) -- a global
// "created in this date range, no bookingId" scan over checkout.sessions
// picks up EVERY paid session on the account, not just this site's. Found
// the hard way: $45.15 of "TodaysTab tips" turned out to be two Photaro
// charges ("Tip for Okanagan Parasail", "Okanagan Parasail Media Package")
// and one Callova tip (success_url callova.live/parasailreview), none of
// which have any TodaysTab bookingId to exclude them on the old logic.
// metadata.type === "tip" (set by app/api/tip/checkout/route.ts) is the one
// tag that's actually specific to this site's tip jar -- require it exactly,
// don't fall back to "no bookingId" for anything missing it.
function isTipSession(session: { payment_status: string; metadata: Record<string, string> | null }): boolean {
  return session.payment_status === "paid" && session.metadata?.type === "tip";
}

export async function getTipsInRange(
  from: Date,
  to: Date,
  // "all" (the default admin scope) skips filtering entirely. A specific set
  // of slugs excludes anything checked out for a different region -- and,
  // since tips predate the regionSlug metadata tag added alongside this
  // filter, a tip with no tag at all is treated as Kelowna's: this site had
  // only one region until the todaystab.com migration, so every tip that old
  // is genuinely a Kelowna tip, not an unknown one.
  regionSlugs: string[] | "all" = "all"
): Promise<TipsSummary> {
  const stripe = getStripe();
  const tips: TipRecord[] = [];
  let startingAfter: string | undefined;

  // Stripe's `created` filter is inclusive on both ends and takes unix seconds.
  const gte = Math.floor(from.getTime() / 1000);
  const lte = Math.floor(to.getTime() / 1000);

  for (;;) {
    const page = await stripe.checkout.sessions.list({
      created: { gte, lte },
      limit: 100,
      starting_after: startingAfter,
    });

    for (const session of page.data) {
      if (!isTipSession(session)) continue;
      if (regionSlugs !== "all" && !regionSlugs.includes(session.metadata?.regionSlug ?? "kelowna")) continue;
      tips.push({
        id: session.id,
        amountCents: session.amount_total ?? 0,
        createdAt: new Date(session.created * 1000),
      });
    }

    if (!page.has_more || page.data.length === 0) break;
    startingAfter = page.data[page.data.length - 1].id;
  }

  tips.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return {
    totalCents: tips.reduce((sum, t) => sum + t.amountCents, 0),
    count: tips.length,
    tips,
  };
}

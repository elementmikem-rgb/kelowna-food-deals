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

// Booking checkouts always carry a bookingId in their session metadata; tip
// checkouts never do (see app/api/tip/checkout/route.ts). That split predates
// the explicit metadata.type = "tip" tag added alongside this calculator, so
// checking for a missing bookingId (rather than requiring the tag) also
// counts every tip taken before that tag existed.
function isTipSession(session: { payment_status: string; metadata: Record<string, string> | null }): boolean {
  return session.payment_status === "paid" && !session.metadata?.bookingId;
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

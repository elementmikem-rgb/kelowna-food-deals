import Stripe from "stripe";

// Lazy-initialized: throwing at module scope would fail `next build`'s
// page-data-collection pass for EVERY route (it evaluates every route
// module, including this one's importer, regardless of which Railway
// service is building) on any environment that lacks STRIPE_SECRET_KEY --
// e.g. the cron service, which has no reason to carry a Stripe key since it
// never takes payments. Validate only when a request actually needs it.
let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  cached = new Stripe(process.env.STRIPE_SECRET_KEY);
  return cached;
}

export const TIP_AMOUNTS_CENTS = [300, 500, 1000] as const;

import Stripe from "stripe";
import { db, venueOwners } from "@/db";
import { eq } from "drizzle-orm";

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

// Lazily creates (once) and thereafter reuses one Stripe Customer per owner account --
// every future booking, saved card, and subscription for that owner hangs off this same
// customer id, so a returning owner's card/billing-history stays continuous across
// separate purchases instead of Stripe seeing them as unrelated one-off buyers each time.
export async function getOrCreateStripeCustomerId(venueOwnerId: number): Promise<string> {
  const [owner] = await db
    .select({ stripeCustomerId: venueOwners.stripeCustomerId, email: venueOwners.email, name: venueOwners.name })
    .from(venueOwners)
    .where(eq(venueOwners.id, venueOwnerId))
    .limit(1);
  if (!owner) throw new Error(`venue owner ${venueOwnerId} not found`);
  if (owner.stripeCustomerId) return owner.stripeCustomerId;

  const customer = await getStripe().customers.create({
    email: owner.email,
    name: owner.name,
    metadata: { venueOwnerId: String(venueOwnerId) },
  });
  await db.update(venueOwners).set({ stripeCustomerId: customer.id }).where(eq(venueOwners.id, venueOwnerId));
  return customer.id;
}

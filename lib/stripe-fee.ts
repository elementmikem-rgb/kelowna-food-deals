// Stripe's standard Canadian card rate. Kept as one source of truth so the
// checkout line item and the pre-checkout price preview never disagree.
export const STRIPE_FEE_PERCENT = 0.029;
export const STRIPE_FEE_FIXED_CENTS = 30;

// The fee to add on top of a target net amount so that after Stripe takes its
// cut of the *total* charge, we still net exactly netCents -- i.e. the buyer
// pays the fee instead of it coming out of our price. Solving
// net = total - (total * pct + fixed) for total gives
// total = (net + fixed) / (1 - pct); the fee is just that minus the net.
export function stripeFeeCents(netCents: number): number {
  const total = (netCents + STRIPE_FEE_FIXED_CENTS) / (1 - STRIPE_FEE_PERCENT);
  return Math.ceil(total) - netCents;
}

// Shared check for the paid-promotion timestamps on venues/specials (see
// db/schema.ts): a promotion is active while now() is before its `until` value.
// A plain function rather than storing a boolean means a lapsed promotion
// stops applying on its own -- no cron needed to flip a flag back off.
export function isPromotionActive(until: Date | null): boolean {
  return until !== null && until.getTime() > Date.now();
}

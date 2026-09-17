// Shared check for the paid-promotion timestamps on venues/specials (see
// db/schema.ts): a promotion is active while now() is before its `until` value.
// A plain function rather than storing a boolean means a lapsed promotion
// stops applying on its own -- no cron needed to flip a flag back off.
//
// Accepts `undefined` too (not just the `Date | null` the type declares) as a
// defense-in-depth guard: several call sites feed this from `db.select(...)` rows
// force-cast with `as EventWithVenue[]`/`as SpecialWithVenue[]`, which lies to the
// compiler if that select's column list ever drifts from the interface -- a
// missing `boostedUntil` column then reads as `undefined` at runtime, not `null`,
// and crashed here in production (see lib/venues-data.ts's getVenueEvents, fixed
// 2026-09-16) before this guard existed.
export function isPromotionActive(until: Date | null | undefined): boolean {
  return until != null && until.getTime() > Date.now();
}

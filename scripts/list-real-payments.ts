// READ-ONLY. Lists the paid TodaysTab bookings and credit-bundle purchases that exist in
// the database, so you can see whether any real (live-mode) payments exist before anything
// is backfilled into the payments table. It runs SELECT statements only and writes nothing.
//
// Live vs test is read from the Stripe Checkout Session id prefix (cs_live_ / cs_test_),
// because the database does not store livemode. Tips are not in this database at all
// (they live only in Stripe), so they cannot be listed here.
//
// Run: npx tsx scripts/list-real-payments.ts
import "dotenv/config";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local", quiet: true });

function mode(sessionId: string | null): "live" | "test" | "unknown" {
  if (!sessionId) return "unknown";
  if (sessionId.startsWith("cs_live_")) return "live";
  if (sessionId.startsWith("cs_test_")) return "test";
  return "unknown";
}

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  try {
    const bookings = await sql`
      select b.id, b.product_type, b.status, b.price_cents, b.credits_spent_cents, b.stripe_session_id,
             b.stripe_payment_intent_id, b.stripe_subscription_id, b.auto_renew, b.refund_needed,
             b.created_at, v.name as venue
      from specials.bookings b left join specials.venues v on v.id = b.venue_id
      where b.stripe_session_id is not null or b.stripe_payment_intent_id is not null
      order by b.created_at`;
    const credit = await sql`
      select b.id, b.status, b.credits_spent_cents, b.price_cents, b.created_at, v.name as venue
      from specials.bookings b left join specials.venues v on v.id = b.venue_id
      where b.credits_spent_cents is not null
      order by b.created_at`;
    const bundles = await sql`
      select l.id, l.venue_id, l.delta, l.stripe_session_id, l.created_at, v.name as venue
      from specials.credit_ledger l left join specials.venues v on v.id = l.venue_id
      where l.reason = 'purchase' order by l.created_at`;
    const existing = await sql`select count(*)::int as n from specials.payments`.catch(() => [{ n: "table not created yet" }]);

    const ascii = (s: unknown) => String(s ?? "").replace(/[^\x20-\x7e]/g, "?");
    console.log("== Bookings with a Stripe session or payment intent (cash-paid, any status) ==");
    for (const r of bookings) {
      console.log(
        [r.id, mode(r.stripe_session_id), r.status, r.product_type, "$" + (r.price_cents / 100).toFixed(2), r.auto_renew ? "auto-renew" : "one-time", r.refund_needed ? "REFUND NEEDED" : "", new Date(r.created_at).toISOString().slice(0, 10), ascii(r.venue), r.stripe_session_id ?? "(no session id)"].join(" | ")
      );
    }
    const live = bookings.filter((r) => mode(r.stripe_session_id) === "live");
    console.log(`\nBookings total ${bookings.length}; live ${live.length}; test ${bookings.filter((r) => mode(r.stripe_session_id) === "test").length}; unknown ${bookings.filter((r) => mode(r.stripe_session_id) === "unknown").length}`);
    console.log(`Live booking cash (base price, excludes the pass-through card fee): $${(live.reduce((s, r) => s + r.price_cents, 0) / 100).toFixed(2)}`);

    console.log("\n== Credit-bundle purchases (credit_ledger reason=purchase) ==");
    for (const r of bundles) {
      console.log([r.id, mode(r.stripe_session_id), r.delta + " credits", new Date(r.created_at).toISOString().slice(0, 10), ascii(r.venue), r.stripe_session_id ?? "(no session id)"].join(" | "));
    }
    console.log(`Credit bundles total ${bundles.length}; live ${bundles.filter((r) => mode(r.stripe_session_id) === "live").length}`);

    console.log("\n== Bookings paid with credits (NOT cash, never income) ==");
    console.log(`${credit.length} credit-paid bookings, ${credit.reduce((s, r) => s + (r.credits_spent_cents ?? 0), 0) / 100} credits spent in total`);

    console.log("\nRows already in specials.payments:", existing[0]!.n);
  } finally {
    await sql.end();
  }
}
main().catch((e) => {
  console.error(String(e?.message ?? e));
  process.exit(1);
});

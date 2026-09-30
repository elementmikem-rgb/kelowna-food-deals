import Link from "next/link";
import { getRevenueInRange, getMRRCents, getActiveSubscriptions } from "@/lib/revenue-data";
import { getChatTermSponsorRevenue } from "@/lib/sponsored-data";
import { AdminShell } from "@/components/AdminShell";
import { getSelectedAdminScope } from "@/lib/admin-region";
import { pacificTodayISODate, startOfDayPacific, endOfDayPacific } from "@/lib/time";
import type { BookingProductType } from "@/db/schema";

// Real Stripe-checkout products only -- chat_term_sponsor never goes through `bookings`
// (see lib/revenue-data.ts's emptyByProduct comment), so it would always show $0/0 here
// and imply there's no chat-term revenue even when there is. It gets its own section
// below, fed by getChatTermSponsorRevenue instead.
const BOOKING_PRODUCT_KEYS: BookingProductType[] = ["featured", "boost", "category_sponsor"];

export const dynamic = "force-dynamic";

const DAY_PRESETS = [
  { key: "today", label: "Today", days: 0 },
  { key: "7d", label: "7d", days: 6 },
  { key: "30d", label: "30d", days: 29 },
] as const;

// Nothing paid through this site before its monetization features shipped;
// a safe "beginning of time" floor for "All time" rather than a real date to
// keep in sync with anything.
const ALL_TIME_FROM = "2026-01-01";

const PRODUCT_LABELS: Record<BookingProductType, string> = {
  featured: "Featured placement",
  boost: "Seasonal boost",
  category_sponsor: "Category sponsorship",
  chat_term_sponsor: "Chat term sponsorship",
  map_pin: "Map pin boost",
};

function centsToDisplay(cents: number): string {
  return (cents / 100).toLocaleString("en-CA", { style: "currency", currency: "CAD" });
}

export default async function AdminRevenuePage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>;
}) {
  const { preset: presetParam, from: fromParam, to: toParam } = await searchParams;

  const today = pacificTodayISODate();
  const isCustom = Boolean(fromParam && toParam);
  const matchedPreset = DAY_PRESETS.find((p) => p.key === presetParam);
  const preset = !isCustom && presetParam === "all" ? "all" : !isCustom ? (matchedPreset?.key ?? "30d") : null;

  let fromDate: string;
  let toDate: string;
  if (isCustom) {
    fromDate = fromParam!;
    toDate = toParam!;
  } else if (preset === "all") {
    fromDate = ALL_TIME_FROM;
    toDate = today;
  } else {
    const days = (matchedPreset ?? DAY_PRESETS[1]).days;
    const d = new Date(`${today}T00:00:00`);
    d.setDate(d.getDate() - days);
    fromDate = d.toISOString().slice(0, 10);
    toDate = today;
  }

  const from = startOfDayPacific(fromDate);
  const to = endOfDayPacific(toDate);
  // Tips carry no region, so getRevenueInRange only folds them into totalCents
  // when regionIds is genuinely "all" -- under any specific scope, totalCents
  // is bookings-only and tips are shown as their own always-account-wide figure.
  const { regionIds } = await getSelectedAdminScope();
  const [summary, chatTermRevenue, mrrCents, activeSubscriptions] = await Promise.all([
    getRevenueInRange(from, to, regionIds),
    getChatTermSponsorRevenue(regionIds, from, to),
    getMRRCents(regionIds),
    getActiveSubscriptions(regionIds),
  ]);
  const isAllScope = regionIds === "all";

  return (
    <AdminShell active="revenue">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="font-display text-2xl text-foreground">Revenue</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1">
            {DAY_PRESETS.map((p) => (
              <Link
                key={p.key}
                href={`/admin/revenue?preset=${p.key}`}
                className={`press-pill rounded-full px-3 py-1 text-xs border ${
                  preset === p.key
                    ? "bg-accent text-background border-accent"
                    : "bg-transparent text-muted border-border"
                }`}
              >
                {p.label}
              </Link>
            ))}
            <Link
              href="/admin/revenue?preset=all"
              className={`press-pill rounded-full px-3 py-1 text-xs border ${
                preset === "all"
                  ? "bg-accent text-background border-accent"
                  : "bg-transparent text-muted border-border"
              }`}
            >
              All time
            </Link>
          </div>
          <form
            action="/admin/revenue"
            method="get"
            className={`flex items-center gap-1 rounded-full border px-2 py-1 text-xs ${
              isCustom ? "border-accent" : "border-border"
            }`}
          >
            <input
              type="date"
              name="from"
              defaultValue={fromDate}
              max={today}
              className="bg-transparent text-foreground text-xs w-[9.5rem] outline-none"
            />
            <span className="text-muted-2">–</span>
            <input
              type="date"
              name="to"
              defaultValue={toDate}
              max={today}
              className="bg-transparent text-foreground text-xs w-[9.5rem] outline-none"
            />
            <button
              type="submit"
              className="press-pill rounded-full px-2 py-0.5 text-xs bg-accent text-background"
            >
              Go
            </button>
          </form>
        </div>
      </div>

      <div className="rounded-xl border border-accent bg-accent-soft/20 p-5 flex flex-col gap-1">
        <span className="text-xs uppercase tracking-wide text-muted-2">
          {isAllScope ? "Total revenue" : "Sponsorship revenue (this scope)"}
        </span>
        <span className="font-display text-4xl text-foreground">{centsToDisplay(summary.totalCents)}</span>
        {isAllScope ? (
          <span className="text-xs text-muted-2">
            {centsToDisplay(summary.tips.totalCents)} in tips + {centsToDisplay(summary.bookings.totalCents)} in
            sponsorship
          </span>
        ) : (
          <span className="text-xs text-muted-2">
            Tips have no region and always total {centsToDisplay(summary.tips.totalCents)} account-wide -- not
            included above since this view is scoped.
          </span>
        )}
      </div>

      <div className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-1">
        <span className="text-xs uppercase tracking-wide text-muted-2">Monthly recurring revenue</span>
        <span className="font-display text-3xl text-foreground">{centsToDisplay(mrrCents)}</span>
        <span className="text-xs text-muted-2">
          {activeSubscriptions.length} auto-renewing sponsorship{activeSubscriptions.length === 1 ? "" : "s"}{" "}
          currently active -- not part of the date-range total above, this is what's committed going forward.
        </span>
      </div>

      {activeSubscriptions.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-lg text-foreground">Active auto-renews</h2>
          <div className="rounded-xl border border-border bg-surface divide-y divide-border">
            {activeSubscriptions.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <div className="flex flex-col min-w-0">
                  <span className="text-foreground/90 truncate">
                    {s.venueName ?? "Unknown venue"}
                    {s.specialTitle ? ` — ${s.specialTitle}` : ""}
                  </span>
                  <span className="text-xs text-muted-2">
                    {PRODUCT_LABELS[s.productType]} · next renewal {s.endDate}
                  </span>
                </div>
                <span className="font-mono-tabular text-muted shrink-0">{centsToDisplay(s.priceCents)}/mo</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h2 className="font-display text-lg text-foreground">Sponsorship &amp; placements</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {BOOKING_PRODUCT_KEYS.map((key) => (
            <div key={key} className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-muted-2">{PRODUCT_LABELS[key]}</span>
              <span className="font-display text-2xl text-foreground">
                {centsToDisplay(summary.bookings.byProduct[key].totalCents)}
              </span>
              <span className="text-xs text-muted-2">
                {summary.bookings.byProduct[key].count} booking
                {summary.bookings.byProduct[key].count === 1 ? "" : "s"}
              </span>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-border bg-surface divide-y divide-border">
          {summary.bookings.records.length === 0 && (
            <p className="p-3 text-sm text-muted-2">No sponsorship bookings in this range.</p>
          )}
          {summary.bookings.records.map((b) => (
            <div key={b.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <div className="flex flex-col min-w-0">
                <span className="text-foreground/90 truncate">
                  {b.venueName ?? "Unknown venue"}
                  {b.specialTitle ? ` — ${b.specialTitle}` : ""}
                </span>
                <span className="text-xs text-muted-2">
                  {PRODUCT_LABELS[b.productType]} ·{" "}
                  {b.createdAt.toLocaleDateString("en-CA", { timeZone: "America/Vancouver" })}
                </span>
              </div>
              <span className="font-mono-tabular text-muted shrink-0">{centsToDisplay(b.priceCents)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="font-display text-lg text-foreground">Chat term sponsorships</h2>
        <p className="text-xs text-muted-2">
          Manual sales (no self-serve checkout yet) -- not part of the total above, counted
          separately.
        </p>
        <div className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-1 max-w-xs">
          <span className="font-display text-2xl text-foreground">{centsToDisplay(chatTermRevenue.totalCents)}</span>
          <span className="text-xs text-muted-2">
            {chatTermRevenue.count} sale{chatTermRevenue.count === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="font-display text-lg text-foreground">
          Tips <span className="text-muted-2 font-body text-sm">({summary.tips.count})</span>
        </h2>
        <p className="text-sm text-muted-2">
          {centsToDisplay(summary.tips.totalCents)} total.{" "}
          <Link href={`/admin/tips?${isCustom ? `from=${fromDate}&to=${toDate}` : `preset=${preset}`}`} className="text-accent-dim underline">
            See individual tips
          </Link>
        </p>
      </div>
    </AdminShell>
  );
}

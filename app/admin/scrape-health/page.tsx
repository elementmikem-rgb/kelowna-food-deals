import { AdminShell } from "@/components/AdminShell";
import {
  getZeroListingVenues,
  getRecentlyFailingVenues,
  getCronSpend,
  ZERO_LISTING_RECHECK_DAYS,
} from "@/lib/scrape-health";
import { getSelectedAdminScope } from "@/lib/admin-region";
import { ZeroListingVenuesPanel } from "@/components/ZeroListingVenuesPanel";

export const dynamic = "force-dynamic";

function formatUsd(n: number): string {
  return n.toLocaleString("en-CA", { style: "currency", currency: "USD" });
}

export default async function AdminScrapeHealthPage() {
  const { regionIds } = await getSelectedAdminScope();
  const [zeroListingVenues, failingVenues, cronSpend] = await Promise.all([
    getZeroListingVenues(regionIds),
    getRecentlyFailingVenues(regionIds),
    getCronSpend(14),
  ]);

  return (
    <AdminShell active="scrapeHealth" maxWidth="max-w-2xl">
      <h1 className="font-display text-2xl text-foreground">Scrape health</h1>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-display text-xl text-foreground">Logged cron spend (estimate)</h2>
          <span className="text-sm text-muted-2">
            Logged, last 30 days:{" "}
            <span className="font-mono-tabular text-foreground">{formatUsd(cronSpend.monthToDateUsd)}</span>
          </span>
        </div>
        <p className="text-sm text-muted">
          Claude Haiku 4.5 usage from the nightly scrape/extraction cron, priced from tokens logged per run
          (input/output/cache read/cache write priced separately since prompt caching shipped 2026-09-16).
          This is a floor, not the account total — it only covers runs that went through the normal cron
          path and logged a row; a few hours of one-off backfill work in mid-September called the API
          directly and isn&apos;t counted here, which is why this reads lower than Anthropic&apos;s own
          Console for that period (confirmed 2026-09-16: Console showed $63.87 for this key over Sep 5–15,
          this page showed ~$29 for the same window). For the real account total, check{" "}
          <a
            href="https://platform.claude.com/cost?group_by=key_id"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            the Anthropic Console&apos;s Cost page
          </a>
          , grouped by API key (&ldquo;Kelowna specials&rdquo;). Platform-wide, not scoped to the region
          filter above — it&apos;s one shared job across every region.
        </p>
        {cronSpend.days.length === 0 ? (
          <p className="text-sm text-muted-2">No cron runs logged in the last 14 days.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
            {cronSpend.days.map((d) => (
              <li key={d.day} className="p-3 flex items-center justify-between gap-2">
                <span className="font-medium text-foreground">{d.day}</span>
                <span className="text-xs text-muted-2">
                  {d.venueRuns.toLocaleString()} run(s) · {d.totalTokens.toLocaleString()} tokens
                </span>
                <span className="font-mono-tabular text-foreground">{formatUsd(d.costUsd)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2 mt-4">
        <h2 className="font-display text-xl text-foreground">
          Recently failing ({failingVenues.length})
        </h2>
        <p className="text-sm text-muted">
          Venues whose most recent scrape (last 3 days) errored — a genuine problem worth checking,
          not just a thin site.
        </p>
        {failingVenues.length === 0 ? (
          <p className="text-sm text-muted-2">No venues failing right now.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
            {failingVenues.map((v) => (
              <li key={v.id} className="p-3 flex flex-col gap-0.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground">{v.name}</span>
                  <span className="text-[11px] text-muted-2 uppercase tracking-wide">{v.regionSlug}</span>
                </div>
                <span className="text-xs text-stale font-mono-tabular">{v.lastError}</span>
                <span className="text-[11px] text-muted-2">
                  Last attempted {v.lastRanAt.toLocaleString("en-CA", { timeZone: "America/Vancouver" })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2 mt-4">
        <h2 className="font-display text-xl text-foreground">
          Zero listings ({zeroListingVenues.length})
        </h2>
        <p className="text-sm text-muted">
          Active venues with no specials or events at all. Some of these genuinely have nothing
          promotional on their site (expected) — others are a bad URL, bot-blocking, or
          JS-rendered content the scraper can&apos;t see. Worth a manual spot-check periodically.
          Confirming one as &ldquo;nothing to find&rdquo; keeps it off this list for{" "}
          {ZERO_LISTING_RECHECK_DAYS} days.
        </p>
        <ZeroListingVenuesPanel venues={zeroListingVenues} />
      </div>
    </AdminShell>
  );
}

import Link from "next/link";
import { buildWindow, getAnalyticsStats } from "@/lib/analytics";
import { AnalyticsChart } from "@/components/AnalyticsChart";

export const dynamic = "force-dynamic";

function pctChange(current: number, previous: number): string | null {
  if (previous === 0) return current > 0 ? "new" : null;
  const change = ((current - previous) / previous) * 100;
  const sign = change >= 0 ? "+" : "";
  return `${sign}${change.toFixed(0)}%`;
}

function StatCard({
  label,
  value,
  previous,
}: {
  label: string;
  value: number | string;
  previous?: number;
}) {
  const change = typeof value === "number" && previous !== undefined ? pctChange(value, previous) : null;
  return (
    <div className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-muted-2">{label}</span>
      <span className="font-display text-2xl text-foreground">{value}</span>
      {change && (
        <span className={`text-xs ${change.startsWith("-") ? "text-stale" : "text-evergreen"}`}>
          {change} vs previous period
        </span>
      )}
    </div>
  );
}

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days: daysParam } = await searchParams;
  const days = [7, 30, 90].includes(Number(daysParam)) ? Number(daysParam) : 30;
  const window = buildWindow(days);
  const stats = await getAnalyticsStats(window);

  return (
    <div className="flex flex-col flex-1 max-w-4xl mx-auto w-full px-4 py-6 gap-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="font-display text-2xl text-foreground">Analytics</h1>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {[7, 30, 90].map((d) => (
              <Link
                key={d}
                href={`/admin/analytics?days=${d}`}
                className={`press-pill rounded-full px-3 py-1 text-xs border ${
                  d === days
                    ? "bg-accent text-background border-accent"
                    : "bg-transparent text-muted border-border"
                }`}
              >
                {d}d
              </Link>
            ))}
          </div>
          <Link href="/admin/outreach" className="text-sm text-accent-dim underline">
            Outreach
          </Link>
          <Link href="/admin/inbox" className="text-sm text-accent-dim underline">
            Inbox
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Pageviews" value={stats.pageviews} previous={stats.previous.pageviews} />
        <StatCard
          label="Unique visitors"
          value={stats.uniqueVisitors}
          previous={stats.previous.uniqueVisitors}
        />
        <StatCard label="Sessions" value={stats.sessions} previous={stats.previous.sessions} />
        <StatCard label="Bounce rate" value={`${stats.bounceRate.toFixed(0)}%`} />
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center gap-4 mb-2 text-xs text-muted-2">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-0.5 bg-accent" /> Pageviews
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-0.5 bg-evergreen" style={{ borderTop: "1.5px dashed" }} />{" "}
            Visitors
          </span>
        </div>
        <AnalyticsChart data={stats.dailyTrend} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-lg text-foreground">Top pages</h2>
          <div className="rounded-xl border border-border bg-surface divide-y divide-border">
            {stats.topPages.length === 0 && (
              <p className="p-3 text-sm text-muted-2">No data yet.</p>
            )}
            {stats.topPages.map((p) => (
              <div key={p.page} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="text-foreground/90 truncate">{p.page}</span>
                <span className="font-mono-tabular text-muted shrink-0 ml-2">{p.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="font-display text-lg text-foreground">Top referrers</h2>
          <div className="rounded-xl border border-border bg-surface divide-y divide-border">
            {stats.topReferrers.length === 0 && (
              <p className="p-3 text-sm text-muted-2">No data yet.</p>
            )}
            {stats.topReferrers.map((r) => (
              <div key={r.referrer} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="text-foreground/90 truncate">{r.referrer}</span>
                <span className="font-mono-tabular text-muted shrink-0 ml-2">{r.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="font-display text-lg text-foreground">Top countries</h2>
          <div className="rounded-xl border border-border bg-surface divide-y divide-border">
            {stats.topCountries.length === 0 && (
              <p className="p-3 text-sm text-muted-2">No data yet.</p>
            )}
            {stats.topCountries.map((c) => (
              <div key={c.country} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="text-foreground/90">{c.country}</span>
                <span className="font-mono-tabular text-muted shrink-0 ml-2">{c.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {stats.eventCounts.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-lg text-foreground">Events</h2>
          <div className="rounded-xl border border-border bg-surface divide-y divide-border">
            {stats.eventCounts.map((e) => (
              <div key={e.eventType} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="text-foreground/90">{e.eventType}</span>
                <span className="font-mono-tabular text-muted shrink-0 ml-2">{e.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

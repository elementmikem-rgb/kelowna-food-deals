import { AdminShell } from "@/components/AdminShell";
import { getSelectedAdminScope } from "@/lib/admin-region";
import { getBadgeSummary, getBadgeAdoption } from "@/lib/badge-data";

export const dynamic = "force-dynamic";

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-muted-2">{label}</span>
      <span className="font-display text-2xl text-foreground">{value.toLocaleString()}</span>
    </div>
  );
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export default async function AdminBadgesPage() {
  const { regionIds } = await getSelectedAdminScope();
  const [summary, adoption] = await Promise.all([
    getBadgeSummary(regionIds),
    getBadgeAdoption(regionIds),
  ]);

  return (
    <AdminShell active="badges">
      <div>
        <h1 className="font-display text-2xl text-foreground">Website badge</h1>
        <p className="text-sm text-muted">
          Each row logs itself the moment the badge image loads -- no crawling needed. A venue only counts
          as adopted once a load comes from a referrer that isn&apos;t todaystab.com itself (the dashboard&apos;s
          own live preview shows up in the raw log too, but isn&apos;t a real install).
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="Venues with badge live on their site" value={summary.venuesWithExternalImpression} />
        <StatCard label="Venues who've ever loaded it" value={summary.venuesWithAnyImpression} />
        <StatCard label="Total badge loads" value={summary.totalImpressions} />
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="font-display text-lg text-foreground">
          By venue <span className="text-muted-2 font-body text-sm">({adoption.length})</span>
        </h2>
        {adoption.length === 0 ? (
          <p className="text-sm text-muted-2">No badge loads logged yet.</p>
        ) : (
          <div className="rounded-xl border border-border bg-surface divide-y divide-border">
            {adoption.map((v) => (
              <div key={v.venueId} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-foreground/90 truncate">{v.venueName}</span>
                  <span className="text-xs text-muted-2">
                    {v.externalImpressions > 0 ? (
                      <>
                        Live on{" "}
                        <strong className="text-evergreen font-normal">
                          {v.sampleReferrer ? hostnameOf(v.sampleReferrer) : "their site"}
                        </strong>
                      </>
                    ) : (
                      "Not detected on an external site yet"
                    )}{" "}
                    -- last loaded {v.lastSeen.toLocaleDateString()}
                  </span>
                </div>
                <span className="font-mono-tabular text-muted shrink-0">
                  {v.totalImpressions} load{v.totalImpressions === 1 ? "" : "s"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}

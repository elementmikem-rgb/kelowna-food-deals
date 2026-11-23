import { AdminShell } from "@/components/AdminShell";
import { getSelectedAdminScope } from "@/lib/admin-region";
import { getReplyAnalytics } from "@/lib/reply-analytics-data";
import type { Group } from "@/lib/reply-analytics";
import { formatHours, formatPercent, languageLabel } from "@/lib/reply-analytics-format";

export const dynamic = "force-dynamic";

const STYLE_LABEL: Record<string, string> = {
  branded: "Branded (designed email)",
  plain: "Plain (looks personal)",
  unknown: "Older sends (style not recorded)",
};

function GroupTable({ title, rows, labelOf, minShown = 0, note }: {
  title: string;
  rows: Group[];
  labelOf?: (label: string) => string;
  minShown?: number;
  note?: string;
}) {
  const shown = rows.filter((g) => g.contacted >= minShown);
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-display text-lg text-foreground">{title}</h2>
      {note && <p className="text-xs text-muted-2">{note}</p>}
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-background text-left text-[11px] uppercase tracking-wider text-muted-2">
            <tr>
              <th className="px-3 py-2 font-medium">Group</th>
              <th className="px-3 py-2 text-right font-medium">Emailed</th>
              <th className="px-3 py-2 text-right font-medium">Replied</th>
              <th className="px-3 py-2 text-right font-medium">Reply rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {shown.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-3 text-muted-2">Nothing to show yet.</td>
              </tr>
            )}
            {shown.map((g) => (
              <tr key={g.label}>
                <td className="px-3 py-2 text-foreground">{labelOf ? labelOf(g.label) : g.label}</td>
                <td className="px-3 py-2 text-right font-mono-tabular text-muted">{g.contacted}</td>
                <td className="px-3 py-2 text-right font-mono-tabular text-muted">{g.replied}</td>
                <td className="px-3 py-2 text-right font-mono-tabular text-foreground">{formatPercent(g.rate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default async function ReplyStatsPage() {
  const { regionIds } = await getSelectedAdminScope();
  const a = await getReplyAnalytics(regionIds);
  const stat = "flex flex-col gap-0.5 rounded-xl border border-border bg-surface px-4 py-3";
  const lab = "text-[11px] font-medium uppercase tracking-wider text-muted-2";

  return (
    <AdminShell active="inbox" backHref="/admin/inbox" backLabel="Inbox" maxWidth="max-w-3xl">
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="font-display text-2xl text-foreground">Reply stats</h1>
          <p className="text-sm text-muted">
            How the first outreach email is doing: of the venues we emailed, how many wrote back. Follows the region
            picker at the top. Read-only.
          </p>
        </header>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className={stat}>
            <span className={lab}>Venues emailed</span>
            <span className="font-mono-tabular text-2xl text-foreground">{a.overall.contacted}</span>
          </div>
          <div className={stat}>
            <span className={lab}>Replied</span>
            <span className="font-mono-tabular text-2xl text-foreground">{a.overall.replied}</span>
          </div>
          <div className={stat}>
            <span className={lab}>Reply rate</span>
            <span className="font-mono-tabular text-2xl text-foreground">{formatPercent(a.overall.rate)}</span>
          </div>
          <div className={stat}>
            <span className={lab}>Median time to reply</span>
            <span className="font-mono-tabular text-2xl text-foreground">{formatHours(a.hoursToFirstReply)}</span>
          </div>
        </div>

        <GroupTable
          title="By email style"
          rows={a.byVariant}
          labelOf={(l) => STYLE_LABEL[l] ?? l}
          note="The style was assigned by venue number (even gets branded, odd gets plain), so the two groups are comparable. The plain email also asks a single question and leaves out the advertising pitch, so the gap reflects the whole template, not only how it looks. Older sends predate the style being recorded."
        />
        <GroupTable title="By language" rows={a.byLanguage} labelOf={languageLabel} />

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-lg text-foreground">How fast you answer</h2>
          <div className="grid grid-cols-3 gap-3">
            <div className={stat}>
              <span className={lab}>Answered here</span>
              <span className="font-mono-tabular text-xl text-foreground">{a.ourResponse.answered}</span>
            </div>
            <div className={stat}>
              <span className={lab}>No answer sent here</span>
              <span className="font-mono-tabular text-xl text-foreground">{a.ourResponse.unanswered}</span>
            </div>
            <div className={stat}>
              <span className={lab}>Median time to answer</span>
              <span className="font-mono-tabular text-xl text-foreground">{formatHours(a.ourResponse.medianHours)}</span>
            </div>
          </div>
          <p className="text-xs text-muted-2">
            &quot;No answer sent here&quot; counts replies with no answer sent from this inbox. It includes replies you
            answered some other way, replies that needed no answer (a plain no), and any from before this inbox
            existed.
          </p>
        </section>

        <GroupTable
          title="By region"
          rows={a.byRegion}
          minShown={a.smallSampleBelow}
          note={`Only regions where at least ${a.smallSampleBelow} venues were emailed are shown. Below that, a rate is mostly noise.`}
        />

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-lg text-foreground">Opens and clicks</h2>
          <p className="text-sm text-muted">
            {a.engagement.opened} of {a.engagement.contacted} venues have an open recorded and {a.engagement.clicked} a
            click.
          </p>
          <p className="text-xs text-muted-2">
            Treat these as unreliable. Mail security software opens and clicks links automatically, so real interest is
            lower than these numbers. Replies above are the number to trust.
          </p>
        </section>
      </div>
    </AdminShell>
  );
}

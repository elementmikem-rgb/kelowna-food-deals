import { AdminShell } from "@/components/AdminShell";
import { getSelectedAdminScope } from "@/lib/admin-region";
import { getChatSummary, getRecentChatQueries, getTopMentionedVenues } from "@/lib/chat-data";

export const dynamic = "force-dynamic";

function StatCard({ label, count, tokens }: { label: string; count: number; tokens: number }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-muted-2">{label}</span>
      <span className="font-display text-2xl text-foreground">{count.toLocaleString()}</span>
      <span className="text-xs text-muted-2">{tokens.toLocaleString()} tokens</span>
    </div>
  );
}

export default async function AdminChatPage() {
  const { regionIds } = await getSelectedAdminScope();
  const [summary, topVenues, recent] = await Promise.all([
    getChatSummary(regionIds),
    getTopMentionedVenues(regionIds, 7),
    getRecentChatQueries(regionIds, 200),
  ]);

  return (
    <AdminShell active="chat">
      <h1 className="font-display text-2xl text-foreground">Ask chat log</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="Today" count={summary.todayCount} tokens={summary.todayTokens} />
        <StatCard label="Last 7 days" count={summary.weekCount} tokens={summary.weekTokens} />
        <StatCard label="Last 30 days" count={summary.monthCount} tokens={summary.monthTokens} />
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="font-display text-lg text-foreground">Top mentioned venues (7 days)</h2>
        {/* Substring match against question+answer text, not a structured link -- see
            lib/chat-data.ts's getTopMentionedVenues for why this is an approximation. */}
        {topVenues.length === 0 ? (
          <p className="text-sm text-muted-2">No venue mentions yet in this range.</p>
        ) : (
          <div className="rounded-xl border border-border bg-surface divide-y divide-border">
            {topVenues.map((v) => (
              <div key={v.venueName} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="text-foreground/90 truncate">{v.venueName}</span>
                <span className="font-mono-tabular text-muted shrink-0">
                  {v.mentionCount} mention{v.mentionCount === 1 ? "" : "s"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="font-display text-lg text-foreground">
          Recent questions <span className="text-muted-2 font-body text-sm">({recent.length})</span>
        </h2>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-2">No questions asked yet.</p>
        ) : (
          <div className="rounded-xl border border-border bg-surface divide-y divide-border">
            {recent.map((row) => (
              <div key={row.id} className="flex flex-col gap-1 px-3 py-2 text-sm">
                <span className="text-foreground/90">{row.question}</span>
                <span className="text-muted-2">{row.answer}</span>
                <span className="text-xs text-muted-2">
                  {row.createdAt.toLocaleString("en-CA", { timeZone: "America/Vancouver" })} · {row.tokensUsed}{" "}
                  tokens
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}

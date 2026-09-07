import Link from "next/link";
import { getTipsInRange } from "@/lib/tips-data";
import { AdminShell } from "@/components/AdminShell";
import { pacificTodayISODate, startOfDayPacific, endOfDayPacific } from "@/lib/time";

export const dynamic = "force-dynamic";

const DAY_PRESETS = [
  { key: "today", label: "Today", days: 0 },
  { key: "7d", label: "7d", days: 6 },
  { key: "30d", label: "30d", days: 29 },
] as const;

// Stripe's own account creation predates this site; nothing paid through it
// before the tip jar shipped, so this is just a safe "beginning of time"
// floor for the "All time" preset rather than a real launch date to maintain.
const ALL_TIME_FROM = "2026-01-01";

function centsToDisplay(cents: number): string {
  return (cents / 100).toLocaleString("en-CA", { style: "currency", currency: "CAD" });
}

export default async function AdminTipsPage({
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
  const summary = await getTipsInRange(from, to);

  return (
    <AdminShell active="revenue" backHref="/admin/revenue" backLabel="Revenue">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="font-display text-2xl text-foreground">Tips</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1">
            {DAY_PRESETS.map((p) => (
              <Link
                key={p.key}
                href={`/admin/tips?preset=${p.key}`}
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
              href="/admin/tips?preset=all"
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
            action="/admin/tips"
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

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-muted-2">Total tips</span>
          <span className="font-display text-3xl text-foreground">{centsToDisplay(summary.totalCents)}</span>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-muted-2">Number of tips</span>
          <span className="font-display text-3xl text-foreground">{summary.count}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="font-display text-lg text-foreground">Individual tips</h2>
        <div className="rounded-xl border border-border bg-surface divide-y divide-border">
          {summary.tips.length === 0 && (
            <p className="p-3 text-sm text-muted-2">No tips in this range.</p>
          )}
          {summary.tips.map((tip) => (
            <div key={tip.id} className="flex items-center justify-between px-3 py-2 text-sm">
              <span className="text-foreground/90">
                {tip.createdAt.toLocaleString("en-CA", {
                  timeZone: "America/Vancouver",
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
              <span className="font-mono-tabular text-muted shrink-0 ml-2">
                {centsToDisplay(tip.amountCents)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}

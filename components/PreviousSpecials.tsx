import Link from "next/link";
import type { PreviousSpecial } from "@/lib/data";
import { formatPrice, CATEGORY_LABELS } from "@/lib/format";
import { formatVerifiedRelative } from "@/lib/time";
import { groupByDayRange } from "@/lib/group-days";

export function PreviousSpecials({ specials }: { specials: PreviousSpecial[] }) {
  if (specials.length === 0) return null;
  const grouped = groupByDayRange(specials);

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="font-display text-2xl text-foreground">Previously Featured</h2>
        <p className="text-sm text-muted">
          What used to be running before venues changed it up.
        </p>
      </div>
      <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
        {grouped.map((s) => {
          const price = formatPrice(s.priceCents);
          return (
            <div
              key={s.id}
              className="flex items-center justify-between gap-3 px-4 py-3 opacity-70"
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm text-foreground/90 truncate">
                  <Link href={`/venues/${s.venueId}`} className="font-medium hover:underline">
                    {s.venueName}
                  </Link>{" "}
                  — {s.title}
                </span>
                <span className="text-xs text-muted-2">
                  {CATEGORY_LABELS[s.category]}
                  {s.dayLabel && s.dayLabel !== "Daily" ? ` · ${s.dayLabel}` : ""} · replaced{" "}
                  {formatVerifiedRelative(s.archivedAt).replace("verified", "")}
                </span>
              </div>
              {price && (
                <span className="font-mono-tabular text-sm text-muted shrink-0">{price}</span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

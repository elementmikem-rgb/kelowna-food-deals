import Link from "next/link";
import type { PreviousSpecial } from "@/lib/data";
import { formatPrice } from "@/lib/format";
import { formatVerifiedRelative } from "@/lib/time";
import { groupByDayRange } from "@/lib/group-days";
import { t, CATEGORY_LABELS, type Language } from "@/lib/i18n";

export function PreviousSpecials({
  specials,
  regionSlug,
  lang = "en",
}: {
  specials: PreviousSpecial[];
  regionSlug: string;
  lang?: Language;
}) {
  if (specials.length === 0) return null;
  const grouped = groupByDayRange(specials);
  const tr = t(lang);

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="font-display text-2xl text-foreground">{tr.previousSpecials.heading}</h2>
        <p className="text-sm text-muted">
          {tr.previousSpecials.subtitle}
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
                  <Link href={`/${regionSlug}/venues/${s.venueId}`} className="font-medium hover:underline">
                    {s.venueName}
                  </Link>{" "}
                  — {s.title}
                </span>
                <span className="text-xs text-muted-2">
                  {CATEGORY_LABELS[lang][s.category]}
                  {s.dayLabel && s.dayLabel !== "Daily" ? ` · ${s.dayLabel}` : ""} · {tr.previousSpecials.replaced}{" "}
                  {formatVerifiedRelative(s.archivedAt, new Date(), lang).replace(
                    lang === "fr" ? "vérifié " : "verified ",
                    ""
                  )}
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

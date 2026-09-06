import type { Metadata } from "next";
import Link from "next/link";
import { getPreviousSpecials } from "@/lib/data";
import { formatPrice, CATEGORY_LABELS } from "@/lib/format";
import { formatVerifiedRelative } from "@/lib/time";
import { groupByDayRange } from "@/lib/group-days";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

// Retired specials are thin, near-duplicate content next to the live board --
// useful for a curious visitor, not something worth ranking on its own.
export const metadata: Metadata = {
  title: "Archive",
  description: "Specials that used to run before venues changed them up.",
  robots: { index: false, follow: true },
};

export const revalidate = 3600;

export default async function ArchivePage() {
  const previous = await getPreviousSpecials(500);

  const byVenue = new Map<number, { venueName: string; items: typeof previous }>();
  for (const s of previous) {
    const entry = byVenue.get(s.venueId);
    if (entry) {
      entry.items.push(s);
    } else {
      byVenue.set(s.venueId, { venueName: s.venueName, items: [s] });
    }
  }
  const venues = [...byVenue.entries()]
    .map(([venueId, v]) => ({ venueId, ...v }))
    .sort((a, b) => a.venueName.localeCompare(b.venueName));

  return (
    <div className="flex flex-col flex-1 max-w-3xl mx-auto w-full px-4 py-6 gap-8">
      <SiteHeader
        active="blog"
        heading="Archive"
        subtitle="What used to be running before venues changed it up."
      />

      {venues.length === 0 ? (
        <p className="text-muted-2 text-sm">Nothing archived yet.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {venues.map((v) => (
            <section key={v.venueId} className="flex flex-col gap-2">
              <h2 className="font-display text-lg text-foreground">
                <Link href={`/venues/${v.venueId}`} className="hover:underline">
                  {v.venueName}
                </Link>
              </h2>
              <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
                {groupByDayRange(v.items).map((s) => {
                  const price = formatPrice(s.priceCents);
                  return (
                    <div
                      key={s.id}
                      className="flex items-center justify-between gap-3 px-4 py-3 opacity-70"
                    >
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-sm text-foreground/90 truncate">{s.title}</span>
                        <span className="text-xs text-muted-2">
                          {CATEGORY_LABELS[s.category]}
                          {s.dayLabel && s.dayLabel !== "Daily" ? ` · ${s.dayLabel}` : ""} · retired{" "}
                          {formatVerifiedRelative(s.archivedAt).replace("verified", "")}
                        </span>
                      </div>
                      {price && (
                        <span className="font-mono-tabular text-sm text-muted shrink-0">
                          {price}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <SiteFooter />
    </div>
  );
}

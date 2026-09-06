import type { Metadata } from "next";
import { getPreviousSpecials } from "@/lib/data";
import { groupByDayRange } from "@/lib/group-days";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ArchiveSearch } from "@/components/ArchiveSearch";

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
    .map(([venueId, v]) => ({ venueId, venueName: v.venueName, items: groupByDayRange(v.items) }))
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
        <ArchiveSearch venues={venues} />
      )}

      <SiteFooter />
    </div>
  );
}

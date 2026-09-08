import type { SpecialWithVenue } from "@/lib/data";
import { SpecialVenueGroup } from "./SpecialVenueGroup";
import { groupByVenue } from "@/lib/group-by-venue";
import { regionMonthIndex } from "@/lib/time";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function MonthlySpecials({
  specials,
  timezone,
}: {
  specials: SpecialWithVenue[];
  timezone: string;
}) {
  const monthName = MONTH_NAMES[regionMonthIndex(timezone)];

  if (specials.length === 0) {
    return (
      <section className="flex flex-col gap-3">
        <p className="text-muted-2 text-sm py-8 text-center">
          No {monthName.toLowerCase()} specials listed yet — check back soon, or see{" "}
          <a href="/" className="text-accent-dim underline">
            today&apos;s specials
          </a>{" "}
          instead.
        </p>
      </section>
    );
  }

  const grouped = groupByVenue(specials);

  return (
    <section className="flex flex-col gap-3">
      <p className="text-sm text-muted">
        {monthName} · {specials.length} special{specials.length === 1 ? "" : "s"} at{" "}
        {grouped.length} place{grouped.length === 1 ? "" : "s"}
      </p>
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-3">
        {grouped.map((g) => (
          <SpecialVenueGroup
            key={g.key}
            venueId={g.venueId!}
            venueName={g.venueName}
            specials={g.items}
          />
        ))}
      </div>
    </section>
  );
}

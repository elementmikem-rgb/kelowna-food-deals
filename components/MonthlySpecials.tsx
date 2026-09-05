import type { SpecialWithVenue } from "@/lib/data";
import { SpecialVenueGroup } from "./SpecialVenueGroup";
import { groupByVenue } from "@/lib/group-by-venue";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function MonthlySpecials({ specials }: { specials: SpecialWithVenue[] }) {
  if (specials.length === 0) return null;

  const monthName = MONTH_NAMES[new Date().getMonth()];
  const grouped = groupByVenue(specials);

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="font-display text-2xl text-foreground">
          {monthName} Specials
        </h2>
        <p className="text-sm text-muted">Running all month — not tied to a single day.</p>
      </div>
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-3">
        {grouped.map((g) => (
          <SpecialVenueGroup
            key={g.venueId}
            venueId={g.venueId}
            venueName={g.venueName}
            specials={g.items}
          />
        ))}
      </div>
    </section>
  );
}

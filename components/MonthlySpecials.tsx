import type { SpecialWithVenue } from "@/lib/data";
import { SpecialCard } from "./SpecialCard";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function MonthlySpecials({ specials }: { specials: SpecialWithVenue[] }) {
  if (specials.length === 0) return null;

  const monthName = MONTH_NAMES[new Date().getMonth()];

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="font-display text-2xl text-foreground">
          {monthName} Specials
        </h2>
        <p className="text-sm text-muted">Running all month — not tied to a single day.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {specials.map((s) => (
          <SpecialCard key={s.id} special={s} />
        ))}
      </div>
    </section>
  );
}

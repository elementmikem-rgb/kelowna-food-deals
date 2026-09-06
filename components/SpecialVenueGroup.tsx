import Link from "next/link";
import type { SpecialWithVenue } from "@/lib/data";
import { SpecialRow } from "./SpecialRow";
import { VerifiedBadge } from "./VerifiedBadge";
import { isPromotionActive } from "@/lib/promotion";

// Above this many, a venue's card starts crowding out everyone else's on the
// board (BNA Brewing and Cutwater Brewing both run past 10) -- the rest are
// one click away on the venue's own page, which lists all of them anyway.
const MAX_VISIBLE = 5;

export function SpecialVenueGroup({
  venueId,
  venueName,
  specials,
}: {
  venueId: number;
  venueName: string;
  specials: SpecialWithVenue[];
}) {
  const freshest = specials.reduce((latest, s) =>
    s.lastVerifiedAt > latest.lastVerifiedAt ? s : latest
  );
  const featured = isPromotionActive(specials[0]?.venueFeaturedUntil ?? null);
  const isPartner = specials[0]?.venuePartnerSince != null;
  const visible = specials.slice(0, MAX_VISIBLE);
  const hiddenCount = specials.length - visible.length;

  return (
    <article
      className={`pin-card ${
        venueId % 2 === 0 ? "tilt-a" : "tilt-b"
      } break-inside-avoid-column mb-3 rounded-2xl border ${
        featured ? "border-gold" : "border-border"
      } bg-surface p-4 pt-5 flex flex-col gap-1 shadow-[0_2px_10px_rgba(42,40,24,0.06)]`}
    >
      <Link
        href={`/venues/${venueId}`}
        className="absolute inset-0 z-0 rounded-2xl"
        aria-label={`${venueName} — full menu, hours, and details`}
      />

      <div className="relative z-10 flex items-start justify-between gap-3 pointer-events-none pb-2 border-b border-border">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-display text-xl leading-tight text-foreground">{venueName}</h3>
          {featured && (
            <span className="shrink-0 rounded-full border border-gold/40 bg-gold/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-gold">
              Featured
            </span>
          )}
          {isPartner && (
            <span className="shrink-0 rounded-full border border-evergreen/40 bg-evergreen/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-evergreen">
              Partner
            </span>
          )}
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1">
          {specials.length > 1 && (
            <span className="text-[11px] text-muted-2 uppercase tracking-wide">
              {specials.length} specials
            </span>
          )}
          <VerifiedBadge lastVerifiedAt={freshest.lastVerifiedAt} />
        </div>
      </div>

      <ul className="flex flex-col divide-y divide-border">
        {visible.map((s) => (
          <SpecialRow key={s.id} special={s} />
        ))}
      </ul>

      {hiddenCount > 0 && (
        <p className="relative z-10 pointer-events-none mt-1 pt-2 border-t border-dashed border-border text-xs font-medium text-accent-dim">
          + {hiddenCount} more — view all {specials.length} specials →
        </p>
      )}
    </article>
  );
}

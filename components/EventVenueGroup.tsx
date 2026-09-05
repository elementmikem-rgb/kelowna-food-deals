import Link from "next/link";
import type { EventWithVenue } from "@/lib/events-data";
import { EventRow } from "./EventRow";
import { VerifiedBadge } from "./VerifiedBadge";

export function EventVenueGroup({
  venueId,
  venueName,
  events,
}: {
  venueId: number | null;
  venueName: string;
  events: EventWithVenue[];
}) {
  const freshest = events.reduce((latest, e) =>
    e.lastVerifiedAt > latest.lastVerifiedAt ? e : latest
  );
  const address = events.find((e) => e.locationAddress)?.locationAddress ?? null;
  const tiltSeed = venueId ?? venueName.length;

  return (
    <article
      className={`pin-card ${
        tiltSeed % 2 === 0 ? "tilt-a" : "tilt-b"
      } break-inside-avoid-column mb-3 rounded-2xl border border-border bg-surface p-4 pt-5 flex flex-col gap-1 shadow-[0_2px_10px_rgba(42,40,24,0.06)]`}
    >
      {venueId !== null && (
        <Link
          href={`/venues/${venueId}`}
          className="absolute inset-0 z-0 rounded-2xl"
          aria-label={`${venueName} — full menu, hours, and details`}
        />
      )}

      <div className="relative z-10 flex items-start justify-between gap-3 pointer-events-none pb-2 border-b border-border">
        <div className="flex flex-col gap-0.5">
          <h3 className="font-display text-xl leading-tight text-foreground">{venueName}</h3>
          {venueId === null && address && (
            <p className="text-xs text-muted-2">{address}</p>
          )}
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1">
          {events.length > 1 && (
            <span className="text-[11px] text-muted-2 uppercase tracking-wide">
              {events.length} events
            </span>
          )}
          <VerifiedBadge lastVerifiedAt={freshest.lastVerifiedAt} />
        </div>
      </div>

      <ul className="flex flex-col divide-y divide-border">
        {events.map((e) => (
          <EventRow key={e.id} event={e} />
        ))}
      </ul>
    </article>
  );
}

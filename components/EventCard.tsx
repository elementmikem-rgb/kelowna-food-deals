"use client";

import { useState } from "react";
import Link from "next/link";
import type { EventWithVenue } from "@/lib/events-data";
import { formatPrice, formatEventDate } from "@/lib/format";
import { formatTimeWindow, isStale, monthlyOccurrenceLabel } from "@/lib/time";
import { VerifiedBadge } from "./VerifiedBadge";
import { ConfirmedBadges } from "./ConfirmedBadges";
import { EventInterestButton } from "./EventInterestButton";
import { isPromotionActive } from "@/lib/promotion";
import { t, EVENT_TYPE_LABELS, type Language } from "@/lib/i18n";
import { ReportButton } from "./ReportButton";

export function EventCard({
  event,
  dayLabel,
  regionSlug,
  lang = "en",
}: {
  event: EventWithVenue;
  dayLabel?: string | null;
  regionSlug: string;
  lang?: Language;
}) {
  const tr = t(lang);
  const [confirmState, setConfirmState] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );

  const stale = isStale(event.lastVerifiedAt);
  const boosted = isPromotionActive(event.boostedUntil);
  const cover = formatPrice(event.coverChargeCents);
  // null cover means "nobody told us", not "free" -- the extractor emits null both for
  // genuinely-free nights and for ticketed shows whose price it couldn't read. Only an
  // explicit 0 is a confirmed free door. Unknown renders nothing rather than a "not
  // listed" label -- with most events carrying no cover info, spelling out its absence
  // on every single card is pure noise.
  const coverLabel =
    event.coverChargeCents === null ? null : event.coverChargeCents === 0 ? tr.card.free : tr.card.cover(cover!);
  const timeWindow = formatTimeWindow(event.startTime, event.endTime);
  // Monthly ("Last Wednesday") takes priority over a plain day-range label --
  // a monthly event's dayOfWeek is always a single day, so the two labels
  // would otherwise say almost the same thing, and "Last Wednesday" carries
  // the info "Wed" alone doesn't (not every Wednesday).
  const scheduleLabel =
    event.monthlyOccurrence !== null && event.dayOfWeek !== null
      ? monthlyOccurrenceLabel(event.monthlyOccurrence, event.dayOfWeek, lang)
      : dayLabel && dayLabel !== "Daily"
        ? dayLabel
        : null;

  async function handleConfirm() {
    setConfirmState("sending");
    try {
      const res = await fetch(`/api/events/${event.id}/confirm`, { method: "POST" });
      setConfirmState(res.ok ? "sent" : "error");
    } catch {
      setConfirmState("error");
    }
  }

  return (
    <article
      className={`pin-card ${event.id % 2 === 0 ? "tilt-a" : "tilt-b"} rounded-2xl border border-border bg-surface p-4 pt-5 flex flex-col gap-2 shadow-[0_2px_10px_rgba(42,40,24,0.06)] ${
        stale ? "opacity-50" : ""
      }`}
    >
      <Link
        href={`/${regionSlug}/venues/${event.venueId}`}
        className="absolute inset-0 z-0 rounded-2xl"
        aria-label={`${event.venueName} -- ${event.title}, view full details`}
      />

      <div className="relative z-10 flex flex-wrap items-start justify-between gap-x-3 gap-y-1 pointer-events-none">
        <h3 className="font-display text-xl leading-tight text-foreground break-words min-w-0">
          {event.title}
        </h3>
        <div className="shrink-0 flex flex-col items-end gap-1">
          <span className="rounded-full border border-gold/40 bg-gold/15 px-2 py-0.5 text-[11px] uppercase tracking-wide text-gold">
            {EVENT_TYPE_LABELS[lang][event.eventType]}
          </span>
          {boosted && (
            <span className="rounded-full border border-accent-dim/40 bg-accent-dim/10 px-2 py-0.5 text-[11px] uppercase tracking-wide text-accent-dim">
              {tr.card.featured}
            </span>
          )}
        </div>
      </div>

      {event.description && (
        <p className="relative z-10 text-sm text-muted pointer-events-none">
          {event.description}
        </p>
      )}

      {boosted && event.hasPhoto && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/events/${event.id}/photo`}
          alt={`${event.title} poster`}
          className="relative z-10 pointer-events-none w-full max-h-60 rounded-xl object-cover"
          loading="lazy"
        />
      )}

      <div className="relative z-10 flex items-baseline gap-3 mt-1 flex-wrap pointer-events-none">
        {event.specificDate && (
          <span className="font-mono-tabular text-sm text-accent-dim">
            {formatEventDate(event.specificDate)}
          </span>
        )}
        {timeWindow && (
          <span className="font-mono-tabular text-sm text-muted">{timeWindow}</span>
        )}
        {coverLabel && (
          <span className="font-mono-tabular text-sm text-muted">{coverLabel}</span>
        )}
        {scheduleLabel && (
          <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-2">
            {scheduleLabel}
          </span>
        )}
      </div>

      <div className="relative z-10 flex items-center justify-between mt-2 pt-2 border-t border-border">
        <div className="flex flex-col gap-1">
          <VerifiedBadge lastVerifiedAt={event.lastVerifiedAt} lang={lang} />
          <ConfirmedBadges
            venueConfirmedAt={null}
            confirmCount={event.confirmCount}
            lastConfirmedAt={event.lastConfirmedAt}
            lang={lang}
          />
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleConfirm}
            disabled={confirmState !== "idle"}
            className="relative z-10 text-xs text-evergreen hover:underline disabled:cursor-default px-2 py-2.5 -my-2.5"
          >
            {confirmState === "idle" && tr.card.confirmEvent}
            {confirmState === "sending" && tr.card.sending}
            {confirmState === "sent" && tr.card.confirmThanks}
            {confirmState === "error" && tr.card.failedTryAgain}
          </button>
          <ReportButton itemId={event.id} venueId={event.venueId} kind="event" lang={lang} />
        </div>
      </div>

      <div className="relative z-10 -mt-1">
        <EventInterestButton eventId={event.id} initialCount={event.interestedCount} />
      </div>
    </article>
  );
}

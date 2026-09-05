"use client";

import { useState } from "react";
import Link from "next/link";
import type { EventWithVenue } from "@/lib/events-data";
import { formatPrice, EVENT_TYPE_LABELS, formatEventDate } from "@/lib/format";
import { formatTimeWindow, isStale } from "@/lib/time";
import { VerifiedBadge } from "./VerifiedBadge";

export function EventCard({ event }: { event: EventWithVenue }) {
  const [reportState, setReportState] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );

  const stale = isStale(event.lastVerifiedAt);
  const cover = formatPrice(event.coverChargeCents);
  const timeWindow = formatTimeWindow(event.startTime, event.endTime);

  async function handleReport() {
    setReportState("sending");
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specialId: event.id, venueId: event.venueId, kind: "event" }),
      });
      setReportState(res.ok ? "sent" : "error");
    } catch {
      setReportState("error");
    }
  }

  return (
    <article
      className={`pin-card ${event.id % 2 === 0 ? "tilt-a" : "tilt-b"} rounded-2xl border border-border bg-surface p-4 pt-5 flex flex-col gap-2 shadow-[0_2px_10px_rgba(42,40,24,0.06)] ${
        stale ? "opacity-50" : ""
      }`}
    >
      <Link
        href={`/venues/${event.venueId}`}
        className="absolute inset-0 z-0 rounded-2xl"
        aria-label={`${event.venueName} — ${event.title}, view full details`}
      />

      <div className="relative z-10 flex items-start justify-between gap-3 pointer-events-none">
        <h3 className="font-display text-xl leading-tight text-foreground">
          {event.venueName}
        </h3>
        <span className="shrink-0 rounded-full border border-gold/40 bg-gold/15 px-2 py-0.5 text-[11px] uppercase tracking-wide text-gold">
          {EVENT_TYPE_LABELS[event.eventType]}
        </span>
      </div>

      <p className="relative z-10 text-sm text-foreground/90 pointer-events-none">
        {event.title}
      </p>
      {event.description && (
        <p className="relative z-10 text-sm text-muted pointer-events-none">
          {event.description}
        </p>
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
        <span className="font-mono-tabular text-sm text-muted">
          {event.coverChargeCents ? `${cover} cover` : "Free"}
        </span>
      </div>

      <div className="relative z-10 flex items-center justify-between mt-2 pt-2 border-t border-border">
        <VerifiedBadge lastVerifiedAt={event.lastVerifiedAt} />
        <button
          onClick={handleReport}
          disabled={reportState !== "idle"}
          className="relative z-10 text-xs text-muted-2 hover:text-muted disabled:cursor-default"
        >
          {reportState === "idle" && "Report incorrect"}
          {reportState === "sending" && "Sending…"}
          {reportState === "sent" && "Reported"}
          {reportState === "error" && "Failed — try again"}
        </button>
      </div>
    </article>
  );
}

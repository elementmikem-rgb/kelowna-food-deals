"use client";

import { useState } from "react";
import type { EventWithVenue } from "@/lib/events-data";
import { formatPrice, EVENT_TYPE_LABELS, formatEventDate } from "@/lib/format";
import { formatTimeWindow, formatVerifiedRelative, isStale } from "@/lib/time";

export function EventRow({ event }: { event: EventWithVenue }) {
  const [reportState, setReportState] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );

  const stale = isStale(event.lastVerifiedAt);
  const cover = formatPrice(event.coverChargeCents);
  // null cover means "nobody told us", not "free" -- the extractor emits null both for
  // genuinely-free nights and for ticketed shows whose price it couldn't read. Only an
  // explicit 0 is a confirmed free door.
  const coverLabel =
    event.coverChargeCents === null
      ? "Cover not listed"
      : event.coverChargeCents === 0
        ? "Free"
        : `${cover} cover`;
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
    <li className={`relative z-10 py-2.5 first:pt-0 last:pb-0 ${stale ? "opacity-50" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-foreground/90">{event.title}</p>
            <span className="shrink-0 rounded-full border border-gold/40 bg-gold/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-gold">
              {EVENT_TYPE_LABELS[event.eventType]}
            </span>
          </div>
          {event.description && (
            <p className="text-xs text-muted">{event.description}</p>
          )}
        </div>
        <div className="shrink-0 text-right flex flex-col items-end gap-0.5">
          {event.specificDate && (
            <span className="font-mono-tabular text-xs text-accent-dim">
              {formatEventDate(event.specificDate)}
            </span>
          )}
          {timeWindow && (
            <span className="font-mono-tabular text-[11px] text-muted">{timeWindow}</span>
          )}
          <span className="font-mono-tabular text-[11px] text-muted">
            {coverLabel}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between mt-1">
        {stale ? (
          <span className="text-[11px] text-stale">
            stale — {formatVerifiedRelative(event.lastVerifiedAt)}
          </span>
        ) : event.venueId === null && event.sourceUrl ? (
          <a
            href={event.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="relative z-10 text-[11px] text-accent-dim hover:underline"
          >
            Details ↗
          </a>
        ) : (
          <span />
        )}
        <button
          onClick={handleReport}
          disabled={reportState !== "idle"}
          className="relative z-10 text-[11px] text-muted-2 hover:text-muted disabled:cursor-default"
        >
          {reportState === "idle" && "Report incorrect"}
          {reportState === "sending" && "Sending…"}
          {reportState === "sent" && "Reported"}
          {reportState === "error" && "Failed — try again"}
        </button>
      </div>
    </li>
  );
}

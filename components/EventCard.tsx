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
      className={`rounded-2xl border border-border bg-surface p-4 flex flex-col gap-2 shadow-[0_2px_10px_rgba(43,36,32,0.05)] ${
        stale ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-xl leading-tight text-foreground">
          <Link href={`/venues/${event.venueId}`} className="hover:underline">
            {event.venueName}
          </Link>
        </h3>
        <span className="shrink-0 rounded-full border border-accent-dim/30 bg-accent-soft/40 px-2 py-0.5 text-[11px] uppercase tracking-wide text-accent-dim">
          {EVENT_TYPE_LABELS[event.eventType]}
        </span>
      </div>

      <p className="text-sm text-foreground/90">{event.title}</p>
      {event.description && (
        <p className="text-sm text-muted">{event.description}</p>
      )}

      <div className="flex items-baseline gap-3 mt-1 flex-wrap">
        {event.specificDate && (
          <span className="font-mono-tabular text-sm text-accent-dim">
            {formatEventDate(event.specificDate)}
          </span>
        )}
        {timeWindow && (
          <span className="font-mono-tabular text-sm text-muted">{timeWindow}</span>
        )}
        <span className="font-mono-tabular text-sm text-muted">
          {cover ? `${cover} cover` : "Free"}
        </span>
      </div>

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
        <VerifiedBadge lastVerifiedAt={event.lastVerifiedAt} />
        <button
          onClick={handleReport}
          disabled={reportState !== "idle"}
          className="text-xs text-muted-2 hover:text-muted disabled:cursor-default"
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

"use client";

import { useState } from "react";
import Link from "next/link";
import type { SpecialWithVenue } from "@/lib/data";
import { formatPrice, CATEGORY_LABELS } from "@/lib/format";
import { formatTimeWindow, isStale } from "@/lib/time";
import { VerifiedBadge } from "./VerifiedBadge";
import { isPromotionActive } from "@/lib/promotion";

export function SpecialCard({
  special,
  dayLabel,
}: {
  special: SpecialWithVenue;
  dayLabel?: string | null;
}) {
  const [reportState, setReportState] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );

  const stale = isStale(special.lastVerifiedAt);
  const price = formatPrice(special.priceCents);
  const timeWindow = formatTimeWindow(special.startTime, special.endTime);
  const boosted = isPromotionActive(special.boostedUntil);

  async function handleReport() {
    setReportState("sending");
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specialId: special.id, venueId: special.venueId }),
      });
      setReportState(res.ok ? "sent" : "error");
    } catch {
      setReportState("error");
    }
  }

  return (
    <article
      className={`pin-card ${special.id % 2 === 0 ? "tilt-a" : "tilt-b"} rounded-2xl border border-border bg-surface p-4 pt-5 flex flex-col gap-2 shadow-[0_2px_10px_rgba(42,40,24,0.06)] ${
        stale ? "opacity-50" : ""
      }`}
    >
      <Link
        href={`/venues/${special.venueId}`}
        className="absolute inset-0 z-0 rounded-2xl"
        aria-label={`${special.venueName} — ${special.title}, view full details`}
      />

      <div className="relative z-10 flex items-start justify-between gap-3 pointer-events-none">
        <h3 className="font-display text-xl leading-tight text-foreground">
          {special.venueName}
        </h3>
        <div className="shrink-0 flex flex-col items-end gap-1">
          <span className="rounded-full border border-evergreen/30 bg-evergreen/10 px-2 py-0.5 text-[11px] uppercase tracking-wide text-evergreen">
            {CATEGORY_LABELS[special.category]}
          </span>
          {boosted && (
            <span className="rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-[11px] uppercase tracking-wide text-gold">
              Featured
            </span>
          )}
        </div>
      </div>

      <p className="relative z-10 text-sm text-foreground/90 pointer-events-none">
        {special.title}
      </p>
      {special.description && (
        <p className="relative z-10 text-sm text-muted pointer-events-none">
          {special.description}
        </p>
      )}

      <div className="relative z-10 flex items-baseline gap-3 mt-1 pointer-events-none">
        {price && (
          <span className="font-mono-tabular text-lg text-accent">{price}</span>
        )}
        {timeWindow && (
          <span className="font-mono-tabular text-sm text-muted">{timeWindow}</span>
        )}
        {dayLabel && dayLabel !== "Daily" && (
          <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-2">
            {dayLabel}
          </span>
        )}
      </div>

      <div className="relative z-10 flex items-center justify-between mt-2 pt-2 border-t border-border">
        <VerifiedBadge lastVerifiedAt={special.lastVerifiedAt} />
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

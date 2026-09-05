"use client";

import { useState } from "react";
import type { SpecialWithVenue } from "@/lib/data";
import { formatPrice, CATEGORY_LABELS } from "@/lib/format";
import { formatTimeWindow, isStale } from "@/lib/time";
import { VerifiedBadge } from "./VerifiedBadge";

export function SpecialCard({ special }: { special: SpecialWithVenue }) {
  const [reportState, setReportState] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );

  const stale = isStale(special.lastVerifiedAt);
  const price = formatPrice(special.priceCents);
  const timeWindow = formatTimeWindow(special.startTime, special.endTime);

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
      className={`rounded-2xl border border-border bg-surface p-4 flex flex-col gap-2 shadow-[0_2px_10px_rgba(43,36,32,0.05)] ${
        stale ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-xl leading-tight text-foreground">
          {special.venueName}
        </h3>
        <span className="shrink-0 rounded-full border border-evergreen/30 bg-evergreen/10 px-2 py-0.5 text-[11px] uppercase tracking-wide text-evergreen">
          {CATEGORY_LABELS[special.category]}
        </span>
      </div>

      <p className="text-sm text-foreground/90">{special.title}</p>
      {special.description && (
        <p className="text-sm text-muted">{special.description}</p>
      )}

      <div className="flex items-baseline gap-3 mt-1">
        {price && (
          <span className="font-mono-tabular text-lg text-accent">{price}</span>
        )}
        {timeWindow && (
          <span className="font-mono-tabular text-sm text-muted">{timeWindow}</span>
        )}
      </div>

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
        <VerifiedBadge lastVerifiedAt={special.lastVerifiedAt} />
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

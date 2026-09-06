"use client";

import { useState } from "react";
import type { SpecialWithVenue } from "@/lib/data";
import { formatPrice, CATEGORY_LABELS } from "@/lib/format";
import { formatTimeWindow, formatVerifiedRelative, isStale } from "@/lib/time";
import { isPromotionActive } from "@/lib/promotion";

export function SpecialRow({ special }: { special: SpecialWithVenue }) {
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
    <li className={`relative z-10 py-2.5 first:pt-0 last:pb-0 ${stale ? "opacity-50" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-foreground/90">{special.title}</p>
            <span className="shrink-0 rounded-full border border-evergreen/30 bg-evergreen/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-evergreen">
              {CATEGORY_LABELS[special.category]}
            </span>
            {boosted && (
              <span className="shrink-0 rounded-full border border-gold/40 bg-gold/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-gold">
                Featured
              </span>
            )}
          </div>
          {special.description && (
            <p className="text-xs text-muted">{special.description}</p>
          )}
        </div>
        <div className="shrink-0 text-right flex flex-col items-end gap-0.5">
          {price && <span className="font-mono-tabular text-sm text-accent">{price}</span>}
          {timeWindow && (
            <span className="font-mono-tabular text-[11px] text-muted">{timeWindow}</span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-1">
        {stale ? (
          <span className="text-[11px] text-stale">
            stale — {formatVerifiedRelative(special.lastVerifiedAt)}
          </span>
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

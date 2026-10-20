"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { suggestRegion, type GeoRegion } from "@/lib/nearby-region";

const STORAGE_KEY = "todaystab_nearby_checked";
// A check that found nothing to suggest is repeated soon (people travel); a dismissal or a
// blocked location prompt waits much longer so we never nag.
const RECHECK_MS = 6 * 60 * 60 * 1000;
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;

function snoozedUntil(): number {
  try {
    return Number(localStorage.getItem(STORAGE_KEY)) || 0;
  } catch {
    return 0;
  }
}
function snooze(ms: number) {
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now() + ms));
  } catch {
    // Storage blocked: it just checks again next visit.
  }
}

// Offers a switch when the visitor's position clearly puts them in a different region than
// the one they're viewing (e.g. back in Kelowna with the app still open on Penticton).
// Never switches by itself, and the position stays in this browser: only the public
// region-center list is fetched.
export function NearbyRegionPrompt({ currentSlug, lang }: { currentSlug: string; lang: string }) {
  const [suggestion, setSuggestion] = useState<GeoRegion | null>(null);

  useEffect(() => {
    if (!navigator.geolocation || Date.now() < snoozedUntil()) return;
    let cancelled = false;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch("/api/regions/geo");
          if (!res.ok) return;
          const regions = (await res.json()) as GeoRegion[];
          const hit = suggestRegion(
            { lat: pos.coords.latitude, lng: pos.coords.longitude },
            regions,
            currentSlug
          );
          if (cancelled) return;
          if (hit) setSuggestion(hit);
          else snooze(RECHECK_MS);
        } catch {
          // Network trouble: say nothing.
        }
      },
      () => snooze(SNOOZE_MS),
      { timeout: 8000, maximumAge: 10 * 60 * 1000 }
    );
    return () => {
      cancelled = true;
    };
  }, [currentSlug]);

  if (!suggestion) return null;
  const fr = lang === "fr";
  const name = suggestion.brandName.replace(/ Food Deals$/, "");

  return (
    <div className="fixed inset-x-3 top-3 z-50 mx-auto max-w-md rounded-2xl border border-border bg-surface shadow-[0_4px_20px_rgba(42,40,24,0.18)] p-3 flex items-center gap-3">
      <p className="flex-1 min-w-0 text-sm text-foreground/90">
        {fr ? `Vous semblez être à ${name}.` : `You look to be in ${name}.`}
      </p>
      <Link
        href={`/${suggestion.slug}`}
        onClick={() => snooze(RECHECK_MS)}
        className="press-pill shrink-0 rounded-full bg-accent text-background px-3 py-1.5 text-xs font-medium"
      >
        {fr ? "Changer" : "Switch"}
      </Link>
      <button
        onClick={() => {
          snooze(SNOOZE_MS);
          setSuggestion(null);
        }}
        aria-label={fr ? "Fermer" : "Dismiss"}
        className="shrink-0 text-muted hover:text-foreground text-sm px-1"
      >
        ✕
      </button>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { venueActionEvent } from "@/lib/venue-actions";

// Renders nothing. One click listener for the venue page: a tap on any element tagged
// data-venue-action sends that event with the venue id as the label. track.js uses
// sendBeacon, so the event still goes out when the tap opens another page or app.
export function VenueActionTracker({ venueId }: { venueId: number }) {
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const el = (e.target as Element | null)?.closest?.("[data-venue-action]");
      const eventType = venueActionEvent(el?.getAttribute("data-venue-action"));
      if (eventType) window.kdsTrack?.(eventType, String(venueId));
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [venueId]);
  return null;
}

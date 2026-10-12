"use client";

import { useEffect } from "react";
import { venueActionEvent } from "@/lib/venue-actions";

// Renders nothing; mounted once in the region layout. A tap on any element tagged
// data-venue-action sends that event with the element's data-venue-id as the label.
// track.js uses sendBeacon, so the event still goes out when the tap opens another page
// or app.
export function VenueActionTracker() {
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const el = (e.target as Element | null)?.closest?.("[data-venue-action]");
      const eventType = venueActionEvent(el?.getAttribute("data-venue-action"));
      const venueId = el?.getAttribute("data-venue-id");
      if (eventType && venueId) window.kdsTrack?.(eventType, venueId);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
  return null;
}

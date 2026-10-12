"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { venueActionEvent } from "@/lib/venue-actions";
import { createImpressionBatcher } from "@/lib/impressions";

const batcher = createImpressionBatcher();

// Renders nothing; mounted once in the region layout. Two jobs:
// 1. A tap on any element tagged data-venue-action sends that event with the element's
//    data-venue-id as the label.
// 2. A card tagged data-venue-impression that is at least 40% on screen counts as one
//    impression for that venue (once per page view), sent in batches a moment later.
// track.js uses sendBeacon, so events still go out when a tap opens another page or app.
export function VenueActionTracker() {
  const pathname = usePathname();

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

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    batcher.reset();
    let timer: ReturnType<typeof setTimeout> | null = null;

    function flush() {
      if (timer) clearTimeout(timer);
      timer = null;
      for (const label of batcher.flush()) window.kdsTrack?.("venue_impressions", label);
    }

    const io = new IntersectionObserver(
      (entries) => {
        let added = false;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          io.unobserve(entry.target);
          if (batcher.add(Number(entry.target.getAttribute("data-venue-impression")))) added = true;
        }
        if (added && !timer) timer = setTimeout(flush, 2000);
      },
      { threshold: 0.4 }
    );

    function observeWithin(root: ParentNode) {
      root.querySelectorAll("[data-venue-impression]").forEach((el) => io.observe(el));
    }
    observeWithin(document);
    // Cards appear later too (day tabs, filters, "show more"), so watch for new ones.
    const mo = new MutationObserver((records) => {
      for (const r of records) {
        r.addedNodes.forEach((n) => {
          if (n instanceof Element) {
            if (n.hasAttribute("data-venue-impression")) io.observe(n);
            observeWithin(n);
          }
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    function onHide() {
      if (document.visibilityState === "hidden") flush();
    }
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);

    return () => {
      flush();
      io.disconnect();
      mo.disconnect();
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
    };
  }, [pathname]);

  return null;
}

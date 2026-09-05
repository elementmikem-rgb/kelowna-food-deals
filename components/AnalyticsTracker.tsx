"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

declare global {
  interface Window {
    kdsTrack?: (eventType: string, eventLabel?: string) => void;
  }
}

export function AnalyticsTracker() {
  const pathname = usePathname();
  const isFirstRender = useRef(true);

  useEffect(() => {
    // The initial pageview is already sent by the inline script on full load;
    // this only fires for client-side route changes after that.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    window.kdsTrack?.("pageview");
  }, [pathname]);

  return null;
}

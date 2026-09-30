"use client";

import { useEffect, useState } from "react";
import { isInterested, markInterested } from "@/lib/event-interest";

// "X people interested" social proof (Eventbrite-style) -- a lightweight one-tap
// "I'm in" per event, separate from Confirm ("this listing is accurate") and Report.
// Starts unsaved during SSR/first paint (no localStorage server-side), corrects on
// mount, same SSR-vs-client split as SaveVenueButton/InstallPrompt.
export function EventInterestButton({ eventId, initialCount }: { eventId: number; initialCount: number }) {
  const [tapped, setTapped] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [state, setState] = useState<"idle" | "sending" | "error">("idle");

  useEffect(() => {
    setTapped(isInterested(eventId));
  }, [eventId]);

  async function handleTap() {
    setState("sending");
    try {
      const res = await fetch(`/api/events/${eventId}/interest`, { method: "POST" });
      const body = await res.json().catch(() => null);
      if (res.ok) {
        setCount(body?.interestedCount ?? count + 1);
      }
      // A 429 here almost always means this IP already tapped it (elsewhere, or
      // before localStorage caught up) -- either way the intent is recorded, so
      // the button still flips to the tapped state rather than showing an error.
      markInterested(eventId);
      setTapped(true);
      setState("idle");
    } catch {
      setState("error");
    }
  }

  return (
    <span className="relative z-10 flex items-center gap-1.5 text-[11px]">
      {count > 0 && (
        <span className="text-muted-2">
          {count} interested
        </span>
      )}
      {tapped ? (
        <span className="text-accent-dim">You're in</span>
      ) : (
        <button
          onClick={handleTap}
          disabled={state === "sending"}
          className="text-accent-dim hover:underline disabled:cursor-default px-2 py-2 -my-2"
        >
          {state === "sending" ? "Sending…" : "I'm interested"}
        </button>
      )}
    </span>
  );
}

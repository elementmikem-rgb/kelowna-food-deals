"use client";

import { useState } from "react";
import { FlashCountdown } from "./FlashCountdown";

// Shared by SpecialRow (homepage grid) and SpecialCard (venue detail page) -- a flash
// special is urgent enough that both places should treat it the same way rather than
// each rolling their own countdown/claim UI.
export function FlashSpecialPanel({
  specialId,
  expiresAt,
  claimLimit,
  claimCount,
}: {
  specialId: number;
  expiresAt: Date;
  claimLimit: number | null;
  claimCount: number;
}) {
  const [count, setCount] = useState(claimCount);
  const [claimState, setClaimState] = useState<"idle" | "sending" | "claimed" | "error">("idle");
  const soldOut = claimLimit !== null && count >= claimLimit;

  async function handleClaim() {
    setClaimState("sending");
    try {
      const res = await fetch(`/api/specials/${specialId}/claim-flash`, { method: "POST" });
      const body = await res.json().catch(() => null);
      if (res.ok) {
        setCount(body?.flashClaimCount ?? count + 1);
        setClaimState("claimed");
      } else {
        setClaimState("error");
      }
    } catch {
      setClaimState("error");
    }
  }

  return (
    <div className="relative z-10 flex items-center justify-between gap-2 rounded-lg border border-danger/40 bg-danger/10 px-2.5 py-1.5 flex-wrap">
      <div className="flex items-center gap-2 flex-wrap text-xs">
        <span className="rounded-full bg-danger px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
          Flash deal
        </span>
        <span className="text-danger font-medium">
          <FlashCountdown expiresAt={expiresAt} />
        </span>
        {claimLimit !== null && (
          <span className="text-muted-2">
            {soldOut ? "claimed out" : `${count} of ${claimLimit} claimed`}
          </span>
        )}
      </div>
      <button
        onClick={handleClaim}
        disabled={claimState !== "idle" || soldOut}
        className="press-pill shrink-0 rounded-full bg-danger text-white px-3 py-1.5 text-xs font-medium disabled:opacity-50"
      >
        {claimState === "idle" && (soldOut ? "Claimed out" : "I'm claiming this")}
        {claimState === "sending" && "Sending…"}
        {claimState === "claimed" && "Claimed!"}
        {claimState === "error" && "Failed — try again"}
      </button>
    </div>
  );
}

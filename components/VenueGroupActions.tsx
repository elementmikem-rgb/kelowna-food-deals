"use client";

import { useState } from "react";

// One Confirm/Report pair per venue card (see SpecialVenueGroup), applying to
// that venue's freshest special -- replaces what used to be a pair per special
// row, which crowded a 5-special card with up to 10 tiny, closely-packed
// buttons. "If something's wrong here" almost always means the whole board
// needs a re-check anyway; admin's Flagged queue still gets a specific
// special id to investigate, just always the venue's most-recently-verified
// one rather than whichever row a visitor happened to be looking at.
export function VenueGroupActions({
  specialId,
  venueId,
}: {
  specialId: number;
  venueId: number;
}) {
  const [confirmState, setConfirmState] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [reportState, setReportState] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );

  async function handleConfirm() {
    setConfirmState("sending");
    try {
      const res = await fetch(`/api/specials/${specialId}/confirm`, { method: "POST" });
      setConfirmState(res.ok ? "sent" : "error");
    } catch {
      setConfirmState("error");
    }
  }

  async function handleReport() {
    setReportState("sending");
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specialId, venueId }),
      });
      setReportState(res.ok ? "sent" : "error");
    } catch {
      setReportState("error");
    }
  }

  return (
    <div className="relative z-10 flex items-center gap-1">
      <button
        onClick={handleConfirm}
        disabled={confirmState !== "idle"}
        className="text-[11px] text-evergreen hover:underline disabled:cursor-default px-2 py-2 -my-2"
      >
        {confirmState === "idle" && "Confirm this deal"}
        {confirmState === "sending" && "Sending…"}
        {confirmState === "sent" && "Thanks!"}
        {confirmState === "error" && "Failed — try again"}
      </button>
      <button
        onClick={handleReport}
        disabled={reportState !== "idle"}
        className="text-[11px] text-danger/80 hover:text-danger disabled:cursor-default px-2 py-2 -my-2"
      >
        {reportState === "idle" && "Report incorrect"}
        {reportState === "sending" && "Sending…"}
        {reportState === "sent" && "Reported"}
        {reportState === "error" && "Failed — try again"}
      </button>
    </div>
  );
}

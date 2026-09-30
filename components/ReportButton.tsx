"use client";

import { useState } from "react";
import { t, type Language } from "@/lib/i18n";

// Mirrors db/schema.ts's dealFeedbackReason -- kept as a local literal instead
// of importing from "@/db" so this client component never pulls in the
// server-only drizzle/postgres client that module also exports.
type DealFeedbackReason = "price_wrong" | "not_offered" | "wrong_day_time" | "other";

// Shared "Report incorrect" control -- clicking it opens a modal asking for a
// reason before anything is actually submitted, so a mis-tap can't silently
// log a dispute (the old behavior: the link itself fired the request on
// click, no confirmation, no way for admin to see why). Used by every card
// that used to wire up its own handleReport (SpecialCard, EventCard,
// EventRow, VenueGroupActions) so the confirm step is consistent everywhere.
export function ReportButton({
  itemId,
  venueId,
  kind = "special",
  lang = "en",
  className,
}: {
  itemId: number;
  venueId: number | null;
  kind?: "special" | "event";
  lang?: Language;
  className?: string;
}) {
  const tr = t(lang);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<DealFeedbackReason | null>(null);
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit() {
    setState("sending");
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          specialId: itemId,
          venueId,
          kind,
          reason: reason ?? undefined,
          note: note.trim() || undefined,
        }),
      });
      setState(res.ok ? "sent" : "error");
      if (res.ok) setOpen(false);
    } catch {
      setState("error");
    }
  }

  function closeDialog() {
    setOpen(false);
    setReason(null);
    setNote("");
    if (state === "error") setState("idle");
  }

  const btnClassName =
    className ??
    "relative z-10 text-xs text-danger/80 hover:text-danger disabled:cursor-default px-2 py-2.5 -my-2.5";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={state === "sending" || state === "sent"}
        className={btnClassName}
      >
        {state === "idle" && tr.card.reportIncorrect}
        {state === "sending" && tr.card.sending}
        {state === "sent" && tr.card.reported}
        {state === "error" && tr.card.failedTryAgain}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeDialog}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-2xl border border-border bg-surface p-4 shadow-lg flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg text-foreground">{tr.card.reportDialog.heading}</h3>

            <div className="flex flex-col gap-1.5">
              {(
                [
                  ["price_wrong", tr.card.reportDialog.priceWrong],
                  ["not_offered", tr.card.reportDialog.notOffered],
                  ["wrong_day_time", tr.card.reportDialog.wrongDayTime],
                  ["other", tr.card.reportDialog.other],
                ] as [DealFeedbackReason, string][]
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setReason(value)}
                  className={`text-left text-sm rounded-lg border px-3 py-2 ${
                    reason === value
                      ? "border-accent bg-accent-soft/30 text-foreground"
                      : "border-border text-muted hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={tr.card.reportDialog.notePlaceholder}
              maxLength={500}
              rows={2}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-2"
            />

            <div className="flex items-center justify-end gap-2 mt-1">
              <button
                type="button"
                onClick={closeDialog}
                className="text-sm text-muted hover:text-foreground px-3 py-1.5"
              >
                {tr.card.reportDialog.cancel}
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={!reason || state === "sending"}
                className="press-pill rounded-full bg-danger text-background px-4 py-1.5 text-sm font-medium disabled:opacity-50"
              >
                {state === "sending" ? tr.card.sending : tr.card.reportDialog.submit}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

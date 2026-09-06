"use client";

import { useState } from "react";

export function AdminOutreachRow({
  venueId,
  venueName,
  contactEmail,
  lastSend,
}: {
  venueId: number;
  venueName: string;
  contactEmail: string;
  lastSend: { status: string; sentAt: string | null } | null;
}) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    setState("sending");
    setError(null);
    try {
      const res = await fetch("/api/admin/outreach/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venueId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Send failed");
      setState("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
      setState("error");
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-sm font-medium text-foreground/90 truncate">{venueName}</span>
        <span className="text-xs text-muted-2 truncate">{contactEmail}</span>
        {lastSend && (
          <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-2">
            <span
              className={`inline-block w-1.5 h-1.5 rounded-full ${
                lastSend.status === "sent" ? "bg-evergreen" : "bg-stale"
              }`}
            />
            {lastSend.status}
            {lastSend.sentAt ? ` · ${new Date(lastSend.sentAt).toLocaleDateString()}` : ""}
          </span>
        )}
      </div>
      <button
        onClick={handleSend}
        disabled={state === "sending" || state === "sent"}
        className="press-pill shrink-0 rounded-full bg-accent text-background px-4 py-1.5 text-xs font-medium disabled:opacity-50"
      >
        {state === "idle" && (lastSend ? "Send again" : "Send outreach")}
        {state === "sending" && "Sending…"}
        {state === "sent" && "Sent"}
        {state === "error" && "Retry"}
      </button>
      {error && <span className="text-xs text-stale">{error}</span>}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface VenueOption {
  id: number;
  name: string;
  contactEmail: string;
}

export function ComposeForm({ venues }: { venues: VenueOption[] }) {
  const router = useRouter();
  const [venueId, setVenueId] = useState<number>(venues[0]?.id ?? 0);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "error">("idle");

  const selected = venues.find((v) => v.id === venueId);

  async function handleSend() {
    if (!selected || !subject.trim() || !body.trim()) return;
    setState("sending");
    try {
      const res = await fetch("/api/admin/inbox/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueId: selected.id,
          toEmail: selected.contactEmail,
          subject,
          body,
        }),
      });
      if (!res.ok) throw new Error();
      router.push(`/admin/inbox/t/v${selected.id}`);
    } catch {
      setState("error");
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-2">To</span>
        <select
          value={venueId}
          onChange={(e) => setVenueId(Number(e.target.value))}
          className="rounded-lg border border-border bg-background px-3 py-2"
        >
          {venues.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} — {v.contactEmail}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-2">Subject</span>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject"
          className="rounded-lg border border-border bg-background px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-2">Message</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={8}
          placeholder="Type your message…"
          className="rounded-lg border border-border bg-background px-3 py-2 resize-none"
        />
      </label>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSend}
          disabled={state === "sending" || !subject.trim() || !body.trim()}
          className="press-pill self-start rounded-full bg-accent text-background px-4 py-1.5 text-sm font-medium disabled:opacity-50"
        >
          {state === "sending" ? "Sending…" : "Send"}
        </button>
        {state === "error" && <p className="text-xs text-stale">Failed to send — try again.</p>}
      </div>
    </div>
  );
}

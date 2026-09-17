"use client";

import { useState } from "react";

export function ClaimVenueForm({ venueId, venueName }: { venueId: number; venueName: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setStatus("sending");
    setError(null);
    try {
      const res = await fetch("/api/venue-claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueId,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          role: role.trim() || null,
          message: message.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-center">
        <p className="font-display text-xl text-foreground mb-1">Request sent</p>
        <p className="text-sm text-muted">
          We&apos;ll verify this is really you and follow up by email — usually within a day or
          two.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-xs text-muted-2 -mt-1">
        No account needed yet — we&apos;ll verify your claim on {venueName} and email you a login
        link once approved.
      </p>

      <div className="flex flex-col gap-1">
        <label className="text-sm text-muted" htmlFor="claim-name">
          Your name
        </label>
        <input
          id="claim-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm text-muted" htmlFor="claim-email">
          Email
        </label>
        <input
          id="claim-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm text-muted" htmlFor="claim-phone">
          Phone (optional)
        </label>
        <input
          id="claim-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm text-muted" htmlFor="claim-role">
          Your role (optional)
        </label>
        <input
          id="claim-role"
          type="text"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="e.g. Owner, Manager"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm text-muted" htmlFor="claim-message">
          Anything else? (optional)
        </label>
        <textarea
          id="claim-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm resize-none"
        />
      </div>

      {error && <p className="text-sm text-stale">{error}</p>}

      <button
        type="submit"
        disabled={status === "sending"}
        className="press-pill rounded-full bg-accent text-background px-5 py-2 text-sm font-medium disabled:opacity-50 self-start"
      >
        {status === "sending" ? "Sending…" : "Request access"}
      </button>
    </form>
  );
}

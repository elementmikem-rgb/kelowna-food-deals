"use client";

import { useState } from "react";

type Status = "idle" | "sending" | "done" | "error";

export function SponsorInquiryForm() {
  const [name, setName] = useState("");
  const [business, setBusiness] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !business.trim() || !email.trim() || !message.trim()) {
      setError("Fill in every field so we know who's reaching out and why.");
      return;
    }

    setStatus("sending");
    try {
      const res = await fetch("/api/sponsor-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          business: business.trim(),
          email: email.trim(),
          message: message.trim(),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Something went wrong");
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-center">
        <p className="font-display text-xl text-foreground mb-1">Thanks — got it</p>
        <p className="text-sm text-muted">
          We'll follow up at {email} soon. A confirmation is on its way to your inbox too.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-sm text-muted" htmlFor="name">
          Your name
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm text-muted" htmlFor="business">
          Business
        </label>
        <input
          id="business"
          type="text"
          value={business}
          onChange={(e) => setBusiness(e.target.value)}
          placeholder="e.g. The Whatever Pub"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm text-muted" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm text-muted" htmlFor="message">
          What are you interested in?
        </label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          placeholder="e.g. Featured placement for our venue, or promoting our holiday menu the week of..."
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm resize-none"
        />
      </div>

      {error && <p className="text-sm text-stale">{error}</p>}

      <button
        type="submit"
        disabled={status === "sending"}
        className="press-pill rounded-full bg-accent text-background px-5 py-2 text-sm font-medium disabled:opacity-50 self-start"
      >
        {status === "sending" ? "Sending…" : "Send inquiry"}
      </button>
    </form>
  );
}

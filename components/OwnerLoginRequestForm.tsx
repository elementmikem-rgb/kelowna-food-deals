"use client";

import { useState } from "react";

export function OwnerLoginRequestForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setState("sending");
    try {
      await fetch("/api/owner/request-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
    } finally {
      // Same response either way (see route comment) -- always show the
      // generic "check your email" state, never "no account found".
      setState("sent");
    }
  }

  if (state === "sent") {
    return (
      <p className="text-sm text-muted max-w-sm">
        If that email has a listing on file, a fresh login link is on its way.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 w-full max-w-sm">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@yourvenue.com"
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={state === "sending"}
        className="press-pill rounded-full bg-accent text-background px-4 py-1.5 text-sm font-medium disabled:opacity-50"
      >
        {state === "sending" ? "Sending…" : "Email me a login link"}
      </button>
    </form>
  );
}

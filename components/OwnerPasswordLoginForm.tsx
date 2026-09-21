"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function OwnerPasswordLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"idle" | "sending">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setError(null);
    try {
      const res = await fetch("/api/owner/login-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error === "invalid_credentials" ? "Wrong email or password." : "Failed to log in.");
      }
      if (!body.venueId) throw new Error("No venue linked to this account.");
      router.push(`/owner/venue/${body.venueId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log in.");
      setState("idle");
    }
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
      <input
        type="password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
      />
      {error && <p className="text-xs text-stale">{error}</p>}
      <button
        type="submit"
        disabled={state === "sending"}
        className="press-pill rounded-full bg-accent text-background px-4 py-1.5 text-sm font-medium disabled:opacity-50"
      >
        {state === "sending" ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}

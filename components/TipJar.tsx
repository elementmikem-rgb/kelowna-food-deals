"use client";

import { useState } from "react";

const AMOUNTS = [
  { label: "$3", cents: 300 },
  { label: "$5", cents: 500 },
  { label: "$10", cents: 1000 },
];

export function TipJar() {
  const [loadingCents, setLoadingCents] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout(amountCents: number) {
    setError(null);
    setLoadingCents(amountCents);
    try {
      const res = await fetch("/api/tip/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountCents }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Something went wrong");
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoadingCents(null);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-5 flex flex-col items-center gap-3 text-center">
      <h2 className="font-display text-xl text-foreground">Enjoying this?</h2>
      <p className="text-sm text-muted max-w-sm">
        This site is a one-person project, checked and kept accurate by hand. If it
        saved you a trip across town, a tip helps keep it running.
      </p>
      <div className="flex gap-2">
        {AMOUNTS.map((a) => (
          <button
            key={a.cents}
            onClick={() => startCheckout(a.cents)}
            disabled={loadingCents !== null}
            className="press-pill rounded-full bg-accent text-background px-5 py-2 text-sm font-medium disabled:opacity-50"
          >
            {loadingCents === a.cents ? "…" : a.label}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-stale">{error}</p>}
    </section>
  );
}

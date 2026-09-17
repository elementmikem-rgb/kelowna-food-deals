"use client";

import { useState } from "react";
import { t, type Language } from "@/lib/i18n";

const AMOUNTS = [
  { label: "$3", cents: 300 },
  { label: "$5", cents: 500 },
  { label: "$10", cents: 1000 },
];

export function TipJar({ regionSlug, lang = "en" }: { regionSlug: string; lang?: Language }) {
  const tip = t(lang).tip;
  const [loadingCents, setLoadingCents] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout(amountCents: number) {
    setError(null);
    setLoadingCents(amountCents);
    window.kdsTrack?.("tip_click", String(amountCents));
    try {
      const res = await fetch("/api/tip/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountCents, regionSlug }),
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
    <section
      id="tip-jar"
      className="rounded-xl border border-border bg-surface p-5 flex flex-col items-center gap-3 text-center scroll-mt-4"
    >
      <h2 className="font-display text-xl text-foreground">{tip.heading}</h2>
      <p className="text-sm text-muted max-w-sm">
        {tip.body}
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

"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/format";

interface Bundle {
  id: number;
  name: string;
  priceCents: number;
  credits: number;
}

// Purely informational -- credits never expire (see lib/credits.ts: "Free trial, no
// expiry"). This is a soft reminder nudge, not a real deadline, so it never says
// credits will be lost or claws anything back.
function daysSince(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

// Sits alongside OwnerCart -- shows the venue's credit balance (1 credit = $1, see
// lib/credits.ts) and lets the owner buy a prepaid bundle. Spending the balance
// happens from OwnerCart's own "pay with credits" toggle, not here -- this component
// is purchase-only.
export function OwnerCredits({
  venueId,
  balance,
  bundles,
  freeTrialGrantedAt,
  beforeDuringViews,
}: {
  venueId: number;
  balance: number;
  bundles: Bundle[];
  // Null for a venue that never got a free-trial grant (claimed before the credit
  // system existed, or only ever bought credits directly) -- the nudge and the
  // before/during number both just don't render in that case.
  freeTrialGrantedAt: string | null;
  beforeDuringViews: { before: number; during: number } | null;
}) {
  const [buyingId, setBuyingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function buy(bundleId: number) {
    setBuyingId(bundleId);
    setError(null);
    try {
      const res = await fetch("/api/owner/credits/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venueId, bundleId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      window.location.assign(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      setBuyingId(null);
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-foreground/90">Credits</span>
        <span className="text-xs text-muted">
          Spend credits on any promotion below instead of paying by card. 1 credit = $1.
        </span>
      </div>

      <p className="text-2xl font-display text-foreground">
        {balance} <span className="text-sm text-muted font-sans">credit{balance === 1 ? "" : "s"}</span>
      </p>

      {freeTrialGrantedAt && balance > 0 && (
        <p className="text-xs text-muted-2">
          Your free trial credits were added {daysSince(freeTrialGrantedAt)} day{daysSince(freeTrialGrantedAt) === 1 ? "" : "s"} ago --
          they don&apos;t expire, but the sooner you spend them the sooner you&apos;ll see real numbers below.
        </p>
      )}

      {beforeDuringViews && (beforeDuringViews.before > 0 || beforeDuringViews.during > 0) && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm">
          <div className="flex flex-col">
            <span className="text-xs text-muted-2">Before trial</span>
            <span className="text-foreground/90">{beforeDuringViews.before} view{beforeDuringViews.before === 1 ? "" : "s"}</span>
          </div>
          <span className="text-muted-2">→</span>
          <div className="flex flex-col items-end">
            <span className="text-xs text-muted-2">Since trial</span>
            <span className="text-foreground/90">{beforeDuringViews.during} view{beforeDuringViews.during === 1 ? "" : "s"}</span>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-stale">{error}</p>}

      <div className="flex flex-col gap-2">
        {bundles.map((b) => (
          <div key={b.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
            <div className="flex flex-col">
              <span className="text-foreground/90">{b.name}</span>
              <span className="text-xs text-muted-2">{b.credits} credits</span>
            </div>
            <button
              onClick={() => buy(b.id)}
              disabled={buyingId !== null}
              className="press-pill rounded-full bg-accent text-background px-3 py-1.5 text-xs font-medium disabled:opacity-50"
            >
              {buyingId === b.id ? "Redirecting…" : `Buy -- ${formatPrice(b.priceCents)}`}
            </button>
          </div>
        ))}
        {bundles.length === 0 && <p className="text-xs text-muted-2">No bundles available right now.</p>}
      </div>
    </section>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FeaturedVenue, VenueOption } from "@/lib/sponsored-data";
import { formatCheckedAt } from "@/lib/time";

const DURATIONS = [7, 30, 90] as const;

export function FeaturedVenuesPanel({
  active,
  venueOptions,
}: {
  active: FeaturedVenue[];
  venueOptions: VenueOption[];
}) {
  const router = useRouter();
  const [venueId, setVenueId] = useState<number | "">("");
  const [days, setDays] = useState<(typeof DURATIONS)[number]>(30);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function post(id: number, value: number | null) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/sponsored/venues/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: value }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Failed");
      router.refresh();
      if (value !== null) setVenueId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-xl text-foreground">Featured venues</h2>
      <p className="text-sm text-muted">
        Featured venues sort to the top of the homepage board until their window ends.
      </p>

      {active.length === 0 ? (
        <p className="text-muted-2 text-sm">None active right now.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {active.map((v) => (
            <li
              key={v.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2"
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground/90">{v.name}</span>
                <span className="text-xs text-muted-2">until {formatCheckedAt(v.featuredUntil)}</span>
              </div>
              <button
                onClick={() => post(v.id, null)}
                disabled={busy}
                className="press-pill rounded-full border border-border px-3 py-1 text-xs text-muted disabled:opacity-50"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface-raised p-3">
        <select
          value={venueId}
          onChange={(e) => setVenueId(e.target.value ? Number(e.target.value) : "")}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        >
          <option value="">Select a venue…</option>
          {venueOptions.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value) as (typeof DURATIONS)[number])}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        >
          {DURATIONS.map((d) => (
            <option key={d} value={d}>
              {d} days
            </option>
          ))}
        </select>
        <button
          onClick={() => venueId && post(venueId, days)}
          disabled={!venueId || busy}
          className="press-pill rounded-full bg-accent text-background px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          Feature
        </button>
      </div>
      {error && <p className="text-sm text-stale">{error}</p>}
    </section>
  );
}

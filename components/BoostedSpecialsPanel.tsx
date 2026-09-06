"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { BoostedSpecial, SpecialOption, VenueOption } from "@/lib/sponsored-data";
import { formatCheckedAt } from "@/lib/time";

const DURATIONS = [3, 7, 14] as const;

export function BoostedSpecialsPanel({
  active,
  venueOptions,
  specialOptions,
}: {
  active: BoostedSpecial[];
  venueOptions: VenueOption[];
  specialOptions: SpecialOption[];
}) {
  const router = useRouter();
  const [venueId, setVenueId] = useState<number | "">("");
  const [specialId, setSpecialId] = useState<number | "">("");
  const [days, setDays] = useState<(typeof DURATIONS)[number]>(7);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const specialsForVenue = useMemo(
    () => specialOptions.filter((s) => s.venueId === venueId),
    [specialOptions, venueId]
  );

  async function post(id: number, value: number | null) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/sponsored/specials/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: value }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Failed");
      router.refresh();
      if (value !== null) {
        setVenueId("");
        setSpecialId("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-xl text-foreground">Boosted specials</h2>
      <p className="text-sm text-muted">
        A boosted special sorts first within its venue's card and gets a "Featured" badge until
        its window ends.
      </p>

      {active.length === 0 ? (
        <p className="text-muted-2 text-sm">None active right now.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {active.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2"
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground/90">
                  {s.title} <span className="text-muted-2">— {s.venueName}</span>
                </span>
                <span className="text-xs text-muted-2">until {formatCheckedAt(s.boostedUntil)}</span>
              </div>
              <button
                onClick={() => post(s.id, null)}
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
          onChange={(e) => {
            setVenueId(e.target.value ? Number(e.target.value) : "");
            setSpecialId("");
          }}
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
          value={specialId}
          onChange={(e) => setSpecialId(e.target.value ? Number(e.target.value) : "")}
          disabled={!venueId}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm disabled:opacity-50"
        >
          <option value="">
            {venueId ? "Select a special…" : "Pick a venue first"}
          </option>
          {specialsForVenue.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
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
          onClick={() => specialId && post(specialId, days)}
          disabled={!specialId || busy}
          className="press-pill rounded-full bg-accent text-background px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          Boost
        </button>
      </div>
      {error && <p className="text-sm text-stale">{error}</p>}
    </section>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { ChatTermSponsor, RegionOption, VenueOption } from "@/lib/sponsored-data";
import { formatCheckedAt } from "@/lib/time";

const DURATIONS = [7, 14, 30] as const;

export function ChatTermSponsorsPanel({
  active,
  regionOptions,
  venueOptions,
  priceCentsPerDay,
}: {
  active: ChatTermSponsor[];
  regionOptions: RegionOption[];
  venueOptions: VenueOption[];
  priceCentsPerDay: number;
}) {
  const router = useRouter();
  const [regionId, setRegionId] = useState<number | "">(regionOptions[0]?.id ?? "");
  const [venueId, setVenueId] = useState<number | "">("");
  const [term, setTerm] = useState("");
  const [days, setDays] = useState<(typeof DURATIONS)[number]>(14);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const venuesForRegion = useMemo(
    () => venueOptions.filter((v) => v.regionId === regionId),
    [venueOptions, regionId]
  );
  const regionNameById = new Map(regionOptions.map((r) => [r.id, r.brandName]));

  async function set(targetRegionId: number, targetTerm: string, targetVenueId: number | null, targetDays: number | null) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/sponsored/term`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          regionId: targetRegionId,
          term: targetTerm,
          venueId: targetVenueId,
          days: targetDays,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Failed");
      router.refresh();
      if (targetVenueId !== null) {
        setVenueId("");
        setTerm("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = regionId && venueId && term.trim() && days;
  const rateLabel = `$${(priceCentsPerDay / 100).toFixed(2)}/day`;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-xl text-foreground">Term sponsorship (chat)</h2>
      <p className="text-sm text-muted">
        A venue owns a term (e.g. &ldquo;beer&rdquo;, &ldquo;trivia&rdquo;) in one region -- the Ask
        chat mentions it whenever a visitor&rsquo;s question is genuinely about that term, alongside
        the real best answer. One owner per (region, term) at a time; setting a new one replaces the
        old one. Flat rate, currently <strong>{rateLabel}</strong> -- change it under Monetization
        settings below, not here.
      </p>

      {active.length === 0 ? (
        <p className="text-muted-2 text-sm">No term sponsors right now.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {active.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2"
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground/90">
                  &ldquo;{s.term}&rdquo; — {s.venueName}
                </span>
                <span className="text-xs text-muted-2">
                  {regionNameById.get(s.regionId) ?? "region"} · ${(s.priceCentsPerDay / 100).toFixed(2)}/day ·
                  until {formatCheckedAt(s.until)}
                </span>
              </div>
              <button
                onClick={() => set(s.regionId, s.term, null, null)}
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
          value={regionId}
          onChange={(e) => {
            setRegionId(e.target.value ? Number(e.target.value) : "");
            setVenueId("");
          }}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        >
          <option value="">Region…</option>
          {regionOptions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.brandName}
            </option>
          ))}
        </select>
        <select
          value={venueId}
          onChange={(e) => setVenueId(e.target.value ? Number(e.target.value) : "")}
          disabled={!regionId}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm disabled:opacity-50"
        >
          <option value="">{regionId ? "Select a venue…" : "Pick a region first"}</option>
          {venuesForRegion.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Term (e.g. beer)"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm w-32"
        />
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
          onClick={() => canSubmit && set(regionId as number, term.trim(), venueId as number, days)}
          disabled={!canSubmit || busy}
          className="press-pill rounded-full bg-accent text-background px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          Sponsor ({rateLabel})
        </button>
      </div>
      {error && <p className="text-sm text-stale">{error}</p>}
    </section>
  );
}

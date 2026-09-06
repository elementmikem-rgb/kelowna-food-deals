"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PartnerVenue, VenueOption } from "@/lib/sponsored-data";
import { formatCheckedAt } from "@/lib/time";

export function PartnersPanel({
  active,
  venueOptions,
}: {
  active: PartnerVenue[];
  venueOptions: VenueOption[];
}) {
  const router = useRouter();
  const [venueId, setVenueId] = useState<number | "">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function post(id: number, partner: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/sponsored/venues/${id}/partner`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partner }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Failed");
      router.refresh();
      if (partner) setVenueId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-xl text-foreground">Verified partners</h2>
      <p className="text-sm text-muted">
        A standing status, separate from featured placement — doesn't expire on its own.
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
                <span className="text-xs text-muted-2">partner since {formatCheckedAt(v.partnerSince)}</span>
              </div>
              <button
                onClick={() => post(v.id, false)}
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
        <button
          onClick={() => venueId && post(venueId, true)}
          disabled={!venueId || busy}
          className="press-pill rounded-full bg-accent text-background px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          Make partner
        </button>
      </div>
      {error && <p className="text-sm text-stale">{error}</p>}
    </section>
  );
}

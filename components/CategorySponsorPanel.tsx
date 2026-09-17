"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CategorySponsor, RegionOption } from "@/lib/sponsored-data";
import type { SpecialCategory, EventType, SponsorCategoryKind } from "@/db/schema";
import { CATEGORY_LABELS, EVENT_TYPE_LABELS } from "@/lib/format";
import { formatCheckedAt } from "@/lib/time";

const SPECIAL_CATEGORIES: SpecialCategory[] = ["happy_hour", "food_special", "wing_night", "other"];
const EVENT_TYPES: EventType[] = ["live_music", "trivia", "karaoke", "sports_night", "other"];

function labelFor(kind: SponsorCategoryKind, category: SpecialCategory | EventType): string {
  return kind === "event" ? EVENT_TYPE_LABELS[category] : CATEGORY_LABELS[category];
}

export function CategorySponsorPanel({
  active,
  regionOptions,
}: {
  active: CategorySponsor[];
  regionOptions: RegionOption[];
}) {
  const router = useRouter();
  const [regionId, setRegionId] = useState<number | "">(regionOptions[0]?.id ?? "");
  const [categoryKey, setCategoryKey] = useState<string>("special:wing_night");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [kind, category] = categoryKey.split(":") as [SponsorCategoryKind, string];
  const regionNameById = new Map(regionOptions.map((r) => [r.id, r.brandName]));
  const byRegionAndCategory = new Map(active.map((s) => [`${s.regionId}:${s.kind}:${s.category}`, s]));
  const selectedRegionHasSponsor = (k: SponsorCategoryKind, c: string) =>
    regionId !== "" && byRegionAndCategory.has(`${regionId}:${k}:${c}`);

  async function set(
    targetRegionId: number,
    targetKind: SponsorCategoryKind,
    cat: string,
    sponsorName: string | null,
    sponsorUrl?: string | null
  ) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/sponsored/category/${cat}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          regionId: targetRegionId,
          kind: targetKind,
          sponsorName,
          sponsorUrl: sponsorUrl ?? null,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Failed");
      router.refresh();
      if (sponsorName) {
        setName("");
        setUrl("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-xl text-foreground">Category sponsorship</h2>
      <p className="text-sm text-muted">
        &ldquo;Wing Nights presented by X&rdquo; — a sponsor name shown under a category or event-type
        filter pill, one per region.
      </p>

      {active.length === 0 ? (
        <p className="text-muted-2 text-sm">No category sponsors right now.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {active.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2"
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground/90">
                  {labelFor(s.kind, s.category)} — {s.sponsorName}
                </span>
                <span className="text-xs text-muted-2">
                  {regionNameById.get(s.regionId) ?? "region"} ·{" "}
                  {s.sponsorUntil ? `until ${formatCheckedAt(s.sponsorUntil)}` : "indefinite"}
                </span>
              </div>
              <button
                onClick={() => set(s.regionId, s.kind, s.category, null)}
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
          onChange={(e) => setRegionId(e.target.value ? Number(e.target.value) : "")}
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
          value={categoryKey}
          onChange={(e) => setCategoryKey(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        >
          <optgroup label="Specials">
            {SPECIAL_CATEGORIES.map((c) => (
              <option key={`special:${c}`} value={`special:${c}`}>
                {CATEGORY_LABELS[c]}
                {selectedRegionHasSponsor("special", c) ? " (has sponsor)" : ""}
              </option>
            ))}
          </optgroup>
          <optgroup label="Events">
            {EVENT_TYPES.map((t) => (
              <option key={`event:${t}`} value={`event:${t}`}>
                {EVENT_TYPE_LABELS[t]}
                {selectedRegionHasSponsor("event", t) ? " (has sponsor)" : ""}
              </option>
            ))}
          </optgroup>
        </select>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Sponsor name"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Link (optional)"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
        <button
          onClick={() => regionId && name.trim() && set(regionId, kind, category, name.trim(), url.trim() || null)}
          disabled={!regionId || !name.trim() || busy}
          className="press-pill rounded-full bg-accent text-background px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          Set sponsor
        </button>
      </div>
      {error && <p className="text-sm text-stale">{error}</p>}
    </section>
  );
}

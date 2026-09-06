"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CategorySponsor } from "@/lib/sponsored-data";
import type { SpecialCategory } from "@/db/schema";
import { CATEGORY_LABELS } from "@/lib/format";
import { formatCheckedAt } from "@/lib/time";

const CATEGORIES: SpecialCategory[] = ["happy_hour", "food_special", "wing_night", "other"];

export function CategorySponsorPanel({ active }: { active: CategorySponsor[] }) {
  const router = useRouter();
  const [category, setCategory] = useState<SpecialCategory>("wing_night");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const byCategory = new Map(active.map((s) => [s.category, s]));

  async function set(cat: SpecialCategory, sponsorName: string | null, sponsorUrl?: string | null) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/sponsored/category/${cat}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sponsorName, sponsorUrl: sponsorUrl ?? null }),
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
        "Wing Nights presented by X" — a sponsor name shown under a category's filter pill.
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
                  {CATEGORY_LABELS[s.category]} — {s.sponsorName}
                </span>
                <span className="text-xs text-muted-2">
                  {s.sponsorUntil ? `until ${formatCheckedAt(s.sponsorUntil)}` : "indefinite"}
                </span>
              </div>
              <button
                onClick={() => set(s.category, null)}
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
          value={category}
          onChange={(e) => setCategory(e.target.value as SpecialCategory)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
              {byCategory.has(c) ? " (has sponsor)" : ""}
            </option>
          ))}
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
          onClick={() => name.trim() && set(category, name.trim(), url.trim() || null)}
          disabled={!name.trim() || busy}
          className="press-pill rounded-full bg-accent text-background px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          Set sponsor
        </button>
      </div>
      {error && <p className="text-sm text-stale">{error}</p>}
    </section>
  );
}

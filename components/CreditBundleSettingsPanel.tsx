"use client";

import { useState } from "react";

interface BundleRow {
  id: number;
  name: string;
  priceCents: number;
  credits: number;
  active: boolean;
  sortOrder: number;
}

export function CreditBundleSettingsPanel({ initial }: { initial: BundleRow[] }) {
  const [rows, setRows] = useState(initial);
  const [busy, setBusy] = useState<number | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  async function save(row: BundleRow) {
    setBusy(row.id);
    setSavedAt(null);
    try {
      const res = await fetch("/api/admin/credit-bundles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(row),
      });
      if (res.ok) setSavedAt(row.id);
    } finally {
      setBusy(null);
    }
  }

  function update(id: number, patch: Partial<BundleRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-xl text-foreground">Credit bundle settings</h2>
      <p className="text-sm text-muted">
        Prepaid credit tiers venues can buy (1 credit = $1 of spend). Currently illustrative
        placeholder numbers -- set real prices before announcing this.
      </p>
      <ul className="flex flex-col gap-3">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
            <div className="flex flex-wrap gap-3 text-xs text-muted">
              <label className="flex flex-col gap-1">
                Name
                <input
                  type="text"
                  value={row.name}
                  onChange={(e) => update(row.id, { name: e.target.value })}
                  className="rounded-lg border border-border bg-surface-raised px-2 py-1"
                />
              </label>
              <label className="flex flex-col gap-1">
                Price (cents)
                <input
                  type="number"
                  value={row.priceCents}
                  onChange={(e) => update(row.id, { priceCents: Number(e.target.value) })}
                  className="rounded-lg border border-border bg-surface-raised px-2 py-1"
                />
              </label>
              <label className="flex flex-col gap-1">
                Credits granted
                <input
                  type="number"
                  value={row.credits}
                  onChange={(e) => update(row.id, { credits: Number(e.target.value) })}
                  className="rounded-lg border border-border bg-surface-raised px-2 py-1"
                />
              </label>
              <label className="flex flex-col gap-1">
                Sort order
                <input
                  type="number"
                  value={row.sortOrder}
                  onChange={(e) => update(row.id, { sortOrder: Number(e.target.value) })}
                  className="rounded-lg border border-border bg-surface-raised px-2 py-1"
                />
              </label>
              <label className="flex flex-col gap-1 justify-end">
                <span className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={row.active}
                    onChange={(e) => update(row.id, { active: e.target.checked })}
                  />
                  Active (shown to venues)
                </span>
              </label>
            </div>
            <button
              onClick={() => save(row)}
              disabled={busy === row.id}
              className="press-pill self-start rounded-full bg-accent text-background px-3 py-1 text-xs font-medium disabled:opacity-50"
            >
              {savedAt === row.id ? "Saved" : "Save"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

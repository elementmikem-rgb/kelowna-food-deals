"use client";

import { useState } from "react";
import type { BookingProductType } from "@/db/schema";

interface SettingsRow {
  productType: BookingProductType;
  capCount: number | null;
  priceCentsPerDay: number;
  minDays: number;
  maxDays: number;
}

export function MonetizationSettingsPanel({ initial }: { initial: SettingsRow[] }) {
  const [rows, setRows] = useState(initial);
  const [busy, setBusy] = useState<BookingProductType | null>(null);
  const [savedAt, setSavedAt] = useState<BookingProductType | null>(null);

  async function save(row: SettingsRow) {
    setBusy(row.productType);
    setSavedAt(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(row),
      });
      if (res.ok) setSavedAt(row.productType);
    } finally {
      setBusy(null);
    }
  }

  function update(productType: BookingProductType, patch: Partial<SettingsRow>) {
    setRows((prev) => prev.map((r) => (r.productType === productType ? { ...r, ...patch } : r)));
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-xl text-foreground">Monetization settings</h2>
      <p className="text-sm text-muted">
        Real prices and caps for the self-serve booking system — set these before announcing it.
      </p>
      <ul className="flex flex-col gap-3">
        {rows.map((row) => (
          <li key={row.productType} className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
            <span className="text-sm font-medium text-foreground/90">{row.productType}</span>
            <div className="flex flex-wrap gap-3 text-xs text-muted">
              <label className="flex flex-col gap-1">
                Cap (blank = uncapped)
                <input
                  type="number"
                  value={row.capCount ?? ""}
                  onChange={(e) =>
                    update(row.productType, { capCount: e.target.value ? Number(e.target.value) : null })
                  }
                  className="rounded-lg border border-border bg-surface-raised px-2 py-1"
                />
              </label>
              <label className="flex flex-col gap-1">
                Price/day (cents)
                <input
                  type="number"
                  value={row.priceCentsPerDay}
                  onChange={(e) => update(row.productType, { priceCentsPerDay: Number(e.target.value) })}
                  className="rounded-lg border border-border bg-surface-raised px-2 py-1"
                />
              </label>
              <label className="flex flex-col gap-1">
                Min days
                <input
                  type="number"
                  value={row.minDays}
                  onChange={(e) => update(row.productType, { minDays: Number(e.target.value) })}
                  className="rounded-lg border border-border bg-surface-raised px-2 py-1"
                />
              </label>
              <label className="flex flex-col gap-1">
                Max days
                <input
                  type="number"
                  value={row.maxDays}
                  onChange={(e) => update(row.productType, { maxDays: Number(e.target.value) })}
                  className="rounded-lg border border-border bg-surface-raised px-2 py-1"
                />
              </label>
            </div>
            <button
              onClick={() => save(row)}
              disabled={busy === row.productType}
              className="press-pill self-start rounded-full bg-accent text-background px-3 py-1 text-xs font-medium disabled:opacity-50"
            >
              {savedAt === row.productType ? "Saved" : "Save"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

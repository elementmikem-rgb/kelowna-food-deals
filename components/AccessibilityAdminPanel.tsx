"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AccessibilityAdminRow } from "@/lib/accessibility-data";
import { ACCESS_TEXT } from "@/lib/accessibility-text";

export function AccessibilityAdminPanel({ rows }: { rows: AccessibilityAdminRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);

  async function clear(venueId: number, name: string) {
    if (!window.confirm(`Delete every accessibility vote for ${name}? This cannot be undone.`)) return;
    setBusy(venueId);
    try {
      await fetch("/api/admin/accessibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venueId }),
      });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  if (rows.length === 0) return <p className="text-sm text-muted-2">No accessibility votes yet.</p>;
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r) => (
        <li key={r.venueId} className="rounded-xl border border-border p-3 text-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="text-foreground [overflow-wrap:anywhere]">
                {r.venueName} <span className="text-muted-2">(venue {r.venueId})</span>
              </span>
              <p className="text-muted-2">
                {r.voters} {r.voters === 1 ? "browser" : "browsers"}, last vote {r.lastVoteAt.toISOString().slice(0, 10)}
              </p>
            </div>
            <button
              type="button"
              disabled={busy === r.venueId}
              onClick={() => clear(r.venueId, r.venueName)}
              className="shrink-0 rounded-full border border-border px-3 py-1 text-xs text-muted-2 hover:border-muted hover:text-foreground disabled:opacity-60"
            >
              Delete votes
            </button>
          </div>
          <ul className="mt-2 text-muted-2">
            {r.features.map((f) => (
              <li key={f.feature}>
                {ACCESS_TEXT.en.feature[f.feature]}: {f.yes} yes, {f.no} no, {f.unsure} not sure
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

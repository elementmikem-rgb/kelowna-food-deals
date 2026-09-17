"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ZeroListingVenue } from "@/lib/scrape-health";

export function ZeroListingVenuesPanel({ venues }: { venues: ZeroListingVenue[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [noteDraft, setNoteDraft] = useState<Record<number, string>>({});

  async function confirm(id: number) {
    setBusyId(id);
    try {
      await fetch(`/api/admin/scrape-health/mark-checked/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm", note: noteDraft[id]?.trim() || undefined }),
      });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  if (venues.length === 0) {
    return <p className="text-sm text-muted-2">Every active venue has at least one listing.</p>;
  }

  return (
    <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
      {venues.map((v) => (
        <li key={v.id} className="p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-foreground">{v.name}</span>
              {v.website && (
                <a
                  href={v.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-accent-dim underline break-all"
                >
                  {v.website}
                </a>
              )}
              {v.checkedNoListingsAt && (
                <span className="text-[11px] text-muted-2">
                  Previously confirmed empty{" "}
                  {v.checkedNoListingsAt.toLocaleDateString("en-CA", { timeZone: "America/Vancouver" })}
                  {v.checkedNoListingsNote ? ` — ${v.checkedNoListingsNote}` : ""} (due for a recheck)
                </span>
              )}
            </div>
            <span className="text-[11px] text-muted-2 uppercase tracking-wide shrink-0">{v.regionSlug}</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Optional note (e.g. Facebook-only, no specials board)"
              value={noteDraft[v.id] ?? ""}
              onChange={(e) => setNoteDraft((d) => ({ ...d, [v.id]: e.target.value }))}
              className="flex-1 min-w-0 rounded-lg border border-border bg-background px-2.5 py-1 text-xs placeholder:text-muted-2"
            />
            <button
              onClick={() => confirm(v.id)}
              disabled={busyId === v.id}
              className="press-pill shrink-0 rounded-full border border-border px-3 py-1.5 text-xs hover:border-muted disabled:opacity-50"
            >
              Nothing to find — don&apos;t recheck
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

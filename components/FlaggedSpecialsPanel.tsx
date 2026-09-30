"use client";

import { useState } from "react";
import type { FlaggedSpecial } from "@/lib/flagged-data";
import { useRouter } from "next/navigation";

const REASON_LABELS: Record<string, string> = {
  price_wrong: "Price is wrong",
  not_offered: "No longer offered",
  wrong_day_time: "Wrong day/time",
  other: "Other",
};

export function FlaggedSpecialsPanel({
  flagged,
  apiBasePath = "/api/admin/flagged",
  emptyMessage = "No flagged specials right now.",
}: {
  flagged: FlaggedSpecial[];
  apiBasePath?: string;
  emptyMessage?: string;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<number | null>(null);

  async function act(id: number, action: "archive" | "dismiss") {
    setBusyId(id);
    try {
      await fetch(`${apiBasePath}/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  if (flagged.length === 0) {
    return <p className="text-sm text-muted">{emptyMessage}</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {flagged.map((f) => (
        <li key={f.id} className="rounded-xl border border-border bg-surface p-4 flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1.5 min-w-0">
            <p className="text-sm font-medium text-foreground">{f.title}</p>
            <p className="text-xs text-muted">
              {f.venueName} — flagged {f.disputeCount} time{f.disputeCount === 1 ? "" : "s"}
            </p>
            <ul className="flex flex-col gap-0.5">
              {f.reasons.map((r, i) => (
                <li key={i} className="text-xs text-muted-2">
                  {r.reason ? REASON_LABELS[r.reason] ?? r.reason : "No reason given"}
                  {r.note ? ` — "${r.note}"` : ""}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => act(f.id, "dismiss")}
              disabled={busyId === f.id}
              className="press-pill rounded-full border border-border px-3 py-1.5 text-xs disabled:opacity-50"
            >
              Dismiss
            </button>
            <button
              onClick={() => act(f.id, "archive")}
              disabled={busyId === f.id}
              className="press-pill rounded-full bg-accent text-background px-3 py-1.5 text-xs font-medium disabled:opacity-50"
            >
              Archive
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

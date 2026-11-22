"use client";

import { useState } from "react";
import { SNOOZE_PRESETS, snoozeUntilFor } from "@/lib/inbox-snooze";

function when(d: Date): string {
  return d.toLocaleString("en-CA", {
    timeZone: "America/Vancouver",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Popover content for "Snooze until...". Rendered only after a click, so it is client-only and has no
// server/browser clock mismatch to worry about.
export function SnoozeMenu({ onPick, className = "" }: { onPick: (until: Date) => void; className?: string }) {
  const [custom, setCustom] = useState("");
  const now = new Date();
  return (
    <div
      role="menu"
      aria-label="Snooze until"
      className={`w-64 overflow-hidden rounded-xl border border-border bg-surface py-1 text-sm shadow-lg ${className}`}
    >
      <p className="px-4 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-muted-2">Snooze until</p>
      {SNOOZE_PRESETS.map((p) => (
        <button
          key={p.id}
          role="menuitem"
          onClick={() => onPick(snoozeUntilFor(p.id, now))}
          className="flex w-full items-center justify-between px-4 py-2 text-left text-foreground hover:bg-accent-soft/30"
        >
          <span>{p.label}</span>
          <span className="text-xs text-muted-2">{when(snoozeUntilFor(p.id, now))}</span>
        </button>
      ))}
      <div className="mt-1 border-t border-border px-4 py-3">
        <label className="mb-1 block text-xs text-muted-2" htmlFor="snooze-custom">
          Pick date and time
        </label>
        <div className="flex gap-2">
          <input
            id="snooze-custom"
            type="datetime-local"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2 py-1 text-xs outline-none focus:border-accent-dim"
          />
          <button
            disabled={!custom || new Date(custom).getTime() <= now.getTime()}
            onClick={() => onPick(new Date(custom))}
            className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-background disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

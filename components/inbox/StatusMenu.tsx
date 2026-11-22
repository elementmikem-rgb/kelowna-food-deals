"use client";

import type { InboxThreadStatus } from "@/db/schema";
import { STATUS_OPTIONS } from "@/lib/inbox-status";

export function StatusMenu({
  current,
  onPick,
  className = "",
}: {
  current: InboxThreadStatus | null;
  onPick: (s: InboxThreadStatus | null) => void;
  className?: string;
}) {
  return (
    <div
      role="menu"
      aria-label="Set status"
      className={`w-52 overflow-hidden rounded-xl border border-border bg-surface py-1 text-sm shadow-lg ${className}`}
    >
      <p className="px-4 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-muted-2">Status</p>
      {STATUS_OPTIONS.map((o) => (
        <button
          key={o.id}
          role="menuitemradio"
          aria-checked={current === o.id}
          onClick={() => onPick(o.id)}
          className="flex w-full items-center justify-between px-4 py-2 text-left text-foreground hover:bg-accent-soft/30"
        >
          <span>{o.label}</span>
          {current === o.id && <span className="text-xs text-accent-dim">Selected</span>}
        </button>
      ))}
      {current && (
        <button onClick={() => onPick(null)} className="block w-full border-t border-border px-4 py-2 text-left text-muted-2 hover:bg-accent-soft/30 hover:text-foreground">
          Clear status
        </button>
      )}
    </div>
  );
}

import type { InboxThreadStatus } from "@/db/schema";

// One status per conversation, shown as a small pill. Order is the order of the menu.
export const STATUS_OPTIONS: { id: InboxThreadStatus; label: string; pill: string }[] = [
  { id: "new", label: "New", pill: "bg-accent-soft/60 text-accent-dim" },
  { id: "interested", label: "Interested", pill: "bg-evergreen/15 text-evergreen" },
  { id: "waiting", label: "Waiting on them", pill: "bg-border/70 text-muted" },
  { id: "needs_update", label: "Needs update", pill: "bg-stale/15 text-stale" },
  { id: "done", label: "Done", pill: "bg-foreground/10 text-foreground/70" },
];

export function statusLabel(s: InboxThreadStatus | null): string | null {
  return STATUS_OPTIONS.find((o) => o.id === s)?.label ?? null;
}

export function statusPill(s: InboxThreadStatus | null): string {
  return STATUS_OPTIONS.find((o) => o.id === s)?.pill ?? "";
}

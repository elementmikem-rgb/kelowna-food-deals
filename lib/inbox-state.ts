import type { InboxThreadStatus } from "@/db/schema";

export interface StatePatch {
  starred?: boolean;
  snoozedUntil?: string | null; // ISO instant, or null to clear
  status?: InboxThreadStatus | null;
}

export interface StateUpsert {
  values: {
    threadKey: string;
    starred: boolean;
    snoozedUntil: Date | null;
    status: InboxThreadStatus | null;
    updatedAt: Date;
  };
  set: Partial<{ starred: boolean; snoozedUntil: Date | null; status: InboxThreadStatus | null; updatedAt: Date }>;
}

// Builds the insert row and the conflict-update set for one conversation. Only provided fields are updated.
// updatedAt means "when the snooze was set" (isSnoozedNow wakes a conversation that got a reply after it), so
// it moves only when the snooze itself changes, never for a star or status edit.
export function buildStateUpsert(threadKey: string, patch: StatePatch, now: Date): StateUpsert {
  const set: StateUpsert["set"] = {};
  if (patch.starred !== undefined) set.starred = patch.starred;
  if (patch.status !== undefined) set.status = patch.status;
  if (patch.snoozedUntil !== undefined) {
    set.snoozedUntil = patch.snoozedUntil === null ? null : new Date(patch.snoozedUntil);
    set.updatedAt = now;
  }
  return {
    values: {
      threadKey,
      starred: patch.starred ?? false,
      snoozedUntil: set.snoozedUntil ?? null,
      status: patch.status ?? null,
      updatedAt: now,
    },
    set,
  };
}

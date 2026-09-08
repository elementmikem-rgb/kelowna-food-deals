"use client";

import Link from "next/link";
import { useState } from "react";

interface ThreadRow {
  key: string;
  displayName: string;
  contactEmail: string | null;
  lastSnippet: string;
  lastAt: string;
  unreadCount: number;
  archived: boolean;
  messageCount: number;
}

export function InboxThreadList({ threads }: { threads: ThreadRow[] }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "unread" | "archived">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const filtered = threads
    .filter((t) => {
      if (statusFilter === "archived") return t.archived;
      if (statusFilter === "unread") return !t.archived && t.unreadCount > 0;
      return !t.archived; // "all" still excludes archived -- Archive means "out of my way"
    })
    .filter((t) => {
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        t.displayName.toLowerCase().includes(q) ||
        (t.contactEmail ?? "").toLowerCase().includes(q) ||
        t.lastSnippet.toLowerCase().includes(q)
      );
    });

  function toggleSelected(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // Thread keys aren't inboundEmails ids -- bulk actions need the actual row
  // ids, which the thread list doesn't carry. Bulk archive/delete operate on
  // whichever venueId/email each selected thread key resolves to server-side
  // is not available here, so this fetches the same "mark whole thread" idea
  // via a dedicated bulk route scoped by thread key instead of raw ids.
  async function bulkAction(action: "archive" | "unarchive" | "delete") {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      await fetch("/api/admin/inbox/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys: [...selected], action }),
      });
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  async function bulkAction2(key: string, action: "archive" | "unarchive" | "delete") {
    setBusy(true);
    try {
      await fetch("/api/admin/inbox/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys: [key], action }),
      });
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search conversations…"
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | "unread" | "archived")}
          className="rounded-lg border border-border bg-background px-2 py-2 text-sm"
        >
          <option value="all">All</option>
          <option value="unread">Unread</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-2 text-sm py-4 text-center">No conversations match &quot;{query}&quot;.</p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={selected.size === filtered.length && filtered.length > 0}
                onChange={(e) =>
                  setSelected(e.target.checked ? new Set(filtered.map((t) => t.key)) : new Set())
                }
              />
              Select all shown
            </label>
            {selected.size > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={() => bulkAction(statusFilter === "archived" ? "unarchive" : "archive")}
                  disabled={busy}
                  className="press-pill rounded-full border border-border px-3 py-1 text-xs disabled:opacity-50"
                >
                  {statusFilter === "archived" ? "Unarchive" : "Archive"} ({selected.size})
                </button>
                <button
                  onClick={() => bulkAction("delete")}
                  disabled={busy}
                  className="press-pill rounded-full border border-danger/40 text-danger px-3 py-1 text-xs disabled:opacity-50"
                >
                  Delete ({selected.size})
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface overflow-hidden">
            {filtered.map((t) => (
              <div key={t.key} className="flex items-start gap-2 px-4 py-3 hover:bg-accent-soft/20">
                <input
                  type="checkbox"
                  checked={selected.has(t.key)}
                  onChange={() => toggleSelected(t.key)}
                  className="mt-1"
                />
                <Link href={`/admin/inbox/t/${t.key}`} className="flex-1 flex items-start justify-between gap-3 min-w-0">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <p
                      className={`text-sm ${t.unreadCount > 0 ? "font-semibold text-foreground" : "font-medium text-foreground/80"}`}
                    >
                      {t.displayName}
                    </p>
                    <p className="text-xs text-muted-2 truncate max-w-[380px]">{t.lastSnippet}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[11px] text-muted-2">
                      {new Date(t.lastAt).toLocaleDateString()}
                    </span>
                    {t.unreadCount > 0 && (
                      <span className="rounded-full bg-accent text-background text-[10px] font-medium px-1.5 py-0.5">
                        {t.unreadCount}
                      </span>
                    )}
                  </div>
                </Link>
                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    onClick={() => bulkAction2(t.key, t.archived ? "unarchive" : "archive")}
                    className="text-[11px] text-muted hover:text-foreground px-2 py-1.5"
                  >
                    {t.archived ? "Unarchive" : "Archive"}
                  </button>
                  <button
                    onClick={() => bulkAction2(t.key, "delete")}
                    className="text-[11px] text-danger/80 hover:text-danger px-2 py-1.5"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

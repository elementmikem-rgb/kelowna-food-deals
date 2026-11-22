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

function initialsOf(name: string): string {
  return (
    name
      .replace(/<.*?>/g, "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join("") || "?"
  );
}

// Gmail-style: time of day for today, "Nov 19" for this year, full date for older. Pinned to Vancouver
// time so server and browser render the same string (avoids the hydration mismatch noted in InboxThread).
function formatListDate(iso: string): string {
  const d = new Date(iso);
  const tz = "America/Vancouver";
  const day = (x: Date) => x.toLocaleDateString("en-CA", { timeZone: tz });
  if (day(d) === day(new Date())) {
    return d.toLocaleTimeString("en-CA", { timeZone: tz, hour: "numeric", minute: "2-digit" });
  }
  const sameYear = d.toLocaleDateString("en-CA", { timeZone: tz, year: "numeric" }) ===
    new Date().toLocaleDateString("en-CA", { timeZone: tz, year: "numeric" });
  return d.toLocaleDateString("en-CA", sameYear
    ? { timeZone: tz, month: "short", day: "numeric" }
    : { timeZone: tz, month: "short", day: "numeric", year: "numeric" });
}

// Snippets come from raw email text: shorten tracking URLs and drop inline-image placeholders so the
// preview line reads like a sentence instead of a wall of characters.
function tidySnippet(s: string): string {
  return s
    .replace(/\[cid:[^\]\s]*\]/gi, "")
    .replace(/<?https?:\/\/([^\s/<>]+)[^\s<>]*>?/gi, "$1")
    .replace(/\s+/g, " ")
    .trim();
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
    // Selection can include keys that filter/search has since hidden --
    // never act on a row the admin can no longer see.
    const keys = [...selected].filter((k) => filtered.some((t) => t.key === k));
    if (keys.length === 0) return;
    if (action === "delete" && !window.confirm(`Delete ${keys.length} conversation${keys.length === 1 ? "" : "s"}? This can't be undone.`)) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/inbox/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys, action }),
      });
      // A 207 (partial failure) is still res.ok -- check the body, not just status.
      const data = await res.json().catch(() => ({ ok: false }));
      if (res.ok && data.ok) window.location.reload();
      else {
        window.alert("Some conversations couldn't be updated. Please try again.");
        setBusy(false);
      }
    } catch {
      setBusy(false);
    }
  }

  async function bulkAction2(key: string, action: "archive" | "unarchive" | "delete") {
    if (action === "delete" && !window.confirm("Delete this conversation? This can't be undone.")) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/inbox/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys: [key], action }),
      });
      const data = await res.json().catch(() => ({ ok: false }));
      if (res.ok && data.ok) window.location.reload();
      else setBusy(false);
    } catch {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(new Set());
          }}
          placeholder="Search conversations…"
          className="flex-1 rounded-full border border-border bg-surface px-4 py-2.5 text-sm outline-none transition focus:border-accent-dim"
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as "all" | "unread" | "archived");
            setSelected(new Set());
          }}
          className="rounded-full border border-border bg-surface px-3 py-2.5 text-sm outline-none transition focus:border-accent-dim"
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

          <div className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
            {filtered.map((t) => (
              <div
                key={t.key}
                className={`group flex items-center gap-3 px-4 py-3.5 transition hover:bg-accent-soft/20 ${
                  t.unreadCount > 0 ? "bg-accent-soft/10" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(t.key)}
                  onChange={() => toggleSelected(t.key)}
                  aria-label={`Select ${t.displayName}`}
                  className="shrink-0"
                />
                <Link href={`/admin/inbox/t/${t.key}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="relative shrink-0">
                    <span
                      aria-hidden
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft/60 text-sm font-semibold text-accent-dim"
                    >
                      {initialsOf(t.displayName)}
                    </span>
                    {t.unreadCount > 0 && (
                      <span
                        aria-label="Unread"
                        className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-surface bg-accent"
                      />
                    )}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-baseline justify-between gap-3">
                      <span
                        className={`truncate text-[15px] ${
                          t.unreadCount > 0 ? "font-semibold text-foreground" : "font-medium text-foreground/80"
                        }`}
                      >
                        {t.displayName}
                      </span>
                      <span
                        className={`shrink-0 text-[11px] ${t.unreadCount > 0 ? "font-medium text-foreground" : "text-muted-2"}`}
                      >
                        {formatListDate(t.lastAt)}
                      </span>
                    </span>
                    <span className="flex items-center justify-between gap-3">
                      <span className="truncate text-[13px] text-muted-2">{tidySnippet(t.lastSnippet)}</span>
                      {t.messageCount > 1 && (
                        <span className="shrink-0 text-[11px] text-muted-2">{t.messageCount}</span>
                      )}
                    </span>
                  </span>
                </Link>
                {/* gap-2.5 + min-h-11 (44px, the standard minimum mobile tap
                    target): confirmed live 2026-09-12 the previous gap-1 +
                    px-2 py-1.5 pair (Delete sitting directly under Archive
                    with ~4px between) was an easy fat-finger risk on mobile. */}
                <div className="flex shrink-0 gap-2 md:opacity-0 md:transition md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                  <button
                    onClick={() => bulkAction2(t.key, t.archived ? "unarchive" : "archive")}
                    disabled={busy}
                    className="text-xs text-muted hover:text-foreground px-3 min-h-11 flex items-center justify-center rounded-full border border-border bg-background disabled:opacity-50"
                  >
                    {t.archived ? "Unarchive" : "Archive"}
                  </button>
                  <button
                    onClick={() => bulkAction2(t.key, "delete")}
                    disabled={busy}
                    className="text-xs text-danger/80 hover:text-danger px-3 min-h-11 flex items-center justify-center rounded-full border border-danger/30 bg-background disabled:opacity-50"
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

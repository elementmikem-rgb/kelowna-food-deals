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
  messageCount: number;
}

export function InboxThreadList({ threads }: { threads: ThreadRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? threads.filter((t) => {
        const q = query.toLowerCase();
        return (
          t.displayName.toLowerCase().includes(q) ||
          (t.contactEmail ?? "").toLowerCase().includes(q) ||
          t.lastSnippet.toLowerCase().includes(q)
        );
      })
    : threads;

  return (
    <div className="flex flex-col gap-3">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search conversations…"
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
      />

      {filtered.length === 0 ? (
        <p className="text-muted-2 text-sm py-4 text-center">No conversations match &quot;{query}&quot;.</p>
      ) : (
        <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface overflow-hidden">
          {filtered.map((t) => (
            <Link
              key={t.key}
              href={`/admin/inbox/t/${t.key}`}
              className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-accent-soft/20"
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <p
                  className={`text-sm ${t.unreadCount > 0 ? "font-semibold text-foreground" : "font-medium text-foreground/80"}`}
                >
                  {t.displayName}
                </p>
                <p className="text-xs text-muted-2 truncate max-w-[420px]">{t.lastSnippet}</p>
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
          ))}
        </div>
      )}
    </div>
  );
}

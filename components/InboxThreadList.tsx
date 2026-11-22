"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { tidySnippet } from "@/lib/email-display";
import { matchThread, parseQuery, type SearchableThread } from "@/lib/inbox-search";
import { formatCount, formatListDate } from "@/lib/inbox-format";
import { folderFilter, type Folder } from "@/lib/inbox-folders";
import { statusLabel, statusPill } from "@/lib/inbox-status";
import type { InboxThreadStatus } from "@/db/schema";
import { SnoozeMenu } from "@/components/inbox/SnoozeMenu";
import { StatusMenu } from "@/components/inbox/StatusMenu";
import {
  ArchiveIcon,
  ChevronDownIcon,
  ClockIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  InboxIcon,
  KeyboardIcon,
  MailIcon,
  MailOpenIcon,
  PaperclipIcon,
  PencilIcon,
  RefreshIcon,
  SearchIcon,
  SendIcon,
  StarIcon,
  TrashIcon,
} from "@/components/inbox/icons";

interface ThreadRow {
  key: string;
  displayName: string;
  contactEmail: string | null;
  lastSnippet: string;
  lastSubject: string;
  lastFromMe: boolean;
  hasAttachments: boolean;
  inboundCount: number;
  starred: boolean;
  snoozed: boolean;
  snoozedUntil: string | null;
  status: InboxThreadStatus | null;
  hasProposal: boolean;
  lastAt: string;
  unreadCount: number;
  archived: boolean;
  messageCount: number;
}

type BulkAction = "archive" | "unarchive" | "delete" | "markRead" | "markUnread";

const PAGE_SIZE = 50;

const FOLDERS: { id: Folder; label: string; icon: typeof InboxIcon }[] = [
  { id: "inbox", label: "Inbox", icon: InboxIcon },
  { id: "starred", label: "Starred", icon: StarIcon },
  { id: "snoozed", label: "Snoozed", icon: ClockIcon },
  { id: "unread", label: "Unread", icon: MailIcon },
  { id: "sent", label: "Sent", icon: SendIcon },
  { id: "archive", label: "Archived", icon: ArchiveIcon },
];

const OPERATOR_HINTS = ["from:", "is:unread", "has:attachment", "in:sent", "in:archive", "older_than:7d", "lang:fr"];

const SHORTCUTS: [string, string][] = [
  ["j / k", "Next / previous conversation"],
  ["o or Enter", "Open conversation"],
  ["x", "Select conversation"],
  ["e", "Archive"],
  ["s", "Star or unstar"],
  ["b", "Snooze"],
  ["#", "Delete"],
  ["Shift + I", "Mark as read"],
  ["Shift + U", "Mark as unread"],
  ["c", "Compose"],
  ["/", "Search"],
  ["g then i", "Go to Inbox"],
  ["Esc", "Clear selection or close"],
  ["?", "Show this help"],
];

interface Toast {
  id: number;
  text: string;
  undo?: () => void;
}

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable;
}

export function InboxThreadList({ threads }: { threads: ThreadRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<ThreadRow[]>(threads);
  const [folder, setFolder] = useState<Folder>("inbox");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [cursor, setCursor] = useState(0);
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [selectMenu, setSelectMenu] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [menu, setMenu] = useState<{ kind: "snooze" | "status"; keys: string[] } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const gPending = useRef(false);
  type StatePatch = { starred?: boolean; snoozedUntil?: string | null; status?: InboxThreadStatus | null };
  const patchRef = useRef<(keys: string[], patch: StatePatch, toastText?: string, undoPatch?: StatePatch) => Promise<void>>(async () => {});
  const applyRef = useRef<(keys: string[], action: BulkAction, opts?: { quiet?: boolean }) => Promise<void>>(async () => {});
  const toastId = useRef(0);

  // Server data wins whenever the page is refreshed (router.refresh) or navigated back to.
  const [seenThreads, setSeenThreads] = useState(threads);
  if (threads !== seenThreads) {
    setSeenThreads(threads);
    setRows(threads);
  }

  const visible = useMemo(() => {
    const q = parseQuery(query);
    const hasQuery = query.trim().length > 0;
    // An explicit in: operator in the search box wins over the folder, like Gmail. Otherwise the folder
    // decides what is shown and the search only narrows it (so the search itself must not filter by scope).
    const explicitScope = q.in !== null;
    if (!explicitScope) q.in = "all";
    return rows.filter((t) => {
      if (!explicitScope && !folderFilter(t, folder, hasQuery)) return false;
      const searchable: SearchableThread = {
        displayName: t.displayName,
        contactEmail: t.contactEmail,
        lastSubject: t.lastSubject,
        lastSnippet: tidySnippet(t.lastSnippet),
        lastAt: t.lastAt,
        unreadCount: t.unreadCount,
        archived: t.archived,
        hasAttachments: t.hasAttachments,
        lastFromMe: t.lastFromMe,
      };
      return matchThread(searchable, q);
    });
  }, [rows, folder, query]);

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = visible.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const unreadTotal = rows.reduce((n, t) => n + (t.archived || t.snoozed ? 0 : t.unreadCount), 0);
  const snoozedTotal = rows.reduce((n, t) => n + (t.snoozed && !t.archived ? 1 : 0), 0);

  const viewKey = `${folder}|${query}`;
  const [seenViewKey, setSeenViewKey] = useState(viewKey);
  if (viewKey !== seenViewKey) {
    setSeenViewKey(viewKey);
    setPage(0);
    setCursor(0);
    setSelected(new Set());
  }

  const pushToast = useCallback((text: string, undo?: () => void) => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, text, undo }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 7000);
  }, []);

  // Optimistic: the row changes (or leaves) immediately, the API call follows, and a failure restores it.
  const apply = useCallback(
    async (keys: string[], action: BulkAction, opts?: { quiet?: boolean }) => {
      if (keys.length === 0) return;
      const before = rows;
      const keySet = new Set(keys);
      setRows((prev) => {
        if (action === "delete") return prev.filter((t) => !keySet.has(t.key));
        return prev.map((t) => {
          if (!keySet.has(t.key)) return t;
          if (action === "archive") return { ...t, archived: true };
          if (action === "unarchive") return { ...t, archived: false };
          if (action === "markRead") return { ...t, unreadCount: 0 };
          return { ...t, unreadCount: Math.max(1, t.unreadCount) };
        });
      });
      setSelected(new Set());
      setBusy(true);
      try {
        const res = await fetch("/api/admin/inbox/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keys, action }),
        });
        const data = await res.json().catch(() => ({ ok: false }));
        if (!res.ok || !data.ok) throw new Error("bulk failed");
        if (!opts?.quiet) {
          const n = keys.length;
          const noun = `conversation${n === 1 ? "" : "s"}`;
          if (action === "archive") pushToast(`${n} ${noun} archived`, () => void applyRef.current(keys, "unarchive", { quiet: true }));
          else if (action === "unarchive") pushToast(`${n} ${noun} moved to Inbox`);
          else if (action === "delete") pushToast(`${n} ${noun} deleted`);
          else if (action === "markRead") pushToast(`Marked as read`);
          else pushToast(`Marked as unread`);
        }
      } catch {
        setRows(before);
        pushToast("Something went wrong. Nothing was changed.");
      } finally {
        setBusy(false);
      }
    },
    [rows, pushToast]
  );

  useEffect(() => {
    applyRef.current = apply;
  }, [apply]);

  // Stars, snooze and status: optimistic like apply(), through /api/admin/inbox/state.
  const patchState = useCallback(
    async (keys: string[], patch: StatePatch, toastText?: string, undoPatch?: StatePatch) => {
      if (keys.length === 0) return;
      const before = rows;
      const keySet = new Set(keys);
      setRows((prev) =>
        prev.map((t) => {
          if (!keySet.has(t.key)) return t;
          const next = { ...t };
          if (patch.starred !== undefined) next.starred = patch.starred;
          if (patch.status !== undefined) next.status = patch.status;
          if (patch.snoozedUntil !== undefined) {
            next.snoozedUntil = patch.snoozedUntil;
            next.snoozed = patch.snoozedUntil !== null && new Date(patch.snoozedUntil).getTime() > Date.now();
          }
          return next;
        })
      );
      setSelected(new Set());
      setMenu(null);
      try {
        const res = await fetch("/api/admin/inbox/state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keys, ...patch }),
        });
        const data = await res.json().catch(() => ({ ok: false }));
        if (!res.ok || !data.ok) throw new Error("state failed");
        if (toastText) pushToast(toastText, undoPatch ? () => void patchRef.current(keys, undoPatch) : undefined);
      } catch {
        setRows(before);
        pushToast("Something went wrong. Nothing was changed.");
      }
    },
    [rows, pushToast]
  );

  useEffect(() => {
    patchRef.current = patchState;
  }, [patchState]);

  function toggleStar(keys: string[]) {
    const allStarred = keys.length > 0 && keys.every((k) => rows.find((r) => r.key === k)?.starred);
    void patchState(keys, { starred: !allStarred });
  }

  function snoozeTo(keys: string[], until: Date) {
    const label = until.toLocaleString("en-CA", { timeZone: "America/Vancouver", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    void patchState(keys, { snoozedUntil: until.toISOString() }, `Snoozed until ${label}`, { snoozedUntil: null });
  }

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function confirmDelete(keys: string[]) {
    if (keys.length === 0) return;
    if (!window.confirm(`Delete ${keys.length} conversation${keys.length === 1 ? "" : "s"}? This can't be undone.`)) return;
    void apply(keys, "delete");
  }

  const targetKeys = useCallback((): string[] => {
    if (selected.size > 0) return [...selected];
    const row = pageRows[cursor];
    return row ? [row.key] : [];
  }, [selected, pageRows, cursor]);

  // Gmail-style shortcuts. Ignored while typing and when a modifier (other than Shift) is held.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) {
        if (e.key === "Escape") (e.target as HTMLElement).blur();
        return;
      }
      if (gPending.current) {
        gPending.current = false;
        if (e.key === "i") {
          setFolder("inbox");
          setQuery("");
          return;
        }
      }
      switch (e.key) {
        case "j":
          setCursor((c) => Math.min(pageRows.length - 1, c + 1));
          break;
        case "k":
          setCursor((c) => Math.max(0, c - 1));
          break;
        case "x": {
          const row = pageRows[cursor];
          if (row) toggle(row.key);
          break;
        }
        case "o":
        case "Enter": {
          const row = pageRows[cursor];
          if (row) router.push(`/admin/inbox/t/${row.key}`);
          break;
        }
        case "e":
          void apply(targetKeys(), folder === "archive" ? "unarchive" : "archive");
          break;
        case "#":
          confirmDelete(targetKeys());
          break;
        case "s":
          toggleStar(targetKeys());
          break;
        case "b": {
          const keys = targetKeys();
          if (keys.length > 0) setMenu({ kind: "snooze", keys });
          break;
        }
        case "I":
          void apply(targetKeys(), "markRead");
          break;
        case "U":
          void apply(targetKeys(), "markUnread");
          break;
        case "c":
          e.preventDefault();
          router.push("/admin/inbox/compose");
          break;
        case "/":
          e.preventDefault();
          searchRef.current?.focus();
          break;
        case "?":
          setHelpOpen((v) => !v);
          break;
        case "g":
          gPending.current = true;
          window.setTimeout(() => (gPending.current = false), 1200);
          break;
        case "Escape":
          setSelected(new Set());
          setHelpOpen(false);
          setSelectMenu(false);
          setMenu(null);
          break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageRows, cursor, folder, selected, apply, targetKeys, router]);

  const allSelected = pageRows.length > 0 && pageRows.every((t) => selected.has(t.key));
  const someSelected = selected.size > 0;

  function selectWhere(pred: (t: ThreadRow) => boolean) {
    setSelected(new Set(pageRows.filter(pred).map((t) => t.key)));
    setSelectMenu(false);
  }

  const iconBtn =
    "inline-flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-accent-soft/40 hover:text-foreground disabled:opacity-40";

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[208px_minmax(0,1fr)]">
      {/* Sidebar */}
      <aside className="flex flex-col gap-1 md:sticky md:top-4 md:self-start">
        <Link
          href="/admin/inbox/compose"
          className="press-pill mb-3 inline-flex w-fit items-center gap-3 rounded-2xl bg-accent px-6 py-3.5 text-sm font-medium text-background shadow-sm hover:shadow-md"
        >
          <PencilIcon />
          Compose
        </Link>
        <nav aria-label="Folders" className="flex flex-row gap-1 overflow-x-auto md:flex-col">
          {FOLDERS.map((f) => {
            const Icon = f.icon;
            const active = folder === f.id;
            const count = f.id === "inbox" ? unreadTotal : f.id === "snoozed" ? snoozedTotal : 0;
            return (
              <button
                key={f.id}
                onClick={() => {
                  setFolder(f.id);
                  setQuery("");
                }}
                aria-current={active ? "page" : undefined}
                className={`flex shrink-0 items-center gap-4 rounded-full py-2 pl-4 pr-4 text-sm transition ${
                  active
                    ? "bg-accent-soft/60 font-semibold text-foreground"
                    : "text-muted hover:bg-accent-soft/30 hover:text-foreground"
                }`}
              >
                <Icon />
                <span className="flex-1 text-left">{f.label}</span>
                {count > 0 && <span className="text-xs font-semibold text-foreground">{count}</span>}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main */}
      <section className="relative flex min-w-0 flex-col gap-3">
        {/* Search */}
        <div className="relative">
          <div
            className={`flex items-center gap-3 rounded-full border bg-surface px-4 py-2.5 shadow-sm transition ${
              searchFocused ? "border-accent-dim shadow-md" : "border-border"
            }`}
          >
            <SearchIcon className="text-muted-2" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => window.setTimeout(() => setSearchFocused(false), 150)}
              placeholder="Search conversations"
              aria-label="Search conversations"
              className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-2"
            />
            {query && (
              <button onClick={() => setQuery("")} aria-label="Clear search" className="text-muted-2 hover:text-foreground">
                <CloseIcon width={18} height={18} />
              </button>
            )}
          </div>
          {searchFocused && !query && (
            <div className="absolute left-0 right-0 top-full z-20 mt-2 flex flex-wrap gap-2 rounded-2xl border border-border bg-surface p-3 shadow-lg">
              {OPERATOR_HINTS.map((h) => (
                <button
                  key={h}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setQuery(h);
                    searchRef.current?.focus();
                  }}
                  className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted hover:border-accent-dim/40 hover:text-foreground"
                >
                  {h}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-1 border-b border-border pb-2">
          <div className="relative flex items-center">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected && !allSelected;
              }}
              onChange={(e) => setSelected(e.target.checked ? new Set(pageRows.map((t) => t.key)) : new Set())}
              aria-label="Select all"
              className="ml-3 mr-1 h-4 w-4"
            />
            <button onClick={() => setSelectMenu((v) => !v)} aria-label="Selection options" className={iconBtn}>
              <ChevronDownIcon width={16} height={16} />
            </button>
            {selectMenu && (
              <div className="absolute left-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-xl border border-border bg-surface py-1 text-sm shadow-lg">
                {[
                  ["All", () => selectWhere(() => true)],
                  ["None", () => selectWhere(() => false)],
                  ["Read", () => selectWhere((t) => t.unreadCount === 0)],
                  ["Unread", () => selectWhere((t) => t.unreadCount > 0)],
                ].map(([label, fn]) => (
                  <button
                    key={label as string}
                    onClick={fn as () => void}
                    className="block w-full px-4 py-2 text-left text-muted hover:bg-accent-soft/30 hover:text-foreground"
                  >
                    {label as string}
                  </button>
                ))}
              </div>
            )}
          </div>

          {someSelected ? (
            <>
              <button onClick={() => apply([...selected], folder === "archive" ? "unarchive" : "archive")} disabled={busy} title="Archive (e)" aria-label="Archive" className={iconBtn}>
                <ArchiveIcon />
              </button>
              <button onClick={() => confirmDelete([...selected])} disabled={busy} title="Delete (#)" aria-label="Delete" className={iconBtn}>
                <TrashIcon />
              </button>
              <button onClick={() => apply([...selected], "markUnread")} disabled={busy} title="Mark as unread (Shift+U)" aria-label="Mark as unread" className={iconBtn}>
                <MailIcon />
              </button>
              <button onClick={() => apply([...selected], "markRead")} disabled={busy} title="Mark as read (Shift+I)" aria-label="Mark as read" className={iconBtn}>
                <MailOpenIcon />
              </button>
              <button onClick={() => toggleStar([...selected])} title="Star (s)" aria-label="Star" className={iconBtn}>
                <StarIcon />
              </button>
              <button onClick={() => setMenu({ kind: "snooze", keys: [...selected] })} title="Snooze (b)" aria-label="Snooze" className={iconBtn}>
                <ClockIcon />
              </button>
              <button onClick={() => setMenu({ kind: "status", keys: [...selected] })} title="Set status" className="rounded-full px-3 py-1.5 text-xs font-medium text-muted hover:bg-accent-soft/40 hover:text-foreground">
                Status
              </button>
              <span className="ml-2 text-xs text-muted-2">{selected.size} selected</span>
            </>
          ) : (
            <button onClick={() => router.refresh()} title="Refresh" aria-label="Refresh" className={iconBtn}>
              <RefreshIcon />
            </button>
          )}

          <div className="ml-auto flex items-center gap-1 text-xs text-muted-2">
            <span>{formatCount(pageRows.length, visible.length, safePage * PAGE_SIZE + 1)}</span>
            <button onClick={() => setPage(Math.max(0, safePage - 1))} disabled={safePage === 0} aria-label="Newer" className={iconBtn}>
              <ChevronLeftIcon />
            </button>
            <button onClick={() => setPage(Math.min(pageCount - 1, safePage + 1))} disabled={safePage >= pageCount - 1} aria-label="Older" className={iconBtn}>
              <ChevronRightIcon />
            </button>
            <button onClick={() => setHelpOpen(true)} title="Keyboard shortcuts (?)" aria-label="Keyboard shortcuts" className={`${iconBtn} hidden md:inline-flex`}>
              <KeyboardIcon />
            </button>
          </div>
        </div>

        {menu && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setMenu(null)} aria-hidden />
            <div className="absolute left-2 top-[112px] z-40">
              {menu.kind === "snooze" ? (
                <SnoozeMenu onPick={(d) => snoozeTo(menu.keys, d)} />
              ) : (
                <StatusMenu
                  current={rows.find((r) => r.key === menu.keys[0])?.status ?? null}
                  onPick={(st) => void patchState(menu.keys, { status: st }, st ? `Status set to ${statusLabel(st)}` : "Status cleared")}
                />
              )}
            </div>
          </>
        )}

        {/* Rows */}
        {pageRows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <InboxIcon width={40} height={40} className="text-muted-2" />
            <p className="text-sm font-medium text-foreground">
              {query ? `No conversations match "${query}"` : folder === "inbox" ? "Nothing waiting" : "Nothing here"}
            </p>
            <p className="text-xs text-muted-2">
              {query ? "Try fewer words, or an operator like from: or is:unread." : "New replies from venues will show up here."}
            </p>
          </div>
        ) : (
          <ul className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm" role="list">
            {pageRows.map((t, i) => {
              const unread = t.unreadCount > 0;
              const isCursor = i === cursor;
              const isSel = selected.has(t.key);
              return (
                <li
                  key={t.key}
                  className={`group relative flex items-center gap-2 border-b border-border px-3 py-2.5 last:border-b-0 transition ${
                    isSel ? "bg-accent-soft/40" : unread ? "bg-surface" : "bg-background/60"
                  } hover:z-10 hover:shadow-md ${
                    isCursor ? "before:absolute before:left-0 before:top-0 before:h-full before:w-[3px] before:bg-accent" : ""
                  }`}
                  onMouseEnter={() => setCursor(i)}
                >
                  <input
                    type="checkbox"
                    checked={isSel}
                    onChange={() => toggle(t.key)}
                    aria-label={`Select ${t.displayName}`}
                    className="h-4 w-4 shrink-0"
                  />
                  <button
                    onClick={() => void patchState([t.key], { starred: !t.starred })}
                    aria-label={t.starred ? "Remove star" : "Add star"}
                    aria-pressed={t.starred}
                    title={t.starred ? "Starred" : "Not starred"}
                    className={`shrink-0 rounded-full p-1 transition ${t.starred ? "text-accent" : "text-muted-2/50 hover:text-muted"}`}
                  >
                    <StarIcon width={18} height={18} filled={t.starred} />
                  </button>
                  <Link href={`/admin/inbox/t/${t.key}`} className="flex min-w-0 flex-1 flex-col gap-0.5 md:flex-row md:items-center md:gap-4">
                    <span className={`flex shrink-0 items-center gap-2 md:w-52 ${unread ? "font-semibold text-foreground" : "text-foreground/75"}`}>
                      <span className="truncate text-sm">{t.displayName}</span>
                      {t.messageCount > 1 && <span className="shrink-0 text-xs font-normal text-muted-2">{t.messageCount}</span>}
                    </span>
                    <span className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                      <span className="truncate">
                        {t.hasProposal && (
                          <span className="mr-2 rounded bg-accent px-1.5 py-0.5 text-[11px] font-medium text-background">Suggestion</span>
                        )}
                        {t.status && (
                          <span className={`mr-2 rounded px-1.5 py-0.5 text-[11px] font-medium ${statusPill(t.status)}`}>{statusLabel(t.status)}</span>
                        )}
                        {t.snoozed && t.snoozedUntil && (
                          <span className="mr-2 inline-flex items-center gap-1 text-[11px] text-muted-2">
                            <ClockIcon width={12} height={12} />
                            {formatListDate(t.snoozedUntil)}
                          </span>
                        )}
                        <span className={unread ? "font-semibold text-foreground" : "text-foreground/75"}>
                          {t.lastSubject || "(no subject)"}
                        </span>
                        <span className="text-muted-2"> - {tidySnippet(t.lastSnippet)}</span>
                      </span>
                    </span>
                  </Link>
                  {t.hasAttachments && <PaperclipIcon width={16} height={16} className="shrink-0 text-muted-2" />}
                  {/* Date by default; on hover (desktop) it swaps for quick actions, like Gmail. */}
                  <span
                    suppressHydrationWarning
                    className={`w-20 shrink-0 text-right text-xs md:group-hover:hidden ${unread ? "font-semibold text-foreground" : "text-muted-2"}`}
                  >
                    {formatListDate(t.lastAt)}
                  </span>
                  <span className="hidden shrink-0 items-center md:group-hover:flex">
                    <button onClick={() => apply([t.key], t.archived ? "unarchive" : "archive")} title={t.archived ? "Move to Inbox" : "Archive"} aria-label={t.archived ? "Move to Inbox" : "Archive"} className={iconBtn}>
                      <ArchiveIcon width={18} height={18} />
                    </button>
                    <button onClick={() => confirmDelete([t.key])} title="Delete" aria-label="Delete" className={iconBtn}>
                      <TrashIcon width={18} height={18} />
                    </button>
                    <button onClick={() => setMenu({ kind: "snooze", keys: [t.key] })} title="Snooze" aria-label="Snooze" className={iconBtn}>
                      <ClockIcon width={18} height={18} />
                    </button>
                    <button onClick={() => apply([t.key], unread ? "markRead" : "markUnread")} title={unread ? "Mark as read" : "Mark as unread"} aria-label={unread ? "Mark as read" : "Mark as unread"} className={iconBtn}>
                      {unread ? <MailOpenIcon width={18} height={18} /> : <MailIcon width={18} height={18} />}
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Toasts */}
      <div className="pointer-events-none fixed bottom-6 left-6 z-40 flex flex-col gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto flex items-center gap-4 rounded-xl bg-foreground px-5 py-3 text-sm text-background shadow-lg">
            <span>{t.text}</span>
            {t.undo && (
              <button
                onClick={() => {
                  t.undo?.();
                  setToasts((prev) => prev.filter((x) => x.id !== t.id));
                }}
                className="font-semibold text-accent-soft underline-offset-2 hover:underline"
              >
                Undo
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Shortcut help */}
      {helpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4" onClick={() => setHelpOpen(false)}>
          <div role="dialog" aria-label="Keyboard shortcuts" className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl text-foreground">Keyboard shortcuts</h2>
              <button onClick={() => setHelpOpen(false)} aria-label="Close" className={iconBtn}>
                <CloseIcon />
              </button>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              {SHORTCUTS.map(([k, d]) => (
                <div key={k} className="contents">
                  <dt className="font-mono text-xs text-foreground">
                    <kbd className="rounded-md border border-border bg-background px-2 py-1">{k}</kbd>
                  </dt>
                  <dd className="text-muted">{d}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}

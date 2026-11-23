// Small helpers for moving around the admin inbox: auto-advance to the next conversation, a guard against sending
// two replies in quick succession, and a CSV export of the conversation list. All pure.

// --- Auto-advance ---------------------------------------------------------------------------------------------

export interface OrderStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const ORDER_KEY = "inbox-order";
const MAX_KEYS = 500;

// After archiving or deleting, open the next conversation in the list that was on screen (or the previous one when
// this was the last). Null means go back to the list.
export function nextKeyAfter(keys: string[], current: string): string | null {
  const i = keys.indexOf(current);
  if (i === -1) return null;
  return keys[i + 1] ?? keys[i - 1] ?? null;
}

export function saveOrder(storage: OrderStorage | null, keys: string[]): void {
  if (!storage) return;
  try {
    storage.setItem(ORDER_KEY, JSON.stringify(keys.slice(0, MAX_KEYS)));
  } catch {
    // storage unavailable: no auto-advance
  }
}

export function loadOrder(storage: OrderStorage | null): string[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(ORDER_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === "string") : [];
  } catch {
    return [];
  }
}

// --- Duplicate-reply guard ------------------------------------------------------------------------------------

const GUARD_WINDOW_MINUTES = 10;

// Minutes since our newest message in this conversation, when it was sent within the last 10 minutes and they have
// not written since. Null otherwise (nothing to warn about).
export function recentSendMinutes(
  messages: { direction: "inbound" | "outbound"; at: string }[],
  now: Date = new Date()
): number | null {
  const sorted = [...messages].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  const newest = sorted[sorted.length - 1];
  if (!newest || newest.direction !== "outbound") return null;
  const minutes = Math.floor((now.getTime() - new Date(newest.at).getTime()) / 60_000);
  return minutes >= 0 && minutes < GUARD_WINDOW_MINUTES ? minutes : null;
}

// --- CSV export -----------------------------------------------------------------------------------------------

export interface CsvThread {
  lastAt: string;
  displayName: string;
  contactEmail: string | null;
  lastSubject: string;
  status: string | null;
  unreadCount: number;
  messageCount: number;
  signals: { stop: boolean; decline: boolean; lead: boolean };
}

// Text from venues ends up in these cells, so a value that starts like a spreadsheet formula gets a leading quote.
function cell(value: string | number | null): string {
  let s = value === null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function minute(iso: string): string {
  return iso.slice(0, 16).replace("T", " ");
}

export function threadsToCsv(rows: CsvThread[]): string {
  const header = ["Last message", "Venue", "Email", "Subject", "Status", "Unread", "Messages", "Flags"];
  const lines = rows.map((r) =>
    [
      minute(r.lastAt),
      r.displayName,
      r.contactEmail,
      r.lastSubject,
      r.status,
      r.unreadCount,
      r.messageCount,
      [r.signals.stop && "stop", r.signals.decline && "declined", r.signals.lead && "lead"].filter(Boolean).join(" "),
    ]
      .map((v) => cell(v as string | number | null))
      .join(",")
  );
  return `﻿${[header.join(","), ...lines].join("\r\n")}`;
}

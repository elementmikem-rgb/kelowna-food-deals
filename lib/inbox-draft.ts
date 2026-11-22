// Keeps an unsent reply in the browser, per conversation, so closing the tab or navigating away never loses it.
// Browser storage can be missing, blocked or full, so every call is wrapped and failure just means no autosave.

export interface DraftStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const MAX_AGE_DAYS = 30;

export function draftKey(threadKey: string): string {
  return `inbox-draft:${threadKey}`;
}

export function saveDraft(storage: DraftStorage | null, threadKey: string, text: string, now: Date = new Date()): void {
  if (!storage) return;
  try {
    if (text.trim() === "") storage.removeItem(draftKey(threadKey));
    else storage.setItem(draftKey(threadKey), JSON.stringify({ text, at: now.toISOString() }));
  } catch {
    // storage unavailable or full: skip autosave
  }
}

export function loadDraft(storage: DraftStorage | null, threadKey: string, now: Date = new Date()): string | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(draftKey(threadKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { text?: unknown; at?: unknown };
    if (typeof parsed.text !== "string" || typeof parsed.at !== "string") return null;
    const ageDays = (now.getTime() - new Date(parsed.at).getTime()) / 86_400_000;
    if (!(ageDays <= MAX_AGE_DAYS)) {
      storage.removeItem(draftKey(threadKey));
      return null;
    }
    return parsed.text.trim() === "" ? null : parsed.text;
  } catch {
    return null;
  }
}

export function clearDraft(storage: DraftStorage | null, threadKey: string): void {
  if (!storage) return;
  try {
    storage.removeItem(draftKey(threadKey));
  } catch {
    // ignore
  }
}

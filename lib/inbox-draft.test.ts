import { describe, it, expect } from "vitest";
import { draftKey, saveDraft, loadDraft, clearDraft, type DraftStorage } from "./inbox-draft";

function fakeStorage(): DraftStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

const now = new Date("2026-11-22T12:00:00Z");

describe("inbox drafts", () => {
  it("keys a draft by conversation", () => {
    expect(draftKey("v553")).toBe("inbox-draft:v553");
  });

  it("saves and restores what was typed", () => {
    const s = fakeStorage();
    saveDraft(s, "v1", "Hi Ann,\n\nThanks", now);
    expect(loadDraft(s, "v1", now)).toBe("Hi Ann,\n\nThanks");
  });

  it("keeps each conversation's draft separate", () => {
    const s = fakeStorage();
    saveDraft(s, "v1", "one", now);
    saveDraft(s, "v2", "two", now);
    expect(loadDraft(s, "v1", now)).toBe("one");
    expect(loadDraft(s, "v2", now)).toBe("two");
  });

  it("saving an empty or blank draft removes it", () => {
    const s = fakeStorage();
    saveDraft(s, "v1", "something", now);
    saveDraft(s, "v1", "   \n ", now);
    expect(loadDraft(s, "v1", now)).toBeNull();
    expect(s.data.size).toBe(0);
  });

  it("clearDraft removes it", () => {
    const s = fakeStorage();
    saveDraft(s, "v1", "something", now);
    clearDraft(s, "v1");
    expect(loadDraft(s, "v1", now)).toBeNull();
  });

  it("drops a draft older than 30 days", () => {
    const s = fakeStorage();
    saveDraft(s, "v1", "old", new Date("2026-10-01T12:00:00Z"));
    expect(loadDraft(s, "v1", now)).toBeNull();
    expect(s.data.size).toBe(0);
  });

  it("ignores corrupt stored data", () => {
    const s = fakeStorage();
    s.setItem("inbox-draft:v1", "not json");
    expect(loadDraft(s, "v1", now)).toBeNull();
  });

  it("never throws when storage is unavailable or full", () => {
    const broken: DraftStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    expect(() => saveDraft(broken, "v1", "x", now)).not.toThrow();
    expect(loadDraft(broken, "v1", now)).toBeNull();
    expect(() => clearDraft(broken, "v1")).not.toThrow();
    expect(loadDraft(null, "v1", now)).toBeNull();
  });
});

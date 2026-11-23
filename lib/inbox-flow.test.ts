import { describe, it, expect } from "vitest";
import {
  nextKeyAfter,
  saveOrder,
  loadOrder,
  recentSendMinutes,
  threadsToCsv,
  type OrderStorage,
} from "./inbox-flow";

function fakeStorage(): OrderStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

describe("nextKeyAfter (auto-advance)", () => {
  const keys = ["v1", "v2", "v3"];
  it("goes to the next conversation in the list", () => {
    expect(nextKeyAfter(keys, "v1")).toBe("v2");
    expect(nextKeyAfter(keys, "v2")).toBe("v3");
  });
  it("from the last one, goes to the previous", () => {
    expect(nextKeyAfter(keys, "v3")).toBe("v2");
  });
  it("is null when there is nowhere to go", () => {
    expect(nextKeyAfter(["v1"], "v1")).toBeNull();
    expect(nextKeyAfter(keys, "v9")).toBeNull();
    expect(nextKeyAfter([], "v1")).toBeNull();
  });
});

describe("saveOrder and loadOrder", () => {
  it("round-trips the list order", () => {
    const s = fakeStorage();
    saveOrder(s, ["a", "b"]);
    expect(loadOrder(s)).toEqual(["a", "b"]);
  });
  it("keeps at most 500 keys", () => {
    const s = fakeStorage();
    saveOrder(s, Array.from({ length: 700 }, (_, i) => `k${i}`));
    expect(loadOrder(s)).toHaveLength(500);
  });
  it("copes with missing, corrupt or blocked storage", () => {
    expect(loadOrder(null)).toEqual([]);
    const s = fakeStorage();
    s.setItem("inbox-order", "not json");
    expect(loadOrder(s)).toEqual([]);
    s.setItem("inbox-order", JSON.stringify({ not: "an array" }));
    expect(loadOrder(s)).toEqual([]);
    const broken: OrderStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(() => saveOrder(broken, ["a"])).not.toThrow();
    expect(loadOrder(broken)).toEqual([]);
  });
});

describe("recentSendMinutes (duplicate-reply guard)", () => {
  const now = new Date("2026-11-22T12:00:00Z");
  const msg = (direction: "inbound" | "outbound", at: string) => ({ direction, at });
  it("returns whole minutes since our newest message when it is within 10 minutes", () => {
    expect(recentSendMinutes([msg("outbound", "2026-11-22T11:54:30Z")], now)).toBe(5);
    expect(recentSendMinutes([msg("outbound", "2026-11-22T11:59:50Z")], now)).toBe(0);
  });
  it("is null when our newest send is older than the window", () => {
    expect(recentSendMinutes([msg("outbound", "2026-11-22T11:40:00Z")], now)).toBeNull();
  });
  it("is null when they wrote after our send (a new reply is expected)", () => {
    expect(recentSendMinutes([msg("outbound", "2026-11-22T11:55:00Z"), msg("inbound", "2026-11-22T11:58:00Z")], now)).toBeNull();
  });
  it("is null with no messages from us", () => {
    expect(recentSendMinutes([], now)).toBeNull();
    expect(recentSendMinutes([msg("inbound", "2026-11-22T11:58:00Z")], now)).toBeNull();
  });
});

describe("threadsToCsv", () => {
  const row = {
    lastAt: "2026-11-20T10:00:00Z",
    displayName: "Pub X",
    contactEmail: "a@b.com",
    lastSubject: "Re: hours",
    status: "interested",
    unreadCount: 1,
    messageCount: 3,
    signals: { stop: false, decline: false, lead: true },
  };
  it("has a header row and one line per conversation, with a BOM so Excel reads accents", () => {
    const csv = threadsToCsv([row]);
    expect(csv.startsWith("﻿")).toBe(true);
    const lines = csv.slice(1).split("\r\n");
    expect(lines[0]).toBe("Last message,Venue,Email,Subject,Status,Unread,Messages,Flags");
    expect(lines[1]).toBe("2026-11-20 10:00,Pub X,a@b.com,Re: hours,interested,1,3,lead");
  });
  it("quotes commas, quotes and line breaks", () => {
    const csv = threadsToCsv([{ ...row, displayName: 'Pub "X", Inc', lastSubject: "line1\nline2" }]);
    expect(csv).toContain('"Pub ""X"", Inc"');
    expect(csv).toContain('"line1\nline2"');
  });
  it("neutralises spreadsheet formulas in text from outside", () => {
    const csv = threadsToCsv([{ ...row, lastSubject: "=HYPERLINK(\"http://evil\")", displayName: "+cmd", contactEmail: "@x" }]);
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain(",'+cmd,");
    expect(csv).toContain(",'@x,");
  });
  it("lists every flag, and is empty for none", () => {
    expect(threadsToCsv([{ ...row, signals: { stop: true, decline: true, lead: true } }])).toContain("stop declined lead");
    expect(threadsToCsv([{ ...row, signals: { stop: false, decline: false, lead: false }, status: null }])).toContain(",,1,3,");
  });
});

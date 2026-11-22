import { describe, it, expect } from "vitest";
import { parseQuery, matchThread } from "./inbox-search";
import type { SearchableThread } from "./inbox-search";

const base: SearchableThread = {
  displayName: "John Doe",
  contactEmail: "john@example.com",
  lastSubject: "Happy Hour Times",
  lastSnippet: "We have specials every Friday",
  lastAt: "2026-11-20T10:00:00Z",
  unreadCount: 1,
  archived: false,
  hasAttachments: false,
  lastFromMe: false,
};

describe("parseQuery", () => {
  it("returns empty ParsedQuery for empty string", () => {
    const pq = parseQuery("");
    expect(pq.terms).toEqual([]);
    expect(pq.negated).toEqual([]);
    expect(pq.from).toEqual([]);
    expect(pq.subject).toEqual([]);
    expect(pq.is).toEqual([]);
    expect(pq.has).toEqual([]);
    expect(pq.in).toBeNull();
    expect(pq.before).toBeNull();
    expect(pq.after).toBeNull();
    expect(pq.lang).toBeNull();
  });

  it("parses bare terms", () => {
    const pq = parseQuery("hello world");
    expect(pq.terms).toEqual(["hello", "world"]);
  });

  it("parses a quoted phrase as one term", () => {
    const pq = parseQuery('"happy hour"');
    expect(pq.terms).toContain("happy hour");
    expect(pq.terms).toHaveLength(1);
  });

  it("parses negated terms", () => {
    const pq = parseQuery("hello -world");
    expect(pq.terms).toContain("hello");
    expect(pq.negated).toContain("world");
  });

  it("parses from: operator", () => {
    const pq = parseQuery("from:john@example.com");
    expect(pq.from).toContain("john@example.com");
  });

  it("parses from: with quoted value", () => {
    const pq = parseQuery('from:"John Doe"');
    expect(pq.from).toContain("John Doe");
  });

  it("parses subject: operator", () => {
    const pq = parseQuery("subject:happy");
    expect(pq.subject).toContain("happy");
  });

  it("parses is:unread", () => {
    const pq = parseQuery("is:unread");
    expect(pq.is).toContain("unread");
  });

  it("parses is:read is:starred is:snoozed", () => {
    const pq = parseQuery("is:read is:starred is:snoozed");
    expect(pq.is).toContain("read");
    expect(pq.is).toContain("starred");
    expect(pq.is).toContain("snoozed");
  });

  it("parses has:attachment", () => {
    const pq = parseQuery("has:attachment");
    expect(pq.has).toContain("attachment");
  });

  it("parses in:inbox", () => {
    const pq = parseQuery("in:inbox");
    expect(pq.in).toBe("inbox");
  });

  it("parses in:sent", () => {
    const pq = parseQuery("in:sent");
    expect(pq.in).toBe("sent");
  });

  it("parses in:archive", () => {
    const pq = parseQuery("in:archive");
    expect(pq.in).toBe("archive");
  });

  it("maps in:anywhere to all", () => {
    const pq = parseQuery("in:anywhere");
    expect(pq.in).toBe("all");
  });

  it("parses before:YYYY-MM-DD", () => {
    const pq = parseQuery("before:2026-11-01");
    expect(pq.before).toBeInstanceOf(Date);
    expect(pq.before?.toISOString().slice(0, 10)).toBe("2026-11-01");
  });

  it("parses after:YYYY-MM-DD", () => {
    const pq = parseQuery("after:2026-11-01");
    expect(pq.after).toBeInstanceOf(Date);
    expect(pq.after?.toISOString().slice(0, 10)).toBe("2026-11-01");
  });

  it("parses lang:", () => {
    const pq = parseQuery("lang:fr");
    expect(pq.lang).toBe("fr");
  });

  it("treats unknown operators as plain text terms", () => {
    const pq = parseQuery("foo:bar");
    expect(pq.terms).toContain("foo:bar");
  });

  it("sets before for older_than:Nd", () => {
    const pq = parseQuery("older_than:7d");
    expect(pq.before).toBeInstanceOf(Date);
    // before should be approximately now minus 7 days
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    expect(Math.abs(pq.before!.getTime() - sevenDaysAgo)).toBeLessThan(5000);
  });

  it("sets after for newer_than:Nd", () => {
    const pq = parseQuery("newer_than:7d");
    expect(pq.after).toBeInstanceOf(Date);
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    expect(Math.abs(pq.after!.getTime() - sevenDaysAgo)).toBeLessThan(5000);
  });
});

describe("matchThread - default scope", () => {
  it("empty query matches non-archived threads", () => {
    expect(matchThread(base, parseQuery(""))).toBe(true);
  });

  it("empty query excludes archived threads", () => {
    expect(matchThread({ ...base, archived: true }, parseQuery(""))).toBe(false);
  });

  it("matches bare term in displayName", () => {
    expect(matchThread(base, parseQuery("John"))).toBe(true);
  });

  it("matches bare term in contactEmail", () => {
    expect(matchThread(base, parseQuery("john@example.com"))).toBe(true);
  });

  it("matches bare term in lastSubject", () => {
    expect(matchThread(base, parseQuery("Happy"))).toBe(true);
  });

  it("matches bare term in lastSnippet", () => {
    expect(matchThread(base, parseQuery("specials"))).toBe(true);
  });

  it("does not match when bare term is absent", () => {
    expect(matchThread(base, parseQuery("zzzyyyxxx"))).toBe(false);
  });

  it("matches accent-insensitively: desole matches Desole", () => {
    const t: SearchableThread = { ...base, lastSnippet: "Desole du delais" };
    expect(matchThread(t, parseQuery("desole"))).toBe(true);
  });

  it("matches accent-insensitively: accented query matches unaccented text", () => {
    const t: SearchableThread = { ...base, lastSnippet: "Desole du delais" };
    expect(matchThread(t, parseQuery("désolé"))).toBe(true);
  });

  it("requires all bare terms to match", () => {
    expect(matchThread(base, parseQuery("John zzzyyyxxx"))).toBe(false);
  });

  it("excludes thread matching a negated term", () => {
    expect(matchThread(base, parseQuery("-specials"))).toBe(false);
  });

  it("includes thread not matching a negated term", () => {
    expect(matchThread(base, parseQuery("-zzzyyyxxx"))).toBe(true);
  });

  it("matches case-insensitively", () => {
    expect(matchThread(base, parseQuery("JOHN"))).toBe(true);
    expect(matchThread(base, parseQuery("happy hour"))).toBe(true);
  });
});

describe("matchThread - operators", () => {
  it("from: matches contactEmail", () => {
    expect(matchThread(base, parseQuery("from:john@example.com"))).toBe(true);
  });

  it("from: does not match wrong email", () => {
    expect(matchThread(base, parseQuery("from:other@example.com"))).toBe(false);
  });

  it("from: matches displayName", () => {
    expect(matchThread(base, parseQuery("from:John"))).toBe(true);
  });

  it("subject: matches lastSubject", () => {
    expect(matchThread(base, parseQuery("subject:Happy"))).toBe(true);
  });

  it("subject: does not match when absent", () => {
    expect(matchThread(base, parseQuery("subject:zzzyyyxxx"))).toBe(false);
  });

  it("is:unread matches thread with unreadCount > 0", () => {
    expect(matchThread(base, parseQuery("is:unread"))).toBe(true);
    expect(matchThread({ ...base, unreadCount: 0 }, parseQuery("is:unread"))).toBe(false);
  });

  it("is:read matches thread with unreadCount === 0", () => {
    expect(matchThread(base, parseQuery("is:read"))).toBe(false);
    expect(matchThread({ ...base, unreadCount: 0 }, parseQuery("is:read"))).toBe(true);
  });

  it("is:starred matches thread with starred true", () => {
    expect(matchThread(base, parseQuery("is:starred"))).toBe(false);
    expect(matchThread({ ...base, starred: true }, parseQuery("is:starred"))).toBe(true);
  });

  it("is:snoozed matches thread with snoozedUntil in the future", () => {
    const now = new Date("2026-11-22T12:00:00Z");
    expect(matchThread(base, parseQuery("is:snoozed"), now)).toBe(false);
    expect(
      matchThread({ ...base, snoozedUntil: "2026-11-25T12:00:00Z" }, parseQuery("is:snoozed"), now)
    ).toBe(true);
    expect(
      matchThread({ ...base, snoozedUntil: "2026-11-21T12:00:00Z" }, parseQuery("is:snoozed"), now)
    ).toBe(false);
  });

  it("has:attachment matches thread with hasAttachments true", () => {
    expect(matchThread(base, parseQuery("has:attachment"))).toBe(false);
    expect(matchThread({ ...base, hasAttachments: true }, parseQuery("has:attachment"))).toBe(true);
  });

  it("in:sent matches lastFromMe true", () => {
    expect(matchThread(base, parseQuery("in:sent"))).toBe(false);
    expect(matchThread({ ...base, lastFromMe: true }, parseQuery("in:sent"))).toBe(true);
  });

  it("in:archive matches archived threads", () => {
    expect(matchThread(base, parseQuery("in:archive"))).toBe(false);
    expect(matchThread({ ...base, archived: true }, parseQuery("in:archive"))).toBe(true);
  });

  it("in:starred matches starred threads", () => {
    expect(matchThread(base, parseQuery("in:starred"))).toBe(false);
    expect(matchThread({ ...base, starred: true }, parseQuery("in:starred"))).toBe(true);
  });

  it("in:all includes archived threads", () => {
    expect(matchThread(base, parseQuery("in:anywhere"))).toBe(true);
    expect(matchThread({ ...base, archived: true }, parseQuery("in:anywhere"))).toBe(true);
  });

  it("before: filters by date - matches older thread", () => {
    const pq = parseQuery("before:2026-11-21");
    expect(matchThread(base, pq)).toBe(true); // lastAt 2026-11-20 < 2026-11-21
  });

  it("before: excludes threads on or after the date", () => {
    const pq = parseQuery("before:2026-11-19");
    expect(matchThread(base, pq)).toBe(false); // lastAt 2026-11-20 is not before 2026-11-19
  });

  it("after: filters by date - matches newer thread", () => {
    const pq = parseQuery("after:2026-11-19");
    expect(matchThread(base, pq)).toBe(true); // lastAt 2026-11-20 > 2026-11-19
  });

  it("after: excludes threads on or before the date", () => {
    const pq = parseQuery("after:2026-11-21");
    expect(matchThread(base, pq)).toBe(false); // lastAt 2026-11-20 not after 2026-11-21
  });

  it("older_than:1d excludes recent threads", () => {
    const recentThread: SearchableThread = {
      ...base,
      lastAt: new Date(Date.now() - 10_000).toISOString(),
    };
    expect(matchThread(recentThread, parseQuery("older_than:1d"))).toBe(false);
  });

  it("older_than:1d includes clearly old threads", () => {
    const oldThread: SearchableThread = { ...base, lastAt: "2026-01-01T10:00:00Z" };
    expect(matchThread(oldThread, parseQuery("older_than:1d"))).toBe(true);
  });

  it("newer_than:7d includes recent threads", () => {
    const recentThread: SearchableThread = {
      ...base,
      lastAt: new Date(Date.now() - 60_000).toISOString(),
    };
    expect(matchThread(recentThread, parseQuery("newer_than:7d"))).toBe(true);
  });

  it("newer_than:7d excludes clearly old threads", () => {
    const oldThread: SearchableThread = { ...base, lastAt: "2026-01-01T10:00:00Z" };
    expect(matchThread(oldThread, parseQuery("newer_than:7d"))).toBe(false);
  });

  it("lang: matches thread lang field", () => {
    expect(matchThread(base, parseQuery("lang:fr"))).toBe(false);
    expect(matchThread({ ...base, lang: "fr" }, parseQuery("lang:fr"))).toBe(true);
  });
});

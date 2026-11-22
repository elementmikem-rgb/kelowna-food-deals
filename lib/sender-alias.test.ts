import { describe, it, expect, vi, beforeEach } from "vitest";

const { calls, TABLES } = vi.hoisted(() => {
  const calls: { op: string; table: unknown; values?: unknown }[] = [];
  const TABLES = {
    senderAliases: { __t: "senderAliases", email: "email" },
    inboundEmails: { __t: "inboundEmails" },
    outreachSends: { __t: "outreachSends" },
    venues: { __t: "venues", id: "id" },
  };
  return { calls, TABLES };
});

vi.mock("@/db", () => ({
  db: {
    execute: (query: unknown) => {
      calls.push({ op: "execute", table: null, values: query });
      return Promise.resolve();
    },
    update: (table: unknown) => ({
      set: (values: unknown) => {
        calls.push({ op: "update", table, values });
        return { where: () => ({ returning: () => Promise.resolve([{ id: 1 }, { id: 2 }]) }) };
      },
    }),
  },
  ...TABLES,
}));
vi.mock("drizzle-orm", () => ({ sql: Object.assign(vi.fn((strings: TemplateStringsArray, ...vals: unknown[]) => ({ strings, vals })), {}), eq: vi.fn(), and: vi.fn(), isNull: vi.fn() }));

import { normalizeSender, pickVenueId, assignSenderToVenue } from "./sender-alias";

beforeEach(() => {
  calls.length = 0;
});

describe("normalizeSender", () => {
  it("lowercases and trims", () => {
    expect(normalizeSender("  Info@PubX.CA ")).toBe("info@pubx.ca");
  });
  it("rejects something that is not an email address", () => {
    expect(normalizeSender("not an email")).toBeNull();
    expect(normalizeSender("")).toBeNull();
  });
});

describe("pickVenueId (how an incoming reply finds its venue)", () => {
  it("prefers the venue whose contact email matches", () => {
    expect(pickVenueId({ contactVenueId: 5, aliasVenueId: 9 })).toBe(5);
  });
  it("falls back to a remembered alias", () => {
    expect(pickVenueId({ contactVenueId: null, aliasVenueId: 9 })).toBe(9);
  });
  it("is null when neither matches", () => {
    expect(pickVenueId({ contactVenueId: null, aliasVenueId: null })).toBeNull();
  });
});

describe("assignSenderToVenue", () => {
  it("remembers the address and moves the sender's unmatched messages and our replies to that venue", async () => {
    const out = await assignSenderToVenue("Owner@Gmail.com", 42);
    expect(out).toEqual({ ok: true, email: "owner@gmail.com", movedReplies: 2, movedSent: 2 });
    const upsert = calls.find((c) => c.op === "execute");
    expect((upsert?.values as { vals: unknown[] }).vals).toEqual(["owner@gmail.com", 42]);
    const updates = calls.filter((c) => c.op === "update");
    expect(updates.map((u) => u.table)).toEqual([TABLES.inboundEmails, TABLES.outreachSends]);
    expect(updates.every((u) => (u.values as { venueId: number }).venueId === 42)).toBe(true);
  });
  it("refuses a bad address and writes nothing", async () => {
    const out = await assignSenderToVenue("nope", 42);
    expect(out.ok).toBe(false);
    expect(calls).toHaveLength(0);
  });
});

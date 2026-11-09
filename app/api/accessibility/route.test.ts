import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const venueRows = vi.fn();
const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
const values = vi.fn(() => ({ onConflictDoUpdate }));
const insert = vi.fn(() => ({ values }));
const limit = vi.fn(() => venueRows());
const where = vi.fn(() => ({ limit }));
const from = vi.fn(() => ({ where }));
const select = vi.fn(() => ({ from }));
const checkRateLimit = vi.fn();

vi.mock("@/db", () => ({
  db: { select: () => select(), insert: (...a: unknown[]) => insert(...(a as [])) },
  venues: { id: "id", active: "active" },
  accessibilityVotes: { venueId: "v", feature: "f", tokenHash: "t" },
}));
vi.mock("drizzle-orm", () => ({ eq: vi.fn(), and: vi.fn(), sql: (s: TemplateStringsArray) => s.join("") }));
vi.mock("@/lib/request-rate-limit", () => ({ checkRateLimit: (...a: unknown[]) => checkRateLimit(...a) }));

import { POST } from "./route";

const TOKEN = "a".repeat(32);
function req(body: unknown) {
  return new NextRequest("https://todaystab.com/api/accessibility", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  [venueRows, insert, values, onConflictDoUpdate, checkRateLimit].forEach((m) => m.mockClear());
  venueRows.mockResolvedValue([{ id: 7 }]);
  checkRateLimit.mockResolvedValue({ ok: true, remaining: 5 });
});

describe("POST /api/accessibility", () => {
  it("stores one vote per answered feature", async () => {
    const res = await POST(req({ venueId: 7, token: TOKEN, answers: { entrance: "yes", washroom: "no" } }));
    expect(res.status).toBe(200);
    expect(insert).toHaveBeenCalledTimes(2);
  });

  it("never stores the raw token, only a hash", async () => {
    await POST(req({ venueId: 7, token: TOKEN, answers: { entrance: "yes" } }));
    const stored = JSON.stringify((values.mock.calls as unknown[][])[0]);
    expect(stored).not.toContain(TOKEN);
    expect(stored).toMatch(/[0-9a-f]{64}/);
  });

  it("rejects an unknown answer, an unknown feature and a short token", async () => {
    expect((await POST(req({ venueId: 7, token: TOKEN, answers: { entrance: "maybe" } }))).status).toBe(400);
    expect((await POST(req({ venueId: 7, token: TOKEN, answers: { parking: "yes" } }))).status).toBe(400);
    expect((await POST(req({ venueId: 7, token: "short", answers: { entrance: "yes" } }))).status).toBe(400);
    expect(insert).not.toHaveBeenCalled();
  });

  it("rejects an empty set of answers", async () => {
    expect((await POST(req({ venueId: 7, token: TOKEN, answers: {} }))).status).toBe(400);
    expect(insert).not.toHaveBeenCalled();
  });

  it("returns 404 and writes nothing for a venue that does not exist", async () => {
    venueRows.mockResolvedValue([]);
    const res = await POST(req({ venueId: 999, token: TOKEN, answers: { entrance: "yes" } }));
    expect(res.status).toBe(404);
    expect(insert).not.toHaveBeenCalled();
  });

  it("returns 429 and writes nothing when rate limited", async () => {
    checkRateLimit.mockResolvedValue({ ok: false, remaining: 0 });
    const res = await POST(req({ venueId: 7, token: TOKEN, answers: { entrance: "yes" } }));
    expect(res.status).toBe(429);
    expect(insert).not.toHaveBeenCalled();
  });

  it("rejects a body that is not JSON", async () => {
    const bad = new NextRequest("https://todaystab.com/api/accessibility", { method: "POST", body: "nope" });
    expect((await POST(bad)).status).toBe(400);
  });
});

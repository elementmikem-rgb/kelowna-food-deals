import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Queue of results for the three `.limit(1)` selects the route makes when the email
// belongs to an owner: owner row, first venue link, venue's region id.
const limitResults: unknown[][] = [];
const chain: Record<string, unknown> = {};
chain.from = () => chain;
chain.where = () => chain;
chain.limit = () => Promise.resolve(limitResults.shift() ?? []);

const select = vi.fn(() => chain);
vi.mock("@/db", () => ({
  db: { select: (...a: unknown[]) => select(...(a as [])) },
  venueOwners: { id: "id", email: "email" },
  venueOwnerVenues: { venueId: "venueId", venueOwnerId: "venueOwnerId" },
  venues: { id: "id", regionId: "regionId" },
}));
vi.mock("drizzle-orm", () => ({ eq: vi.fn(), sql: vi.fn(() => ({})) }));

const checkRateLimit = vi.fn();
vi.mock("@/lib/request-rate-limit", () => ({
  checkRateLimit: (...a: unknown[]) => checkRateLimit(...a),
}));

const createOwnerSession = vi.fn().mockResolvedValue("tok");
vi.mock("@/lib/venue-owner-auth", () => ({
  createOwnerSession: (...a: unknown[]) => createOwnerSession(...a),
}));

const sendOutreachEmail = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/outreach-email", () => ({
  sendOutreachEmail: (...a: unknown[]) => sendOutreachEmail(...a),
}));
vi.mock("@/lib/outreach-send", () => ({ wrapOutreachHtml: () => "<html></html>" }));
vi.mock("@/lib/regions", () => ({
  getRegionById: vi.fn().mockResolvedValue({
    brandName: "TodaysTab Test",
    mailingAddress: "1 Test St",
    domain: "todaystab.com",
  }),
}));

import { POST } from "./route";

function req() {
  return new NextRequest("https://todaystab.com/api/owner/request-login", {
    method: "POST",
    body: JSON.stringify({ email: "owner@example.com" }),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  limitResults.length = 0;
  limitResults.push([{ id: 1 }], [{ venueId: 2 }], [{ regionId: 3 }]);
  checkRateLimit.mockReset();
  createOwnerSession.mockClear();
  sendOutreachEmail.mockClear();
  select.mockClear();
});

describe("POST /api/owner/request-login rate limit", () => {
  it("refuses with 429 once the caller is over the limit, and sends no email or session", async () => {
    checkRateLimit.mockResolvedValue({ ok: false, remaining: 0 });
    const res = await POST(req());
    expect(res.status).toBe(429);
    expect(createOwnerSession).not.toHaveBeenCalled();
    expect(sendOutreachEmail).not.toHaveBeenCalled();
  });

  it("checks the limit under its own key before touching the database", async () => {
    checkRateLimit.mockResolvedValue({ ok: false, remaining: 0 });
    await POST(req());
    expect(checkRateLimit).toHaveBeenCalledWith(expect.anything(), "owner-request-login", 5, 60);
    expect(select).not.toHaveBeenCalled();
  });

  it("still sends the login link when under the limit", async () => {
    checkRateLimit.mockResolvedValue({ ok: true, remaining: 4 });
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(createOwnerSession).toHaveBeenCalledTimes(1);
    expect(sendOutreachEmail).toHaveBeenCalledTimes(1);
  });
});

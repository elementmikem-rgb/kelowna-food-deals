import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const where = vi.fn().mockResolvedValue(undefined);
const set = vi.fn(() => ({ where }));
const update = vi.fn(() => ({ set }));

// db.select().from().innerJoin().innerJoin().where().limit() resolves to the owner's region row.
let regionRow: { brandName: string | null; language: string | null } | undefined = { brandName: "Whistler Food Deals", language: "en" };
const limit = vi.fn(async () => (regionRow ? [regionRow] : []));
const selectWhere = vi.fn(() => ({ limit }));
const join2 = vi.fn(() => ({ where: selectWhere }));
const join1 = vi.fn(() => ({ innerJoin: join2 }));
const from = vi.fn(() => ({ innerJoin: join1 }));
const select = vi.fn(() => ({ from }));

vi.mock("@/db", () => ({
  db: { update: (...a: unknown[]) => update(...(a as [])), select: (...a: unknown[]) => select(...(a as [])) },
  venueOwners: { id: "id", weeklyDigestOptOut: "weeklyDigestOptOut" },
  venueOwnerVenues: { venueOwnerId: "venueOwnerId", venueId: "venueId" },
  venues: { id: "id", regionId: "regionId" },
  regions: { id: "id", brandName: "brandName", language: "language" },
}));
vi.mock("drizzle-orm", () => ({ eq: vi.fn(), and: vi.fn() }));
vi.mock("@/lib/owner-digest-unsubscribe", () => ({
  verifyDigestUnsubscribeToken: (id: number, token: string) => token === `good-${id}`,
}));

import * as route from "./route";

function req(method: string, qs: string, body?: string) {
  return new NextRequest(`https://todaystab.com/api/owner/digest-unsubscribe?${qs}`, {
    method,
    body,
    headers: body ? { "Content-Type": "application/x-www-form-urlencoded" } : undefined,
  });
}
const post = (r: NextRequest) => (route as { POST: (r: NextRequest) => Promise<Response> }).POST(r);

beforeEach(() => {
  update.mockClear();
  set.mockClear();
  where.mockClear();
  regionRow = { brandName: "Whistler Food Deals", language: "en" };
});

describe("/api/owner/digest-unsubscribe GET (mail scanners follow links, so a GET must never opt anyone out)", () => {
  it("shows a confirmation page about the weekly stats emails and writes NOTHING", async () => {
    const res = await route.GET(req("GET", "venueOwnerId=7&token=good-7"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/text\/html/);
    const html = await res.text();
    expect(html).toMatch(/<form[^>]*method="post"/i);
    expect(html).toMatch(/weekly listing stats/i);
    expect(update).not.toHaveBeenCalled();
  });

  it("uses French for a French region", async () => {
    regionRow = { brandName: "Montréal Centre Bons Plans", language: "fr" };
    const html = await (await route.GET(req("GET", "venueOwnerId=7&token=good-7"))).text();
    expect(html).toMatch(/résumé hebdomadaire/i);
  });

  it("rejects a bad token and writes nothing", async () => {
    const res = await route.GET(req("GET", "venueOwnerId=7&token=nope"));
    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });
});

describe("/api/owner/digest-unsubscribe POST", () => {
  it("the page's button opts the owner out and answers with a page", async () => {
    const res = await post(req("POST", "venueOwnerId=7&token=good-7", "confirm=1"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/text\/html/);
    expect(update).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenCalledWith({ weeklyDigestOptOut: true });
  });

  it("a mail provider's one-click (RFC 8058) opts the owner out and answers in plain text", async () => {
    const res = await post(req("POST", "venueOwnerId=7&token=good-7", "List-Unsubscribe=One-Click"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/text\/plain/);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("rejects a bad token or another owner's token and writes nothing", async () => {
    expect((await post(req("POST", "venueOwnerId=7&token=nope", "confirm=1"))).status).toBe(400);
    expect((await post(req("POST", "venueOwnerId=8&token=good-7", "List-Unsubscribe=One-Click"))).status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });
});

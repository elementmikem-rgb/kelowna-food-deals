import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const where = vi.fn().mockResolvedValue(undefined);
const set = vi.fn(() => ({ where }));
const update = vi.fn(() => ({ set }));

// db.select().from().leftJoin().where().limit() resolves to the venue's region row.
let regionRow: { brandName: string | null; language: string | null } | undefined = { brandName: "Whistler Food Deals", language: "en" };
const limit = vi.fn(async () => (regionRow ? [regionRow] : []));
const selectWhere = vi.fn(() => ({ limit }));
const leftJoin = vi.fn(() => ({ where: selectWhere }));
const from = vi.fn(() => ({ leftJoin }));
const select = vi.fn(() => ({ from }));

vi.mock("@/db", () => ({
  db: { update: (...a: unknown[]) => update(...(a as [])), select: (...a: unknown[]) => select(...(a as [])) },
  venues: { id: "id", regionId: "regionId", unsubscribedAt: "unsubscribedAt" },
  regions: { id: "id", brandName: "brandName", language: "language" },
}));
vi.mock("drizzle-orm", () => ({ eq: vi.fn(), and: vi.fn(), isNull: vi.fn() }));
vi.mock("@/lib/unsubscribe", () => ({
  verifyUnsubscribeToken: (id: number, token: string) => token === `good-${id}`,
}));

import * as route from "./route";

function req(method: string, qs: string, body?: string) {
  return new NextRequest(`https://todaystab.com/api/unsubscribe?${qs}`, {
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

describe("/api/unsubscribe GET (mail scanners follow links, so a GET must never unsubscribe)", () => {
  it("shows a confirmation page and writes NOTHING", async () => {
    const res = await route.GET(req("GET", "venueId=7&token=good-7"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/text\/html/);
    const html = await res.text();
    expect(html).toMatch(/<form[^>]*method="post"/i);
    expect(html).toContain("Whistler Food Deals");
    expect(update).not.toHaveBeenCalled();
  });

  it("keeps the token and venue id in the form action so the button works", async () => {
    const html = await (await route.GET(req("GET", "venueId=7&token=good-7"))).text();
    expect(html).toContain("/api/unsubscribe?venueId=7&amp;token=good-7");
  });

  it("uses French and the region's brand for a French region", async () => {
    regionRow = { brandName: "Montréal Centre Bons Plans", language: "fr" };
    const html = await (await route.GET(req("GET", "venueId=7&token=good-7"))).text();
    expect(html).toContain("Se désabonner");
    expect(html).toContain("Montréal Centre Bons Plans");
  });

  it("rejects a bad token and writes nothing", async () => {
    const res = await route.GET(req("GET", "venueId=7&token=nope"));
    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });
});

describe("/api/unsubscribe POST", () => {
  it("exports POST", () => {
    expect(typeof (route as { POST?: unknown }).POST).toBe("function");
  });

  it("the page's button (confirm=1) unsubscribes the venue and answers with a page", async () => {
    const res = await post(req("POST", "venueId=7&token=good-7", "confirm=1"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/text\/html/);
    expect(update).toHaveBeenCalledTimes(1);
    expect(await res.text()).toMatch(/unsubscribed/i);
  });

  it("a mail provider's one-click (RFC 8058) unsubscribes and answers in plain text", async () => {
    const res = await post(req("POST", "venueId=7&token=good-7", "List-Unsubscribe=One-Click"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/text\/plain/);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("rejects a bad token and writes nothing, for both kinds of POST", async () => {
    expect((await post(req("POST", "venueId=7&token=nope", "List-Unsubscribe=One-Click"))).status).toBe(400);
    expect((await post(req("POST", "venueId=7&token=nope", "confirm=1"))).status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects a token that belongs to a different venue", async () => {
    expect((await post(req("POST", "venueId=8&token=good-7", "confirm=1"))).status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });
});

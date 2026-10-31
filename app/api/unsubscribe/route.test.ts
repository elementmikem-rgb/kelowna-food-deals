import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const where = vi.fn().mockResolvedValue(undefined);
const set = vi.fn(() => ({ where }));
const update = vi.fn(() => ({ set }));

vi.mock("@/db", () => ({ db: { update: (...a: unknown[]) => update(...(a as [])) }, venues: { id: "id" } }));
vi.mock("drizzle-orm", () => ({ eq: vi.fn() }));
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

beforeEach(() => {
  update.mockClear();
  set.mockClear();
  where.mockClear();
});

describe("/api/unsubscribe", () => {
  it("GET with a valid token unsubscribes the venue", async () => {
    const res = await route.GET(req("GET", "venueId=7&token=good-7"));
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("GET with a bad token is rejected and writes nothing", async () => {
    const res = await route.GET(req("GET", "venueId=7&token=nope"));
    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("exports POST for RFC 8058 one-click unsubscribe", () => {
    expect(typeof (route as { POST?: unknown }).POST).toBe("function");
  });

  it("POST one-click with a valid token unsubscribes the venue", async () => {
    const post = (route as { POST: (r: NextRequest) => Promise<Response> }).POST;
    const res = await post(req("POST", "venueId=7&token=good-7", "List-Unsubscribe=One-Click"));
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("POST with a bad token is rejected and writes nothing", async () => {
    const post = (route as { POST: (r: NextRequest) => Promise<Response> }).POST;
    const res = await post(req("POST", "venueId=7&token=nope", "List-Unsubscribe=One-Click"));
    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });
});

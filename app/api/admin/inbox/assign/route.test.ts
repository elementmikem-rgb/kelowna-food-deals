import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

let authed = true;
let venueExists = true;
const assign = vi.fn();

vi.mock("@/lib/admin-auth", () => ({ isAdminAuthed: async () => authed }));
vi.mock("@/lib/sender-alias", () => ({ assignSenderToVenue: (...a: unknown[]) => assign(...a) }));
vi.mock("@/db", () => ({
  db: { select: () => ({ from: () => ({ where: () => ({ limit: async () => (venueExists ? [{ id: 7 }] : []) }) }) }) },
  venues: { id: "id" },
}));
vi.mock("drizzle-orm", () => ({ eq: vi.fn() }));

import { POST } from "./route";

const req = (body: unknown) =>
  new NextRequest("https://todaystab.com/api/admin/inbox/assign", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

beforeEach(() => {
  authed = true;
  venueExists = true;
  assign.mockReset();
  assign.mockResolvedValue({ ok: true, email: "a@b.com", movedReplies: 2, movedSent: 1 });
});

describe("/api/admin/inbox/assign", () => {
  it("needs an admin session and writes nothing without one", async () => {
    authed = false;
    expect((await POST(req({ email: "a@b.com", venueId: 7 }))).status).toBe(401);
    expect(assign).not.toHaveBeenCalled();
  });
  it("rejects a bad payload", async () => {
    expect((await POST(req({ email: "a@b.com" }))).status).toBe(400);
    expect((await POST(req({ email: "a@b.com", venueId: -1 }))).status).toBe(400);
    expect(assign).not.toHaveBeenCalled();
  });
  it("404 for a venue that does not exist", async () => {
    venueExists = false;
    expect((await POST(req({ email: "a@b.com", venueId: 7 }))).status).toBe(404);
    expect(assign).not.toHaveBeenCalled();
  });
  it("assigns and reports how many messages moved", async () => {
    const res = await POST(req({ email: "a@b.com", venueId: 7 }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, venueId: 7, movedReplies: 2, movedSent: 1 });
    expect(assign).toHaveBeenCalledWith("a@b.com", 7);
  });
  it("passes a bad address back as a 400", async () => {
    assign.mockResolvedValue({ ok: false, error: "not an email address" });
    expect((await POST(req({ email: "nope", venueId: 7 }))).status).toBe(400);
  });
});

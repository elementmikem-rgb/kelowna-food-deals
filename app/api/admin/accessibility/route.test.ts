import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const where = vi.fn().mockResolvedValue(undefined);
const del = vi.fn(() => ({ where }));
const isAdminAuthed = vi.fn();

vi.mock("@/db", () => ({
  db: { delete: (...a: unknown[]) => del(...(a as [])) },
  accessibilityVotes: { venueId: "venue_id", feature: "feature" },
}));
vi.mock("drizzle-orm", () => ({ eq: vi.fn((a, b) => ({ eq: [a, b] })), and: vi.fn((...a) => ({ and: a })) }));
vi.mock("@/lib/admin-auth", () => ({ isAdminAuthed: (...a: unknown[]) => isAdminAuthed(...a) }));

import { POST } from "./route";

const req = (body: unknown) =>
  new NextRequest("https://todaystab.com/api/admin/accessibility", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

beforeEach(() => {
  del.mockClear();
  where.mockClear();
  isAdminAuthed.mockResolvedValue(true);
});

describe("POST /api/admin/accessibility", () => {
  it("refuses anyone who is not signed in as admin and deletes nothing", async () => {
    isAdminAuthed.mockResolvedValue(false);
    const res = await POST(req({ venueId: 5 }));
    expect(res.status).toBe(401);
    expect(del).not.toHaveBeenCalled();
  });

  it("deletes every vote for a venue", async () => {
    const res = await POST(req({ venueId: 5 }));
    expect(res.status).toBe(200);
    expect(del).toHaveBeenCalledTimes(1);
  });

  it("can delete the votes for one feature only", async () => {
    const res = await POST(req({ venueId: 5, feature: "washroom" }));
    expect(res.status).toBe(200);
    expect(JSON.stringify(where.mock.calls[0])).toContain("washroom");
  });

  it("rejects a bad venue id or feature", async () => {
    expect((await POST(req({ venueId: "x" }))).status).toBe(400);
    expect((await POST(req({ venueId: 5, feature: "parking" }))).status).toBe(400);
    expect((await POST(req({}))).status).toBe(400);
    expect(del).not.toHaveBeenCalled();
  });
});

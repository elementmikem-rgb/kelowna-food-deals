import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

let row: Record<string, unknown> | undefined;

vi.mock("@/db", () => ({
  db: {
    select: () => ({
      from: () => ({ where: () => ({ limit: async () => (row ? [row] : []) }) }),
    }),
  },
  specials: { photoData: "photoData", photoMimeType: "photoMimeType", boostedUntil: "boostedUntil", id: "id" },
}));
vi.mock("drizzle-orm", () => ({ eq: vi.fn() }));

import { GET } from "./route";

const POSTER = Buffer.from("fake-image-bytes").toString("base64");
const call = (id: string) =>
  GET(new NextRequest(`https://todaystab.com/api/specials/${id}/photo`), { params: Promise.resolve({ id }) });

beforeEach(() => {
  row = undefined;
});

describe("/api/specials/[id]/photo (the paid poster)", () => {
  it("serves the poster while the Boost is active", async () => {
    row = { photoData: POSTER, photoMimeType: "image/jpeg", boostedUntil: new Date(Date.now() + 86_400_000) };
    const res = await call("5");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/jpeg");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(Buffer.from(await res.arrayBuffer()).toString()).toBe("fake-image-bytes");
  });

  it("stops serving it the moment the Boost has lapsed", async () => {
    row = { photoData: POSTER, photoMimeType: "image/jpeg", boostedUntil: new Date(Date.now() - 1000) };
    expect((await call("5")).status).toBe(404);
  });

  it("404 when the special was never boosted", async () => {
    row = { photoData: POSTER, photoMimeType: "image/jpeg", boostedUntil: null };
    expect((await call("5")).status).toBe(404);
  });

  it("404 when there is no poster", async () => {
    row = { photoData: null, photoMimeType: null, boostedUntil: new Date(Date.now() + 86_400_000) };
    expect((await call("5")).status).toBe(404);
  });

  it("refuses to serve an unsafe file type even if one got stored", async () => {
    row = { photoData: POSTER, photoMimeType: "text/html", boostedUntil: new Date(Date.now() + 86_400_000) };
    expect((await call("5")).status).toBe(404);
  });

  it("404 for an unknown special and 400 for a bad id", async () => {
    expect((await call("5")).status).toBe(404);
    expect((await call("abc")).status).toBe(400);
  });
});

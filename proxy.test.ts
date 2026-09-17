import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/admin-auth", () => ({ isAdminAuthed: vi.fn().mockResolvedValue(false) }));
vi.mock("@/lib/regions", () => ({
  getRegionByDomain: vi.fn().mockResolvedValue({ id: 1, slug: "kelowna" }),
  getRegionBySlug: vi.fn().mockResolvedValue(null),
}));

import { proxy } from "./proxy";

describe("proxy legacy-domain redirect", () => {
  it("redirects the legacy domain's homepage to /<slug>", async () => {
    const req = new NextRequest("https://kelownafooddeals.shop/", {
      headers: { host: "kelownafooddeals.shop" },
    });
    const res = await proxy(req);
    expect(res.headers.get("location")).toBe("https://todaystab.com/kelowna");
  });

  it("redirects a legacy-domain page path to /<slug>/<path>, not doubled", async () => {
    const req = new NextRequest("https://kelownafooddeals.shop/events", {
      headers: { host: "kelownafooddeals.shop" },
    });
    const res = await proxy(req);
    expect(res.headers.get("location")).toBe("https://todaystab.com/kelowna/events");
  });

  // The exact regression this covers: a visitor typing kelownafooddeals.shop/kelowna
  // (an easy guess given the domain name) previously got the slug prepended a second
  // time, producing a dead /kelowna/kelowna 404.
  it("does not double the region slug when the visitor already typed it", async () => {
    const req = new NextRequest("https://kelownafooddeals.shop/kelowna", {
      headers: { host: "kelownafooddeals.shop" },
    });
    const res = await proxy(req);
    expect(res.headers.get("location")).toBe("https://todaystab.com/kelowna");
  });

  it("does not double the slug when a sub-path also starts with the slug", async () => {
    const req = new NextRequest("https://kelownafooddeals.shop/kelowna/events", {
      headers: { host: "kelownafooddeals.shop" },
    });
    const res = await proxy(req);
    expect(res.headers.get("location")).toBe("https://todaystab.com/kelowna/events");
  });
});

import { describe, it, expect } from "vitest";
import { safeRedirectPath } from "./safe-redirect";

const SITE = "https://todaystab.com";

describe("safeRedirectPath", () => {
  it("keeps ordinary same-site paths, queries and fragments", () => {
    expect(safeRedirectPath("/", SITE)).toBe("/");
    expect(safeRedirectPath("/kelowna/venues/12", SITE)).toBe("/kelowna/venues/12");
    expect(safeRedirectPath("/kelowna?day=mon#top", SITE)).toBe("/kelowna?day=mon#top");
  });

  it("falls back to / for anything that is not a plain path", () => {
    expect(safeRedirectPath("", SITE)).toBe("/");
    expect(safeRedirectPath("kelowna", SITE)).toBe("/");
    expect(safeRedirectPath("https://evil.example/", SITE)).toBe("/");
    expect(safeRedirectPath("//evil.example", SITE)).toBe("/");
  });

  it("rejects a backslash after the leading slash (parsed as // by WHATWG URL)", () => {
    expect(safeRedirectPath("/\\evil.example", SITE)).toBe("/");
    expect(safeRedirectPath("/\\/evil.example", SITE)).toBe("/");
    expect(safeRedirectPath("/a\\b", SITE)).toBe("/");
  });

  it("rejects tab, newline and other control characters (stripped by the URL parser)", () => {
    expect(safeRedirectPath("/\t/evil.example", SITE)).toBe("/");
    expect(safeRedirectPath("/\n/evil.example", SITE)).toBe("/");
    expect(safeRedirectPath("/\r/evil.example", SITE)).toBe("/");
    expect(safeRedirectPath("/ok\u0000", SITE)).toBe("/");
  });

  it("never returns a path that resolves to a different origin", () => {
    for (const to of ["/\\evil.example", "/\t/evil.example", "//evil.example", "/%2f%2fevil.example"]) {
      const out = safeRedirectPath(to, SITE);
      expect(new URL(out, SITE).origin).toBe(SITE);
    }
  });
});

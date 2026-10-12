import { describe, it, expect } from "vitest";
import { selectSitemapVenues } from "./sitemap-venues";

const d = (s: string) => new Date(s);

describe("selectSitemapVenues", () => {
  it("leaves out venues with no specials and no events", () => {
    const out = selectSitemapVenues([{ id: 1 }, { id: 2 }], new Map(), new Map());
    expect(out).toEqual([]);
  });

  it("includes a venue with specials, dated by its last verification", () => {
    const out = selectSitemapVenues([{ id: 1 }], new Map([[1, d("2026-10-01T00:00:00Z")]]), new Map());
    expect(out).toEqual([{ id: 1, lastModified: d("2026-10-01T00:00:00Z") }]);
  });

  it("includes a venue with only events", () => {
    const out = selectSitemapVenues([{ id: 1 }], new Map(), new Map([[1, d("2026-10-05T00:00:00Z")]]));
    expect(out).toEqual([{ id: 1, lastModified: d("2026-10-05T00:00:00Z") }]);
  });

  it("uses the newer of the specials and events dates", () => {
    const out = selectSitemapVenues([{ id: 1 }], new Map([[1, d("2026-10-01T00:00:00Z")]]), new Map([[1, d("2026-10-09T00:00:00Z")]]));
    expect(out[0].lastModified).toEqual(d("2026-10-09T00:00:00Z"));
  });

  it("never invents a date: a venue with content always carries a real one", () => {
    const out = selectSitemapVenues([{ id: 1 }, { id: 2 }], new Map([[1, d("2026-09-01T00:00:00Z")]]), new Map([[2, d("2026-09-02T00:00:00Z")]]));
    expect(out.map((v) => v.lastModified.toISOString())).toEqual(["2026-09-01T00:00:00.000Z", "2026-09-02T00:00:00.000Z"]);
  });
});

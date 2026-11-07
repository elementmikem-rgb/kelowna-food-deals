import { describe, expect, it } from "vitest";
import {
  classifySession,
  referrerSource,
  summarizeSessions,
  noteMarkers,
  type SessionRow,
} from "./traffic-quality";

function session(over: Partial<SessionRow> = {}): SessionRow {
  return {
    sessionId: "s1",
    visitorId: "v1",
    pageviews: 1,
    referrer: null,
    country: "CA",
    landing: "/regina",
    bucket: "2026-11-07",
    ...over,
  };
}

describe("referrerSource", () => {
  it("reads a full url or a bare host", () => {
    expect(referrerSource("https://www.facebook.com/")).toBe("facebook");
    expect(referrerSource("m.facebook.com")).toBe("facebook");
    expect(referrerSource("https://l.facebook.com/l.php?u=x")).toBe("facebook");
    expect(referrerSource("https://www.google.com/")).toBe("google");
  });
  it("treats an empty or missing referrer as direct", () => {
    expect(referrerSource(null)).toBe("direct");
    expect(referrerSource("")).toBe("direct");
  });
  it("puts everything else under other, and does not match a look-alike host", () => {
    expect(referrerSource("https://duckduckgo.com/")).toBe("other");
    expect(referrerSource("https://notfacebook.example.com/")).toBe("other");
  });
});

describe("classifySession", () => {
  it("flags a single view with no referrer as a likely bot", () => {
    expect(classifySession(session({ referrer: null }))).toBe("bot_no_referrer");
  });
  it("flags a single Facebook-referred view from a Facebook data centre country", () => {
    for (const country of ["US", "IE", "SE"]) {
      expect(classifySession(session({ referrer: "https://www.facebook.com/", country }))).toBe("facebook_link_check");
    }
  });
  it("keeps a Canadian Facebook visitor as likely real", () => {
    expect(classifySession(session({ referrer: "https://m.facebook.com/", country: "CA" }))).toBe("likely_real");
  });
  it("keeps a multi-page Facebook visit from the US as likely real", () => {
    expect(classifySession(session({ referrer: "https://www.facebook.com/", country: "US", pageviews: 3 }))).toBe("likely_real");
  });
  it("does not flag a US visit that came from Google", () => {
    expect(classifySession(session({ referrer: "https://www.google.com/", country: "US" }))).toBe("likely_real");
  });
  it("keeps a no-referrer visit with more than one page", () => {
    expect(classifySession(session({ referrer: null, pageviews: 2 }))).toBe("likely_real");
  });
});

describe("summarizeSessions", () => {
  const rows: SessionRow[] = [
    session({ sessionId: "a", visitorId: "va", referrer: "https://www.facebook.com/", country: "CA", landing: "/penticton/venues/5", pageviews: 2, bucket: "2026-11-07" }),
    session({ sessionId: "b", visitorId: "vb", referrer: "https://www.facebook.com/", country: "US", landing: "/regina", bucket: "2026-11-07" }),
    session({ sessionId: "c", visitorId: "vc", referrer: "https://www.facebook.com/", country: "IE", landing: "/regina", bucket: "2026-11-07" }),
    session({ sessionId: "d", visitorId: "vd", referrer: null, country: "FR", landing: "/", bucket: "2026-11-06" }),
    session({ sessionId: "e", visitorId: "ve", referrer: "https://www.google.com/", country: "CA", landing: "/kelowna", bucket: "2026-11-06" }),
  ];
  const s = summarizeSessions(rows);

  it("counts each class", () => {
    expect(s.sessions).toBe(5);
    expect(s.likelyBot).toBe(1);
    expect(s.facebookLinkCheck).toBe(2);
    expect(s.likelyReal).toBe(2);
  });

  it("splits sessions by source, all and likely real", () => {
    expect(s.sources).toEqual([
      { source: "facebook", all: 3, real: 1 },
      { source: "google", all: 1, real: 1 },
      { source: "other", all: 0, real: 0 },
      { source: "direct", all: 1, real: 0 },
    ]);
  });

  it("builds the Facebook panel by landing region with a Canadian-only count", () => {
    expect(s.facebookByRegion).toEqual([
      { region: "regina", all: 2, likelyReal: 0, canadian: 0 },
      { region: "penticton", all: 1, likelyReal: 1, canadian: 1 },
    ]);
  });

  it("labels the home page landing", () => {
    const home = summarizeSessions([session({ landing: "/", referrer: "https://www.facebook.com/", country: "CA" })]);
    expect(home.facebookByRegion[0].region).toBe("(home)");
  });

  it("builds a likely-real trend with pageviews and distinct visitors per bucket", () => {
    expect(s.realTrend).toEqual([
      { date: "2026-11-06", pageviews: 1, visitors: 1 },
      { date: "2026-11-07", pageviews: 2, visitors: 1 },
    ]);
  });

  it("builds a Canadian Facebook trend per bucket", () => {
    expect(s.facebookCanadianTrend).toEqual([{ date: "2026-11-07", sessions: 1 }]);
  });

  it("handles no sessions", () => {
    const empty = summarizeSessions([]);
    expect(empty.sessions).toBe(0);
    expect(empty.realTrend).toEqual([]);
    expect(empty.facebookByRegion).toEqual([]);
  });
});

describe("noteMarkers", () => {
  const notes = [
    { date: "2026-11-07", label: "FB posts" },
    { date: "2026-10-11", label: "Sitemap trimmed" },
  ];
  it("places a note on the matching day bucket", () => {
    expect(noteMarkers(["2026-11-06", "2026-11-07"], notes)).toEqual([{ index: 1, date: "2026-11-07", label: "FB posts" }]);
  });
  it("ignores hourly buckets, where a day note has no single place", () => {
    expect(noteMarkers(["2026-11-07 09:00", "2026-11-07 10:00"], notes)).toEqual([]);
  });
  it("skips notes outside the window", () => {
    expect(noteMarkers(["2026-11-01"], notes)).toEqual([]);
  });
});

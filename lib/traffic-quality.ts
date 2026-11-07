// Separates real visitors from automated traffic in the analytics page, and builds the
// per-source and Facebook breakdowns. Pure functions over one row per session, so each rule
// is testable without a database. The flags are pattern guesses, not proof for any single
// session; the page labels them "likely" and keeps the raw totals next to them.

export interface SessionRow {
  sessionId: string;
  visitorId: string;
  pageviews: number;
  referrer: string | null;
  country: string | null;
  // The page of the session's first pageview, e.g. "/regina" or "/penticton/venues/5".
  landing: string;
  // The trend bucket (Pacific day or hour) of the session's first pageview.
  bucket: string;
}

export type SessionClass = "bot_no_referrer" | "facebook_link_check" | "likely_real";
export type TrafficSource = "facebook" | "google" | "other" | "direct";

// Facebook's data centres. A single Facebook-referred view from one of these, on a site for
// Canadian towns, matches the link preview and safety checks Facebook runs on a posted link
// (seen 2026-11-07: about 45 of 56 sessions in six hours, each of the five posted regions
// lit up while every post was still waiting for admin approval).
const FACEBOOK_DATA_CENTRE_COUNTRIES = new Set(["US", "IE", "SE"]);

function referrerHost(referrer: string): string {
  return referrer
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, "")
    .split(/[/?#]/)[0];
}

export function referrerSource(referrer: string | null): TrafficSource {
  if (!referrer || !referrer.trim()) return "direct";
  const host = referrerHost(referrer);
  const isHost = (domain: string) => host === domain || host.endsWith(`.${domain}`);
  if (isHost("facebook.com") || isHost("fb.com")) return "facebook";
  if (isHost("google.com") || /^(www\.)?google\.[a-z.]+$/.test(host)) return "google";
  return "other";
}

export function classifySession(s: SessionRow): SessionClass {
  if (s.pageviews === 1 && !s.referrer?.trim()) return "bot_no_referrer";
  if (
    s.pageviews === 1 &&
    referrerSource(s.referrer) === "facebook" &&
    s.country !== null &&
    FACEBOOK_DATA_CENTRE_COUNTRIES.has(s.country)
  ) {
    return "facebook_link_check";
  }
  return "likely_real";
}

export interface TrafficSummary {
  sessions: number;
  likelyBot: number;
  facebookLinkCheck: number;
  likelyReal: number;
  sources: { source: TrafficSource; all: number; real: number }[];
  facebookByRegion: { region: string; all: number; likelyReal: number; canadian: number }[];
  // Likely-real traffic in the same shape as the main trend, so the chart can show it alone.
  // A session's pageviews count in the bucket of its first view.
  realTrend: { date: string; pageviews: number; visitors: number }[];
  facebookCanadianTrend: { date: string; sessions: number }[];
}

const SOURCES: TrafficSource[] = ["facebook", "google", "other", "direct"];

function landingRegion(landing: string): string {
  const first = landing.split("/")[1] ?? "";
  return first || "(home)";
}

export function summarizeSessions(rows: SessionRow[]): TrafficSummary {
  let likelyBot = 0;
  let facebookLinkCheck = 0;
  let likelyReal = 0;
  const sources = new Map<TrafficSource, { all: number; real: number }>(SOURCES.map((s) => [s, { all: 0, real: 0 }]));
  const regions = new Map<string, { all: number; likelyReal: number; canadian: number }>();
  const realBuckets = new Map<string, { pageviews: number; visitors: Set<string> }>();
  const canadianBuckets = new Map<string, number>();

  for (const row of rows) {
    const cls = classifySession(row);
    const source = referrerSource(row.referrer);
    const real = cls === "likely_real";
    if (cls === "bot_no_referrer") likelyBot++;
    else if (cls === "facebook_link_check") facebookLinkCheck++;
    else likelyReal++;

    const src = sources.get(source)!;
    src.all++;
    if (real) src.real++;

    if (real) {
      const b = realBuckets.get(row.bucket) ?? { pageviews: 0, visitors: new Set<string>() };
      b.pageviews += row.pageviews;
      b.visitors.add(row.visitorId);
      realBuckets.set(row.bucket, b);
    }

    if (source === "facebook") {
      const key = landingRegion(row.landing);
      const r = regions.get(key) ?? { all: 0, likelyReal: 0, canadian: 0 };
      r.all++;
      if (real) r.likelyReal++;
      if (real && row.country === "CA") {
        r.canadian++;
        canadianBuckets.set(row.bucket, (canadianBuckets.get(row.bucket) ?? 0) + 1);
      }
      regions.set(key, r);
    }
  }

  return {
    sessions: rows.length,
    likelyBot,
    facebookLinkCheck,
    likelyReal,
    sources: SOURCES.map((source) => ({ source, ...sources.get(source)! })),
    facebookByRegion: [...regions.entries()]
      .map(([region, v]) => ({ region, ...v }))
      .sort((a, b) => b.all - a.all || a.region.localeCompare(b.region)),
    realTrend: [...realBuckets.entries()]
      .map(([date, v]) => ({ date, pageviews: v.pageviews, visitors: v.visitors.size }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    facebookCanadianTrend: [...canadianBuckets.entries()]
      .map(([date, sessions]) => ({ date, sessions }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}

export interface AnalyticsNote {
  date: string; // YYYY-MM-DD, Pacific
  label: string;
}

// Notes only mark day buckets: an hourly chart has no single place for a whole-day note.
export function noteMarkers(
  buckets: string[],
  notes: AnalyticsNote[]
): { index: number; date: string; label: string }[] {
  const out: { index: number; date: string; label: string }[] = [];
  for (const note of notes) {
    const index = buckets.findIndex((b) => b.length === 10 && b === note.date);
    if (index >= 0) out.push({ index, date: note.date, label: note.label });
  }
  return out.sort((a, b) => a.index - b.index);
}

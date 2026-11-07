import type { AnalyticsNote } from "./traffic-quality";

// Days worth marking on the analytics chart, so a bump or a drop has its cause next to it.
// Kept in code, not the database: add a line when a posting day or a site change happens.
// Facebook posting days come from founder/fb-campaign.md; the site changes from the git log
// and Mike (2026-11-07). Dates are Pacific.
export const ANALYTICS_NOTES: AnalyticsNote[] = [
  { date: "2026-09-07", label: "FB posts" },
  { date: "2026-09-12", label: "FB posts" },
  { date: "2026-09-15", label: "FB posts" },
  { date: "2026-09-22", label: "FB posts" },
  { date: "2026-09-23", label: "FB posts" },
  { date: "2026-09-25", label: "FB posts" },
  { date: "2026-09-29", label: "FB posts" },
  { date: "2026-10-03", label: "FB posts" },
  { date: "2026-10-05", label: "FB posts" },
  { date: "2026-10-06", label: "FB posts" },
  { date: "2026-10-08", label: "Venue expansion (Mike)" },
  { date: "2026-10-11", label: "Sitemap cut to venues with content" },
  { date: "2026-10-12", label: "Google traffic drop begins" },
  { date: "2026-10-16", label: "FB posts" },
  { date: "2026-10-26", label: "FB posts" },
  { date: "2026-10-28", label: "FB posts" },
  { date: "2026-10-29", label: "FB posts" },
  { date: "2026-10-30", label: "FB posts" },
  { date: "2026-11-07", label: "FB posts (5, waiting on admin approval)" },
];

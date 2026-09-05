import { db, analyticsEvents } from "@/db";
import { and, gte, lt, eq, sql } from "drizzle-orm";

// Covers common crawlers, bots, HTTP libraries, and AI crawlers — without this,
// blog/SEO content gets crawled far more than it gets actually visited, and
// the analytics would mostly measure bot traffic instead of real people.
const BOT_UA_RE =
  /bot|crawler|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegrambot|discordbot|slackbot|curl|wget|python-requests|axios|go-http-client|headlesschrome|phantomjs|puppeteer|playwright|ahrefsbot|semrushbot|mj12bot|dotbot|petalbot|gptbot|claudebot|anthropic|ccbot|bytespider|amazonbot|applebot/i;

export function isBotUserAgent(userAgent: string | null): boolean {
  if (!userAgent) return true; // no UA at all is almost always a script, not a browser
  return BOT_UA_RE.test(userAgent);
}

interface TrackEventParams {
  eventType: string;
  eventLabel?: string | null;
  page: string;
  sessionId: string;
  visitorId: string;
  referrer?: string | null;
  country?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
}

export async function trackEvent(params: TrackEventParams): Promise<void> {
  await db.insert(analyticsEvents).values({
    eventType: params.eventType,
    eventLabel: params.eventLabel ?? null,
    page: params.page,
    sessionId: params.sessionId,
    visitorId: params.visitorId,
    referrer: params.referrer ?? null,
    country: params.country ?? null,
    utmSource: params.utmSource ?? null,
    utmMedium: params.utmMedium ?? null,
    utmCampaign: params.utmCampaign ?? null,
  });
}

const RETENTION_DAYS = 400;

export async function pruneAnalyticsEvents(): Promise<{ deleted: number }> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  const result = await db
    .delete(analyticsEvents)
    .where(lt(analyticsEvents.createdAt, cutoff))
    .returning({ id: analyticsEvents.id });
  return { deleted: result.length };
}

export interface AnalyticsWindow {
  from: Date;
  to: Date;
}

export function buildWindow(days: number): AnalyticsWindow {
  // Pacific-day boundaries so "today" lines up with what a Kelowna visitor expects.
  const now = new Date();
  const to = new Date(now);
  const from = new Date(now);
  from.setDate(from.getDate() - days);
  return { from, to };
}

export function buildPreviousWindow(window: AnalyticsWindow): AnalyticsWindow {
  const spanMs = window.to.getTime() - window.from.getTime();
  return {
    from: new Date(window.from.getTime() - spanMs),
    to: new Date(window.from.getTime()),
  };
}

export interface AnalyticsStats {
  pageviews: number;
  uniqueVisitors: number;
  sessions: number;
  bounceRate: number; // % of sessions with exactly one pageview
  topPages: { page: string; count: number }[];
  topReferrers: { referrer: string; count: number }[];
  topCountries: { country: string; count: number }[];
  eventCounts: { eventType: string; count: number }[];
  dailyTrend: { date: string; pageviews: number; visitors: number }[];
  previous: {
    pageviews: number;
    uniqueVisitors: number;
    sessions: number;
  };
}

export async function getAnalyticsStats(window: AnalyticsWindow): Promise<AnalyticsStats> {
  const prevWindow = buildPreviousWindow(window);
  const inWindow = and(gte(analyticsEvents.createdAt, window.from), lt(analyticsEvents.createdAt, window.to));
  const inPrevWindow = and(
    gte(analyticsEvents.createdAt, prevWindow.from),
    lt(analyticsEvents.createdAt, prevWindow.to)
  );
  const isPageview = eq(analyticsEvents.eventType, "pageview");

  const [pageviewCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(analyticsEvents)
    .where(and(inWindow, isPageview));

  const [uniqueVisitorCount] = await db
    .select({ count: sql<number>`count(distinct ${analyticsEvents.visitorId})::int` })
    .from(analyticsEvents)
    .where(and(inWindow, isPageview));

  const [sessionCount] = await db
    .select({ count: sql<number>`count(distinct ${analyticsEvents.sessionId})::int` })
    .from(analyticsEvents)
    .where(and(inWindow, isPageview));

  const sessionPageviewCounts = await db
    .select({
      sessionId: analyticsEvents.sessionId,
      count: sql<number>`count(*)::int`,
    })
    .from(analyticsEvents)
    .where(and(inWindow, isPageview))
    .groupBy(analyticsEvents.sessionId);

  const bounceRate =
    sessionPageviewCounts.length > 0
      ? (sessionPageviewCounts.filter((s) => s.count === 1).length / sessionPageviewCounts.length) * 100
      : 0;

  const topPages = await db
    .select({ page: analyticsEvents.page, count: sql<number>`count(*)::int` })
    .from(analyticsEvents)
    .where(and(inWindow, isPageview))
    .groupBy(analyticsEvents.page)
    .orderBy(sql`count(*) desc`)
    .limit(10);

  const topReferrers = await db
    .select({
      referrer: sql<string>`coalesce(nullif(${analyticsEvents.referrer}, ''), 'Direct')`,
      count: sql<number>`count(*)::int`,
    })
    .from(analyticsEvents)
    .where(and(inWindow, isPageview))
    .groupBy(sql`coalesce(nullif(${analyticsEvents.referrer}, ''), 'Direct')`)
    .orderBy(sql`count(*) desc`)
    .limit(10);

  const topCountries = await db
    .select({
      country: sql<string>`coalesce(${analyticsEvents.country}, 'Unknown')`,
      count: sql<number>`count(distinct ${analyticsEvents.visitorId})::int`,
    })
    .from(analyticsEvents)
    .where(and(inWindow, isPageview))
    .groupBy(sql`coalesce(${analyticsEvents.country}, 'Unknown')`)
    .orderBy(sql`count(distinct ${analyticsEvents.visitorId}) desc`)
    .limit(10);

  const eventCounts = await db
    .select({ eventType: analyticsEvents.eventType, count: sql<number>`count(*)::int` })
    .from(analyticsEvents)
    .where(inWindow)
    .groupBy(analyticsEvents.eventType)
    .orderBy(sql`count(*) desc`);

  const dailyTrendRaw = await db
    .select({
      date: sql<string>`to_char(${analyticsEvents.createdAt} at time zone 'America/Vancouver', 'YYYY-MM-DD')`,
      pageviews: sql<number>`count(*)::int`,
      visitors: sql<number>`count(distinct ${analyticsEvents.visitorId})::int`,
    })
    .from(analyticsEvents)
    .where(and(inWindow, isPageview))
    .groupBy(sql`to_char(${analyticsEvents.createdAt} at time zone 'America/Vancouver', 'YYYY-MM-DD')`)
    .orderBy(sql`to_char(${analyticsEvents.createdAt} at time zone 'America/Vancouver', 'YYYY-MM-DD') asc`);

  const [prevPageviewCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(analyticsEvents)
    .where(and(inPrevWindow, isPageview));
  const [prevUniqueVisitorCount] = await db
    .select({ count: sql<number>`count(distinct ${analyticsEvents.visitorId})::int` })
    .from(analyticsEvents)
    .where(and(inPrevWindow, isPageview));
  const [prevSessionCount] = await db
    .select({ count: sql<number>`count(distinct ${analyticsEvents.sessionId})::int` })
    .from(analyticsEvents)
    .where(and(inPrevWindow, isPageview));

  return {
    pageviews: pageviewCount.count,
    uniqueVisitors: uniqueVisitorCount.count,
    sessions: sessionCount.count,
    bounceRate,
    topPages,
    topReferrers,
    topCountries,
    eventCounts,
    dailyTrend: dailyTrendRaw,
    previous: {
      pageviews: prevPageviewCount.count,
      uniqueVisitors: prevUniqueVisitorCount.count,
      sessions: prevSessionCount.count,
    },
  };
}

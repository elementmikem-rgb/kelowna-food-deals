import { db, venues, venueOwners, venueOwnerVenues, regions } from "@/db";
import { and, eq, isNotNull } from "drizzle-orm";
import { getRegionVenueWeeklyViews } from "@/lib/analytics";
import { sendOutreachEmail } from "@/lib/outreach-email";
import { wrapOutreachHtml } from "@/lib/outreach-send";
import { buildDigestUnsubscribeUrl } from "@/lib/owner-digest-unsubscribe";
import type { Language } from "@/lib/i18n";

// Only the top 3 gets the "#N most-viewed" bonus line -- outside that it's not a
// compelling stat, and would just read as an arbitrary/unflattering number.
const RANK_CALLOUT_THRESHOLD = 3;

export interface DigestEmailContent {
  subject: string;
  htmlBody: string;
  textBody: string;
}

function viewsDeltaPhrase(thisWeek: number, lastWeek: number, lang: Language): string {
  // No baseline to compare against -- most often a venue's first tracked week.
  if (lastWeek === 0) return "";
  if (thisWeek > lastWeek) {
    return lang === "fr" ? ` (en hausse par rapport à ${lastWeek})` : ` (up from ${lastWeek})`;
  }
  if (thisWeek < lastWeek) {
    return lang === "fr"
      ? ` (en baisse par rapport à ${lastWeek})`
      : ` (down from ${lastWeek})`;
  }
  return lang === "fr" ? ` (identique à la semaine dernière)` : ` (same as last week)`;
}

export function buildDigestEmail(params: {
  venueName: string;
  venueId: number;
  venueOwnerId: number;
  regionBrandName: string;
  regionMailingAddress: string;
  language: Language;
  thisWeekViews: number;
  lastWeekViews: number;
  rank: number | null;
}): DigestEmailContent {
  const {
    venueName,
    venueId,
    venueOwnerId,
    regionBrandName,
    regionMailingAddress,
    language: lang,
    thisWeekViews,
    lastWeekViews,
    rank,
  } = params;

  const siteUrl = `https://${process.env.PATH_BASED_DOMAIN ?? "todaystab.com"}`;
  const dashboardUrl = `${siteUrl}/owner/venue/${venueId}`;
  const logoUrl = `${siteUrl}/icons/icon-192.png`;
  const unsubscribeUrl = buildDigestUnsubscribeUrl(venueOwnerId);
  const delta = viewsDeltaPhrase(thisWeekViews, lastWeekViews, lang);

  const showRank = rank !== null && rank <= RANK_CALLOUT_THRESHOLD;
  const rankLine = showRank
    ? lang === "fr"
      ? `<p>Vous étiez le <strong>#${rank} établissement le plus consulté</strong> sur ${regionBrandName} cette semaine.</p>`
      : `<p>You were the <strong>#${rank} most-viewed venue</strong> on ${regionBrandName} this week.</p>`
    : "";
  const rankLineText = showRank
    ? lang === "fr"
      ? `Vous étiez le #${rank} établissement le plus consulté sur ${regionBrandName} cette semaine.\n`
      : `You were the #${rank} most-viewed venue on ${regionBrandName} this week.\n`
    : "";

  const subject =
    lang === "fr"
      ? `${venueName} : ${thisWeekViews} vues cette semaine`
      : `${venueName}: ${thisWeekViews} view${thisWeekViews === 1 ? "" : "s"} this week`;

  const bodyHtml =
    lang === "fr"
      ? `
        <p>Voici comment <strong>${venueName}</strong> s'est comporté sur ${regionBrandName} la semaine dernière.</p>
        <p style="font-size:28px;font-weight:700;margin:16px 0 4px;">${thisWeekViews} vue${thisWeekViews === 1 ? "" : "s"}${delta}</p>
        ${rankLine}
        <p><a href="${dashboardUrl}" style="display:inline-block;background:#c14a1f;color:#fffaf0;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Gérer votre fiche</a></p>
      `
      : `
        <p>Here's how <strong>${venueName}</strong> did on ${regionBrandName} last week.</p>
        <p style="font-size:28px;font-weight:700;margin:16px 0 4px;">${thisWeekViews} view${thisWeekViews === 1 ? "" : "s"}${delta}</p>
        ${rankLine}
        <p><a href="${dashboardUrl}" style="display:inline-block;background:#c14a1f;color:#fffaf0;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Manage your listing</a></p>
      `;

  const textBody =
    lang === "fr"
      ? `${venueName} : ${thisWeekViews} vue(s) cette semaine${delta}\n${rankLineText}\nGérer votre fiche : ${dashboardUrl}`
      : `${venueName}: ${thisWeekViews} view(s) this week${delta}\n${rankLineText}\nManage your listing: ${dashboardUrl}`;

  const footerHtml =
    lang === "fr"
      ? `${regionMailingAddress}<br>Vous ne voulez plus recevoir ce résumé hebdomadaire? <a href="${unsubscribeUrl}">Se désabonner</a>.`
      : `${regionMailingAddress}<br>Don't want this weekly summary? <a href="${unsubscribeUrl}">Unsubscribe</a>.`;

  const htmlBody = wrapOutreachHtml(bodyHtml, footerHtml, regionBrandName, logoUrl);
  const footerText =
    lang === "fr"
      ? `${regionMailingAddress}\nSe désabonner : ${unsubscribeUrl}`
      : `${regionMailingAddress}\nUnsubscribe: ${unsubscribeUrl}`;

  return { subject, htmlBody, textBody: `${textBody}\n\n--\n${footerText}` };
}

// Runs once a week (see cron/index.ts's Monday guard). One region-scoped query per
// region per week (getRegionVenueWeeklyViews), not one per venue -- cheap regardless of
// how many claimed venues a region has.
export async function sendWeeklyDigests(): Promise<void> {
  const now = new Date();
  const thisWeekStart = new Date(now);
  thisWeekStart.setUTCDate(thisWeekStart.getUTCDate() - 7);
  const lastWeekStart = new Date(now);
  lastWeekStart.setUTCDate(lastWeekStart.getUTCDate() - 14);

  const activeRegions = await db.select().from(regions).where(eq(regions.active, true));

  for (const region of activeRegions) {
    const claimedVenues = await db
      .select({
        venueId: venues.id,
        venueName: venues.name,
        venueOwnerId: venueOwners.id,
      })
      .from(venues)
      .innerJoin(venueOwnerVenues, eq(venueOwnerVenues.venueId, venues.id))
      .innerJoin(venueOwners, eq(venueOwners.id, venueOwnerVenues.venueOwnerId))
      .where(
        and(
          eq(venues.regionId, region.id),
          isNotNull(venues.claimedAt),
          eq(venueOwners.weeklyDigestOptOut, false)
        )
      );

    if (claimedVenues.length === 0) continue;

    const [thisWeekViews, lastWeekViews] = await Promise.all([
      getRegionVenueWeeklyViews(region.id, thisWeekStart, now),
      getRegionVenueWeeklyViews(region.id, lastWeekStart, thisWeekStart),
    ]);

    // Rank is computed across every claimed venue in the region with at least one view
    // this week (not the region's full venue list) -- ranking a claimed venue against
    // hundreds of unclaimed ones it has no relationship to would be a meaningless stat.
    const ranked = claimedVenues
      .map((v) => ({ ...v, views: thisWeekViews.get(v.venueId) ?? 0 }))
      .filter((v) => v.views > 0)
      .sort((a, b) => b.views - a.views);

    for (const venue of claimedVenues) {
      const views = thisWeekViews.get(venue.venueId) ?? 0;
      if (views === 0) continue; // no email for a quiet week -- see plan's rationale

      const rank = ranked.findIndex((r) => r.venueId === venue.venueId) + 1 || null;

      const { subject, htmlBody, textBody } = buildDigestEmail({
        venueName: venue.venueName,
        venueId: venue.venueId,
        venueOwnerId: venue.venueOwnerId,
        regionBrandName: region.brandName,
        regionMailingAddress: region.mailingAddress,
        language: (region.language as Language) ?? "en",
        thisWeekViews: views,
        lastWeekViews: lastWeekViews.get(venue.venueId) ?? 0,
        rank,
      });

      const [owner] = await db
        .select({ email: venueOwners.email })
        .from(venueOwners)
        .where(eq(venueOwners.id, venue.venueOwnerId))
        .limit(1);
      if (!owner) continue;

      try {
        await sendOutreachEmail({
          to: owner.email,
          subject,
          htmlContent: htmlBody,
          textContent: textBody,
          senderName: region.brandName,
          replyTo: region.domain
            ? `reply@reply.${region.domain}`
            : `reply@reply.${process.env.PATH_BASED_DOMAIN ?? "todaystab.com"}`,
        });
      } catch (err) {
        console.error(`[weekly-digest] failed to send to venue ${venue.venueId}:`, err);
      }
    }
  }
}

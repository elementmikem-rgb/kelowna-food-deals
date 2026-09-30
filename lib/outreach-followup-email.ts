// Follow-up email to venues that already received the first-contact outreach
// (lib/outreach-send.ts) and haven't claimed their listing yet. Separate
// function/template rather than a branch inside sendVenueOutreachEmail so the
// two "kinds" (see outreachSends.kind) never collide with each other's "already
// sent" dedupe check. See docs/superpowers/specs (moat strategy) for why this
// pitches the claim flow + credit system specifically -- decided 2026-09-23,
// timed to this specific outreach list rather than as a standing offer (see the
// honesty note on the 10-credit framing below).
import { db, venues, outreachSends, regions } from "@/db";
import { eq, and } from "drizzle-orm";
import { sendOutreachEmail } from "@/lib/outreach-email";
import { buildUnsubscribeUrl } from "@/lib/unsubscribe";
import { wrapOutreachHtml } from "@/lib/outreach-send";
import type { Language } from "@/lib/i18n";

const FG = "#2a2818";
const MUTED = "#6b654e";
const ACCENT = "#c14a1f";

function buildFooter(unsubscribeUrl: string, mailingAddress: string, language: Language): string {
  return language === "fr"
    ? `${mailingAddress}<br>
        Vous préférez ne plus recevoir ces courriels? <a href="${unsubscribeUrl}" style="color:${MUTED};">Se désabonner</a>.`
    : `${mailingAddress}<br>
        Don't want emails like this? <a href="${unsubscribeUrl}" style="color:${MUTED};">Unsubscribe</a>.`;
}

function buildFooterText(unsubscribeUrl: string, mailingAddress: string, language: Language): string {
  return language === "fr"
    ? `${mailingAddress}\nVous préférez ne plus recevoir ces courriels? Se désabonner : ${unsubscribeUrl}`
    : `${mailingAddress}\nDon't want emails like this? Unsubscribe: ${unsubscribeUrl}`;
}

// Honest framing only -- the 10 free trial credits (lib/credits.ts,
// FREE_TRIAL_CREDITS) don't actually expire once granted. The "this round
// only" line is true today (it really is specific to this outreach list, sent
// once) and must stay true if this template is ever reused for a later batch --
// don't turn this into a fake countdown/deadline. See the 2026-09-23 research
// on FTC dark-patterns guidance before changing this copy.
function buildHtml(
  venueName: string, venueUrl: string, claimUrl: string,
  brandName: string, language: Language
): string {
  return language === "fr" ? `
        <p style="margin:0 0 16px;">Bonjour,</p>
        <p style="margin:0 0 16px;">Au cas où mon courriel se serait perdu -- je vous avais écrit il y a
        quelques semaines pour vous dire que <strong>${venueName}</strong> a une fiche gratuite sur ${brandName} :</p>
        <p style="margin:0 0 20px;">
          <a href="${venueUrl}" style="display:inline-block;background:${ACCENT};color:#fffaf0;text-decoration:none;
          padding:10px 20px;border-radius:999px;font-size:14px;font-weight:bold;">Voir votre fiche</a>
        </p>
        <p style="margin:0 0 16px;">Depuis, on a ajouté deux choses :</p>
        <p style="margin:0 0 16px;"><strong>1. Vous pouvez maintenant réclamer votre fiche</strong> -- ça vous donne un accès direct pour la garder à jour vous-même, sans passer par moi.</p>
        <p style="margin:0 0 16px;"><strong>2. Réclamer votre fiche vous donne 10 crédits gratuits</strong> (10 $ de valeur) à dépenser sur la mise en avant de votre fiche -- par exemple l'épingler en tête de la page d'accueil. C'est spécifique aux commerces de cette liste d'envoi, pas une offre permanente.</p>
        <p style="margin:0 0 20px;">
          <a href="${claimUrl}" style="display:inline-block;background:${ACCENT};color:#fffaf0;text-decoration:none;
          padding:10px 20px;border-radius:999px;font-size:14px;font-weight:bold;">Réclamer ${venueName}</a>
        </p>
        <p style="margin:0 0 16px;">Aucune pression -- si ça ne vous intéresse pas, pas de souci du tout. Et si
        vous avez des questions, répondez simplement ici.</p>
        <p style="margin:24px 0 0;">Merci,<br>Mike</p>
  ` : `
        <p style="margin:0 0 16px;">Hey there,</p>
        <p style="margin:0 0 16px;">In case my last email got buried -- I reached out a little while back to let you know
        <strong>${venueName}</strong> has a free listing on ${brandName}:</p>
        <p style="margin:0 0 20px;">
          <a href="${venueUrl}" style="display:inline-block;background:${ACCENT};color:#fffaf0;text-decoration:none;
          padding:10px 20px;border-radius:999px;font-size:14px;font-weight:bold;">View your listing</a>
        </p>
        <p style="margin:0 0 16px;">Since then we've added two things:</p>
        <p style="margin:0 0 16px;"><strong>1. You can now claim your listing.</strong> That gives you direct access to keep it updated yourself, instead of going through me.</p>
        <p style="margin:0 0 16px;"><strong>2. Claiming gets you 10 free credits</strong> ($10 worth) to spend on promoting your listing -- pinning it to the top of the homepage, for example. This is specific to businesses on this outreach list, not a standing offer.</p>
        <p style="margin:0 0 20px;">
          <a href="${claimUrl}" style="display:inline-block;background:${ACCENT};color:#fffaf0;text-decoration:none;
          padding:10px 20px;border-radius:999px;font-size:14px;font-weight:bold;">Claim ${venueName}</a>
        </p>
        <p style="margin:0 0 16px;">No pressure at all if it's not for you. And if you've got questions, just reply here.</p>
        <p style="margin:24px 0 0;">Thanks,<br>Mike</p>
  `;
}

function buildText(
  venueName: string, venueUrl: string, claimUrl: string, brandName: string, language: Language
): string {
  return language === "fr" ? `
Bonjour,

Au cas où mon courriel se serait perdu -- je vous avais écrit il y a quelques semaines pour vous dire que ${venueName} a une fiche gratuite sur ${brandName} : ${venueUrl}

Depuis, on a ajouté deux choses :
1. Vous pouvez maintenant réclamer votre fiche -- ça vous donne un accès direct pour la garder à jour vous-même, sans passer par moi.
2. Réclamer votre fiche vous donne 10 crédits gratuits (10 $ de valeur) à dépenser sur la mise en avant de votre fiche. C'est spécifique aux commerces de cette liste d'envoi, pas une offre permanente.

Réclamer ${venueName} : ${claimUrl}

Aucune pression -- si ça ne vous intéresse pas, pas de souci du tout. Et si vous avez des questions, répondez simplement ici.

Merci,
Mike
  ` : `
Hey there,

In case my last email got buried -- I reached out a little while back to let you know ${venueName} has a free listing on ${brandName}: ${venueUrl}

Since then we've added two things:
1. You can now claim your listing. That gives you direct access to keep it updated yourself, instead of going through me.
2. Claiming gets you 10 free credits ($10 worth) to spend on promoting your listing -- pinning it to the top of the homepage, for example. This is specific to businesses on this outreach list, not a standing offer.

Claim ${venueName}: ${claimUrl}

No pressure at all if it's not for you. And if you've got questions, just reply here.

Thanks,
Mike
  `;
}

export interface FollowUpSendOutcome {
  ok: boolean;
  reason?: string;
  messageId?: string;
}

export async function sendVenueFollowUpEmail(venueId: number): Promise<FollowUpSendOutcome> {
  const [venue] = await db
    .select({
      id: venues.id,
      name: venues.name,
      contactEmail: venues.contactEmail,
      unsubscribedAt: venues.unsubscribedAt,
      claimedAt: venues.claimedAt,
      regionId: venues.regionId,
    })
    .from(venues)
    .where(eq(venues.id, venueId))
    .limit(1);

  if (!venue || !venue.contactEmail) return { ok: false, reason: "venue has no contact email on file" };
  if (venue.unsubscribedAt) return { ok: false, reason: "venue has unsubscribed from outreach email" };
  if (venue.claimedAt) return { ok: false, reason: "venue already claimed -- no need for the claim pitch" };

  const [firstContact] = await db
    .select({ id: outreachSends.id })
    .from(outreachSends)
    .where(and(eq(outreachSends.venueId, venue.id), eq(outreachSends.kind, "first_contact"), eq(outreachSends.status, "sent")))
    .limit(1);
  if (!firstContact) return { ok: false, reason: "venue never received first-contact outreach" };

  const [alreadyFollowedUp] = await db
    .select({ id: outreachSends.id })
    .from(outreachSends)
    .where(and(eq(outreachSends.venueId, venue.id), eq(outreachSends.kind, "follow_up"), eq(outreachSends.status, "sent")))
    .limit(1);
  if (alreadyFollowedUp) return { ok: false, reason: "already sent this venue a follow-up" };

  const [region] = await db
    .select({
      slug: regions.slug, brandName: regions.brandName, domain: regions.domain,
      language: regions.language, mailingAddress: regions.mailingAddress,
    })
    .from(regions)
    .where(eq(regions.id, venue.regionId))
    .limit(1);
  if (!region) return { ok: false, reason: "venue has no valid region" };

  const lang = (region.language as Language) ?? "en";
  const siteUrl = `https://${process.env.PATH_BASED_DOMAIN ?? "todaystab.com"}`;
  const venueUrl = `${siteUrl}/${region.slug}/venues/${venue.id}`;
  const claimUrl = `${siteUrl}/${region.slug}/venues/${venue.id}/claim`;
  const logoUrl = `${siteUrl}/icons/icon-192.png`;
  const unsubscribeUrl = buildUnsubscribeUrl(venue.id);
  const footer = buildFooter(unsubscribeUrl, region.mailingAddress, lang);
  const footerText = buildFooterText(unsubscribeUrl, region.mailingAddress, lang);

  const subject = lang === "fr"
    ? `Au cas où -- ${venue.name} sur ${region.brandName}`
    : `In case you missed it -- ${venue.name} on ${region.brandName}`;

  const bodyHtml = buildHtml(venue.name, venueUrl, claimUrl, region.brandName, lang);
  const bodyText = buildText(venue.name, venueUrl, claimUrl, region.brandName, lang);
  const htmlBody = wrapOutreachHtml(bodyHtml, footer, region.brandName, logoUrl);
  const textBody = `${bodyText.trim()}\n\n--\n${footerText}`;

  const [sendRow] = await db
    .insert(outreachSends)
    .values({ venueId: venue.id, kind: "follow_up", toEmail: venue.contactEmail, subject, htmlBody, status: "queued" })
    .returning({ id: outreachSends.id });

  try {
    const { messageId } = await sendOutreachEmail({
      to: venue.contactEmail,
      subject,
      htmlContent: htmlBody,
      textContent: textBody,
      senderName: region.brandName,
      replyTo: region.domain
        ? `reply@reply.${region.domain}`
        : `reply@reply.${process.env.PATH_BASED_DOMAIN ?? "todaystab.com"}`,
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
      tags: [`send-${sendRow.id}`],
    });
    await db.update(outreachSends).set({ status: "sent", brevoMessageId: messageId, sentAt: new Date() }).where(eq(outreachSends.id, sendRow.id));
    return { ok: true, messageId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.update(outreachSends).set({ status: "failed", errorMessage: message }).where(eq(outreachSends.id, sendRow.id));
    return { ok: false, reason: message };
  }
}

import { db, venues, outreachSends, specials, events, inboundEmails, blockedSenders } from "@/db";
import { eq, and, or, inArray, sql } from "drizzle-orm";
import { sendOutreachEmail } from "@/lib/outreach-email";
import { buildUnsubscribeUrl } from "@/lib/unsubscribe";
import { buildVenueVerifyUrl } from "@/lib/venue-verify";
import { getRegionById } from "@/lib/regions";
import type { Language } from "@/lib/i18n";

// Inline styles + table layout throughout -- Outlook and older webmail clients strip
// <style> blocks and ignore modern CSS, so anything that has to render consistently
// (brand colors, the logo band, the button) is styled inline on the element itself.
const BG = "#f4ecd8";
const CARD = "#fffaf0";
const FG = "#2a2818";
const MUTED = "#6b654e";
const ACCENT = "#c14a1f";
const ACCENT_DIM = "#8f3315";
const BORDER = "#e4d9bb";

export function wrapOutreachHtml(bodyHtml: string, footer: string, brandName: string, logoUrl: string): string {
  return `
<div style="background:${BG};padding:32px 16px;font-family:Georgia,'Times New Roman',serif;white-space:normal;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;white-space:normal;">
    <tr>
      <td style="padding-bottom:20px;">
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td style="vertical-align:middle;padding-right:10px;">
              <img src="${logoUrl}" width="40" height="40" alt="${brandName}" style="display:block;border-radius:50%;">
            </td>
            <td style="vertical-align:middle;">
              <span style="font-family:Georgia,'Times New Roman',serif;font-size:22px;color:${FG};font-weight:700;">${brandName}</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="background:${CARD};border:1px solid ${BORDER};border-radius:16px;padding:32px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:${FG};">
        ${bodyHtml}
      </td>
    </tr>
    <tr>
      <td style="padding-top:20px;font-family:Helvetica,Arial,sans-serif;font-size:12px;color:${MUTED};line-height:1.6;">
        ${footer}
      </td>
    </tr>
  </table>
</div>
  `;
}

// A/B test (2026-10-09): plain-text-style alternative to the branded HTML card
// below. Cold-email deliverability research (plain-text cold emails get ~2x the
// reply rate of designed HTML in controlled studies -- heavy HTML reads as bulk
// mail to both spam filters and human recipients) motivated this variant: no
// logo, no colored pill buttons, no card background, a single link instead of
// multiple CTAs, and the paid-advertise pitch dropped entirely from first
// contact (save it for a reply/second touch, not a cold open). Minimal inline
// styling only -- just enough that broken HTML doesn't render as a wall of raw
// markup in clients that ignore plain-text parts.
export function wrapPlainOutreachHtml(bodyHtml: string, footer: string): string {
  return `
<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a;max-width:560px;">
  ${bodyHtml}
  <div style="margin-top:24px;font-size:12px;color:#767676;line-height:1.6;">
    ${footer}
  </div>
</div>
  `;
}

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

// Plain-text mirror of buildHasDataHtml/buildEmptyListingHtml -- Brevo sends this as the
// multipart/alternative text/plain part alongside the HTML. Without it, spam filters
// (SpamAssassin's MIME_HTML_ONLY rule) dock points for an HTML-only message.
function buildHasDataText(
  venueName: string, venueUrl: string, verifyUrl: string, advertiseUrl: string,
  brandName: string, language: Language
): string {
  return language === "fr" ? `
Bonjour,

Je gère ${brandName} -- un site qui répertorie les happy hours et les offres bouffe/boisson dans le coin. J'ai ajouté ${venueName} à notre liste : ${venueUrl}

C'est basé sur ce que j'ai trouvé sur votre site, mais je préfère confirmer avec vous plutôt que de me tromper. Confirmer que vos spéciaux sont exacts : ${verifyUrl}

Si vous avez des spéciaux ou des événements qui ne sont pas sur votre site mais que vous voudriez faire savoir aux gens, répondez simplement ici et je les ajoute.

En passant -- si vous vouliez un jour que votre fiche apparaisse en tête de la page d'accueil, ou mettre en avant un spécial ou un menu saisonnier, il y a une option payante pour ça : ${advertiseUrl}. Aucune pression, c'est juste pour vous le signaler.

Merci,
Mike
  ` : `
Hey there,

I run ${brandName} -- a site that tracks happy hours and food/drink deals around the area. I've got ${venueName} listed here: ${venueUrl}

That's built from what I could find on your site, but I'd rather double-check with you than guess wrong. Confirm your specials are accurate: ${verifyUrl}

If you've got specials or events that aren't on your website but you'd want people to know about, just reply here and I'll add them.

Separately -- if you'd ever want your listing to pin to the top of the homepage, or push a specific special or seasonal menu, there's a paid option for that too: ${advertiseUrl}. No pressure either way, just flagging it's there.

Thanks,
Mike
  `;
}

function buildEmptyListingText(
  venueName: string, venueUrl: string, advertiseUrl: string,
  brandName: string, language: Language
): string {
  return language === "fr" ? `
Bonjour,

Je gère ${brandName} -- un site qui répertorie les happy hours et les offres bouffe/boisson dans le coin, et j'aimerais y ajouter ${venueName}. J'ai commencé une fiche pour vous ici : ${venueUrl}

Je n'ai trouvé aucun happy hour, spécial du jour ou événement récurrent publié publiquement pour vous, donc la fiche est vide pour l'instant. Si vous avez quelque chose du genre -- un happy hour, une soirée ailes de poulet, de la musique live, peu importe -- répondez simplement ici avec les détails et je l'ajoute, gratuitement.

Et si vous n'avez rien de tel, pas de souci -- je voulais juste vérifier avant de supposer.

En passant -- si vous vouliez un jour que votre fiche apparaisse en tête de la page d'accueil, ou mettre en avant un spécial ou un menu saisonnier, il y a une option payante pour ça : ${advertiseUrl}. Aucune pression, c'est juste pour vous le signaler.

Merci,
Mike
  ` : `
Hey there,

I run ${brandName} -- a site that tracks happy hours and food/drink deals around the area, and I'd love to feature ${venueName}. I've got a page started for you here: ${venueUrl}

I couldn't find a happy hour, daily special, or recurring event publicly posted anywhere for you yet, so the listing's sitting empty for now. If you run anything like that -- a happy hour, a wing night, live music, whatever -- just reply here with the details and I'll get it added, free.

And if you don't run anything like that, no worries at all -- just figured I'd ask before assuming.

Separately -- if you'd ever want your listing to pin to the top of the homepage, or push a specific special or seasonal menu, there's a paid option for that too: ${advertiseUrl}. No pressure either way, just flagging it's there.

Thanks,
Mike
  `;
}

// Venue has specials/events on file -- ask them to confirm accuracy rather than
// guess wrong, matching the confidence-scored data we scraped/manually verified.
function buildHasDataHtml(
  venueName: string, venueUrl: string, verifyUrl: string, advertiseUrl: string,
  brandName: string, language: Language
): string {
  return language === "fr" ? `
        <p style="margin:0 0 16px;">Bonjour,</p>
        <p style="margin:0 0 16px;">Je gère ${brandName} -- un site qui répertorie les happy hours et les offres
        bouffe/boisson dans le coin. J'ai ajouté <strong>${venueName}</strong> à notre liste :</p>
        <p style="margin:0 0 20px;">
          <a href="${venueUrl}" style="display:inline-block;background:${ACCENT};color:#fffaf0;text-decoration:none;
          padding:10px 20px;border-radius:999px;font-size:14px;font-weight:bold;">Voir votre fiche</a>
        </p>
        <p style="margin:0 0 16px;">C'est basé sur ce que j'ai trouvé sur votre site, mais je préfère confirmer avec
        vous plutôt que de me tromper.</p>
        <p style="margin:0 0 20px;">
          <a href="${verifyUrl}" style="display:inline-block;background:${ACCENT_DIM};color:#fffaf0;text-decoration:none;
          padding:10px 20px;border-radius:999px;font-size:14px;font-weight:bold;">Confirmer que vos spéciaux sont exacts</a>
        </p>
        <p style="margin:0 0 16px;">Si vous avez des spéciaux ou des événements qui ne sont pas sur votre site mais
        que vous voudriez faire savoir aux gens, répondez simplement ici et je les ajoute.</p>
        <p style="margin:0 0 16px;">En passant -- si vous vouliez un jour que votre fiche apparaisse en tête de la page
        d'accueil, ou mettre en avant un spécial ou un menu saisonnier, il y a une option payante pour ça :
        <a href="${advertiseUrl}" style="color:${ACCENT_DIM};">${advertiseUrl}</a>. Aucune pression, c'est juste pour vous le signaler.</p>
        <p style="margin:24px 0 0;">Merci,<br>Mike</p>
  ` : `
        <p style="margin:0 0 16px;">Hey there,</p>
        <p style="margin:0 0 16px;">I run ${brandName} -- a site that tracks happy hours and food/drink deals
        around the area. I've got <strong>${venueName}</strong> listed here:</p>
        <p style="margin:0 0 20px;">
          <a href="${venueUrl}" style="display:inline-block;background:${ACCENT};color:#fffaf0;text-decoration:none;
          padding:10px 20px;border-radius:999px;font-size:14px;font-weight:bold;">View your listing</a>
        </p>
        <p style="margin:0 0 16px;">That's built from what I could find on your site, but I'd rather double-check with you
        than guess wrong.</p>
        <p style="margin:0 0 20px;">
          <a href="${verifyUrl}" style="display:inline-block;background:${ACCENT_DIM};color:#fffaf0;text-decoration:none;
          padding:10px 20px;border-radius:999px;font-size:14px;font-weight:bold;">Confirm your specials are accurate</a>
        </p>
        <p style="margin:0 0 16px;">If you've got specials or events that
        aren't on your website but you'd want people to know about, just reply here and I'll add
        them.</p>
        <p style="margin:0 0 16px;">Separately -- if you'd ever want your listing to pin to the top of the homepage, or
        push a specific special or seasonal menu, there's a paid option for that too:
        <a href="${advertiseUrl}" style="color:${ACCENT_DIM};">${advertiseUrl}</a>. No pressure either way, just flagging it's there.</p>
        <p style="margin:24px 0 0;">Thanks,<br>Mike</p>
  `;
}

// Venue has no specials/events on file yet -- ask them directly rather than
// pretend there's something to "confirm". No verify link since there's
// nothing scraped to verify.
function buildEmptyListingHtml(
  venueName: string, venueUrl: string, advertiseUrl: string,
  brandName: string, language: Language
): string {
  return language === "fr" ? `
        <p style="margin:0 0 16px;">Bonjour,</p>
        <p style="margin:0 0 16px;">Je gère ${brandName} -- un site qui répertorie les happy hours et les offres
        bouffe/boisson dans le coin, et j'aimerais y ajouter <strong>${venueName}</strong>. J'ai commencé une fiche pour vous ici :</p>
        <p style="margin:0 0 20px;">
          <a href="${venueUrl}" style="display:inline-block;background:${ACCENT};color:#fffaf0;text-decoration:none;
          padding:10px 20px;border-radius:999px;font-size:14px;font-weight:bold;">Voir votre fiche</a>
        </p>
        <p style="margin:0 0 16px;">Je n'ai trouvé aucun happy hour, spécial du jour ou événement récurrent publié
        publiquement pour vous, donc la fiche est vide pour l'instant. Si vous avez quelque chose du genre -- un happy
        hour, une soirée ailes de poulet, de la musique live, peu importe -- répondez simplement ici avec les détails
        et je l'ajoute, gratuitement.</p>
        <p style="margin:0 0 16px;">Et si vous n'avez rien de tel, pas de souci -- je voulais juste vérifier avant de
        supposer.</p>
        <p style="margin:0 0 16px;">En passant -- si vous vouliez un jour que votre fiche apparaisse en tête de la page
        d'accueil, ou mettre en avant un spécial ou un menu saisonnier, il y a une option payante pour ça :
        <a href="${advertiseUrl}" style="color:${ACCENT_DIM};">${advertiseUrl}</a>. Aucune pression, c'est juste pour vous le signaler.</p>
        <p style="margin:24px 0 0;">Merci,<br>Mike</p>
  ` : `
        <p style="margin:0 0 16px;">Hey there,</p>
        <p style="margin:0 0 16px;">I run ${brandName} -- a site that tracks happy hours and food/drink deals
        around the area, and I'd love to feature <strong>${venueName}</strong>. I've got a page started for you here:</p>
        <p style="margin:0 0 20px;">
          <a href="${venueUrl}" style="display:inline-block;background:${ACCENT};color:#fffaf0;text-decoration:none;
          padding:10px 20px;border-radius:999px;font-size:14px;font-weight:bold;">View your listing</a>
        </p>
        <p style="margin:0 0 16px;">I couldn't find a happy hour, daily special, or recurring event
        publicly posted anywhere for you yet, so the listing's sitting empty for now. If you run
        anything like that -- a happy hour, a wing night, live music, whatever -- just reply here
        with the details and I'll get it added, free.</p>
        <p style="margin:0 0 16px;">And if you don't run anything like that, no worries at all --
        just figured I'd ask before assuming.</p>
        <p style="margin:0 0 16px;">Separately -- if you'd ever want your listing to pin to the top of the homepage, or
        push a specific special or seasonal menu, there's a paid option for that too:
        <a href="${advertiseUrl}" style="color:${ACCENT_DIM};">${advertiseUrl}</a>. No pressure either way, just flagging it's there.</p>
        <p style="margin:24px 0 0;">Thanks,<br>Mike</p>
  `;
}

// --- "plain" A/B variant (2026-10-09) -------------------------------------
// Single link, question-based close, no advertise upsell in the cold open.
// See wrapPlainOutreachHtml's comment for why.

function buildHasDataPlainSubject(venueName: string, language: Language): string {
  return language === "fr" ? `une question rapide sur ${venueName}` : `quick question about ${venueName}`;
}

function buildEmptyListingPlainSubject(venueName: string, language: Language): string {
  return language === "fr"
    ? `${venueName} offre-t-il un happy hour ou des spéciaux?`
    : `does ${venueName} run a happy hour or specials?`;
}

function buildHasDataPlainText(venueName: string, venueUrl: string, brandName: string, language: Language): string {
  return language === "fr" ? `
Bonjour,

J'ai ajouté ${venueName} à ${brandName}, un site de happy hours et spéciaux bouffe/boisson du coin, basé sur ce que j'ai trouvé sur votre site : ${venueUrl}

Est-ce encore exact, ou est-ce que ça a changé?

Si vous avez des spéciaux ou événements qui ne sont pas affichés ailleurs, répondez simplement et je les ajoute.

Merci,
Mike
  ` : `
Hey,

I listed ${venueName} on ${brandName}, a local happy hour/specials site, based on what I found on your website: ${venueUrl}

Is that still accurate, or has anything changed?

If you've got specials or events that aren't posted anywhere, just reply and I'll add them.

Thanks,
Mike
  `;
}

function buildEmptyListingPlainText(venueName: string, venueUrl: string, brandName: string, language: Language): string {
  return language === "fr" ? `
Bonjour,

Je gère ${brandName}, un site de happy hours et spéciaux bouffe/boisson du coin, et j'ai commencé une fiche pour ${venueName} ici : ${venueUrl}

Je n'ai trouvé aucun happy hour, spécial ou événement récurrent publié pour vous -- avez-vous quelque chose du genre?

Si oui, répondez avec les détails et je l'ajoute, gratuitement. Sinon, pas de souci, je voulais juste vérifier.

Merci,
Mike
  ` : `
Hey,

I run ${brandName}, a local happy hour/specials site, and started a page for ${venueName} here: ${venueUrl}

I couldn't find a happy hour, daily special, or recurring event posted anywhere for you -- do you run anything like that?

If so, just reply with the details and I'll add it, free. If not, no worries, just wanted to check.

Thanks,
Mike
  `;
}

function buildHasDataPlainHtml(venueName: string, venueUrl: string, brandName: string, language: Language): string {
  return language === "fr" ? `
    <p style="margin:0 0 16px;">Bonjour,</p>
    <p style="margin:0 0 16px;">J'ai ajouté <strong>${venueName}</strong> à ${brandName}, un site de happy hours et
    spéciaux bouffe/boisson du coin, basé sur ce que j'ai trouvé sur votre site :
    <a href="${venueUrl}" style="color:#1a1a1a;">${venueUrl}</a></p>
    <p style="margin:0 0 16px;">Est-ce encore exact, ou est-ce que ça a changé?</p>
    <p style="margin:0 0 16px;">Si vous avez des spéciaux ou événements qui ne sont pas affichés ailleurs, répondez
    simplement et je les ajoute.</p>
    <p style="margin:16px 0 0;">Merci,<br>Mike</p>
  ` : `
    <p style="margin:0 0 16px;">Hey,</p>
    <p style="margin:0 0 16px;">I listed <strong>${venueName}</strong> on ${brandName}, a local happy hour/specials
    site, based on what I found on your website: <a href="${venueUrl}" style="color:#1a1a1a;">${venueUrl}</a></p>
    <p style="margin:0 0 16px;">Is that still accurate, or has anything changed?</p>
    <p style="margin:0 0 16px;">If you've got specials or events that aren't posted anywhere, just reply and I'll
    add them.</p>
    <p style="margin:16px 0 0;">Thanks,<br>Mike</p>
  `;
}

function buildEmptyListingPlainHtml(venueName: string, venueUrl: string, brandName: string, language: Language): string {
  return language === "fr" ? `
    <p style="margin:0 0 16px;">Bonjour,</p>
    <p style="margin:0 0 16px;">Je gère ${brandName}, un site de happy hours et spéciaux bouffe/boisson du coin, et
    j'ai commencé une fiche pour <strong>${venueName}</strong> ici :
    <a href="${venueUrl}" style="color:#1a1a1a;">${venueUrl}</a></p>
    <p style="margin:0 0 16px;">Je n'ai trouvé aucun happy hour, spécial ou événement récurrent publié pour vous --
    avez-vous quelque chose du genre?</p>
    <p style="margin:0 0 16px;">Si oui, répondez avec les détails et je l'ajoute, gratuitement. Sinon, pas de souci,
    je voulais juste vérifier.</p>
    <p style="margin:16px 0 0;">Merci,<br>Mike</p>
  ` : `
    <p style="margin:0 0 16px;">Hey,</p>
    <p style="margin:0 0 16px;">I run ${brandName}, a local happy hour/specials site, and started a page for
    <strong>${venueName}</strong> here: <a href="${venueUrl}" style="color:#1a1a1a;">${venueUrl}</a></p>
    <p style="margin:0 0 16px;">I couldn't find a happy hour, daily special, or recurring event posted anywhere for
    you -- do you run anything like that?</p>
    <p style="margin:0 0 16px;">If so, just reply with the details and I'll add it, free. If not, no worries, just
    wanted to check.</p>
    <p style="margin:16px 0 0;">Thanks,<br>Mike</p>
  `;
}

export interface OutreachSendOutcome {
  ok: boolean;
  reason?: string;
  messageId?: string;
}

// Shared by both the admin UI's one-at-a-time send route
// (app/api/admin/outreach/send/route.ts) and any batch-sending script, so the
// two variants (has-data vs empty-listing) and all the guard checks live in
// exactly one place instead of drifting apart. Branches on whether the venue
// currently has any specials/events on file -- a venue with real data gets
// asked to confirm it; an empty one gets asked directly for its specials.
export async function sendVenueOutreachEmail(venueId: number): Promise<OutreachSendOutcome> {
  const [venue] = await db
    .select({
      id: venues.id,
      name: venues.name,
      contactEmail: venues.contactEmail,
      unsubscribedAt: venues.unsubscribedAt,
      regionId: venues.regionId,
    })
    .from(venues)
    .where(eq(venues.id, venueId))
    .limit(1);

  if (!venue || !venue.contactEmail) return { ok: false, reason: "venue has no contact email on file" };
  if (venue.unsubscribedAt) return { ok: false, reason: "venue has unsubscribed from outreach email" };

  const region = await getRegionById(venue.regionId);
  if (!region) return { ok: false, reason: "venue has no valid region" };

  // Never send a second first-contact email to the same INBOX. Matches by address (not just
  // venue id) because chains and near-duplicate venue rows share one contactEmail, and counts
  // "replied" and "bounced" as already-contacted -- a webhook flips a "sent" row to "replied",
  // so checking only status "sent" would re-email people who wrote back (and re-send to
  // addresses that bounced).
  const [alreadyContacted] = await db
    .select({ id: outreachSends.id })
    .from(outreachSends)
    .where(
      and(
        or(eq(outreachSends.venueId, venue.id), sql`lower(${outreachSends.toEmail}) = lower(${venue.contactEmail})`),
        inArray(outreachSends.status, ["sent", "replied", "bounced"])
      )
    )
    .limit(1);
  if (alreadyContacted) return { ok: false, reason: "already contacted (sent, replied or bounced) at this venue or email address" };

  const [wroteToUs] = await db
    .select({ id: inboundEmails.id })
    .from(inboundEmails)
    .where(sql`lower(${inboundEmails.fromEmail}) = lower(${venue.contactEmail})`)
    .limit(1);
  if (wroteToUs) return { ok: false, reason: "this address has already written to us" };

  const [blocked] = await db
    .select({ id: blockedSenders.id })
    .from(blockedSenders)
    .where(sql`lower(${blockedSenders.email}) = lower(${venue.contactEmail})`)
    .limit(1);
  if (blocked) return { ok: false, reason: "this address is on the blocked senders list" };

  const [hasSpecial] = await db.select({ id: specials.id }).from(specials).where(eq(specials.venueId, venue.id)).limit(1);
  const [hasEvent] = await db.select({ id: events.id }).from(events).where(eq(events.venueId, venue.id)).limit(1);
  const hasData = Boolean(hasSpecial || hasEvent);

  const lang = (region.language as Language) ?? "en";
  const siteUrl = `https://${process.env.PATH_BASED_DOMAIN ?? "todaystab.com"}`;
  const venueUrl = `${siteUrl}/${region.slug}/venues/${venue.id}`;
  const advertiseUrl = `${siteUrl}/${region.slug}/advertise`;
  const logoUrl = `${siteUrl}/icons/icon-192.png`;
  const unsubscribeUrl = buildUnsubscribeUrl(venue.id);
  const footer = buildFooter(unsubscribeUrl, region.mailingAddress, lang);
  const footerText = buildFooterText(unsubscribeUrl, region.mailingAddress, lang);

  // A/B test (2026-10-09): deterministic by venue id parity, not random per
  // call -- a retried send (e.g. after a transient Brevo failure) must land
  // the same variant it would have gotten the first time, not re-roll into
  // the other bucket. See wrapPlainOutreachHtml's comment for why "plain"
  // exists; see outreachSends.variant's schema comment for how results get
  // compared later.
  const variant: "branded" | "plain" = venue.id % 2 === 0 ? "branded" : "plain";

  const verifyUrl = buildVenueVerifyUrl(venue.id, region.slug);

  let subject: string;
  let bodyHtml: string;
  let bodyText: string;
  if (variant === "branded") {
    subject = hasData
      ? (lang === "fr" ? `Un mot rapide sur ${venue.name} -- ${region.brandName}` : `Quick one about ${venue.name} on ${region.brandName}`)
      : (lang === "fr" ? `J'ai commencé une fiche pour ${venue.name} sur ${region.brandName}` : `Got a listing started for ${venue.name} on ${region.brandName}`);
    bodyHtml = hasData
      ? buildHasDataHtml(venue.name, venueUrl, verifyUrl, advertiseUrl, region.brandName, lang)
      : buildEmptyListingHtml(venue.name, venueUrl, advertiseUrl, region.brandName, lang);
    bodyText = hasData
      ? buildHasDataText(venue.name, venueUrl, verifyUrl, advertiseUrl, region.brandName, lang)
      : buildEmptyListingText(venue.name, venueUrl, advertiseUrl, region.brandName, lang);
  } else {
    subject = hasData
      ? buildHasDataPlainSubject(venue.name, lang)
      : buildEmptyListingPlainSubject(venue.name, lang);
    bodyHtml = hasData
      ? buildHasDataPlainHtml(venue.name, venueUrl, region.brandName, lang)
      : buildEmptyListingPlainHtml(venue.name, venueUrl, region.brandName, lang);
    bodyText = hasData
      ? buildHasDataPlainText(venue.name, venueUrl, region.brandName, lang)
      : buildEmptyListingPlainText(venue.name, venueUrl, region.brandName, lang);
  }

  const htmlBody = variant === "branded" ? wrapOutreachHtml(bodyHtml, footer, region.brandName, logoUrl) : wrapPlainOutreachHtml(bodyHtml, footer);
  const textBody = `${bodyText.trim()}\n\n--\n${footerText}`;

  const [sendRow] = await db
    .insert(outreachSends)
    .values({ venueId: venue.id, toEmail: venue.contactEmail, subject, htmlBody, status: "queued", variant })
    .returning({ id: outreachSends.id });

  try {
    const { messageId } = await sendOutreachEmail({
      to: venue.contactEmail,
      subject,
      htmlContent: htmlBody,
      textContent: textBody,
      senderName: region.brandName,
      // A legacy region (its own domain, e.g. kelownafooddeals.shop) uses that domain's
      // own reply.<domain> inbound route; every other region shares one inbound route on
      // the consolidated domain instead. Both are real, registered Brevo inbound-parsing
      // domains wired to the same /api/webhooks/brevo-inbound/[token] route -- unlike the
      // literal "admin@todaystab.com" this used to fall back to, which had no inbound
      // webhook registered for it at all and silently swallowed every reply sent there
      // (confirmed live 2026-09-17: Brevo accepted the mail via MX but had nowhere to
      // deliver it, which is almost certainly why a venue reported "the reply email
      // address is broken").
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

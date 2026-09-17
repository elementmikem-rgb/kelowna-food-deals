// Cold-sales email templates pitching the paid placements (Featured / Boost / Category
// Sponsor) to venues that already have a live, free listing. Separate from
// buildOutreachHtml in app/api/admin/outreach/send/route.ts, which is the one-touch
// "here's your free listing, mind confirming it" email sent once per venue on first
// contact -- these are a short follow-up sales sequence sent later, to venues who
// already have real data live (so there's something concrete to point at).
//
// Structure follows the same CASL-required shape as buildOutreachHtml: sender identity,
// mailing address, one-click unsubscribe. Not yet wired to a send route/admin button --
// intentionally just the content for now. See feedback_cold_email_principles in Mike's
// memory for the sales reasoning behind the specific choices here (subject length,
// single CTA, no-pressure close, etc.) before editing this copy.

import type { Language } from "@/lib/i18n";

const BG = "#f4ecd8";
const CARD = "#fffaf0";
const FG = "#2a2818";
const MUTED = "#6b654e";
const ACCENT = "#c14a1f";
const BORDER = "#e4d9bb";

function wrap(
  brandName: string,
  logoUrl: string,
  bodyHtml: string,
  mailingAddress: string,
  unsubscribeUrl: string,
  language: Language = "en"
): string {
  const footerText = language === "fr"
    ? `${mailingAddress}<br>\n        Vous préférez ne plus recevoir ces courriels? <a href="${unsubscribeUrl}" style="color:${MUTED};">Se désabonner</a>.`
    : `${mailingAddress}<br>\n        Don't want emails like this? <a href="${unsubscribeUrl}" style="color:${MUTED};">Unsubscribe</a>.`;

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
        ${footerText}
      </td>
    </tr>
  </table>
</div>
  `;
}

interface PitchParams {
  venueName: string;
  venueId: number;
  regionSlug: string;
  brandName: string;
  mailingAddress: string;
  unsubscribeUrl: string;
  // Real, specific numbers beat generic claims -- pass whatever's actually true for
  // this venue/region. Omit a stat entirely (don't fabricate a placeholder) if it
  // isn't known; the templates degrade gracefully without it.
  regionMonthlyVisitors?: number;
  // Language of the region this email is going to. Defaults to "en" so existing
  // callers need no change -- only Quebec-region sends pass "fr".
  language?: Language;
}

// Email 1 of 2. Subject kept short (under ~45 chars) and specific -- no "$" or "free"
// in it, both common spam-filter/skepticism triggers for a business inbox. Body is a
// single clear ask (Featured) rather than listing all three products -- cold email
// converts better on one decision than a menu of three.
export function buildFeaturedPitchHtml(p: PitchParams): { subject: string; html: string } {
  const lang: Language = p.language ?? "en";
  const siteUrl = `https://${process.env.PATH_BASED_DOMAIN ?? "todaystab.com"}`;
  const venueUrl = `${siteUrl}/${p.regionSlug}/venues/${p.venueId}`;
  const advertiseUrl = `${siteUrl}/${p.regionSlug}/advertise`;
  const logoUrl = `${siteUrl}/icons/icon-192.png`;

  if (lang === "fr") {
    const proofLineFr = p.regionMonthlyVisitors
      ? `<p style="margin:0 0 16px;">${p.brandName} reçoit environ ${p.regionMonthlyVisitors.toLocaleString("fr-CA")} visites par mois de gens qui cherchent où sortir ce soir — en ce moment, ce trafic atterrit sur l'établissement que le tirage quotidien met au sommet.</p>`
      : `<p style="margin:0 0 16px;">En ce moment, la position de <strong>${p.venueName}</strong> sur la page d'accueil est déterminée par un tirage quotidien — les mêmes chances que toutes les autres fiches.</p>`;

    const bodyFr = `
    <p style="margin:0 0 16px;">Bonjour,</p>
    <p style="margin:0 0 16px;"><strong>${p.venueName}</strong> est déjà en ligne sur ${p.brandName} :
    <a href="${venueUrl}" style="color:${ACCENT};">votre fiche</a>.</p>
    ${proofLineFr}
    <p style="margin:0 0 20px;">Le placement Featured épingle votre fiche en tête chaque jour pendant toute la durée de la campagne, avec un badge doré, pour 3 $/jour. Aucune conception nécessaire, pas de contrat — choisissez vos dates et c'est en ligne le jour même.</p>
    <p style="margin:0 0 20px;">
      <a href="${advertiseUrl}" style="display:inline-block;background:${ACCENT};color:#fffaf0;text-decoration:none;
      padding:10px 20px;border-radius:999px;font-size:14px;font-weight:bold;">Voir les tarifs Featured</a>
    </p>
    <p style="margin:0 0 16px;">Si ce n'est pas utile pour l'instant, pas de problème — je voulais juste vous le faire savoir.</p>
    <p style="margin:24px 0 0;">Merci,<br>Mike</p>
  `;

    return {
      subject: `${p.venueName} — en tête de liste?`,
      html: wrap(p.brandName, logoUrl, bodyFr, p.mailingAddress, p.unsubscribeUrl, lang),
    };
  }

  const proofLine = p.regionMonthlyVisitors
    ? `<p style="margin:0 0 16px;">${p.brandName} gets around ${p.regionMonthlyVisitors.toLocaleString()} visits a month from people deciding where to go tonight — right now that traffic lands on whichever venue the daily shuffle happens to put on top.</p>`
    : `<p style="margin:0 0 16px;">Right now, where <strong>${p.venueName}</strong> lands on the homepage is a daily shuffle — same odds as every other listing.</p>`;

  const body = `
    <p style="margin:0 0 16px;">Hey,</p>
    <p style="margin:0 0 16px;"><strong>${p.venueName}</strong> is already live on ${p.brandName}:
    <a href="${venueUrl}" style="color:${ACCENT};">your listing</a>.</p>
    ${proofLine}
    <p style="margin:0 0 20px;">Featured placement pins your card to the top every day for as long as it runs, with a gold badge, for $3/day. No design work, no contract — pick your dates and it's live same day.</p>
    <p style="margin:0 0 20px;">
      <a href="${advertiseUrl}" style="display:inline-block;background:${ACCENT};color:#fffaf0;text-decoration:none;
      padding:10px 20px;border-radius:999px;font-size:14px;font-weight:bold;">See Featured pricing</a>
    </p>
    <p style="margin:0 0 16px;">If it's not useful right now, no worries at all — just wanted you to know it's there.</p>
    <p style="margin:24px 0 0;">Thanks,<br>Mike</p>
  `;

  return {
    subject: `${p.venueName} — top of the list?`,
    html: wrap(p.brandName, logoUrl, body, p.mailingAddress, p.unsubscribeUrl, lang),
  };
}

// Email 2 of 2 (send ~5-7 days after Email 1, only to venues who didn't reply or buy).
// Deliberately much shorter than the first -- a follow-up that's longer than the
// original reads as pushy. One new angle (a specific event/special, if they have one
// live, makes Boost concretely relevant) rather than repeating the same pitch.
export function buildFollowUpPitchHtml(
  p: PitchParams & { specificSpecialOrEventTitle?: string }
): { subject: string; html: string } {
  const lang: Language = p.language ?? "en";
  const siteUrl = `https://${process.env.PATH_BASED_DOMAIN ?? "todaystab.com"}`;
  const advertiseUrl = `${siteUrl}/${p.regionSlug}/advertise`;
  const logoUrl = `${siteUrl}/icons/icon-192.png`;

  if (lang === "fr") {
    const bodyFr = p.specificSpecialOrEventTitle
      ? `
    <p style="margin:0 0 16px;">Petit suivi —</p>
    <p style="margin:0 0 16px;">Puisque ${p.venueName} a déjà <strong>${p.specificSpecialOrEventTitle}</strong> en ligne, un Boost pourrait mettre juste cet élément en avant pour ses dates — 2 $/jour, sans engagement continu.</p>
    <p style="margin:0 0 20px;">
      <a href="${advertiseUrl}" style="display:inline-block;background:${ACCENT};color:#fffaf0;text-decoration:none;
      padding:10px 20px;border-radius:999px;font-size:14px;font-weight:bold;">Jeter un coup d'oeil</a>
    </p>
    <p style="margin:0;">Autrement, ça me va aussi — merci dans tous les cas.</p>
  `
      : `
    <p style="margin:0 0 16px;">Petit suivi sur la note Featured de la semaine dernière —</p>
    <p style="margin:0 0 20px;">Pas de problème si ce n'est pas le bon moment. Si un jour vous voulez que ${p.venueName} soit épinglé en tête, la mise en place prend deux minutes : <a href="${advertiseUrl}" style="color:${ACCENT};">${advertiseUrl}</a></p>
    <p style="margin:0;">Dans tous les cas, merci de faire partie du site.</p>
  `;

    return {
      subject: `Suivi — ${p.venueName}`,
      html: wrap(p.brandName, logoUrl, bodyFr, p.mailingAddress, p.unsubscribeUrl, lang),
    };
  }

  const body = p.specificSpecialOrEventTitle
    ? `
    <p style="margin:0 0 16px;">Quick follow-up —</p>
    <p style="margin:0 0 16px;">Since ${p.venueName} already has <strong>${p.specificSpecialOrEventTitle}</strong> listed, a Boost would put just that one item top billing for its dates — $2/day, no ongoing commitment.</p>
    <p style="margin:0 0 20px;">
      <a href="${advertiseUrl}" style="display:inline-block;background:${ACCENT};color:#fffaf0;text-decoration:none;
      padding:10px 20px;border-radius:999px;font-size:14px;font-weight:bold;">Take a look</a>
    </p>
    <p style="margin:0;">Otherwise, happy to leave it be — thanks either way.</p>
  `
    : `
    <p style="margin:0 0 16px;">Quick follow-up on the Featured note from last week —</p>
    <p style="margin:0 0 20px;">Totally fine if it's not the right time. If you ever want ${p.venueName} pinned to the top, it's a two-minute setup: <a href="${advertiseUrl}" style="color:${ACCENT};">${advertiseUrl}</a></p>
    <p style="margin:0;">Either way, thanks for being part of the site.</p>
  `;

  return {
    subject: `Following up — ${p.venueName}`,
    html: wrap(p.brandName, logoUrl, body, p.mailingAddress, p.unsubscribeUrl, lang),
  };
}

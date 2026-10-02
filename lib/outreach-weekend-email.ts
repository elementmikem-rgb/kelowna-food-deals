// "Weekend" promo email -- sent once to every active venue with a contact email that
// hasn't unsubscribed or claimed their listing yet, regardless of whether they already
// got first_contact/follow_up outreach before (see outreachSends.kind: "weekend_promo"
// is its own kind so it never collides with those dedupe checks). Decided 2026-10-02:
// reminds venues to keep their listing accurate, offers the reply-with-updates path,
// pitches claiming (now a real self-serve flow for specials/events/photo updates --
// see app/owner/venue/[id]/page.tsx), and the same "this list only" 10 free credits
// framing as the follow-up template. See that file's comment on why the credit framing
// must stay honest (no fake countdown) if this template is ever reused later.
import { db, venues, outreachSends, regions } from "@/db";
import { eq, and } from "drizzle-orm";
import { sendOutreachEmail } from "@/lib/outreach-email";
import { buildUnsubscribeUrl } from "@/lib/unsubscribe";
import { wrapOutreachHtml } from "@/lib/outreach-send";
import type { Language } from "@/lib/i18n";

const ACCENT = "#c14a1f";

function buildFooter(unsubscribeUrl: string, mailingAddress: string, language: Language): string {
  return language === "fr"
    ? `${mailingAddress}<br>
        Vous préférez ne plus recevoir ces courriels? <a href="${unsubscribeUrl}" style="color:#6b654e;">Se désabonner</a>.`
    : `${mailingAddress}<br>
        Don't want emails like this? <a href="${unsubscribeUrl}" style="color:#6b654e;">Unsubscribe</a>.`;
}

function buildFooterText(unsubscribeUrl: string, mailingAddress: string, language: Language): string {
  return language === "fr"
    ? `${mailingAddress}\nVous préférez ne plus recevoir ces courriels? Se désabonner : ${unsubscribeUrl}`
    : `${mailingAddress}\nDon't want emails like this? Unsubscribe: ${unsubscribeUrl}`;
}

function buildHtml(
  venueName: string, city: string, venueUrl: string, claimUrl: string, replyNote: string,
  brandName: string, language: Language
): string {
  return language === "fr" ? `
        <p style="margin:0 0 16px;">Bonjour,</p>
        <p style="margin:0 0 16px;">Vendredi après-midi -- ce qui veut dire que les gens de ${city} commencent à
        consulter ${brandName} pour savoir où aller ce soir.</p>
        <p style="margin:0 0 16px;">Petite faveur : <a href="${venueUrl}" style="color:${ACCENT};font-weight:bold;">vérifiez votre fiche</a> et
        assurez-vous qu'elle est toujours exacte -- spéciaux, événements, tout. Les choses changent, et on préfère que ce soit vous qui le remarquiez plutôt qu'un client affamé.</p>
        <p style="margin:0 0 16px;">La façon la plus simple de corriger quoi que ce soit : ${replyNote}</p>
        <p style="margin:0 0 20px;">
          Ou, encore mieux -- <a href="${claimUrl}" style="display:inline-block;background:${ACCENT};color:#fffaf0;text-decoration:none;
          padding:10px 20px;border-radius:999px;font-size:14px;font-weight:bold;">réclamez ${venueName}</a>. Ça prend deux
          minutes, et une fois connecté vous pouvez tout mettre à jour vous-même -- ajouter ou modifier des spéciaux et
          des événements, et même téléverser une vraie photo de votre établissement.</p>
        <p style="margin:0 0 16px;">Cette semaine, ça vient aussi avec un bonus : <strong>10 crédits gratuits</strong> (10 $ de valeur) à
        dépenser comme vous voulez -- épingler votre fiche en tête de la page d'accueil pour la fin de semaine, mettre en
        avant un spécial du vendredi, peu importe. C'est spécifique aux commerces de cette liste, pas une offre permanente.</p>
        <p style="margin:0 0 16px;">Aucune pression. Passez une bonne fin de semaine.</p>
        <p style="margin:24px 0 0;">Mike</p>
  ` : `
        <p style="margin:0 0 16px;">Hey there,</p>
        <p style="margin:0 0 16px;">Friday afternoon -- which means ${city} diners are about to start checking
        ${brandName} to figure out where to go tonight.</p>
        <p style="margin:0 0 16px;">Quick favor: <a href="${venueUrl}" style="color:${ACCENT};font-weight:bold;">check your listing</a> and make sure
        it's still accurate -- specials, events, all of it. Things change, and we'd rather you catch it than a hungry
        customer does.</p>
        <p style="margin:0 0 16px;">${replyNote}</p>
        <p style="margin:0 0 20px;">
          Or, better yet -- <a href="${claimUrl}" style="display:inline-block;background:${ACCENT};color:#fffaf0;text-decoration:none;
          padding:10px 20px;border-radius:999px;font-size:14px;font-weight:bold;">claim ${venueName}</a>. Takes two minutes,
          and once you're in you can update everything yourself -- add or edit specials and events, and even upload a
          real photo of your place.</p>
        <p style="margin:0 0 16px;">This week it also comes with something extra: <strong>10 free credits</strong> ($10 worth) to spend
        however you want -- pin yourself to the top of the homepage for the weekend, boost a Friday special, whatever
        gets people in the door. This is specific to businesses on this list, not a standing offer.</p>
        <p style="margin:0 0 16px;">No pressure either way. Have a good one.</p>
        <p style="margin:24px 0 0;">Mike</p>
  `;
}

function buildText(
  venueName: string, city: string, venueUrl: string, claimUrl: string, replyNoteText: string,
  brandName: string, language: Language
): string {
  return language === "fr" ? `
Bonjour,

Vendredi après-midi -- ce qui veut dire que les gens de ${city} commencent à consulter ${brandName} pour savoir où aller ce soir.

Petite faveur : vérifiez votre fiche (${venueUrl}) et assurez-vous qu'elle est toujours exacte -- spéciaux, événements, tout.

${replyNoteText}

Ou, encore mieux -- réclamez ${venueName} : ${claimUrl}
Ça prend deux minutes, et une fois connecté vous pouvez tout mettre à jour vous-même, photo incluse.

Cette semaine, ça vient aussi avec 10 crédits gratuits (10 $ de valeur) à dépenser comme vous voulez. Spécifique à cette liste, pas une offre permanente.

Aucune pression. Passez une bonne fin de semaine.

Mike
  ` : `
Hey there,

Friday afternoon -- which means ${city} diners are about to start checking ${brandName} to figure out where to go tonight.

Quick favor: check your listing (${venueUrl}) and make sure it's still accurate -- specials, events, all of it.

${replyNoteText}

Or, better yet -- claim ${venueName}: ${claimUrl}
Takes two minutes, and once you're in you can update everything yourself, photo included.

This week it also comes with 10 free credits ($10 worth) to spend however you want. Specific to this list, not a standing offer.

No pressure either way. Have a good one.

Mike
  `;
}

export interface WeekendSendOutcome {
  ok: boolean;
  reason?: string;
  messageId?: string;
}

export async function sendVenueWeekendEmail(venueId: number): Promise<WeekendSendOutcome> {
  const [venue] = await db
    .select({
      id: venues.id,
      name: venues.name,
      city: venues.city,
      contactEmail: venues.contactEmail,
      unsubscribedAt: venues.unsubscribedAt,
      claimedAt: venues.claimedAt,
      active: venues.active,
      regionId: venues.regionId,
    })
    .from(venues)
    .where(eq(venues.id, venueId))
    .limit(1);

  if (!venue || !venue.active) return { ok: false, reason: "venue not found or inactive" };
  if (!venue.contactEmail) return { ok: false, reason: "venue has no contact email on file" };
  if (venue.unsubscribedAt) return { ok: false, reason: "venue has unsubscribed from outreach email" };
  if (venue.claimedAt) return { ok: false, reason: "venue already claimed" };

  const [alreadySent] = await db
    .select({ id: outreachSends.id })
    .from(outreachSends)
    .where(and(eq(outreachSends.venueId, venue.id), eq(outreachSends.kind, "weekend_promo"), eq(outreachSends.status, "sent")))
    .limit(1);
  if (alreadySent) return { ok: false, reason: "already sent this venue the weekend promo" };

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
  const city = venue.city ?? region.brandName.split(" ")[0];

  const replyNote =
    lang === "fr"
      ? `répondez simplement à ce courriel avec vos spéciaux, événements, ou même une photo -- je m'en occupe moi-même.`
      : `Easiest way to fix anything: just reply to this email with what's wrong or what's new -- a special, an event, even a photo -- and I'll get it sorted myself.`;

  const subject = lang === "fr"
    ? `Votre fin de semaine commence -- ${venue.name} est-il à jour?`
    : `Your weekend starts now -- is ${venue.name} ready?`;

  const bodyHtml = buildHtml(venue.name, city, venueUrl, claimUrl, replyNote, region.brandName, lang);
  const bodyText = buildText(venue.name, city, venueUrl, claimUrl, replyNote, region.brandName, lang);
  const htmlBody = wrapOutreachHtml(bodyHtml, footer, region.brandName, logoUrl);
  const textBody = `${bodyText.trim()}\n\n--\n${footerText}`;

  const [sendRow] = await db
    .insert(outreachSends)
    .values({ venueId: venue.id, kind: "weekend_promo", toEmail: venue.contactEmail, subject, htmlBody, status: "queued" })
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

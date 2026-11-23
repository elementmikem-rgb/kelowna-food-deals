
// The reminder sent to claimed owners who still have their free credit. English and French (formal vous). It only
// says what the product pages and code say: Featured pins the listing to the top of the homepage and events boards,
// a Boost puts one special or event at the front, credit needs no card and does not expire, and every booking is
// reviewed before it goes live. No prices beyond the $10, no results or reach claims, and no dashes, per house style.

const ACCENT = "#c14a1f";

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Names are stored as typed. An all-capitals name (3 or more letters) would read as shouting in a greeting, so it is
// softened to a leading capital. Anything else, including names like McKenzie or initials like DJ, is left alone.
export function tidyFirstName(name: string): string {
  const n = name.trim();
  if (n.length < 3 || n !== n.toLocaleUpperCase() || n === n.toLocaleLowerCase()) return n;
  return n
    .toLocaleLowerCase()
    .replace(/(^|[-' ])(\p{L})/gu, (_m, sep: string, ch: string) => sep + ch.toLocaleUpperCase());
}

export interface CreditNudgeInput {
  lang: "en" | "fr";
  firstName: string;
  venueName: string;
  dashboardUrl: string;
}

export interface CreditNudge {
  subject: string;
  html: string;
  text: string;
}

const COPY = {
  en: {
    subject: (venue: string) => `You have $10 in free credit waiting, ${venue}`,
    greeting: (name: string) => (name ? `Hi ${name},` : "Hi,"),
    p1: (venue: string) => `You have $10 in free credit on your ${venue} listing that is still unused.`,
    p2: "It pays for Featured (your listing pins to the top of the homepage and events boards) or a Boost (puts one special or event at the front). No card needed: it comes straight off your balance. $10 covers a few days of either. I review each one before it goes live.",
    button: "Use my credit",
    p3: "It takes about two minutes from your dashboard. No pressure, and it does not expire.",
    signoff: "Thanks,",
  },
  fr: {
    subject: (venue: string) => `Vous avez 10 $ de crédit gratuit, ${venue}`,
    greeting: (name: string) => (name ? `Bonjour ${name},` : "Bonjour,"),
    p1: (venue: string) => `Vous avez 10 $ de crédit gratuit, encore inutilisé, sur la fiche de ${venue}.`,
    p2: "Il sert à payer une mise en vedette (votre fiche reste en haut de la page d'accueil et du tableau des événements) ou un coup de pouce (met un spécial ou un événement en avant). Aucune carte requise : le montant est simplement déduit de votre solde. 10 $ couvre quelques jours de l'un ou l'autre. J'examine chaque demande avant sa mise en ligne.",
    button: "Utiliser mon crédit",
    p3: "Cela prend environ deux minutes depuis votre tableau de bord. Aucune pression, et le crédit n'expire pas.",
    signoff: "Merci,",
  },
} as const;

export function buildCreditNudge(i: CreditNudgeInput): CreditNudge {
  const c = COPY[i.lang];
  const venueHtml = escapeHtml(i.venueName);
  const nameHtml = escapeHtml(i.firstName);
  const html = `
    <p style="margin:0 0 16px;">${c.greeting(nameHtml)}</p>
    <p style="margin:0 0 16px;">${c.p1(`<strong>${venueHtml}</strong>`)}</p>
    <p style="margin:0 0 16px;">${c.p2}</p>
    <p style="margin:0 0 20px;">
      <a href="${i.dashboardUrl}" style="display:inline-block;background:${ACCENT};color:#fffaf0;text-decoration:none;
      padding:10px 20px;border-radius:999px;font-size:14px;font-weight:bold;">${c.button}</a>
    </p>
    <p style="margin:0 0 16px;">${c.p3}</p>
    <p style="margin:24px 0 0;">${c.signoff}<br>Mike</p>
  `;
  const text = `${c.greeting(i.firstName)}

${c.p1(i.venueName)}

${c.p2}

${c.button}: ${i.dashboardUrl}

${c.p3}

${c.signoff}
Mike`;
  return { subject: c.subject(i.venueName), html, text };
}

export function creditNudgeFooter(lang: "en" | "fr", mailingAddress: string, unsubscribeUrl: string): { html: string; text: string } {
  const muted = "#6b654e";
  if (lang === "fr") {
    return {
      html: `${mailingAddress}<br>Vous ne souhaitez plus recevoir ces courriels? <a href="${unsubscribeUrl}" style="color:${muted};">Se désabonner</a>.`,
      text: `${mailingAddress}\nVous ne souhaitez plus recevoir ces courriels? Se désabonner: ${unsubscribeUrl}`,
    };
  }
  return {
    html: `${mailingAddress}<br>Don't want emails like this? <a href="${unsubscribeUrl}" style="color:${muted};">Unsubscribe</a>.`,
    text: `${mailingAddress}\nDon't want emails like this? Unsubscribe: ${unsubscribeUrl}`,
  };
}

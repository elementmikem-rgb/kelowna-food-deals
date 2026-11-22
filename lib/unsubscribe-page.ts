// The page behind the unsubscribe link in outreach emails.
//
// A plain GET must NOT unsubscribe anyone: corporate mail scanners follow every link in an email within seconds, and
// that silently dropped real prospects (audit 2026-11-22: 42 of 72 unsubscribes came within 5 minutes of delivery, 20
// within 30 seconds). So a GET shows this confirmation page, and only the button (a POST) unsubscribes. A mail
// provider's native one-click button POSTs "List-Unsubscribe=One-Click" and is handled separately by the route.

export type UnsubscribeState = "confirm" | "done" | "invalid";
// "outreach" is the cold-outreach link; "digest" is the weekly listing stats email sent to owners who claimed a venue.
export type UnsubscribeKind = "outreach" | "digest";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const TEXT = {
  en: {
    confirmTitle: "Unsubscribe?",
    confirmBody: (brand: string) => `Click the button to stop emails from ${brand}.`,
    button: "Unsubscribe",
    doneTitle: "You are unsubscribed",
    doneBody: (brand: string) => `You have been unsubscribed. ${brand} will not email this address again.`,
    invalidTitle: "This link is not valid",
    invalidBody: "The unsubscribe link is invalid or incomplete. Reply to the email and we will remove you.",
  },
  fr: {
    confirmTitle: "Se désabonner?",
    confirmBody: (brand: string) => `Cliquez sur le bouton pour ne plus recevoir de courriels de ${brand}.`,
    button: "Se désabonner",
    doneTitle: "Vous êtes désabonné",
    doneBody: (brand: string) => `Vous avez été désabonné. ${brand} ne vous enverra plus de courriels à cette adresse.`,
    invalidTitle: "Ce lien n'est pas valide",
    invalidBody: "Le lien de désabonnement est invalide ou incomplet. Répondez au courriel et nous vous retirerons.",
  },
} as const;

const DIGEST_TEXT = {
  en: {
    confirmBody: (brand: string) => `Click the button to stop the weekly listing stats emails from ${brand}.`,
    doneBody: (brand: string) => `You have been unsubscribed from the weekly listing stats emails from ${brand}.`,
  },
  fr: {
    confirmBody: (brand: string) => `Cliquez sur le bouton pour ne plus recevoir le résumé hebdomadaire de votre fiche de ${brand}.`,
    doneBody: (brand: string) => `Vous êtes désabonné du résumé hebdomadaire de votre fiche de ${brand}.`,
  },
} as const;

export function renderUnsubscribePage(args: {
  state: UnsubscribeState;
  brand: string;
  language: "en" | "fr";
  action?: string;
  kind?: UnsubscribeKind;
}): string {
  const t = TEXT[args.language];
  const d = DIGEST_TEXT[args.language];
  const digest = args.kind === "digest";
  const brand = esc(args.brand);
  const title = args.state === "confirm" ? t.confirmTitle : args.state === "done" ? t.doneTitle : t.invalidTitle;
  const body =
    args.state === "confirm"
      ? (digest ? d.confirmBody(brand) : t.confirmBody(brand))
      : args.state === "done"
        ? (digest ? d.doneBody(brand) : t.doneBody(brand))
        : t.invalidBody;
  const form =
    args.state === "confirm"
      ? `<form method="post" action="${esc(args.action ?? "")}"><input type="hidden" name="confirm" value="1"><button type="submit">${t.button}</button></form>`
      : "";
  return `<!doctype html>
<html lang="${args.language}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(title)}</title>
<style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f4ecd8;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#2b2a22}
main{max-width:420px;margin:24px;padding:32px;background:#fffbf0;border:1px solid #ecdcac;border-radius:16px;text-align:center}
h1{font-size:22px;margin:0 0 12px}
p{line-height:1.5;margin:0 0 20px}
button{background:#b94a24;color:#fff;border:0;border-radius:999px;padding:12px 28px;font-size:16px;cursor:pointer}
</style>
</head>
<body>
<main>
<h1>${esc(title)}</h1>
<p>${body}</p>
${form}
</main>
</body>
</html>`;
}

// The button posts "confirm=1". A mail provider's one-click unsubscribe (RFC 8058) posts "List-Unsubscribe=One-Click".
export function isFormConfirmation(body: string): boolean {
  return /(^|&)confirm=1(&|$)/.test(body);
}

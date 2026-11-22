export interface Snippet {
  id: string;
  label: string;
  lang: "en" | "fr";
  body: string;
  // Only offered when the venue has claimed its listing (an owner, not a cold contact).
  claimedOnly?: boolean;
}

// Canned reply snippets for the admin inbox.
// Variables: {{name}}, {{venue}}, {{link}}, {{owner_link}} (the owner login page).
// Rules: plain and warm, one ask per snippet, no emojis, no em dashes, signed Mike.
// French uses proper accents and formal vous.
export const SNIPPETS: Snippet[] = [
  // 1. Thanks -- added to listing
  {
    id: "en-thanks-added",
    label: "Thanks -- added to listing",
    lang: "en",
    body: `Hi {{name}},

Thanks for getting in touch. I have added {{venue}} to the listing at {{link}}.

Let me know if anything looks off.

Mike`,
  },
  {
    id: "fr-thanks-added",
    label: "Merci -- ajouté à la liste",
    lang: "fr",
    body: `Bonjour {{name}},

Merci de nous avoir contactés. J'ai ajouté {{venue}} à notre liste sur {{link}}.

N'hésitez pas à nous écrire si quelque chose ne vous convient pas.

Mike`,
  },

  // 2. Ask for happy hour / specials times
  {
    id: "en-ask-times",
    label: "Ask for happy hour / specials times",
    lang: "en",
    body: `Hi {{name}},

Could you share the happy hour or specials schedule for {{venue}}? I want to make sure the listing has the right times.

Mike`,
  },
  {
    id: "fr-ask-times",
    label: "Demander les horaires des spéciaux",
    lang: "fr",
    body: `Bonjour {{name}},

Pourriez-vous partager les horaires de l'heure heureuse ou des spéciaux pour {{venue}}? Je voudrais m'assurer que la liste indique les bonnes heures.

Mike`,
  },

  // 3. Ask for photos
  {
    id: "en-ask-photos",
    label: "Ask for photos",
    lang: "en",
    body: `Hi {{name}},

Do you have any photos of {{venue}} you would be willing to share? A good photo makes a big difference on the listing.

Mike`,
  },
  {
    id: "fr-ask-photos",
    label: "Demander des photos",
    lang: "fr",
    body: `Bonjour {{name}},

Auriez-vous des photos de {{venue}} que vous pourriez partager? Une belle photo fait toute la différence sur la liste.

Mike`,
  },

  // 4. Ask to confirm phone number
  {
    id: "en-ask-phone",
    label: "Ask to confirm phone number",
    lang: "en",
    body: `Hi {{name}},

Could you confirm the best phone number for {{venue}}? I want to make sure the listing is current.

Mike`,
  },
  {
    id: "fr-ask-phone",
    label: "Confirmer le numéro de téléphone",
    lang: "fr",
    body: `Bonjour {{name}},

Pourriez-vous confirmer le meilleur numéro de téléphone pour {{venue}}? Je veux m'assurer que la liste est à jour.

Mike`,
  },

  // 5. Thanks -- will follow up
  {
    id: "en-thanks-followup",
    label: "Thanks -- will follow up",
    lang: "en",
    body: `Hi {{name}},

Thanks for getting back to me. I will follow up once I have more details.

Mike`,
  },
  {
    id: "fr-thanks-followup",
    label: "Merci -- je reviens vers vous",
    lang: "fr",
    body: `Bonjour {{name}},

Merci pour votre réponse. Je vous recontacterai quand j'aurai plus de détails.

Mike`,
  },

  // 6. No worries -- removed from list
  {
    id: "en-removed",
    label: "No worries -- removed from list",
    lang: "en",
    body: `Hi {{name}},

No worries at all. I have removed {{venue}} from our outreach list and you will not hear from us again.

Mike`,
  },
  {
    id: "fr-removed",
    label: "Pas de souci -- retiré de la liste",
    lang: "fr",
    body: `Bonjour {{name}},

Pas de souci. J'ai retiré {{venue}} de notre liste et vous ne recevrez plus de messages de notre part.

Mike`,
  },
  // 7. Thanks for the photo, poster offer (claimed owners only).
  // Promises only what was verified on 2026-11-22: a poster shows on that special's card while the Boost runs,
  // and every Boost is reviewed before it goes live. No price and no reach claims.
  {
    id: "en-photo-poster-offer",
    label: "Thanks for the photo, poster offer (owners)",
    lang: "en",
    claimedOnly: true,
    body: `Hi {{name}},

Thanks for sending the photo. It is now on the {{venue}} listing.

If you would like a poster to show on the card of one of your specials, you can add it when you boost that special from your dashboard: {{owner_link}}

The poster shows on that special's card while the Boost is running. I review each Boost before it goes live.

Mike`,
  },
  {
    id: "fr-photo-poster-offer",
    label: "Merci pour la photo, offre d'affiche (propriétaires)",
    lang: "fr",
    claimedOnly: true,
    body: `Bonjour {{name}},

Merci pour la photo. Elle figure maintenant sur la fiche de {{venue}}.

Si vous souhaitez qu'une affiche s'affiche sur la carte d'un de vos spéciaux, vous pouvez l'ajouter en lançant un coup de pouce pour ce spécial depuis votre tableau de bord : {{owner_link}}

L'affiche apparaît sur la carte de ce spécial tant que le coup de pouce est actif. J'examine chaque coup de pouce avant sa mise en ligne.

Mike`,
  },
];

export function snippetsFor(lang: "en" | "fr", opts: { claimed?: boolean } = {}): Snippet[] {
  return SNIPPETS.filter((s) => s.lang === lang && (!s.claimedOnly || opts.claimed === true));
}

// The owner login page lives at the site root, not under a region, so build it from the venue page's origin.
export function ownerLoginUrl(venueUrl: string | null | undefined): string | null {
  if (!venueUrl) return null;
  try {
    return `${new URL(venueUrl).origin}/owner/login`;
  } catch {
    return null;
  }
}

export function fillSnippet(
  body: string,
  vars: { name?: string; venue?: string; link?: string; ownerLink?: string }
): string {
  let result = body;

  // Replace known variables with provided values, or empty string if absent.
  // Unknown variables (e.g. {{city}}) are left untouched because we only
  // replace the three known keys.
  result = result.replaceAll("{{name}}", vars.name ?? "");
  result = result.replaceAll("{{venue}}", vars.venue ?? "");
  result = result.replaceAll("{{link}}", vars.link ?? "");
  result = result.replaceAll("{{owner_link}}", vars.ownerLink ?? "");

  // When name was not provided (or empty), the greeting becomes "Hi ," or
  // "Bonjour ," -- tighten those up to "Hi," / "Bonjour,".
  if (!vars.name) {
    result = result.replace(/^Hi ,/m, "Hi,");
    result = result.replace(/^Bonjour ,/m, "Bonjour,");
  }

  return result;
}

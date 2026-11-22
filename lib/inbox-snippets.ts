export interface Snippet {
  id: string;
  label: string;
  lang: "en" | "fr";
  body: string;
}

// Canned reply snippets for the admin inbox.
// Variables: {{name}}, {{venue}}, {{link}}.
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
];

export function snippetsFor(lang: "en" | "fr"): Snippet[] {
  return SNIPPETS.filter((s) => s.lang === lang);
}

export function fillSnippet(
  body: string,
  vars: { name?: string; venue?: string; link?: string }
): string {
  let result = body;

  // Replace known variables with provided values, or empty string if absent.
  // Unknown variables (e.g. {{city}}) are left untouched because we only
  // replace the three known keys.
  result = result.replaceAll("{{name}}", vars.name ?? "");
  result = result.replaceAll("{{venue}}", vars.venue ?? "");
  result = result.replaceAll("{{link}}", vars.link ?? "");

  // When name was not provided (or empty), the greeting becomes "Hi ," or
  // "Bonjour ," -- tighten those up to "Hi," / "Bonjour,".
  if (!vars.name) {
    result = result.replace(/^Hi ,/m, "Hi,");
    result = result.replace(/^Bonjour ,/m, "Bonjour,");
  }

  return result;
}

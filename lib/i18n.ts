// Small dictionary-based i18n, not a full library -- there are only two
// languages and no plural-form complexity, so no need for ICU/plurals or a
// real locale negotiator. Every call site takes a `lang: Language` param and
// looks up its string here.
//
// `regions.language` (db/schema.ts) is the region's CANONICAL language --
// what a crawler with no cookie sees, and what <html lang>/OG locale always
// report (see app/layout.tsx, app/[region]/layout.tsx) so search engines get
// one consistent signal per URL regardless of who's asking. A visitor's
// EFFECTIVE language (what's actually rendered to them) can differ from that
// via getEffectiveLanguage() below -- an explicit toggle click (a `lang-pref`
// cookie) or a same-request Accept-Language guess. Every page that renders
// visible UI text should call getEffectiveLanguage(region), not read
// region.language directly; generateMetadata functions are the one
// exception -- they intentionally keep reading region.language directly to
// stay canonical.
export type Language = "en" | "fr";

export const strings = {
  en: {
    nav: {
      specials: "Specials",
      events: "Events",
      monthly: "Monthly",
    },
    dayTabs: {
      thisWeekend: "This Weekend",
    },
    filters: {
      label: "Filters",
      searchPlaceholder: "Search venues…",
      searchAriaLabel: "Search venues",
      clearSearchAriaLabel: "Clear search",
      allCategories: "All",
      allCities: "All areas",
      allTypes: "All",
    },
    card: {
      confirmDeal: "Confirm this deal",
      reportIncorrect: "Report incorrect",
      checkedVerifiedToday: "✓ checked verified today",
      fullDetails: (venueName: string) => `${venueName} — full menu, hours, and details`,
    },
    footer: {
      tellUs: "See something wrong or missing? Tell us",
      blog: "Blog",
      archive: "Archive",
      advertise: "Advertise with us",
      tipJar: "Tip jar",
      privacy: "Privacy & terms",
    },
    emptyState: {
      noSpecials: "No specials found for this day/category yet.",
      noSpecialsSearch: (q: string) => `No venue matching "${q}" has a special for this day/category.`,
      noEvents: "No recurring events found for this day/type yet.",
      noEventsSearch: (q: string) => `No venue matching "${q}" has a recurring event for this day/type.`,
      noUpcoming: "No events found for that date.",
      noUpcomingSearch: (q: string, dated: boolean) =>
        `No venue matching "${q}" has an upcoming event${dated ? " on that date" : ""}.`,
    },
    tip: {
      nudge: "Found this useful? Leave a tip →",
      heading: "Enjoying this?",
      body: "This site is a one-person project, checked and kept accurate by hand. If it saved you a trip across town, a tip helps keep it running.",
    },
    about: {
      heading: "About this site",
      submitLink: "submit an update",
      submitTrailer: "page — every tip gets checked before it goes live.",
      seeWrong: "See something wrong, or a place we're missing? Use the",
    },
    verified: {
      badge: "verified",
      subtitle: "What's actually on today — verified, not guessed.",
    },
  },
  fr: {
    nav: {
      specials: "Spéciaux",
      events: "Événements",
      monthly: "Mensuel",
    },
    dayTabs: {
      thisWeekend: "Cette fin de semaine",
    },
    filters: {
      label: "Filtres",
      searchPlaceholder: "Rechercher un établissement…",
      searchAriaLabel: "Rechercher un établissement",
      clearSearchAriaLabel: "Effacer la recherche",
      allCategories: "Tous",
      allCities: "Tous les secteurs",
      allTypes: "Tous",
    },
    card: {
      confirmDeal: "Confirmer cette offre",
      reportIncorrect: "Signaler une erreur",
      checkedVerifiedToday: "✓ vérifié aujourd'hui",
      fullDetails: (venueName: string) => `${venueName} — menu complet, horaires et détails`,
    },
    footer: {
      tellUs: "Une erreur ou un oubli? Dites-le-nous",
      blog: "Blogue",
      archive: "Archives",
      advertise: "Annoncez avec nous",
      tipJar: "Pourboire",
      privacy: "Confidentialité et conditions",
    },
    emptyState: {
      noSpecials: "Aucun spécial trouvé pour ce jour/cette catégorie pour l'instant.",
      noSpecialsSearch: (q: string) =>
        `Aucun établissement correspondant à « ${q} » n'a de spécial pour ce jour/cette catégorie.`,
      noEvents: "Aucun événement récurrent trouvé pour ce jour/type pour l'instant.",
      noEventsSearch: (q: string) =>
        `Aucun établissement correspondant à « ${q} » n'a d'événement récurrent pour ce jour/type.`,
      noUpcoming: "Aucun événement trouvé pour cette date.",
      noUpcomingSearch: (q: string, dated: boolean) =>
        `Aucun établissement correspondant à « ${q} » n'a d'événement à venir${dated ? " à cette date" : ""}.`,
    },
    tip: {
      nudge: "Ça vous a été utile? Laissez un pourboire →",
      heading: "Vous aimez ce que vous voyez?",
      body: "Ce site est un projet d'une seule personne, vérifié et tenu à jour à la main. S'il vous a évité un déplacement inutile, un pourboire aide à le garder en ligne.",
    },
    about: {
      heading: "À propos de ce site",
      submitLink: "soumettre une mise à jour",
      submitTrailer: "— chaque suggestion est vérifiée avant d'être publiée.",
      seeWrong: "Une erreur, ou un endroit qui manque? Utilisez la page",
    },
    verified: {
      badge: "vérifié",
      subtitle: "Ce qui se passe vraiment aujourd'hui — vérifié, pas deviné.",
    },
  },
} as const;

export function t(lang: Language) {
  return strings[lang];
}

export const CATEGORY_LABELS: Record<Language, Record<string, string>> = {
  en: {
    happy_hour: "Happy Hour",
    food_special: "Food Special",
    wing_night: "Wing Night",
    other: "Other",
  },
  fr: {
    happy_hour: "Happy Hour",
    food_special: "Spécial repas",
    wing_night: "Soirée ailes de poulet",
    other: "Autre",
  },
};

export const EVENT_TYPE_LABELS: Record<Language, Record<string, string>> = {
  en: {
    live_music: "Live Music",
    trivia: "Trivia",
    karaoke: "Karaoke",
    sports_night: "Sports Night",
    other: "Other",
  },
  fr: {
    live_music: "Musique live",
    trivia: "Jeu-questionnaire",
    karaoke: "Karaoké",
    sports_night: "Soirée sportive",
    other: "Autre",
  },
};

const DOW_FULL: Record<Language, readonly string[]> = {
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  fr: ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"],
};

const DOW_SHORT: Record<Language, readonly string[]> = {
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  fr: ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"],
};

export function dowFullNameLocalized(dow: number, lang: Language): string {
  return DOW_FULL[lang][dow] ?? (lang === "fr" ? "Inconnu" : "Unknown");
}

export function dowShortNameLocalized(dow: number, lang: Language): string {
  return DOW_SHORT[lang][dow] ?? "?";
}

const LANG_COOKIE = "lang-pref";

function isLanguage(value: string | undefined): value is Language {
  return value === "en" || value === "fr";
}

// Parses a raw `Accept-Language` header (e.g. "fr-CA,fr;q=0.9,en;q=0.8") into
// whichever of our two supported languages the browser weights higher.
// Anything other than en/fr in the header is ignored -- we only ever have
// two dictionaries, there's no "closest match" to fall back to.
function detectFromAcceptLanguage(header: string | null): Language | null {
  if (!header) return null;
  const weighted = header
    .split(",")
    .map((part) => {
      const [tagRaw, qRaw] = part.trim().split(";q=");
      const tag = tagRaw?.trim().toLowerCase();
      const q = qRaw ? parseFloat(qRaw) : 1;
      return { tag, q: Number.isNaN(q) ? 1 : q };
    })
    .filter((entry) => entry.tag)
    .sort((a, b) => b.q - a.q);
  for (const { tag } of weighted) {
    if (tag!.startsWith("fr")) return "fr";
    if (tag!.startsWith("en")) return "en";
  }
  return null;
}

// The language actually rendered to THIS visitor, as opposed to
// `region.language` (the canonical language <html lang>/OG metadata always
// report -- see the module comment above). Resolution order:
//   1. An explicit `lang-pref` cookie -- set only when the visitor clicks the
//      FR/EN toggle (see app/api/lang/set/route.ts), never by auto-detection
//      alone, so a one-off ambiguous browser header can never "stick" as a
//      wrong permanent guess.
//   2. The request's Accept-Language header, re-evaluated fresh on every
//      request with no cookie -- cheap and stateless, and self-corrects if
//      the visitor's browser language ever changes.
//   3. region.language, same as always.
// Must be called from a server component/route that can read cookies()/
// headers() (i.e. anywhere already calling getCurrentRegion() can call this).
export async function getEffectiveLanguage(region: { language: string }): Promise<Language> {
  const { cookies, headers } = await import("next/headers");
  const cookieStore = await cookies();
  const cookieLang = cookieStore.get(LANG_COOKIE)?.value;
  if (isLanguage(cookieLang)) return cookieLang;

  const detected = detectFromAcceptLanguage((await headers()).get("accept-language"));
  if (detected) return detected;

  return isLanguage(region.language) ? region.language : "en";
}

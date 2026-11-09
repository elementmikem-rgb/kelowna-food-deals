import type { Language } from "@/lib/i18n";

// "On now" and "Starting soon" are exclusive: a special is one or the other, never both.
export type WhenMode = "any" | "now" | "soon";

const TEXT = {
  en: {
    filters: "Filters",
    now: "On now",
    soon: "Starting soon",
    under10: "Under $10",
    late: "Late night",
    accessible: "Visitor-confirmed access",
    accessTitle: "Access",
    food: "Food",
    drink: "Drinks",
    when: "When",
    anyTime: "Any time",
    what: "What",
    everything: "Everything",
    type: "Type",
    area: "Area",
    allAreas: "All areas",
    allTypes: "All",
    price: "Price and hours",
    clearAll: "Clear all",
    close: "Close filters",
    show: (n: number) => `Show ${n} place${n === 1 ? "" : "s"}`,
    removeFilter: (name: string) => `Remove filter: ${name}`,
    monthly: "Monthly specials",
  },
  fr: {
    filters: "Filtres",
    now: "En cours",
    soon: "Bientôt",
    under10: "Moins de 10 $",
    late: "Tard le soir",
    accessible: "Accès confirmé par des visiteurs",
    accessTitle: "Accès",
    food: "Manger",
    drink: "Boissons",
    when: "Quand",
    anyTime: "N'importe quand",
    what: "Quoi",
    everything: "Tout",
    type: "Type",
    area: "Secteur",
    allAreas: "Tous les secteurs",
    allTypes: "Tous",
    price: "Prix et heures",
    clearAll: "Tout effacer",
    close: "Fermer les filtres",
    show: (n: number) => `Afficher ${n} endroit${n === 1 ? "" : "s"}`,
    removeFilter: (name: string) => `Retirer le filtre : ${name}`,
    monthly: "Spéciaux du mois",
  },
};

export function filterText(lang: Language) {
  return TEXT[lang === "fr" ? "fr" : "en"];
}

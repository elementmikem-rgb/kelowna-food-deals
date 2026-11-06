import type { Language } from "@/lib/i18n";

// Wording for the floating chat box and the List/Map switch. The French has not had a native review yet,
// like the rest of the French copy (see the note on the privacy page).
const TEXT = {
  en: {
    open: "Ask what's on tonight",
    title: "Ask about today",
    close: "Close chat",
    placeholder: "What's on tonight? Cheapest beer?",
    followUp: "Ask a follow-up…",
    send: "Ask",
    sending: "Asking…",
    error: "Something went wrong",
    list: "List",
    map: "Map",
  },
  fr: {
    open: "Que se passe-t-il ce soir ?",
    title: "Posez une question sur aujourd'hui",
    close: "Fermer le clavardage",
    placeholder: "Que se passe-t-il ce soir ? La bière la moins chère ?",
    followUp: "Posez une autre question…",
    send: "Envoyer",
    sending: "Envoi…",
    error: "Une erreur est survenue",
    list: "Liste",
    map: "Carte",
  },
};

export function chatText(lang: Language) {
  return TEXT[lang === "fr" ? "fr" : "en"];
}

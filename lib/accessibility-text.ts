import type { AccessAnswer, AccessFeature } from "@/lib/accessibility";

type Lang = "en" | "fr";

export const ACCESS_TEXT = {
  en: {
    feature: {
      entrance: "Step-free entrance",
      space: "Room to move inside",
      washroom: "Accessible washroom",
    } satisfies Record<AccessFeature, string>,
    question: {
      entrance: "Is the entrance step-free?",
      space: "Is there room to move around inside (wheelchair, walker, stroller)?",
      washroom: "Is there a washroom with grab bars and enough room?",
    } satisfies Record<AccessFeature, string>,
    answer: { yes: "Yes", no: "No", unsure: "Not sure" } satisfies Record<AccessAnswer, string>,
    confirmedBy: (n: number) => (n === 1 ? "confirmed by 1 visitor" : `confirmed by ${n} visitors`),
    open: "Been here? Add accessibility info",
    close: "Close",
    intro: "Only answer what you know from being there. A note shows once 3 visitors agree.",
    send: "Send",
    sending: "Sending...",
    needOne: "Pick an answer for at least one question.",
    thanks: "Thanks. Your answer is saved.",
    error: "Could not save that. Please try again.",
  },
  fr: {
    feature: {
      entrance: "Entrée sans marches",
      space: "Espace pour circuler à l'intérieur",
      washroom: "Toilettes accessibles",
    } satisfies Record<AccessFeature, string>,
    question: {
      entrance: "L'entrée est-elle sans marches?",
      space: "Y a-t-il assez d'espace pour circuler (fauteuil roulant, marchette, poussette)?",
      washroom: "Y a-t-il une toilette avec barres d'appui et assez d'espace?",
    } satisfies Record<AccessFeature, string>,
    answer: { yes: "Oui", no: "Non", unsure: "Je ne sais pas" } satisfies Record<AccessAnswer, string>,
    confirmedBy: (n: number) => (n === 1 ? "confirmé par 1 visiteur" : `confirmé par ${n} visiteurs`),
    open: "Déjà venu? Ajoutez des infos d'accessibilité",
    close: "Fermer",
    intro: "Répondez seulement à ce que vous savez pour y être allé. Une note apparaît quand 3 visiteurs s'accordent.",
    send: "Envoyer",
    sending: "Envoi...",
    needOne: "Choisissez une réponse pour au moins une question.",
    thanks: "Merci. Votre réponse est enregistrée.",
    error: "Impossible d'enregistrer. Veuillez réessayer.",
  },
} as const;

export const accessText = (lang: Lang) => ACCESS_TEXT[lang === "fr" ? "fr" : "en"];

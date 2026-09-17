import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getCurrentRegion } from "@/lib/regions";
import type { Language } from "@/lib/i18n";
import { getEffectiveLanguage } from "@/lib/i18n";
import type { Metadata } from "next";

// ---------------------------------------------------------------------------
// All user-facing copy, keyed by language. English content is byte-for-byte
// identical to the original so existing regions render unchanged.
// ---------------------------------------------------------------------------

interface PrivacyCopy {
  metaTitle: string;
  metaDescription: (brandName: string) => string;
  headerSubtitle: string;
  whoRunsHeading: string;
  whoRunsBody: (brandName: string) => string;
  whoRunsFeedbackLabel: string;
  analyticsHeading: string;
  analyticsBody: string;
  submissionsHeading: string;
  submissionsBody: string;
  tipsHeading: string;
  tipsBody: string;
  cookiesHeading: string;
  cookiesBody: string;
  sponsoredHeading: string;
  sponsoredBody: string;
  accuracyHeading: string;
  accuracyBody: string;
  tosHeading: string;
  tosIntro: string;
  tosAdvertiseLabel: string;
  tosAdvertiseTrailer: string;
  paidPlacementsHeading: string;
  paidPlacementsBody: string;
  guaranteesHeading: string;
  guaranteesBody: string;
  paymentHeading: string;
  paymentBody: string;
  noWarrantyHeading: string;
  noWarrantyBody: (brandName: string) => string;
  changesHeading: string;
  changesBody: string;
}

const copy: Record<Language, PrivacyCopy> = {
  en: {
    metaTitle: "Privacy & Terms",
    metaDescription: (brandName) =>
      `What ${brandName} collects, why, and how it's used.`,
    headerSubtitle: "What this site collects, why, and how it's used.",
    whoRunsHeading: "Who runs this site",
    whoRunsBody: (brandName) =>
      `${brandName} is a one-person project. Questions about anything on this page can go through the`,
    whoRunsFeedbackLabel: "feedback form",
    analyticsHeading: "Basic site analytics",
    analyticsBody:
      "Page views are logged with a randomly generated session ID and visitor ID (not tied to your name or email), the page you visited, the referring site, UTM campaign parameters if present, and a country code (from Cloudflare's edge network, not your exact location). This is used only to understand which pages get used and where traffic comes from — never sold or shared with advertisers.",
    submissionsHeading: "If you submit a special, event, or sponsorship inquiry",
    submissionsBody:
      "A submitted photo or description is stored so it can be reviewed and published. A sponsorship inquiry's name, business, and email are stored so we can follow up, and trigger one automatic confirmation email back to you. None of this is sold or shared beyond what's needed to respond to you.",
    tipsHeading: "Tips",
    tipsBody:
      "The tip jar redirects to Stripe's own checkout page — this site never sees or stores your card details.",
    cookiesHeading: "Cookies",
    cookiesBody:
      "A cookie stores your session/visitor ID for the analytics described above. No third-party advertising or tracking cookies are used.",
    sponsoredHeading: "Featured & sponsored content",
    sponsoredBody:
      "A venue can pay to be featured, boost a specific special, or sponsor a category — this never changes whether a listing is accurate, only where it sorts on the page, and it's always marked with a badge. A sponsored blog post is a paid feature and is always labeled “Sponsored” — it's never presented as independent coverage.",
    accuracyHeading: "Accuracy",
    accuracyBody:
      "Every special and event on this site is checked against a real source before it's published, but venues change things without notice. Prices, hours, and availability are not guaranteed — call ahead if it matters. If you spot something wrong, use the “Report incorrect” link on any listing.",
    tosHeading: "Terms of service",
    tosIntro: "These terms apply if you book a Featured Placement, Seasonal Boost, or Category Sponsorship through the",
    tosAdvertiseLabel: "advertise page",
    tosAdvertiseTrailer: ". Browsing the site to see what's on doesn't require agreeing to anything below.",
    paidPlacementsHeading: "Paid placements & review",
    paidPlacementsBody:
      "Payment is collected up front through Stripe at checkout, but every booking is reviewed by hand before it goes live — this isn't automatic. If a booking is rejected during review, it's refunded in full and never goes live. Approved placements run for the exact date range you paid for; there's no partial refund for ending a placement early once it's live.",
    guaranteesHeading: "What a placement guarantees",
    guaranteesBody:
      "Paying only guarantees where your listing appears (top of the homepage board, top billing for a special, or a category sponsor slot) for the dates you booked — never a specific number of views, clicks, or customers. Featured/boosted/sponsored placements are always marked with a badge and are never presented as an independent review or recommendation.",
    paymentHeading: "Payment processing",
    paymentBody:
      "All payments are handled entirely by Stripe — this site never sees or stores your card number. Questions about a specific charge can reference the receipt Stripe emails you at checkout.",
    noWarrantyHeading: "No warranty, limited liability",
    noWarrantyBody: (brandName) =>
      `This site is provided as-is, run by one person as a side project, with no warranty of any kind. ${brandName} isn’t liable for losses connected to a listing being outdated, a booking dispute with a venue, or any decision made based on information here. If something in this section conflicts with a law that can’t be waived where you live, that law controls instead.`,
    changesHeading: "Changes to these terms",
    changesBody:
      "These terms may be updated as the site changes — the current version always lives at this URL. Continuing to use the site after a change means you accept the updated terms.",
  },
  fr: {
    // TODO: this French translation was AI-generated and has not been reviewed by a native/legal French speaker — verify before relying on it for Bill 96 compliance.
    metaTitle: "Confidentialité et conditions",
    metaDescription: (brandName) =>
      `Ce que ${brandName} recueille, pourquoi et comment ces données sont utilisées.`,
    headerSubtitle: "Ce que ce site recueille, pourquoi et comment ces données sont utilisées.",
    whoRunsHeading: "Qui gère ce site",
    whoRunsBody: (brandName) =>
      `${brandName} est un projet mené par une seule personne. Pour toute question sur cette page, utilisez le`,
    whoRunsFeedbackLabel: "formulaire de commentaires",
    analyticsHeading: "Analyses de base du site",
    analyticsBody:
      "Les pages visitées sont enregistrées avec un identifiant de session et un identifiant de visiteur générés aléatoirement (sans lien avec votre nom ni votre adresse courriel), la page consultée, le site référant, les paramètres de campagne UTM s'il y en a, et un code de pays (fourni par le réseau Cloudflare, et non votre position exacte). Ces données servent uniquement à comprendre quelles pages sont utilisées et d'où provient le trafic — elles ne sont jamais vendues ni partagées avec des annonceurs.",
    submissionsHeading:
      "Si vous soumettez un spécial, un événement ou une demande de commandite",
    submissionsBody:
      "Une photo ou description soumise est conservée pour être examinée et publiée. Le nom, le nom de l'entreprise et l'adresse courriel d'une demande de commandite sont conservés afin que nous puissions assurer un suivi et envoyer un courriel de confirmation automatique. Ces informations ne sont ni vendues ni partagées au-delà de ce qui est nécessaire pour vous répondre.",
    tipsHeading: "Pourboires",
    tipsBody:
      "Le pot à pourboires redirige vers la page de paiement de Stripe — ce site ne voit ni ne stocke jamais vos coordonnées bancaires.",
    cookiesHeading: "Témoins (cookies)",
    cookiesBody:
      "Un témoin (cookie) enregistre votre identifiant de session et de visiteur pour les analyses décrites ci-dessus. Aucun témoin publicitaire ou de suivi tiers n'est utilisé.",
    sponsoredHeading: "Contenu mis en vedette et commandité",
    sponsoredBody:
      "Un établissement peut payer pour être mis en vedette, pour amplifier un spécial précis ou pour commanditer une catégorie — cela ne modifie jamais l'exactitude d'une fiche, seulement son emplacement sur la page, et c'est toujours indiqué par un badge. Un article de blogue commandité est un contenu payant et est toujours étiqueté « Commandité » — il n'est jamais présenté comme une couverture indépendante.",
    accuracyHeading: "Exactitude",
    accuracyBody:
      "Chaque spécial et événement sur ce site est vérifié auprès d'une source réelle avant d'être publié, mais les établissements peuvent apporter des modifications sans préavis. Les prix, les horaires et la disponibilité ne sont pas garantis — appelez à l'avance si c'est important. Si vous remarquez une erreur, utilisez le lien « Signaler une erreur » sur n'importe quelle fiche.",
    tosHeading: "Conditions d'utilisation",
    tosIntro:
      "Ces conditions s'appliquent si vous réservez une mise en vedette, un coup de pouce saisonnier ou une commandite de catégorie via la",
    tosAdvertiseLabel: "page d'annonce",
    tosAdvertiseTrailer:
      ". La simple consultation du site pour voir ce qui est disponible ne nécessite pas d'accepter les conditions ci-dessous.",
    paidPlacementsHeading: "Placements payants et examen",
    paidPlacementsBody:
      "Le paiement est effectué à l'avance via Stripe au moment du règlement, mais chaque réservation est examinée manuellement avant d'être mise en ligne — ce n'est pas automatique. Si une réservation est refusée lors de l'examen, elle est remboursée intégralement et n'est jamais mise en ligne. Les placements approuvés durent exactement pour la plage de dates réservée; aucun remboursement partiel n'est effectué si vous mettez fin à un placement avant la date prévue une fois qu'il est en ligne.",
    guaranteesHeading: "Ce qu'un placement garantit",
    guaranteesBody:
      "Le paiement garantit uniquement l'emplacement de votre fiche (en haut du tableau de la page d'accueil, en tête d'affiche pour un spécial, ou dans un espace de commandite de catégorie) pour les dates réservées — jamais un nombre précis de vues, de clics ou de clients. Les placements en vedette, amplifiés ou commandités sont toujours signalés par un badge et ne sont jamais présentés comme une évaluation ou une recommandation indépendante.",
    paymentHeading: "Traitement des paiements",
    paymentBody:
      "Tous les paiements sont entièrement gérés par Stripe — ce site ne voit ni ne stocke jamais votre numéro de carte. Pour toute question sur un paiement spécifique, référez-vous au reçu que Stripe vous envoie par courriel lors du paiement.",
    noWarrantyHeading: "Aucune garantie, responsabilité limitée",
    noWarrantyBody: (brandName) =>
      `Ce site est fourni tel quel, géré par une seule personne en tant que projet parallèle, sans aucune garantie d'aucune sorte. ${brandName} n'est pas responsable des pertes liées à une fiche périmée, à un litige de réservation avec un établissement, ou à toute décision prise sur la base des informations présentées ici. Si une disposition de cette section entre en conflit avec une loi impérative dans votre région, c'est cette loi qui s'applique.`,
    changesHeading: "Modifications de ces conditions",
    changesBody:
      "Ces conditions peuvent être mises à jour au fur et à mesure de l'évolution du site — la version actuelle est toujours accessible à cette URL. Continuer à utiliser le site après une modification signifie que vous acceptez les conditions mises à jour.",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const region = await getCurrentRegion();
  const lang: Language = region.language === "fr" ? "fr" : "en";
  const c = copy[lang];
  return {
    title: c.metaTitle,
    description: c.metaDescription(region.brandName),
    alternates: { canonical: `/${region.slug}/privacy` },
  };
}

export default async function PrivacyPage() {
  const region = await getCurrentRegion();
  const lang = await getEffectiveLanguage(region);
  const c = copy[lang];
  return (
    <div className="flex flex-col flex-1 max-w-2xl mx-auto w-full px-4 py-6 gap-6">
      <SiteHeader active="blog" subtitle={c.headerSubtitle} />

      <div className="flex flex-col gap-6 text-sm text-foreground/90">
        <div>
          <h2 className="font-display text-xl text-foreground mb-2">{c.whoRunsHeading}</h2>
          <p>
            {c.whoRunsBody(region.brandName)}{" "}
            <a href={`/${region.slug}/submit`} className="text-accent-dim underline">
              {c.whoRunsFeedbackLabel}
            </a>
            .
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-foreground mb-2">{c.analyticsHeading}</h2>
          <p>{c.analyticsBody}</p>
        </div>

        <div>
          <h2 className="font-display text-xl text-foreground mb-2">
            {c.submissionsHeading}
          </h2>
          <p>{c.submissionsBody}</p>
        </div>

        <div>
          <h2 className="font-display text-xl text-foreground mb-2">{c.tipsHeading}</h2>
          <p>{c.tipsBody}</p>
        </div>

        <div>
          <h2 className="font-display text-xl text-foreground mb-2">{c.cookiesHeading}</h2>
          <p>{c.cookiesBody}</p>
        </div>

        <div>
          <h2 className="font-display text-xl text-foreground mb-2">{c.sponsoredHeading}</h2>
          <p>{c.sponsoredBody}</p>
        </div>

        <div>
          <h2 className="font-display text-xl text-foreground mb-2">{c.accuracyHeading}</h2>
          <p>{c.accuracyBody}</p>
        </div>

        <div className="pt-2 border-t border-border">
          <h2 className="font-display text-2xl text-foreground mb-2">{c.tosHeading}</h2>
          <p>
            {c.tosIntro}{" "}
            <a href={`/${region.slug}/advertise`} className="text-accent-dim underline">
              {c.tosAdvertiseLabel}
            </a>
            {c.tosAdvertiseTrailer}
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-foreground mb-2">{c.paidPlacementsHeading}</h2>
          <p>{c.paidPlacementsBody}</p>
        </div>

        <div>
          <h2 className="font-display text-xl text-foreground mb-2">{c.guaranteesHeading}</h2>
          <p>{c.guaranteesBody}</p>
        </div>

        <div>
          <h2 className="font-display text-xl text-foreground mb-2">{c.paymentHeading}</h2>
          <p>{c.paymentBody}</p>
        </div>

        <div>
          <h2 className="font-display text-xl text-foreground mb-2">{c.noWarrantyHeading}</h2>
          <p>{c.noWarrantyBody(region.brandName)}</p>
        </div>

        <div>
          <h2 className="font-display text-xl text-foreground mb-2">{c.changesHeading}</h2>
          <p>{c.changesBody}</p>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}

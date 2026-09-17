import type { ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SponsorInquiryForm } from "@/components/SponsorInquiryForm";
import { BookingFlow } from "@/components/BookingFlow";
import { getVenueOptions, getSpecialOptions, getEventOptions } from "@/lib/sponsored-data";
import { formatPrice } from "@/lib/format";
import { db, monetizationSettings, addOnSettings } from "@/db";
import { eq } from "drizzle-orm";
import type { BookingProductType } from "@/db/schema";
import { regionTodayISODate } from "@/lib/time";
import { getCurrentRegion, getRegionContext } from "@/lib/regions";
import type { Language } from "@/lib/i18n";
import { getEffectiveLanguage } from "@/lib/i18n";
import type { Metadata } from "next";

// ---------------------------------------------------------------------------
// All user-facing copy, keyed by language. English content is byte-for-byte
// identical to the original so existing regions render unchanged.
// ---------------------------------------------------------------------------

interface AdvertiseCopy {
  metaTitle: string;
  metaDescription: (brandName: string) => string;
  subtitle: (city: string) => string;
  intro: (city: string) => string;
  threeWaysHeading: string;
  pickDatesBody: string;
  expiredError: string;
  perDay: string;
  featured: { title: string; body: ReactNode; bestFor: string };
  boost: {
    title: string;
    body: string;
    photoAddOn: (price: string) => string;
    bestFor: string;
  };
  categorySponsors: { title: string; body: string; bestFor: string };
  closingHeading: string;
  closingBody: string;
}

const copy: Record<Language, AdvertiseCopy> = {
  en: {
    metaTitle: "Advertise With Us",
    metaDescription: (brandName) =>
      `Feature your venue, promote a seasonal special, or sponsor a category on ${brandName}.`,
    subtitle: (city) =>
      `Feature your venue or promote a seasonal special to ${city} diners.`,
    intro: (city) =>
      `TodaysTab shows ${city} diners which happy hours, food specials, and events are actually running today — checked and updated daily instead of left to rot on an old social post. Here's how to get your venue in front of them.`,
    threeWaysHeading: "Three ways to get more visibility",
    pickDatesBody:
      "Pick a venue and dates, see the price up front, pay securely — every booking is reviewed before it goes live.",
    expiredError: "That link expired — please start again below.",
    perDay: "/day",
    featured: {
      title: "Featured placement",
      body: (
        <>
          Your venue&apos;s card pins to the top of the homepage specials board <em>and</em> the
          events board — every day, for as long as the placement runs. Comes with a gold
          &ldquo;Featured&rdquo; badge on both.
        </>
      ),
      bestFor: "venues that want to be seen every day, not tied to one specific deal.",
    },
    boost: {
      title: "Seasonal boost",
      body: "One specific special or event — a holiday menu, a game-day deal, a live music night — gets top billing for its exact date window. A one-time push instead of an ongoing commitment.",
      photoAddOn: (price) => ` Add a photo or event poster for +${price}/day.`,
      bestFor: "a one-time push around something specific, not an ongoing commitment.",
    },
    categorySponsors: {
      title: "Category sponsorship",
      body: "Your brand attached to a specific category sitewide — a specials category (Wing Nights, Happy Hour) or an event type (Live Music, Trivia) — shown right under the filter whenever a diner picks it.",
      bestFor:
        "owning a whole category even on days your card doesn't win the daily rotation.",
    },
    closingHeading: "Not sure which one fits?",
    closingBody:
      "Send us a quick note instead — tell us what you're trying to promote and we'll suggest the right option, or something custom if none of the three above fit.",
  },
  fr: {
    metaTitle: "Annoncez avec nous",
    metaDescription: (brandName) =>
      `Mettez votre établissement en vedette, faites la promotion d'un spécial saisonnier ou commanditez une catégorie sur ${brandName}.`,
    subtitle: (city) =>
      `Faites ressortir votre établissement ou faites la promotion d'un spécial saisonnier auprès des clients de ${city}.`,
    intro: (city) =>
      `TodaysTab montre aux clients de ${city} quelles heures heureuses, quels spéciaux et quels événements sont vraiment en cours aujourd'hui — vérifiés et mis à jour chaque jour, et non laissés à moisir dans un vieux message sur les réseaux sociaux. Voici comment faire apparaître votre établissement.`,
    threeWaysHeading: "Trois façons d'augmenter votre visibilité",
    pickDatesBody:
      "Choisissez un établissement et des dates, voyez le prix à l'avance, payez en toute sécurité — chaque réservation est examinée avant d'être mise en ligne.",
    expiredError: "Ce lien a expiré — veuillez recommencer ci-dessous.",
    perDay: "/jour",
    featured: {
      title: "Mise en vedette",
      body: (
        <>
          La fiche de votre établissement s&apos;affiche en haut du tableau des spéciaux{" "}
          <em>et</em> du tableau des événements sur la page d&apos;accueil — chaque jour, pour
          toute la durée du placement. Accompagnée d&apos;un badge doré{" "}
          &laquo;&nbsp;En vedette&nbsp;&raquo; sur les deux.
        </>
      ),
      bestFor:
        "les établissements qui veulent être vus chaque jour, sans être liés à une offre particulière.",
    },
    boost: {
      title: "Coup de pouce saisonnier",
      body: "Un spécial ou un événement précis — un menu de fête, une offre pour un grand match, une soirée de musique live — se retrouve en tête d'affiche pour sa fenêtre de dates exacte. Une mise en avant ponctuelle, sans engagement continu.",
      photoAddOn: (price) => ` Ajoutez une photo ou une affiche d'événement pour +${price}/jour.`,
      bestFor:
        "une mise en avant ponctuelle autour de quelque chose de précis, sans engagement continu.",
    },
    categorySponsors: {
      title: "Commandite de catégorie",
      body: "Votre marque associée à une catégorie précise sur tout le site — une catégorie de spéciaux (soirées ailes, happy hour) ou un type d'événement (musique live, jeu-questionnaire) — affichée juste sous le filtre dès qu'un client la sélectionne.",
      bestFor:
        "dominer une catégorie entière, même les jours où votre fiche ne remporte pas la rotation quotidienne.",
    },
    closingHeading: "Vous ne savez pas laquelle choisir?",
    closingBody:
      "Envoyez-nous un message — dites-nous ce que vous souhaitez promouvoir et nous vous suggérerons la bonne option, ou quelque chose de personnalisé si aucune des trois ci-dessus ne convient.",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const region = await getCurrentRegion();
  const lang: Language = region.language === "fr" ? "fr" : "en";
  const c = copy[lang];
  return {
    title: c.metaTitle,
    description: c.metaDescription(region.brandName),
    alternates: { canonical: `/${region.slug}/advertise` },
  };
}

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ verifiedToken?: string; verifiedProduct?: string; bookingError?: string }>;
}

export default async function AdvertisePage({ searchParams }: PageProps) {
  const { verifiedToken, verifiedProduct, bookingError } = await searchParams;
  // Only the BookingFlow whose productType matches the confirmed link's product ever
  // receives a non-null token -- confirm-email (Task 5) redirects with the product
  // type in plain text alongside the (HMAC-signed, client-unverifiable) token itself.
  function tokenFor(productType: BookingProductType): string | null {
    return verifiedProduct === productType ? (verifiedToken ?? null) : null;
  }
  const region = await getCurrentRegion();
  const lang = await getEffectiveLanguage(region);
  const c = copy[lang];
  const { timezone } = await getRegionContext(region);
  const [venueOptions, specialOptions, eventOptions, settingsRows, photoAddOnRow] = await Promise.all([
    getVenueOptions([region.id]),
    getSpecialOptions([region.id]),
    getEventOptions([region.id]),
    db.select().from(monetizationSettings),
    db.select().from(addOnSettings).where(eq(addOnSettings.addOnType, "photo")).then((r) => r[0]),
  ]);

  function settingsFor(productType: BookingProductType) {
    const row = settingsRows.find((r) => r.productType === productType);
    return {
      priceCentsPerDay: row?.priceCentsPerDay ?? 0,
      minDays: row?.minDays ?? 1,
      maxDays: row?.maxDays ?? 30,
    };
  }

  const photoAddOn = photoAddOnRow ? { priceCentsPerDay: photoAddOnRow.priceCentsPerDay } : undefined;

  // Computed server-side in the request's own region's timezone so the date
  // picker's earliest-selectable day always agrees with the server's own
  // authoritative check (verify-email and checkout both reject
  // startDate < regionTodayISODate(timezone) for that same region). A
  // client-side `new Date()` would use the visitor's local/UTC date instead,
  // which can disagree with the region's timezone for several hours a day.
  const todayISO = regionTodayISODate(timezone);
  const city = region.brandName.split(" ")[0];

  return (
    <div className="flex flex-col flex-1 max-w-2xl mx-auto w-full px-4 py-6 gap-8">
      <SiteHeader
        active="blog"
        subtitle={c.subtitle(city)}
      />

      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted">{c.intro(city)}</p>
        <h2 className="font-display text-2xl text-foreground pt-2">{c.threeWaysHeading}</h2>
        <p className="text-sm text-muted">{c.pickDatesBody}</p>
        {bookingError === "expired" && (
          <p className="text-sm text-stale">{c.expiredError}</p>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-display text-lg text-foreground">{c.featured.title}</h3>
              <span className="font-mono-tabular text-sm text-accent-dim shrink-0">
                {formatPrice(settingsFor("featured").priceCentsPerDay)}{c.perDay}
              </span>
            </div>
            <p className="text-sm text-muted">{c.featured.body}</p>
            <p className="text-xs text-muted-2 italic">
              Best for: {c.featured.bestFor}
            </p>
          </div>
          <BookingFlow
            productType="featured"
            venues={venueOptions}
            specials={specialOptions}
            events={eventOptions}
            settings={settingsFor("featured")}
            initialVerifiedToken={tokenFor("featured")}
            todayISO={todayISO}
            regionSlug={region.slug}
          />
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-display text-lg text-foreground">{c.boost.title}</h3>
              <span className="font-mono-tabular text-sm text-accent-dim shrink-0">
                {formatPrice(settingsFor("boost").priceCentsPerDay)}{c.perDay}
              </span>
            </div>
            <p className="text-sm text-muted">
              {c.boost.body}
              {photoAddOn && (
                <>{c.boost.photoAddOn(formatPrice(photoAddOn.priceCentsPerDay) ?? "")}</>
            )}
            </p>
            <p className="text-xs text-muted-2 italic">
              Best for: {c.boost.bestFor}
            </p>
          </div>
          <BookingFlow
            productType="boost"
            venues={venueOptions}
            specials={specialOptions}
            events={eventOptions}
            settings={settingsFor("boost")}
            photoAddOn={photoAddOn}
            initialVerifiedToken={tokenFor("boost")}
            todayISO={todayISO}
            regionSlug={region.slug}
          />
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-display text-lg text-foreground">{c.categorySponsors.title}</h3>
              <span className="font-mono-tabular text-sm text-accent-dim shrink-0">
                {formatPrice(settingsFor("category_sponsor").priceCentsPerDay)}{c.perDay}
              </span>
            </div>
            <p className="text-sm text-muted">{c.categorySponsors.body}</p>
            <p className="text-xs text-muted-2 italic">
              Best for: {c.categorySponsors.bestFor}
            </p>
          </div>
          <BookingFlow
            productType="category_sponsor"
            venues={venueOptions}
            specials={specialOptions}
            events={eventOptions}
            settings={settingsFor("category_sponsor")}
            initialVerifiedToken={tokenFor("category_sponsor")}
            todayISO={todayISO}
            regionSlug={region.slug}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 pt-2 border-t border-border">
        <h2 className="font-display text-xl text-foreground">{c.closingHeading}</h2>
        <p className="text-sm text-muted">{c.closingBody}</p>
      </div>
      <SponsorInquiryForm />

      <SiteFooter />
    </div>
  );
}

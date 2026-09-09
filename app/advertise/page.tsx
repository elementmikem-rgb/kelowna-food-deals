import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SponsorInquiryForm } from "@/components/SponsorInquiryForm";
import { BookingFlow } from "@/components/BookingFlow";
import { getVenueOptions, getSpecialOptions } from "@/lib/sponsored-data";
import { db, monetizationSettings } from "@/db";
import type { BookingProductType } from "@/db/schema";
import { regionTodayISODate } from "@/lib/time";
import { getCurrentRegion, getRegionContext } from "@/lib/regions";

export async function generateMetadata(): Promise<Metadata> {
  const region = await getCurrentRegion();
  return {
    title: "Advertise With Us",
    description: `Feature your venue, promote a seasonal special, or sponsor a category on ${region.brandName}.`,
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
  const { timezone } = await getRegionContext(region);
  const [venueOptions, specialOptions, settingsRows] = await Promise.all([
    getVenueOptions("all"),
    getSpecialOptions("all"),
    db.select().from(monetizationSettings),
  ]);

  function settingsFor(productType: BookingProductType) {
    const row = settingsRows.find((r) => r.productType === productType);
    return {
      priceCentsPerDay: row?.priceCentsPerDay ?? 0,
      minDays: row?.minDays ?? 1,
      maxDays: row?.maxDays ?? 30,
    };
  }

  // Computed server-side in the request's own region's timezone so the date
  // picker's earliest-selectable day always agrees with the server's own
  // authoritative check (verify-email and checkout both reject
  // startDate < regionTodayISODate(timezone) for that same region). A
  // client-side `new Date()` would use the visitor's local/UTC date instead,
  // which can disagree with the region's timezone for several hours a day.
  const todayISO = regionTodayISODate(timezone);

  return (
    <div className="flex flex-col flex-1 max-w-2xl mx-auto w-full px-4 py-6 gap-8">
      <SiteHeader
        active="blog"
        subtitle="Feature your venue or promote a seasonal special to local diners."
      />

      <div className="flex flex-col gap-2">
        <h2 className="font-display text-2xl text-foreground">Three ways to get more visibility</h2>
        <p className="text-sm text-muted">
          Pick a venue, choose your dates, and pay securely — every booking is reviewed before it
          goes live.
        </p>
        {bookingError === "expired" && (
          <p className="text-sm text-stale">That link expired — please start again below.</p>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h3 className="font-display text-lg text-foreground">Featured placement</h3>
            <p className="text-sm text-muted">
              Your venue&apos;s card pins to the top of the homepage board — every day, every category —
              for as long as the placement runs. Comes with a gold &ldquo;Featured&rdquo; badge.
            </p>
          </div>
          <BookingFlow
            productType="featured"
            venues={venueOptions}
            specials={specialOptions}
            settings={settingsFor("featured")}
            initialVerifiedToken={tokenFor("featured")}
            todayISO={todayISO}
          />
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h3 className="font-display text-lg text-foreground">Seasonal boost</h3>
            <p className="text-sm text-muted">
              One specific special — a holiday menu, a game-day deal, a one-off event — gets top
              billing for its exact date window. A one-time push instead of an ongoing commitment.
            </p>
          </div>
          <BookingFlow
            productType="boost"
            venues={venueOptions}
            specials={specialOptions}
            settings={settingsFor("boost")}
            initialVerifiedToken={tokenFor("boost")}
            todayISO={todayISO}
          />
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h3 className="font-display text-lg text-foreground">Category sponsorship</h3>
            <p className="text-sm text-muted">
              Your brand attached to a specific category sitewide (Wing Nights, Happy Hour) —
              shown right under the filter whenever a diner picks that category.
            </p>
          </div>
          <BookingFlow
            productType="category_sponsor"
            venues={venueOptions}
            specials={specialOptions}
            settings={settingsFor("category_sponsor")}
            initialVerifiedToken={tokenFor("category_sponsor")}
            todayISO={todayISO}
          />
        </div>
      </div>

      <SponsorInquiryForm />

      <SiteFooter />
    </div>
  );
}

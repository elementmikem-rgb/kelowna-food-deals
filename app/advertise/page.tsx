import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SponsorInquiryForm } from "@/components/SponsorInquiryForm";

export const metadata = {
  title: "Advertise With Us",
  description:
    "Feature your venue, promote a seasonal special, or sponsor a category on Kelowna Food Deals.",
};

export default function AdvertisePage() {
  return (
    <div className="flex flex-col flex-1 max-w-2xl mx-auto w-full px-4 py-6 gap-8">
      <SiteHeader
        active="blog"
        subtitle="Feature your venue or promote a seasonal special to Kelowna diners."
      />

      <div className="flex flex-col gap-2">
        <h2 className="font-display text-2xl text-foreground">Three ways to get more visibility</h2>
        <p className="text-sm text-muted">
          No fixed pricing yet — tell us what you're after below and we'll work out details together.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-1">
          <h3 className="font-display text-lg text-foreground">Featured placement</h3>
          <p className="text-sm text-muted">
            Your venue's card pins to the top of the homepage board — every day, every category —
            for as long as the placement runs. Comes with a gold &ldquo;Featured&rdquo; badge.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-1">
          <h3 className="font-display text-lg text-foreground">Seasonal boost</h3>
          <p className="text-sm text-muted">
            One specific special — a holiday menu, a game-day deal, a one-off event — gets top
            billing for its exact date window. A one-time push instead of an ongoing commitment.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-1">
          <h3 className="font-display text-lg text-foreground">Category sponsorship</h3>
          <p className="text-sm text-muted">
            Your brand attached to a specific category sitewide (Wing Nights, Happy Hour). Not
            built yet — tell us you're interested and we'll follow up once it is.
          </p>
        </div>
      </div>

      <SponsorInquiryForm />

      <SiteFooter />
    </div>
  );
}

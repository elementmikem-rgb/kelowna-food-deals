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
        <h2 className="font-display text-2xl text-foreground">Advertise with us</h2>
        <p className="text-sm text-muted">
          Interested in featured placement, a seasonal boost, or sponsoring a category? Tell us a
          bit about what you're after and we'll get back to you.
        </p>
      </div>

      <SponsorInquiryForm />

      <SiteFooter />
    </div>
  );
}

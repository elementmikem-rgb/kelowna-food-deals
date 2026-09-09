import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getCurrentRegion } from "@/lib/regions";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const region = await getCurrentRegion();
  return {
    title: "Privacy & Terms",
    description: `What ${region.brandName} collects, why, and how it's used.`,
  };
}

export default async function PrivacyPage() {
  const region = await getCurrentRegion();
  return (
    <div className="flex flex-col flex-1 max-w-2xl mx-auto w-full px-4 py-6 gap-6">
      <SiteHeader active="blog" subtitle="What this site collects, why, and how it's used." />

      <div className="flex flex-col gap-6 text-sm text-foreground/90">
        <div>
          <h2 className="font-display text-xl text-foreground mb-2">Who runs this site</h2>
          <p>
            {region.brandName} is a one-person project. Questions about anything on this page can
            go through the{" "}
            <a href="/submit" className="text-accent-dim underline">
              feedback form
            </a>
            .
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-foreground mb-2">Basic site analytics</h2>
          <p>
            Page views are logged with a randomly generated session ID and visitor ID (not tied to
            your name or email), the page you visited, the referring site, UTM campaign
            parameters if present, and a country code (from Cloudflare&apos;s edge network, not your
            exact location). This is used only to understand which pages get used and where
            traffic comes from — never sold or shared with advertisers.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-foreground mb-2">
            If you submit a special, event, or sponsorship inquiry
          </h2>
          <p>
            A submitted photo or description is stored so it can be reviewed and published. A
            sponsorship inquiry&apos;s name, business, and email are stored so we can follow up, and
            trigger one automatic confirmation email back to you. None of this is sold or shared
            beyond what&apos;s needed to respond to you.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-foreground mb-2">Tips</h2>
          <p>
            The tip jar redirects to Stripe&apos;s own checkout page — this site never sees or stores
            your card details.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-foreground mb-2">Cookies</h2>
          <p>
            A cookie stores your session/visitor ID for the analytics described above. No
            third-party advertising or tracking cookies are used.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-foreground mb-2">Featured &amp; sponsored content</h2>
          <p>
            A venue can pay to be featured, boost a specific special, or sponsor a category — this
            never changes whether a listing is accurate, only where it sorts on the page, and it&apos;s
            always marked with a badge. A sponsored blog post is a paid feature and is always
            labeled &quot;Sponsored&quot; — it&apos;s never presented as independent coverage.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-foreground mb-2">Accuracy</h2>
          <p>
            Every special and event on this site is checked against a real source before it&apos;s
            published, but venues change things without notice. Prices, hours, and availability
            are not guaranteed — call ahead if it matters. If you spot something wrong, use the
            &quot;Report incorrect&quot; link on any listing.
          </p>
        </div>

        <div className="pt-2 border-t border-border">
          <h2 className="font-display text-2xl text-foreground mb-2">Terms of service</h2>
          <p>
            These terms apply if you book a Featured Placement, Seasonal Boost, or Category
            Sponsorship through the{" "}
            <a href="/advertise" className="text-accent-dim underline">
              advertise page
            </a>
            . Browsing the site to see what&apos;s on doesn&apos;t require agreeing to anything below.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-foreground mb-2">Paid placements &amp; review</h2>
          <p>
            Payment is collected up front through Stripe at checkout, but every booking is
            reviewed by hand before it goes live — this isn&apos;t automatic. If a booking is rejected
            during review, it&apos;s refunded in full and never goes live. Approved placements run for
            the exact date range you paid for; there&apos;s no partial refund for ending a placement
            early once it&apos;s live.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-foreground mb-2">What a placement guarantees</h2>
          <p>
            Paying only guarantees where your listing appears (top of the homepage board, top
            billing for a special, or a category sponsor slot) for the dates you booked — never a
            specific number of views, clicks, or customers. Featured/boosted/sponsored placements
            are always marked with a badge and are never presented as an independent review or
            recommendation.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-foreground mb-2">Payment processing</h2>
          <p>
            All payments are handled entirely by Stripe — this site never sees or stores your card
            number. Questions about a specific charge can reference the receipt Stripe emails you
            at checkout.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-foreground mb-2">No warranty, limited liability</h2>
          <p>
            This site is provided as-is, run by one person as a side project, with no warranty of
            any kind. {region.brandName} isn&apos;t liable for losses connected to a listing being
            outdated, a booking dispute with a venue, or any decision made based on information
            here. If something in this section conflicts with a law that can&apos;t be waived where you
            live, that law controls instead.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-foreground mb-2">Changes to these terms</h2>
          <p>
            These terms may be updated as the site changes — the current version always lives at
            this URL. Continuing to use the site after a change means you accept the updated
            terms.
          </p>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}

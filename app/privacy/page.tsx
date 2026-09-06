import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata = {
  title: "Privacy & Terms",
  description: "What Kelowna Food Deals collects, why, and how it's used.",
};

export default function PrivacyPage() {
  return (
    <div className="flex flex-col flex-1 max-w-2xl mx-auto w-full px-4 py-6 gap-6">
      <SiteHeader active="blog" subtitle="What this site collects, why, and how it's used." />

      <div className="flex flex-col gap-6 text-sm text-foreground/90">
        <div>
          <h2 className="font-display text-xl text-foreground mb-2">Who runs this site</h2>
          <p>
            Kelowna Food Deals is a one-person project. Questions about anything on this page can
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
            parameters if present, and a country code (from Cloudflare's edge network, not your
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
            sponsorship inquiry's name, business, and email are stored so we can follow up, and
            trigger one automatic confirmation email back to you. None of this is sold or shared
            beyond what's needed to respond to you.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-foreground mb-2">Tips</h2>
          <p>
            The tip jar redirects to Stripe's own checkout page — this site never sees or stores
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
            never changes whether a listing is accurate, only where it sorts on the page, and it's
            always marked with a badge. A sponsored blog post is a paid feature and is always
            labeled "Sponsored" — it's never presented as independent coverage.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl text-foreground mb-2">Accuracy</h2>
          <p>
            Every special and event on this site is checked against a real source before it's
            published, but venues change things without notice. Prices, hours, and availability
            are not guaranteed — call ahead if it matters. If you spot something wrong, use the
            "Report incorrect" link on any listing.
          </p>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}

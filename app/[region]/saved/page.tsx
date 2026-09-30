import type { Metadata } from "next";
import { getCurrentRegion } from "@/lib/regions";
import { SavedVenuesBoard } from "@/components/SavedVenuesBoard";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

// Per-region correctness requires the request's own domain (getCurrentRegion),
// which forces dynamic rendering -- see app/page.tsx's comment. The page itself
// has no per-region data (My Spots spans regions -- see lib/saved-venues.ts), but
// SiteHeader/SiteFooter still need the current region to render correctly.
export const dynamic = "force-dynamic";

// Not indexed -- this page's real content lives entirely in the visitor's own
// localStorage, so it renders the same empty shell to every crawler regardless of
// what any real visitor has saved. Nothing here is worth ranking.
export const metadata: Metadata = {
  title: "My Spots",
  robots: { index: false, follow: true },
};

export default async function SavedPage() {
  const region = await getCurrentRegion();

  return (
    <div className="flex flex-col flex-1 max-w-2xl mx-auto w-full px-4 py-6 gap-6">
      <SiteHeader active="saved" heading="My Spots" subtitle="Venues you've saved, across every region." />

      <SavedVenuesBoard />

      <SiteFooter />
    </div>
  );
}

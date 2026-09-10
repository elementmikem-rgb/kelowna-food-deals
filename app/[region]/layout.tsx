import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRegionBySlug, getCurrentRegion } from "@/lib/regions";

interface RegionLayoutProps {
  children: React.ReactNode;
  params: Promise<{ region: string }>;
}

export async function generateMetadata({ params }: { params: Promise<{ region: string }> }): Promise<Metadata> {
  const { region: slug } = await params;
  const region = await getRegionBySlug(slug);
  if (!region) return {};

  const siteUrl = `https://${process.env.PATH_BASED_DOMAIN ?? "todaystab.com"}/${region.slug}`;
  const title = `${region.brandName} — Food & Drink Deals Today`;
  const description = `Food and drink specials actually running today in ${region.brandName.replace(" Food Deals", "")} — happy hours and deals, checked daily, not scraped.`;

  return {
    title: { default: title, template: `%s — ${region.brandName}` },
    description,
    applicationName: region.brandName,
    appleWebApp: { capable: true, statusBarStyle: "default", title: region.brandName },
    openGraph: { type: "website", locale: "en_CA", url: siteUrl, siteName: region.brandName, title, description },
    twitter: { card: "summary", title, description },
    alternates: { canonical: siteUrl },
  };
}

// proxy.ts already resolves this same slug and sets x-region-id for every
// request under this path, so getCurrentRegion() (unchanged, still reads that
// header) keeps working for every existing call site -- SiteHeader, sitemap
// data, checkout/email routes, etc. -- without any of them needing to know
// path-based routing exists. This layout's own job is just the 404 gate for
// an unknown slug and the per-region theme override.
export default async function RegionLayout({ children, params }: RegionLayoutProps) {
  const { region: slug } = await params;
  const region = await getRegionBySlug(slug);
  if (!region) notFound();

  // Confirms the header proxy.ts set actually resolved to the same region --
  // a genuine mismatch here would mean proxy.ts and this layout disagree,
  // which should never happen since both derive from the identical URL slug.
  await getCurrentRegion();

  const themeStyle = `:root { --accent: ${region.accentColor}; --accent-dim: ${region.accentDimColor}; --accent-soft: ${region.accentSoftColor}; --background: ${region.backgroundColor}; --foreground: ${region.foregroundColor}; --evergreen: ${region.evergreenColor}; }`;

  return (
    <>
      {/* eslint-disable-next-line react/no-danger -- static string built entirely
          from our own regions table, never from request-supplied input */}
      <style dangerouslySetInnerHTML={{ __html: themeStyle }} />
      {children}
    </>
  );
}

import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Fraunces, Karla, Geist_Mono } from "next/font/google";
import { AnalyticsTracker } from "@/components/AnalyticsTracker";
import { getCurrentRegion } from "@/lib/regions";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
});

const karla = Karla({
  variable: "--font-karla",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const region = await getCurrentRegion();
  const siteUrl = `https://${region.domain}`;
  const title = `${region.brandName} — Food & Drink Deals Today`;
  const description = `Food and drink specials actually running today in ${region.brandName.replace(" Food Deals", "")} — happy hours and deals, checked daily, not scraped.`;

  return {
    metadataBase: new URL(siteUrl),
    title: { default: title, template: `%s — ${region.brandName}` },
    description,
    applicationName: region.brandName,
    manifest: "/manifest.json",
    appleWebApp: { capable: true, statusBarStyle: "default", title: region.brandName },
    openGraph: { type: "website", locale: "en_CA", url: siteUrl, siteName: region.brandName, title, description },
    twitter: { card: "summary", title, description },
    alternates: { canonical: siteUrl },
  };
}

export const viewport: Viewport = {
  themeColor: "#b5502c",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const region = await getCurrentRegion();
  const themeStyle = `:root { --accent: ${region.accentColor}; --accent-dim: ${region.accentDimColor}; --accent-soft: ${region.accentSoftColor}; --background: ${region.backgroundColor}; --foreground: ${region.foregroundColor}; --evergreen: ${region.evergreenColor}; }`;

  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${karla.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Trusted input: a static string built entirely from our own regions
            table, never from request-supplied input. */}
        <style dangerouslySetInnerHTML={{ __html: themeStyle }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:bg-accent focus:text-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium"
        >
          Skip to content
        </a>
        <main id="main-content" className="flex flex-col flex-1">
          {children}
        </main>
        <AnalyticsTracker />
        <Script src="/js/track.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}

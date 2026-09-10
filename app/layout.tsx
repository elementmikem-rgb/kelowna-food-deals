import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Fraunces, Karla, Geist_Mono } from "next/font/google";
import { AnalyticsTracker } from "@/components/AnalyticsTracker";
import { getPrimaryRegion } from "@/lib/regions";
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

const SITE_URL = `https://${process.env.PATH_BASED_DOMAIN ?? "todaystab.com"}`;

// This top-level layout can't call getCurrentRegion() -- it also renders the
// bare "/" city-picker page, which has no single region to be. Per-region
// metadata (title, description, canonical, etc.) lives one level down in
// app/[region]/layout.tsx instead, which runs for every actual region page.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "TodaysTab — Local Food & Drink Deals", template: "%s — TodaysTab" },
  description: "Real food and drink specials, checked daily -- pick your city to see what's on today.",
  manifest: "/manifest.json",
  openGraph: { type: "website", locale: "en_CA", url: SITE_URL, siteName: "TodaysTab" },
  twitter: { card: "summary" },
  alternates: { canonical: SITE_URL },
};

export const viewport: Viewport = {
  themeColor: "#b5502c",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Only a default/fallback theme for the picker page and anywhere else
  // rendered outside a real region path -- app/[region]/layout.tsx overrides
  // these same CSS variables with the actual region's colors via its own
  // nested <style> tag for every real region page.
  const fallbackRegion = await getPrimaryRegion();
  const themeStyle = `:root { --accent: ${fallbackRegion.accentColor}; --accent-dim: ${fallbackRegion.accentDimColor}; --accent-soft: ${fallbackRegion.accentSoftColor}; --background: ${fallbackRegion.backgroundColor}; --foreground: ${fallbackRegion.foregroundColor}; --evergreen: ${fallbackRegion.evergreenColor}; }`;

  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${karla.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* eslint-disable-next-line react/no-danger -- static string built entirely
            from our own regions table, never from request-supplied input */}
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

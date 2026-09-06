import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Fraunces, Karla, Geist_Mono } from "next/font/google";
import { AnalyticsTracker } from "@/components/AnalyticsTracker";
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

const SITE_URL = "https://kelownafooddeals.shop";
const SITE_TITLE = "Kelowna Food Deals — Food & Drink Deals Today";
const SITE_DESCRIPTION =
  "Food and drink specials actually running today in Kelowna, West Kelowna, Lake Country & Peachland — happy hours and deals, checked daily, not scraped.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s — Kelowna Food Deals",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "Kelowna food deals",
    "Kelowna specials",
    "Kelowna happy hour",
    "Kelowna wing night",
    "Kelowna restaurant deals",
    "Kelowna BC food specials today",
    "West Kelowna happy hour",
    "Lake Country BC restaurants",
    "Peachland restaurants",
    "Okanagan happy hour",
  ],
  applicationName: "Kelowna Food Deals",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "KFD",
  },
  openGraph: {
    type: "website",
    locale: "en_CA",
    url: SITE_URL,
    siteName: "Kelowna Food Deals",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export const viewport: Viewport = {
  themeColor: "#b5502c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${karla.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <AnalyticsTracker />
        <Script src="/js/track.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}

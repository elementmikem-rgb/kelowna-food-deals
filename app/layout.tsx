import type { Metadata, Viewport } from "next";
import { Fraunces, Karla, Geist_Mono } from "next/font/google";
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
const SITE_TITLE = "Kelowna Daily Specials — Food & Drink Deals Today";
const SITE_DESCRIPTION =
  "What food and drink specials are actually running in Kelowna, BC today — happy hours, wing nights, and food deals, checked and verified daily, not scraped and guessed.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s — Kelowna Daily Specials",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "Kelowna food deals",
    "Kelowna specials",
    "Kelowna happy hour",
    "Kelowna wing night",
    "Kelowna restaurant deals",
    "Kelowna BC food specials today",
  ],
  applicationName: "Kelowna Daily Specials",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "KDS",
  },
  openGraph: {
    type: "website",
    locale: "en_CA",
    url: SITE_URL,
    siteName: "Kelowna Daily Specials",
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
      </body>
    </html>
  );
}

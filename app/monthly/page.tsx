import type { Metadata } from "next";
import { getMonthlySpecials } from "@/lib/data";
import { MonthlySpecials } from "@/components/MonthlySpecials";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { TipJar } from "@/components/TipJar";

// Same reasoning as app/page.tsx: static + hourly ISR, not tied to a request.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Kelowna Monthly Specials",
  description:
    "Deals running all month long at Kelowna restaurants and bars — not tied to a single day, checked and verified.",
  alternates: { canonical: "https://kelownafooddeals.shop/monthly" },
  openGraph: {
    title: "Kelowna Monthly Specials",
    description: "Deals running all month long at Kelowna restaurants and bars.",
    url: "https://kelownafooddeals.shop/monthly",
  },
};

export default async function MonthlyPage() {
  const specials = await getMonthlySpecials();

  return (
    <div className="flex flex-col flex-1 max-w-5xl mx-auto w-full px-4 py-6 gap-10">
      <SiteHeader
        active="monthly"
        heading="Kelowna Monthly Specials"
        subtitle="Running all month — not tied to a single day."
      />

      <MonthlySpecials specials={specials} />

      <TipJar />
      <SiteFooter />
    </div>
  );
}

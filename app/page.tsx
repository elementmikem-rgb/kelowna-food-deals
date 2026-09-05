import Image from "next/image";
import { getAllSpecialsWithVenue, getMonthlySpecials, getPreviousSpecials } from "@/lib/data";
import { SpecialsBoard } from "@/components/SpecialsBoard";
import { MonthlySpecials } from "@/components/MonthlySpecials";
import { PreviousSpecials } from "@/components/PreviousSpecials";
import { TipJar } from "@/components/TipJar";
import { buildSpecialsJsonLd } from "@/lib/seo";

export const revalidate = 3600; // ISR: refresh at most once an hour

export default async function Home() {
  const [specials, monthlySpecials, previousSpecials] = await Promise.all([
    getAllSpecialsWithVenue(),
    getMonthlySpecials(),
    getPreviousSpecials(),
  ]);

  const jsonLd = buildSpecialsJsonLd(specials);

  return (
    <div className="flex flex-col flex-1 max-w-5xl mx-auto w-full px-4 py-6 gap-10">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <header className="flex items-center gap-4">
        <Image
          src="/icons/icon-192.png"
          alt=""
          width={56}
          height={56}
          className="rounded-full shrink-0"
        />
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-3xl sm:text-4xl text-foreground">
            <span className="hand-underline">Kelowna</span> Daily Specials
          </h1>
          <p className="text-muted text-sm">
            What&apos;s actually on today — verified, not guessed.
          </p>
        </div>
      </header>

      <SpecialsBoard specials={specials} />
      <MonthlySpecials specials={monthlySpecials} />
      <PreviousSpecials specials={previousSpecials} />

      <TipJar />
    </div>
  );
}

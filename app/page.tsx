import { getAllSpecialsWithVenue } from "@/lib/data";
import { SpecialsBoard } from "@/components/SpecialsBoard";

export const revalidate = 3600; // ISR: refresh at most once an hour

export default async function Home() {
  const specials = await getAllSpecialsWithVenue();

  return (
    <div className="flex flex-col flex-1 max-w-5xl mx-auto w-full px-4 py-6 gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl sm:text-4xl text-foreground">
          Kelowna Daily Specials
        </h1>
        <p className="text-muted text-sm">
          What&apos;s actually on today — verified, not guessed.
        </p>
      </header>

      <SpecialsBoard specials={specials} />
    </div>
  );
}

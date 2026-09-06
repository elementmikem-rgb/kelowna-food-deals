import Link from "next/link";

export function HomeIntroCallout() {
  return (
    <div className="rounded-xl border border-accent-dim/30 bg-accent-soft/20 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
      <p className="text-xs sm:text-sm text-foreground/90">
        Also tracking live music, trivia, and karaoke nights around town —{" "}
        <Link href="/events" className="underline font-medium">
          see what&apos;s on tonight
        </Link>
        .
      </p>
      <Link
        href="/submit"
        className="press-pill rounded-full bg-accent text-background px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium self-start sm:self-auto shrink-0"
      >
        Spot something missing? Tell us
      </Link>
    </div>
  );
}

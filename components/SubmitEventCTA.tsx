import Link from "next/link";

export function SubmitEventCTA() {
  return (
    <div className="rounded-xl border border-accent-dim/30 bg-accent-soft/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <p className="text-sm text-foreground/90">
        Know about a show, trivia night, or event we&apos;re missing?
      </p>
      <Link
        href="/submit?type=event"
        className="press-pill rounded-full bg-accent text-background px-4 py-1.5 text-sm font-medium self-start sm:self-auto"
      >
        Submit an event
      </Link>
    </div>
  );
}

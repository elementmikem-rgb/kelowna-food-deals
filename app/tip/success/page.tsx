import Link from "next/link";
import type { Metadata } from "next";

// A post-payment confirmation page has no business in search results.
export const metadata: Metadata = {
  title: "Thank you — Kelowna Daily Specials",
  robots: { index: false, follow: false },
};

export default function TipSuccessPage() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center gap-3 px-4 py-16 text-center">
      <h1 className="font-display text-3xl text-foreground">Thank you!</h1>
      <p className="text-muted max-w-sm">
        Your tip genuinely helps keep this site running and accurate. Appreciate it.
      </p>
      <Link href="/" className="text-accent text-sm underline">
        Back to today&apos;s specials
      </Link>
    </div>
  );
}

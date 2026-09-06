import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata = {
  title: "Page Not Found",
};

export default function NotFound() {
  return (
    <div className="flex flex-col flex-1 max-w-2xl mx-auto w-full px-4 py-6 gap-8">
      <SiteHeader active="blog" subtitle="This page doesn't exist." />

      <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-surface p-10 text-center">
        <p className="font-display text-3xl text-foreground">Page not found</p>
        <p className="text-sm text-muted max-w-sm">
          That page doesn't exist, or the venue may have closed. Try today's specials instead.
        </p>
        <Link
          href="/"
          className="press-pill rounded-full bg-accent text-background px-5 py-2 text-sm font-medium"
        >
          Back to specials
        </Link>
      </div>

      <SiteFooter />
    </div>
  );
}

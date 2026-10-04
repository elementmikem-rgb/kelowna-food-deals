import Link from "next/link";

export const metadata = {
  title: "Page Not Found",
};

// This is Next's global catch-all for any unmatched path -- including ones proxy.ts
// can't resolve to a region at all (a mistyped /api/ path, a bad top-level URL), so it
// can't safely use SiteHeader/SiteFooter here: both call the strict getCurrentRegion()
// (lib/regions.ts), which deliberately throws when there's no x-region-id header,
// turning what should be a clean 404 into a 500. A plain, region-agnostic header/footer
// avoids that -- there's no real region to brand this page with anyway.
export default function NotFound() {
  return (
    <div className="flex flex-col flex-1 max-w-2xl mx-auto w-full px-4 py-6 gap-8">
      <header>
        <Link href="/" className="font-display text-2xl text-foreground">
          TodaysTab
        </Link>
      </header>

      <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-surface p-10 text-center">
        <p className="font-display text-3xl text-foreground">This deal expired a while ago</p>
        <p className="text-sm text-muted max-w-sm">
          That page is gone, or the venue closed up shop. The specials that are
          actually running today are one click away.
        </p>
        <Link
          href="/"
          className="press-pill rounded-full bg-accent text-background px-5 py-2 text-sm font-medium"
        >
          Back to today's specials
        </Link>
      </div>

      <footer className="text-center text-xs text-muted-2 pt-4 pb-8 border-t border-border">
        <Link href="/" className="text-accent-dim underline">
          TodaysTab.com
        </Link>
      </footer>
    </div>
  );
}

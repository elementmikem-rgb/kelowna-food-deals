import Image from "next/image";
import { SiteNav } from "./SiteNav";
import { ShareButton } from "./ShareButton";

export function SiteHeader({
  active,
  subtitle,
  brandIsHeading = true,
  heading,
}: {
  active: "specials" | "events" | "blog";
  subtitle: string;
  // Pages that carry their own <h1> (e.g. a blog post title) pass false so the
  // brand renders as plain text and the page keeps exactly one real heading.
  brandIsHeading?: boolean;
  // Overrides the brand text inside the H1 so each page's heading can carry its
  // own keyword intent instead of every page sharing the literal brand name.
  heading?: string;
}) {
  const BrandTag = brandIsHeading ? "h1" : "span";
  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <Image
          src="/icons/icon-192.png"
          alt="Kelowna Food Deals logo"
          width={56}
          height={56}
          className="rounded-full shrink-0"
        />
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3 flex-wrap">
            <BrandTag className="block font-display text-3xl sm:text-4xl text-foreground">
              {heading ?? (
                <>
                  <span className="hand-underline">Kelowna</span> Food Deals
                </>
              )}
            </BrandTag>
            <span className="stamp px-2.5 py-1 text-[10px] hidden sm:inline-flex">
              Okanagan · verified
            </span>
          </div>
          <p className="text-muted text-sm">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <SiteNav active={active} />
        <ShareButton
          title="Kelowna Food Deals"
          text="Verified food & drink specials happening today around Kelowna:"
          url="https://kelownafooddeals.shop/"
        />
      </div>
    </header>
  );
}

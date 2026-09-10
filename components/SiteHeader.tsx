import Image from "next/image";
import Link from "next/link";
import { SiteNav } from "./SiteNav";
import { ShareButton } from "./ShareButton";
import { getCurrentRegion } from "@/lib/regions";

export async function SiteHeader({
  active,
  subtitle,
  brandIsHeading = true,
  heading,
}: {
  active: "specials" | "events" | "monthly" | "blog";
  subtitle: string;
  // Pages that carry their own <h1> (e.g. a blog post title) pass false so the
  // brand renders as plain text and the page keeps exactly one real heading.
  brandIsHeading?: boolean;
  // Overrides the brand text inside the H1 so each page's heading can carry its
  // own keyword intent instead of every page sharing the literal brand name.
  heading?: string;
}) {
  const region = await getCurrentRegion();
  const BrandTag = brandIsHeading ? "h1" : "span";
  const [firstWord, ...rest] = region.brandName.split(" ");
  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
      <div className="flex items-center gap-3 sm:gap-4">
        <Link href={`/${region.slug}`} className="shrink-0">
          <Image
            src={region.logoUrl}
            alt={`${region.brandName} logo`}
            width={56}
            height={56}
            className="rounded-full w-10 h-10 sm:w-14 sm:h-14"
          />
        </Link>
        <div className="flex flex-col gap-0.5 sm:gap-1">
          <div className="flex items-center gap-3 flex-wrap">
            <BrandTag className="block font-display text-2xl sm:text-4xl text-foreground">
              <Link href={`/${region.slug}`}>
                {heading ?? (
                  <>
                    <span className="hand-underline">{firstWord}</span> {rest.join(" ")}
                  </>
                )}
              </Link>
            </BrandTag>
            {/* !hidden: .stamp's plain (unlayered) CSS rule sets display:inline-flex,
                which in Tailwind v4's cascade layers beats a layered "hidden" utility
                regardless of source order -- !important is the reliable override. */}
            <span className="stamp px-2.5 py-1 text-[10px] !hidden sm:!inline-flex">
              Okanagan · verified
            </span>
          </div>
          <p className="text-muted text-xs sm:text-sm">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <SiteNav active={active} />
        <ShareButton
          title={region.brandName}
          text={`Verified food & drink specials happening today around ${firstWord}:`}
          url={`https://${process.env.PATH_BASED_DOMAIN ?? "todaystab.com"}/${region.slug}`}
        />
      </div>
    </header>
  );
}

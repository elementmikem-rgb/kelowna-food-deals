import Link from "next/link";
import Image from "next/image";
import { db, regions } from "@/db";
import { eq, asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function CityPickerPage() {
  const activeRegions = await db
    .select({
      slug: regions.slug,
      brandName: regions.brandName,
      logoUrl: regions.logoUrl,
    })
    .from(regions)
    .where(eq(regions.active, true))
    .orderBy(asc(regions.brandName));

  return (
    <div className="flex flex-col flex-1 items-center justify-center px-4 py-16 gap-8 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl sm:text-4xl text-foreground">TodaysTab</h1>
        <p className="text-muted max-w-sm mx-auto">
          Real food and drink specials, checked daily. Pick your city to see what&apos;s on today.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        {activeRegions.map((region) => (
          <Link
            key={region.slug}
            href={`/${region.slug}`}
            className="press-pill flex items-center gap-3 rounded-2xl border border-border bg-surface px-6 py-4 hover:border-muted transition-colors"
          >
            <Image
              src={region.logoUrl}
              alt={`${region.brandName} logo`}
              width={40}
              height={40}
              className="rounded-full w-10 h-10"
            />
            <span className="font-display text-lg text-foreground">{region.brandName}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

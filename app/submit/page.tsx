import { db, venues } from "@/db";
import { asc, eq } from "drizzle-orm";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SubmitForm } from "@/components/SubmitForm";

export const metadata = {
  title: "Submit an Update",
  description: "Spot a special or event we don't have? Let us know.",
};

export default async function SubmitPage() {
  const venueList = await db
    .select({ id: venues.id, name: venues.name })
    .from(venues)
    .where(eq(venues.active, true))
    .orderBy(asc(venues.name));

  return (
    <div className="flex flex-col flex-1 max-w-2xl mx-auto w-full px-4 py-6 gap-8">
      <SiteHeader active="specials" subtitle="Spot something we're missing? Tell us." />

      <SubmitForm venues={venueList} />

      <SiteFooter />
    </div>
  );
}

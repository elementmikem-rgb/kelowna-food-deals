import { sql } from "drizzle-orm";
import { db } from "@/db";

// Every special and event carries its own copy of a region, set when it was created. When a venue is moved to a
// different region, those copies must follow (the public events pages filter by the event's own region). This reports
// any that do not, so a drift is seen at once instead of years later (found 2026-11-22: 929 specials and 174 events
// across 29 venues). The database trigger in docs/region-sync-trigger-draft.md prevents it; this is the check on top.

export interface RegionDrift {
  specials: number;
  events: number;
  venues: number; // distinct venues involved
}

export function describeDrift(d: RegionDrift): { inSync: boolean; summary: string } {
  if (d.specials === 0 && d.events === 0) return { inSync: true, summary: "All specials and events are tagged with their venue's region (in sync)." };
  const parts: string[] = [];
  if (d.specials > 0) parts.push(`${d.specials} special${d.specials === 1 ? "" : "s"}`);
  if (d.events > 0) parts.push(`${d.events} event${d.events === 1 ? "" : "s"}`);
  return {
    inSync: false,
    summary: `${parts.join(" and ")} across ${d.venues} venue${d.venues === 1 ? "" : "s"} carry a different region than their venue.`,
  };
}

export async function getRegionDrift(): Promise<RegionDrift> {
  const [row] = (await db.execute(sql`
    select
      (select count(*) from specials.specials s join specials.venues v on v.id = s.venue_id where s.region_id <> v.region_id)::int as specials,
      (select count(*) from specials.events e join specials.venues v on v.id = e.venue_id where e.region_id <> v.region_id)::int as events,
      (select count(*) from (
         select s.venue_id from specials.specials s join specials.venues v on v.id = s.venue_id where s.region_id <> v.region_id
         union
         select e.venue_id from specials.events e join specials.venues v on v.id = e.venue_id where e.region_id <> v.region_id
       ) x)::int as venues`)) as unknown as RegionDrift[];
  return row ?? { specials: 0, events: 0, venues: 0 };
}

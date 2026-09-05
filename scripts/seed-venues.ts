import { db, venues } from "@/db";

interface SeedVenue {
  name: string;
  address: string;
  lat?: number;
  lng?: number;
  phone?: string;
  website?: string;
  menuUrl?: string;
  instagramHandle?: string;
  sourceUrls?: string[];
}

// Fill in the real ~30 Kelowna venues here. The 5 below are real examples
// showing the shape — update URLs/phones/coords as you confirm them.
const SEED_VENUES: SeedVenue[] = [
  {
    name: "Tonics Pub",
    address: "1483 Sutherland Ave, Kelowna, BC",
    website: "https://tonicspub.com",
    menuUrl: "https://tonicspub.com/menu",
  },
  {
    name: "O'Flannigan's",
    address: "255 Hwy 33 W, Kelowna, BC",
    website: "https://oflannigans.ca",
    menuUrl: "https://oflannigans.ca/menu",
  },
  {
    name: "Earls Kelowna",
    address: "211 Bernard Ave, Kelowna, BC",
    website: "https://www.earls.ca/locations/kelowna",
    menuUrl: "https://www.earls.ca/locations/kelowna",
  },
  {
    name: "Train Station Pub",
    address: "1140 Station Ave, Kelowna, BC",
    website: "https://www.trainstationpub.com",
    menuUrl: "https://www.trainstationpub.com/menu",
  },
  {
    name: "WINGS Rutland",
    address: "170 Hollywood Rd S, Kelowna, BC",
    website: "https://wingsrestaurant.ca",
    menuUrl: "https://wingsrestaurant.ca/menu",
  },

  // Add the remaining ~25 venues below in the same shape.
];

async function main() {
  for (const v of SEED_VENUES) {
    await db.insert(venues).values({
      name: v.name,
      address: v.address,
      lat: v.lat ?? null,
      lng: v.lng ?? null,
      phone: v.phone ?? null,
      website: v.website ?? null,
      menuUrl: v.menuUrl ?? null,
      instagramHandle: v.instagramHandle ?? null,
      sourceUrls: v.sourceUrls ?? [],
      active: true,
    });
    console.log(`Seeded: ${v.name}`);
  }
  console.log(`Done. Seeded ${SEED_VENUES.length} venue(s).`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

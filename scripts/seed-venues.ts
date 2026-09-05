import { db, venues } from "@/db";
import { sql } from "drizzle-orm";

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

// Verified via web research (WebSearch/WebFetch) — real addresses and official
// websites, not guessed. Re-running this script is safe: it upserts by name,
// so corrections to an address/URL just need an edit here + a re-run.
const SEED_VENUES: SeedVenue[] = [
  // Kelowna
  {
    name: "Tonics Pub",
    address: "1483 Sutherland Ave, Kelowna, BC",
    website: "https://tonicspub.com",
    menuUrl: "https://tonicspub.com/menu",
  },
  {
    name: "O'Flannigan's",
    address: "319 Queensway, Kelowna, BC V1Y 8E6",
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
    address: "1177 Ellis St, Kelowna, BC V1Y 1Z5",
    website: "https://www.trainstationpub.com",
    menuUrl: "https://www.trainstationpub.com/menu",
  },
  {
    name: "WINGS Rutland",
    address: "170 Hollywood Rd S, Kelowna, BC",
    website: "https://wingsrestaurant.ca",
    menuUrl: "https://wingsrestaurant.ca/menu",
  },
  {
    name: "Browns Socialhouse Kelowna",
    address: "1544 Harvey Ave, Kelowna, BC V1Y 6G2",
    website: "https://www.brownssocialhouse.com/harvey",
    menuUrl: "https://www.brownssocialhouse.com/harvey",
  },
  {
    name: "Cactus Club Cafe Banks Rd",
    address: "1575 Banks Rd, Kelowna, BC V1X 7Y1",
    website: "https://www.cactusclubcafe.com/locations/kelowna/",
    menuUrl: "https://www.cactusclubcafe.com/locations/kelowna/",
  },
  {
    name: "Cactus Club Cafe Kelowna Yacht Club",
    address: "1370 Water St #1, Kelowna, BC V1Y 1J1",
    website: "https://www.cactusclubcafe.com/locations/kelowna-yacht-club/",
    menuUrl: "https://www.cactusclubcafe.com/locations/kelowna-yacht-club/",
  },
  {
    name: "Central Kitchen + Bar",
    address: "1155 Ellis St, Kelowna, BC V1Y 1Z4",
    website: "https://centralkelowna.com/",
    menuUrl: "https://centralkelowna.com/",
  },
  {
    name: "Craft Beer Market",
    address: "257 Bernard Ave, Kelowna, BC V1Y 6N2",
    website: "https://www.craftbeermarket.com/locations/kelowna/",
    menuUrl: "https://www.craftbeermarket.com/locations/kelowna/",
  },
  {
    name: "Famoso Pizzeria + Bar",
    address: "3030 Pandosy St Unit 105, Kelowna, BC V1Y 0C4",
    website: "https://famoso.ca/locations/kelowna-sopa-square/",
    menuUrl: "https://famoso.ca/locations/kelowna-sopa-square/",
  },
  {
    name: "Freddy's Brewpub",
    address: "948 McCurdy Rd #124, Kelowna, BC V1X 2P7",
    website: "https://www.mccurdybowl.com/",
    menuUrl: "https://www.mccurdybowl.com/",
  },
  {
    name: "Gulfstream",
    address: "5505 Airport Way, Kelowna, BC V1V 3C3",
    website: "https://www.gulfstreamkelowna.com/",
    menuUrl: "https://www.gulfstreamkelowna.com/",
  },
  {
    name: "Hotel Eldorado Kelowna",
    address: "500 Cook Rd, Kelowna, BC V1W 3G9",
    website: "https://www.hoteleldoradokelowna.com/dining/lakeside-dining",
    menuUrl: "https://www.hoteleldoradokelowna.com/dining/lakeside-dining",
  },
  {
    name: "JOEY Kelowna",
    address: "2475 Hwy 97 #300, Kelowna, BC V1X 4J2",
    website: "https://joeyrestaurants.com/location/joey-kelowna",
    menuUrl: "https://joeyrestaurants.com/menu/joey-kelowna",
  },
  {
    name: "The Keg Steakhouse + Bar",
    address: "1825 Underhill St, Kelowna, BC V1X 8G8",
    website: "https://thekeg.com/en/locations/kelowna",
    menuUrl: "https://thekeg.com/en/locations/kelowna",
  },
  {
    name: "Kelly O'Bryan's & Carlos O'Bryan's",
    address: "262 Bernard Ave, Kelowna, BC V1Y 6N4",
    website: "https://www.kobcob.com/locations/kelowna/",
    menuUrl: "https://www.kobcob.com/locations/kelowna/",
  },
  {
    name: "Milestones Grill + Bar",
    address: "2121 Harvey Ave, Kelowna, BC V1Y 9Z7",
    website: "https://milestonesrestaurants.com/locations/kelowna/",
    menuUrl: "https://milestonesrestaurants.com/locations/kelowna/",
  },
  {
    name: "Micro Bar + Bites",
    address: "1500 Water St, Kelowna, BC V1Y 1J8",
    website: "https://microkelowna.com/",
    menuUrl: "https://microkelowna.com/",
  },
  {
    name: "Moxies Grill & Bar",
    address: "1730 Cooper Rd, Kelowna, BC V1Y 8V5",
    website: "https://moxies.com/restaurants/kelowna-enterprise-way/",
    menuUrl: "https://moxies.com/restaurants/kelowna-enterprise-way/menus/",
  },
  {
    name: "OAK + CRU Social Kitchen & Wine Bar",
    address: "1310 Water St, Kelowna, BC V1Y 9P3",
    website: "https://oakandcru.com/",
    menuUrl: "https://oakandcru.com/oak-cru-menu/",
  },
  {
    name: "Rusty's Sports Lounge",
    address: "1525 Dilworth Dr, Kelowna, BC V1Y 9N5",
    website: "https://rustyslounge.com/",
    menuUrl: "https://rustyslounge.com/",
  },
  {
    name: "The Old Spaghetti Factory",
    address: "1755 Capri St, Kelowna, BC V1Y 9W2",
    website: "https://oldspaghettifactory.ca/locations/kelowna/",
    menuUrl: "https://oldspaghettifactory.ca/locations/kelowna/",
  },
  {
    name: "West Coast Grill & Oyster Bar",
    address: "1675 Abbott St, Kelowna, BC V1Y 8S3",
    website: "https://www.westcoastgrill.ca/",
    menuUrl: "https://www.westcoastgrill.ca/",
  },
  {
    name: "White Spot Kelowna",
    address: "2190 Harvey Ave, Kelowna, BC V1Y 6G8",
    website: "https://www.whitespot.ca/location/kelowna",
    menuUrl: "https://www.whitespot.ca/location/kelowna",
  },
  {
    name: "BNA Brewing Co. & Eatery",
    address: "1250 Ellis St, Kelowna, BC V1Y 1Z4",
    website: "https://www.bnabrewing.com/bna-kelowna",
    menuUrl: "https://www.bnabrewing.com/bna-kelowna-menu",
  },
  {
    name: "Perch Sky Lounge",
    address: "701-460 Doyle Ave, Kelowna, BC V1Y 2A2",
    website: "https://perchskylounge.com/",
    menuUrl: "https://perchskylounge.com/",
  },
  {
    name: "Erica Jane",
    address: "1187 Sunset Dr #2, Kelowna, BC V1Y 9W7",
    website: "https://www.erica-jane.com/",
    menuUrl: "https://www.erica-jane.com/menu/",
  },
  {
    name: "97 Street Pub",
    address: "2400 Highway 97 N, Kelowna, BC V1X 4J1",
    website: "https://97streetpub.com/",
    menuUrl: "https://97streetpub.com/",
  },
  {
    name: "Leopold's Tavern",
    address: "279 Bernard Ave, Kelowna, BC",
    website: "https://leopoldstavern.com/",
    menuUrl: "https://leopoldstavern.com/",
  },
  {
    name: "Creekside Pub & Grill",
    address: "3929 Lakeshore Rd, Kelowna, BC V1W 1V3",
    website: "https://www.creeksidepub.ca/",
    menuUrl: "https://www.creeksidepub.ca/",
  },
  {
    name: "Skinny Duke's Glorious Emporium",
    address: "1481 Water St, Kelowna, BC V1Y 1J6",
    website: "https://www.skinnydukes.com/",
    menuUrl: "https://www.skinnydukes.com/",
  },

  // West Kelowna
  {
    name: "Whiski-Jack's Pub",
    address: "2442 Drought Rd, West Kelowna, BC V4T 1P7",
    website: "https://www.whiskijackspub.com/",
    menuUrl: "https://www.whiskijackspub.com/",
  },
  {
    name: "Turtle Jack's Kitchen & Bar",
    address: "2569 Dobbin Road, West Kelowna, BC",
    website: "https://turtlejacks.com/locations/turtle-jacks-kelowna",
    menuUrl: "https://turtlejacks.com/locations/turtle-jacks-kelowna",
  },
  {
    name: "Sammy J's Grill & Bar",
    address: "190-525 Hwy 97, West Kelowna, BC",
    website: "https://www.sammyjs.ca/westkelowna/",
    menuUrl: "https://www.sammyjs.ca/westkelowna/",
  },
  {
    name: "Whiski-Jack's Pins & Pints",
    address: "525 BC-97 #620, West Kelowna, BC V1Z 4C9",
    website: "https://www.wjpinsandpints.com/",
    menuUrl: "https://www.wjpinsandpints.com/",
  },
  {
    name: "Friends Pub & Liquor Store",
    address: "2210 Boucherie Road, West Kelowna, BC V1Z 2E5",
    website: "https://www.friendspubkelowna.com/",
    menuUrl: "https://www.friendspubkelowna.com/",
  },
  {
    name: "19 Okanagan Grill + Bar",
    address: "3509 Carrington Road, West Kelowna, BC V4T 2E6",
    website: "https://www.dine19.com/",
    menuUrl: "https://www.dine19.com/",
  },
  {
    name: "Broken Hearts Club (Crown & Thieves Winery)",
    address: "3887 Brown Road, West Kelowna, BC V4T 2J3",
    website: "https://crownthieves.com/",
    menuUrl: "https://crownthieves.com/pages/about",
  },
  {
    name: "The Modest Butcher",
    address: "829 Douglas Rd, West Kelowna, BC V1Z 1N9",
    website: "https://modestbutcher.com/",
    menuUrl: "https://modestbutcher.com/",
  },

  // Lake Country / Winfield
  {
    name: "Turtle Bay Pub",
    address: "2850 Woodsdale Rd, Lake Country, BC V4V 1Y1",
    website: "https://turtlebaypub.com/",
    menuUrl: "https://turtlebaypub.com/",
  },
  {
    name: "Woody's Pub",
    address: "9882 Hwy 97, Lake Country (Winfield), BC V4V 1V7",
    website: "https://woodsmangroup.com/woodys-pub/",
    menuUrl: "https://woodsmangroup.com/woodys-pub/",
  },
];

async function main() {
  for (const v of SEED_VENUES) {
    await db
      .insert(venues)
      .values({
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
      })
      .onConflictDoUpdate({
        target: venues.name,
        set: {
          address: sql`excluded.address`,
          lat: sql`excluded.lat`,
          lng: sql`excluded.lng`,
          phone: sql`excluded.phone`,
          website: sql`excluded.website`,
          menuUrl: sql`excluded.menu_url`,
          instagramHandle: sql`excluded.instagram_handle`,
          sourceUrls: sql`excluded.source_urls`,
          active: sql`excluded.active`,
        },
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

import { formatPrice } from "./format";

// Search-result titles for the region home page and venue pages. Pure so the wording is
// unit-tested; the pages only supply the data.

// "Sherwood Park Food Deals" -> "Sherwood Park". Splitting on the first space (the old
// approach) turned that into "Sherwood".
export function areaNameFromBrand(brandName: string): string {
  return brandName.replace(/ Food Deals$| Bons Plans$/, "");
}

// French regions keep their existing title: the wording needs a proper French review.
export function regionHomeTitle(brandName: string, language: string): string {
  if (language === "fr") return `${brandName} -- Food & Drink Deals Today`;
  return `${areaNameFromBrand(brandName)} Deals Today -- Happy Hours & Food Specials`;
}

// "Happy Hour & Menu" is only promised when the venue really has specials or menu items.
// Returns { absolute } for English so the region's "%s -- Brand" template is bypassed.
export function venueTitle(opts: {
  name: string;
  brandName: string;
  language: string;
  hasSpecialsOrMenu: boolean;
}): string | { absolute: string } {
  if (opts.language === "fr") return opts.name;
  const area = areaNameFromBrand(opts.brandName);
  return { absolute: `${opts.name}${opts.hasSpecialsOrMenu ? " Happy Hour & Menu" : ""} -- ${area}` };
}

// Weekday pages (/kelowna/friday). Searches here read "friday food deals" and "wednesday food
// specials" (Search Console, Nov 2026), so the title leads with the area, "Food Deals" and the
// weekday. The page passes it as an absolute title so the "-- Brand" template (which already says
// "Food Deals") is not stacked on top of it.
export function dayPageTitle(areaName: string, dayLabel: string): string {
  return `${areaName} Food Deals on ${dayLabel}: Happy Hour & Specials`;
}

// Venue-page snippet. Searches here are mostly the venue's own name ("ask pablo menu"), so the
// description leads with what the venue really has on, in its own words, instead of a generic line.
// Deals are already collapsed to a day range (lib/group-days.ts); French regions and venues with no
// deals keep the existing wording.
export interface DescriptionDeal {
  title: string;
  priceCents: number | null;
  dayLabel: string | null;
}

const MAX_DESCRIPTION = 160;

export function venueDescription(opts: {
  name: string;
  address: string;
  language: string;
  deals: DescriptionDeal[];
}): string {
  const { name, address } = opts;
  if (opts.language === "fr") {
    return `Spéciaux repas et boissons, événements et informations pour ${name} -- ${address}. Vérifiés, pas devinés.`;
  }
  const generic = `Current food/drink specials, events, and info for ${name} -- ${address}. Verified, not guessed.`;
  const parts = opts.deals.slice(0, 3).map((d) => {
    const price = d.priceCents === null ? "" : ` ${formatPrice(d.priceCents)}`;
    const days = d.dayLabel ? ` (${d.dayLabel})` : "";
    return `${d.title}${price}${days}`;
  });
  // Drop the last deal until the whole line fits what Google shows.
  while (parts.length > 0) {
    const line = `${name}, ${address}: ${parts.join(", ")}. Checked by TodaysTab.`;
    if (line.length <= MAX_DESCRIPTION) return line;
    parts.pop();
  }
  return generic;
}

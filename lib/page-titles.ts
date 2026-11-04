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

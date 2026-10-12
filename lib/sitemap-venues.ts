// Which venue pages belong in the sitemap, and with what last-modified date.
// A venue with no current specials and no events is a thin page ("No current specials on
// file"); listing thousands of those with a made-up "modified today" date dilutes the
// crawl budget for the pages that have real content. The pages stay live and reachable,
// they just aren't advertised to Google until there is something on them.
export function selectSitemapVenues(
  venues: { id: number }[],
  specialsVerified: Map<number, Date>,
  eventsVerified: Map<number, Date>
): { id: number; lastModified: Date }[] {
  const out: { id: number; lastModified: Date }[] = [];
  for (const v of venues) {
    const s = specialsVerified.get(v.id);
    const e = eventsVerified.get(v.id);
    if (!s && !e) continue;
    const lastModified = s && e ? (s > e ? s : e) : (s ?? e)!;
    out.push({ id: v.id, lastModified });
  }
  return out;
}

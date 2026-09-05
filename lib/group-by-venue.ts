export interface VenueGroup<T> {
  key: string;
  venueId: number | null;
  venueName: string;
  items: T[];
}

export function groupByVenue<T extends { venueId: number | null; venueName: string }>(
  items: T[]
): VenueGroup<T>[] {
  const map = new Map<string, VenueGroup<T>>();
  for (const item of items) {
    const key = item.venueId !== null ? `v${item.venueId}` : `n:${item.venueName}`;
    let group = map.get(key);
    if (!group) {
      group = { key, venueId: item.venueId, venueName: item.venueName, items: [] };
      map.set(key, group);
    }
    group.items.push(item);
  }
  return Array.from(map.values());
}

export interface VenueGroup<T> {
  venueId: number;
  venueName: string;
  items: T[];
}

export function groupByVenue<T extends { venueId: number; venueName: string }>(
  items: T[]
): VenueGroup<T>[] {
  const map = new Map<number, VenueGroup<T>>();
  for (const item of items) {
    let group = map.get(item.venueId);
    if (!group) {
      group = { venueId: item.venueId, venueName: item.venueName, items: [] };
      map.set(item.venueId, group);
    }
    group.items.push(item);
  }
  return Array.from(map.values());
}

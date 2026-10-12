// Collects which venues' cards a visitor actually saw, so they can be sent as a few batched
// "venue_impressions" analytics events instead of one row per card. Each venue counts once
// per page view. Labels stay under the 200 character limit /api/track accepts.
export const IMPRESSION_LABEL_MAX = 200;

export function createImpressionBatcher() {
  let seen = new Set<number>();
  let pending: number[] = [];

  return {
    add(venueId: number): boolean {
      if (!Number.isInteger(venueId) || venueId <= 0 || seen.has(venueId)) return false;
      seen.add(venueId);
      pending.push(venueId);
      return true;
    },
    flush(): string[] {
      const labels: string[] = [];
      let current = "";
      for (const id of pending) {
        const next = current ? `${current},${id}` : String(id);
        if (next.length > IMPRESSION_LABEL_MAX) {
          labels.push(current);
          current = String(id);
        } else {
          current = next;
        }
      }
      if (current) labels.push(current);
      pending = [];
      return labels;
    },
    reset() {
      seen = new Set();
      pending = [];
    },
  };
}

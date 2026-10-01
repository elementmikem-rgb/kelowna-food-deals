import type { EventType } from "@/db/schema";

// Single source of truth for the /[region]/events/[slug] event-type URL
// segments -- same pattern as lib/category-slugs.ts. "other" is deliberately
// excluded for the same reason: a catch-all bucket nobody searches for by name.
// sports_night gets no page here: autosuggest research (2026-10-01) showed
// "sports bar <city>" searches are venue-discovery intent ("best sports bar",
// "near me"), not deal/event-seeking intent -- a dedicated page would be thin
// content chasing a search pattern that doesn't actually exist.
export const EVENT_TYPE_SLUGS: Record<string, EventType> = {
  trivia: "trivia",
  karaoke: "karaoke",
  "live-music": "live_music",
};

export function eventTypeFromSlug(slug: string): EventType | null {
  return EVENT_TYPE_SLUGS[slug] ?? null;
}

const EVENT_TYPE_PAGE_LABELS: Partial<Record<EventType, string>> = {
  trivia: "Trivia Night",
  karaoke: "Karaoke",
  live_music: "Live Music",
};

export function eventTypePageLabel(eventType: EventType): string {
  return EVENT_TYPE_PAGE_LABELS[eventType] ?? eventType;
}

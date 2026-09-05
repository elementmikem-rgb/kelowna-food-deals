export function formatPrice(cents: number | null): string | null {
  if (cents === null) return null;
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

export const CATEGORY_LABELS: Record<string, string> = {
  happy_hour: "Happy Hour",
  food_special: "Food Special",
  wing_night: "Wing Night",
  other: "Other",
};

export const EVENT_TYPE_LABELS: Record<string, string> = {
  live_music: "Live Music",
  trivia: "Trivia",
  karaoke: "Karaoke",
  sports_night: "Sports Night",
  other: "Other",
};

export function formatEventDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" });
}

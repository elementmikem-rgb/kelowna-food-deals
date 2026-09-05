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

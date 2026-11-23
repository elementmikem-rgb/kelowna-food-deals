export function formatPercent(r: number | null): string {
  if (r === null) return "-";
  const pct = r * 100;
  // Small rates need a decimal, or 1.4% and 4.0% both look like round numbers and hide how big the gap is.
  return pct === 0 ? "0%" : pct < 10 ? `${pct.toFixed(1)}%` : `${Math.round(pct)}%`;
}

export function formatHours(h: number | null): string {
  if (h === null) return "-";
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 24) return `${Number.isInteger(h) ? h : h.toFixed(1)} h`;
  const days = h / 24;
  return `${Number.isInteger(days) ? days : days.toFixed(1)} days`;
}

export function languageLabel(code: string): string {
  return code === "en" ? "English" : code === "fr" ? "French" : code;
}

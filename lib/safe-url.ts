// A link taken from outside data (an events feed, a scraped page) is only ever shown as a link when it is a
// plain web address. A "javascript:" or "data:" value in an href would run script when clicked.
export function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

// Same, but only for a given site: used when a feed should only ever point at its own domain.
export function safeUrlOnHost(value: string | null | undefined, host: string): string | null {
  const url = safeHttpUrl(value);
  if (!url) return null;
  const h = new URL(url).hostname.toLowerCase();
  return new URL(url).protocol === "https:" && (h === host || h.endsWith(`.${host}`)) ? url : null;
}

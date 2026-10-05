// Plain-JS name-similarity check for the admin submissions queue's duplicate-venue
// warning (see AdminSubmissionRow.tsx) -- no DB extension (e.g. pg_trgm) needed since
// each region only has a few dozen venues to compare against, cheap to do in memory.

function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function bigrams(s: string): string[] {
  const padded = ` ${s} `;
  const result: string[] = [];
  for (let i = 0; i < padded.length - 1; i++) {
    result.push(padded.slice(i, i + 2));
  }
  return result;
}

// Sørensen-Dice coefficient over character bigrams, 0 (no overlap) to 1 (identical after
// normalizing case/accents/punctuation). Catches the common real-world near-misses a
// visitor's free-text venue name produces -- "Tonic's Pub" vs "Tonics Pub", "Earls" vs
// "Earls Kelowna", a missing/extra word -- without needing a spellchecker or a DB extension.
export function nameSimilarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;

  const ba = bigrams(na);
  const bb = bigrams(nb);
  if (ba.length === 0 || bb.length === 0) return na === nb ? 1 : 0;

  const counts = new Map<string, number>();
  for (const g of ba) counts.set(g, (counts.get(g) ?? 0) + 1);

  let overlap = 0;
  for (const g of bb) {
    const remaining = counts.get(g) ?? 0;
    if (remaining > 0) {
      overlap++;
      counts.set(g, remaining - 1);
    }
  }

  return (2 * overlap) / (ba.length + bb.length);
}

export interface SimilarVenue {
  id: number;
  name: string;
  score: number;
}

// Threshold picked to catch real near-duplicates ("Tonic's Pub" vs "Tonics Pub" scores
// ~0.9) without flooding every submission with loosely-related suggestions -- two
// unrelated short names can share a lot of bigrams by chance, so this stays fairly high.
export const SIMILAR_VENUE_THRESHOLD = 0.5;
const MAX_SUGGESTIONS = 3;

export function findSimilarVenues(
  name: string,
  candidates: { id: number; name: string }[]
): SimilarVenue[] {
  return candidates
    .map((c) => ({ id: c.id, name: c.name, score: nameSimilarity(name, c.name) }))
    .filter((c) => c.score >= SIMILAR_VENUE_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_SUGGESTIONS);
}

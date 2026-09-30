import { createHash } from "node:crypto";

// PDF text extraction occasionally decodes a ligature or custom font glyph as a literal
// NUL byte instead of the real character (confirmed live 2026-09-28: Shenanigans Pub &
// Grill's breakfast menu PDF produced "waf\u0000es" for "waffles") -- Postgres text
// columns reject NUL outright, which crashed the nightly cron's batch insert AND the
// error-logging insert that followed it (the failed query's own error message embeds the
// same NUL byte). Stripping every Postgres-unsafe control character here, the one funnel
// all scraped text passes through before hashing/storage, protects every downstream
// insert regardless of which fetch path (HTML, PDF, image transcription) produced it.
function stripUnsafeControlChars(text: string): string {
  // eslint-disable-next-line no-control-regex -- deliberately matching control chars
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
}

export function normalizeText(raw: string): string {
  return stripUnsafeControlChars(raw)
    .replace(/\s+/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .trim()
    .toLowerCase();
}

export function hashText(normalized: string): string {
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}

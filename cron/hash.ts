import { createHash } from "node:crypto";

export function normalizeText(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .trim()
    .toLowerCase();
}

export function hashText(normalized: string): string {
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}

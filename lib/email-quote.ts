// Helpers for collapsing the quoted thread ("> ...") at the bottom of a plain-text email in the
// admin inbox. The split starts at the first quoted line after line 0, so text typed between
// quoted lines (inline replies) lands inside the collapsed block rather than being dropped.

export function splitQuoted(body: string): { main: string; quoted: string | null } {
  const lines = body.split("\n");
  // A body that opens with a quote has no reply of its own to show above it: leave it whole.
  if (lines[0].startsWith(">")) return { main: body, quoted: null };
  let splitAt = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].startsWith(">")) {
      splitAt = i;
      break;
    }
  }
  if (splitAt === -1) return { main: body, quoted: null };
  const mainLines = lines.slice(0, splitAt);
  while (mainLines.length > 0 && mainLines[mainLines.length - 1].trim() === "") mainLines.pop();
  return { main: mainLines.join("\n"), quoted: lines.slice(splitAt).join("\n") };
}

export function stripQuotePrefix(text: string): string {
  return text
    .split("\n")
    .map((line) => (line.startsWith("> ") ? line.slice(2) : line.startsWith(">") ? line.slice(1) : line))
    .join("\n");
}

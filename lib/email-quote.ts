// Helpers for collapsing the quoted thread ("> ...") in a plain-text email in the admin inbox.
//
// The collapsed block runs from the first quoted line (after line 0) to the LAST quoted line.
// Anything after that is returned as `after` and stays visible: many people reply BELOW the quote
// (bottom-posting), and hiding that text would hide the actual reply. Text typed between quoted
// lines (inline replies) lands inside the block, where the toggle reveals it.

export interface QuoteSplit {
  main: string;
  quoted: string | null;
  after: string;
}

export function splitQuoted(body: string): QuoteSplit {
  const lines = body.split("\n");
  // A body that opens with a quote has no reply of its own to show above it: leave it whole.
  if (lines[0].startsWith(">")) return { main: body, quoted: null, after: "" };

  let first = -1;
  let last = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].startsWith(">")) {
      if (first === -1) first = i;
      last = i;
    }
  }
  if (first === -1) return { main: body, quoted: null, after: "" };

  const mainLines = lines.slice(0, first);
  while (mainLines.length > 0 && mainLines[mainLines.length - 1].trim() === "") mainLines.pop();
  const afterLines = lines.slice(last + 1);
  while (afterLines.length > 0 && afterLines[0].trim() === "") afterLines.shift();
  while (afterLines.length > 0 && afterLines[afterLines.length - 1].trim() === "") afterLines.pop();

  return {
    main: mainLines.join("\n"),
    quoted: lines.slice(first, last + 1).join("\n"),
    after: afterLines.join("\n"),
  };
}

export function stripQuotePrefix(text: string): string {
  return text
    .split("\n")
    .map((line) => (line.startsWith("> ") ? line.slice(2) : line.startsWith(">") ? line.slice(1) : line))
    .join("\n");
}

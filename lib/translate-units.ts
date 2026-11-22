// Splits an email body into pieces for the on-device translator and puts the translations back with
// the original layout. Translating the whole body in one call loses paragraph breaks, and splitting on
// "\n\n" alone misses Outlook's Windows line endings ("\r\n\r\n") and whitespace-only blank lines.

export interface TranslationUnit {
  text: string; // what is sent to the translator (and what is kept if translate is false)
  translate: boolean;
  sepAfter: string; // line break(s) that followed this unit in the original
}

// Short lines are a signature or address block: keep them on their own lines.
const SHORT_LINE_MAX = 60;

function worthTranslating(s: string): boolean {
  const t = s.trim();
  if (!/\p{L}{2,}/u.test(t)) return false; // numbers, phone numbers, punctuation only
  if (/^(https?:\/\/\S+|\S+@\S+\.\S+)$/.test(t)) return false; // a bare link or email address
  return true;
}

export function splitForTranslation(raw: string): TranslationUnit[] {
  const text = raw
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t ]+\n/g, "\n") // trailing spaces make "blank" lines non-blank
    .replace(/^[ \t ]+$/gm, "");
  // Capturing split: [para, separator, para, separator, ...]
  const pieces = text.split(/(\n{2,})/);
  const units: TranslationUnit[] = [];
  for (let i = 0; i < pieces.length; i += 2) {
    const para = pieces[i];
    const sepAfterPara = pieces[i + 1] ?? "";
    if (para === "") {
      // Leading blank space or an empty paragraph: keep the separator so layout is unchanged.
      if (sepAfterPara) units.push({ text: "", translate: false, sepAfter: sepAfterPara });
      continue;
    }
    const lines = para.split("\n");
    if (lines.length > 1 && lines.every((l) => l.length <= SHORT_LINE_MAX)) {
      lines.forEach((line, idx) => {
        units.push({
          text: line,
          translate: worthTranslating(line),
          sepAfter: idx === lines.length - 1 ? sepAfterPara : "\n",
        });
      });
    } else {
      // A hard-wrapped paragraph: one unit, so each sentence is translated whole.
      const joined = lines.join(" ");
      units.push({ text: joined, translate: worthTranslating(joined), sepAfter: sepAfterPara });
    }
  }
  return units;
}

export function joinTranslated(units: TranslationUnit[], translated: string[]): string {
  return units.map((u, i) => (translated[i] ?? u.text) + u.sepAfter).join("");
}

// The on-device translator mangles a few one-word greetings and closings ("Merci" becomes "Thank",
// "Salut" becomes "Salvation"). These are fixed answers, matched case-insensitively, with any trailing
// punctuation kept and the French space before ! ? : ; dropped.
const GLOSSARY: Record<string, string> = {
  merci: "Thank you",
  bonjour: "Hello",
  bonsoir: "Good evening",
  salut: "Hi",
  cordialement: "Kind regards",
  "bien cordialement": "Kind regards",
  "bonne journée": "Have a good day",
  "bonne soirée": "Have a good evening",
};

export function glossaryTranslation(text: string): string | null {
  const m = text.trim().match(/^(\p{L}[\p{L}' ]*?)\s*([.!?,;:]*)$/u);
  if (!m) return null;
  const hit = GLOSSARY[m[1].toLowerCase()];
  return hit ? hit + m[2] : null;
}

// A bare word with no context translates badly, so it is sent with a trailing period and finished here.
export function isSingleWord(text: string): boolean {
  return /^\p{L}[\p{L}'-]*$/u.test(text.trim());
}

export function finishSingleWord(original: string, translated: string): string {
  const stripped = translated.trim().replace(/\.$/, "");
  if (!stripped) return stripped;
  const first = original.trim()[0];
  const wasUpper = first === first.toUpperCase() && first !== first.toLowerCase();
  return (wasUpper ? stripped[0].toUpperCase() : stripped[0].toLowerCase()) + stripped.slice(1);
}

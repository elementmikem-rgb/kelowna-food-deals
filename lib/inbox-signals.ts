// Spotting what a venue's reply is really about, so the inbox can surface a stop request (a legal duty under
// CASL) or a sales lead (revenue). Pure text rules, English and French. Both look only at the sender's OWN new
// words: quoted history often contains our own "unsubscribe" footer, which must never count.

// Cuts a plain-text email down to what the sender typed this time: no "> " quote lines, and nothing after a
// "wrote:" / "a écrit :" header or an Outlook separator. Bottom-posted replies below a quote are kept.
export function ownText(body: string): string {
  const out: string[] = [];
  for (const line of body.split("\n")) {
    const t = line.trim();
    if (/^_{10,}/.test(t)) break;
    if (/^(from|de|von)\s*:/i.test(t)) break;
    if (/^on .{5,200}wrote\s*:?$/i.test(t)) break;
    if (/^le .{5,200}a écrit\s*:?$/i.test(t)) break;
    if (t.startsWith(">")) continue;
    out.push(line);
  }
  return cutInlineQuote(out.join("\n")).trim();
}

// Mobile and web mail clients often flatten a reply onto one line, so the quote starts mid-line. Cut at the
// first marker of quoted history, wherever it falls.
const INLINE_QUOTE_MARKERS: RegExp[] = [
  /-{2,}\s*(original message|message d'origine|forwarded message|message transf)/i,
  /-{2,}\s*on\s.{5,200}?\bwrote\s*-{2,}/i,
  /\bon\s+(mon|tue|wed|thu|fri|sat|sun)[a-z]*,?\s.{5,200}?\bwrote\s*:/i,
  /\ble\s+(lun|mar|mer|jeu|ven|sam|dim)[a-z.]*,?\s.{5,200}?\ba écrit\s*:/i,
  /\bfrom:\s.{0,100}?\b(sent|date):/i,
];

function cutInlineQuote(text: string): string {
  let cut = text.length;
  for (const re of INLINE_QUOTE_MARKERS) {
    const m = re.exec(text);
    if (m && m.index < cut) cut = m.index;
  }
  return text.slice(0, cut);
}

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’‘`]/g, "'");
}

const STOP_PATTERNS: RegExp[] = [
  /\bunsubscribe/,
  /\b(remove|take|delete|drop)\s+(me|us|my|our)\b[^.\n]{0,40}\b(list|email|mailing|contact|database|newsletter)/,
  /\b(remove|take)\s+(me|us)\s+(off|from)\b/,
  /\bremove\s+(me|us)\b/,
  /\b(stop|quit|cease)\s+(emailing|sending|contacting|messaging|writing)\b/,
  /\bdo\s*n'?o?t\s+(email|contact|message|write|send)\s+(me|us)\b/,
  /\b(don't|dont|do not|never)\s+(email|contact)\s+(me|us)\b/,
  /\bno longer (wish|want|care) to (receive|get|hear)\b/,
  /\bdesabonn/,
  /\b(retirez|enlevez|supprimez|effacez)[- ](moi|nous)\b/,
  /\bne\s+(plus|jamais)\s+(me|nous|m')\s*(contacter|ecrire|envoyer|joindre)\b/,
  /\bne\s+(veux|voulons|souhaite|souhaitons)\s+plus\s+(recevoir|etre contacte)/,
  /\bne\s+(plus\s+)?(nous\s+)?(contactez|ecrivez|envoyez)\s+plus\b/,
  /\b(arretez|cessez)\s+de\s+(nous|m')\s*(ecrire|envoyer|contacter)\b/,
  /\bretirer\s+(mon|notre)\s+(adresse|courriel|nom)\b/,
  /\b(removed|taken off|deleted)\s+from\s+(your|the)\s+(outreach |email |mailing |contact |distribution )?(list|database|newsletter)/,
  /\bhave\s+(me|us)\s+(removed|taken off)\b/,
];

const DECLINE_PATTERNS: RegExp[] = [
  /\bnot\s+interested\b/,
  /^\W*no,?\s+thank(s| you)\b/,
  /\bpas\s+interesse/,
  /^\W*non,?\s+merci\b/,
];

// A plain "no". Not necessarily a legal stop request, but a venue that says this should not keep getting mail,
// so the inbox suggests unsubscribing. Only short replies count: a long reply is about something else.
export function detectDecline(text: string): boolean {
  const t = norm(text).trim();
  return t.length > 0 && t.length < 300 && DECLINE_PATTERNS.some((re) => re.test(t));
}

export function detectStopRequest(text: string): boolean {
  const t = norm(text);
  return t.length > 0 && STOP_PATTERNS.some((re) => re.test(t));
}

const LEAD_PATTERNS: RegExp[] = [
  /\badvertis/,
  /\bsponsor/,
  /\b(your|ad|advertising|listing)\s+(rates|pricing|prices)\b/,
  /\bpricing\s+(sheet|info|details|options|plans?)\b/,
  /\bwhat\s+(are|is)\s+(your|the)\s+(rates|pricing|prices|cost|fees?)\b/,
  /\bhow\s+much\s+(does|would|do)\s+(it|this|that|a listing|advertising)\b[^.?\n]{0,30}\bcost/,
  /\bwhat\s+does\s+it\s+cost\b/,
  /\bcost\s+to\s+(list|advertise|be featured|be listed|promote)\b/,
  /\b(be|get|become)\s+featured\b/,
  /\bfeatured\s+(spot|listing|placement)\b/,
  /\bmedia\s+kit\b/,
  /\bpublicite/,
  /\bcommandit/,
  /\btarifs?\b/,
  /\bcombien\s+(ca|cela)\s+cout/,
  /\bcombien\s+cout/,
  /\b(mis|mise|mettre)\s+en\s+(vedette|avant)\b/,
];

export function detectLead(text: string): boolean {
  const t = norm(text);
  return t.length > 0 && LEAD_PATTERNS.some((re) => re.test(t));
}

export interface ThreadSignals {
  stop: boolean; // asked to be removed or unsubscribed (a legal duty to act on)
  decline: boolean; // a plain no, worth suggesting an unsubscribe
  lead: boolean; // asked about advertising, pricing or sponsoring (revenue)
}

export function threadSignals(body: string | null | undefined): ThreadSignals {
  const own = ownText(body ?? "");
  return { stop: detectStopRequest(own), decline: detectDecline(own), lead: detectLead(own) };
}

// A stop request or decline that has already been acted on (the venue is unsubscribed) needs no more attention.
export function settleSignals(s: ThreadSignals, venueUnsubscribed: boolean): ThreadSignals {
  return venueUnsubscribed ? { ...s, stop: false, decline: false } : s;
}

import { isConversationalSend } from "@/lib/inbox-folders";

// How well the cold outreach is working: how many venues we first emailed went on to reply, split by region,
// language and email style, how long replies take, and how fast we answer. Pure calculation over rows the page
// loads; nothing here reads the database.

export interface SendRow {
  venueId: number;
  kind: string;
  variant: string | null;
  status: string;
  at: Date;
  subject: string | null;
  openedAt: Date | null;
  clickedAt: Date | null;
}
export interface ReplyRow {
  venueId: number;
  at: Date;
}
export interface VenueInfo {
  regionLabel: string;
  language: string;
}
export interface Group {
  label: string;
  contacted: number;
  replied: number;
  rate: number | null;
}

// Below this many venues contacted, a rate is mostly noise.
const SMALL_SAMPLE = 20;
const HOUR = 3_600_000;

export function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function rate(replied: number, contacted: number): number | null {
  return contacted === 0 ? null : replied / contacted;
}

type Tally = Map<string, { contacted: number; replied: number }>;

function toGroups(map: Tally): Group[] {
  return [...map.entries()]
    .map(([label, g]) => ({ label, contacted: g.contacted, replied: g.replied, rate: rate(g.replied, g.contacted) }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function bump(m: Tally, key: string, replied: boolean): void {
  const g = m.get(key) ?? { contacted: 0, replied: 0 };
  g.contacted++;
  if (replied) g.replied++;
  m.set(key, g);
}

export function analyzeReplies(input: { sends: SendRow[]; replies: ReplyRow[]; venues: Map<number, VenueInfo> }) {
  // A venue counts as contacted from its earliest successful first_contact send.
  const firstContact = new Map<number, SendRow>();
  const engaged = new Map<number, { opened: boolean; clicked: boolean }>();
  for (const s of input.sends) {
    if (s.kind !== "first_contact" || (s.status !== "sent" && s.status !== "replied")) continue;
    const prev = firstContact.get(s.venueId);
    if (!prev || s.at < prev.at) firstContact.set(s.venueId, s);
    const e = engaged.get(s.venueId) ?? { opened: false, clicked: false };
    if (s.openedAt) e.opened = true;
    if (s.clickedAt) e.clicked = true;
    engaged.set(s.venueId, e);
  }

  const repliesByVenue = new Map<number, Date[]>();
  for (const r of input.replies) {
    const list = repliesByVenue.get(r.venueId) ?? [];
    list.push(r.at);
    repliesByVenue.set(r.venueId, list);
  }
  const answersByVenue = new Map<number, Date[]>();
  for (const s of input.sends) {
    if (!isConversationalSend({ kind: s.kind, variant: s.variant, subject: s.subject })) continue;
    const list = answersByVenue.get(s.venueId) ?? [];
    list.push(s.at);
    answersByVenue.set(s.venueId, list);
  }

  const region: Tally = new Map();
  const language: Tally = new Map();
  const variant: Tally = new Map();

  let replied = 0;
  const firstReplyHours: number[] = [];
  const ourHours: number[] = [];
  let answered = 0;
  let unanswered = 0;
  let opened = 0;
  let clicked = 0;

  for (const [venueId, first] of firstContact) {
    // Only a reply that arrived after we first wrote counts.
    const after = (repliesByVenue.get(venueId) ?? [])
      .filter((t) => t >= first.at)
      .sort((a, b) => a.getTime() - b.getTime());
    const did = after.length > 0;
    if (did) {
      replied++;
      firstReplyHours.push((after[0].getTime() - first.at.getTime()) / HOUR);
      const ours = (answersByVenue.get(venueId) ?? [])
        .filter((t) => t >= after[0])
        .sort((a, b) => a.getTime() - b.getTime());
      if (ours.length > 0) {
        answered++;
        ourHours.push((ours[0].getTime() - after[0].getTime()) / HOUR);
      } else {
        unanswered++;
      }
    }
    const info = input.venues.get(venueId);
    bump(region, info?.regionLabel ?? "Unknown", did);
    bump(language, info?.language ?? "unknown", did);
    bump(variant, first.variant ?? "unknown", did);
    const e = engaged.get(venueId);
    if (e?.opened) opened++;
    if (e?.clicked) clicked++;
  }

  const contacted = firstContact.size;
  return {
    overall: { contacted, replied, rate: rate(replied, contacted) },
    byRegion: toGroups(region),
    byLanguage: toGroups(language),
    byVariant: toGroups(variant),
    hoursToFirstReply: median(firstReplyHours),
    ourResponse: { answered, unanswered, medianHours: median(ourHours) },
    engagement: { opened, clicked, contacted },
    smallSampleBelow: SMALL_SAMPLE,
  };
}

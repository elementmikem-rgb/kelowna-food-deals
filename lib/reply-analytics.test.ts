import { describe, it, expect } from "vitest";
import { analyzeReplies, median, rate, type SendRow, type ReplyRow, type VenueInfo } from "./reply-analytics";

const d = (s: string) => new Date(`2026-11-${s}:00Z`);

const send = (o: Partial<SendRow> & { venueId: number; at: Date }): SendRow => ({
  kind: "first_contact",
  variant: "branded",
  status: "sent",
  subject: "Got a listing started",
  openedAt: null,
  clickedAt: null,
  ...o,
});

const venues = new Map<number, VenueInfo>([
  [1, { regionLabel: "Kelowna", language: "en" }],
  [2, { regionLabel: "Kelowna", language: "en" }],
  [3, { regionLabel: "Montreal", language: "fr" }],
  [4, { regionLabel: "Montreal", language: "fr" }],
]);

describe("median and rate", () => {
  it("median of an odd, even and empty list", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBeNull();
  });
  it("rate is a fraction, and null with nothing contacted", () => {
    expect(rate(1, 4)).toBe(0.25);
    expect(rate(0, 0)).toBeNull();
  });
});

describe("analyzeReplies", () => {
  const sends = [
    send({ venueId: 1, at: d("01T10:00"), variant: "branded", openedAt: d("01T11:00") }),
    send({ venueId: 2, at: d("01T10:00"), variant: "plain" }),
    send({ venueId: 3, at: d("02T10:00"), variant: "plain", clickedAt: d("02T12:00") }),
    send({ venueId: 4, at: d("02T10:00"), variant: "branded" }),
    // a follow-up and a failed send must not count as first contact
    send({ venueId: 2, at: d("08T10:00"), kind: "follow_up" }),
    send({ venueId: 4, at: d("02T09:00"), status: "failed" }),
    // our answer to venue 1
    send({ venueId: 1, at: d("01T16:00"), kind: "admin_reply", variant: null, subject: "Re: Got a listing started" }),
  ];
  const replies: ReplyRow[] = [
    { venueId: 1, at: d("01T12:00") },
    { venueId: 3, at: d("03T10:00") },
    // a reply from before we ever wrote must not count
    { venueId: 2, at: d("01T09:00") },
  ];
  const out = analyzeReplies({ sends, replies, venues });

  it("counts venues contacted and replied, ignoring follow-ups and failed sends", () => {
    expect(out.overall).toEqual({ contacted: 4, replied: 2, rate: 0.5 });
  });

  it("breaks reply rate down by region and language", () => {
    expect(out.byRegion).toEqual([
      { label: "Kelowna", contacted: 2, replied: 1, rate: 0.5 },
      { label: "Montreal", contacted: 2, replied: 1, rate: 0.5 },
    ]);
    expect(out.byLanguage).toEqual([
      { label: "en", contacted: 2, replied: 1, rate: 0.5 },
      { label: "fr", contacted: 2, replied: 1, rate: 0.5 },
    ]);
  });

  it("breaks reply rate down by email style", () => {
    expect(out.byVariant).toEqual([
      { label: "branded", contacted: 2, replied: 1, rate: 0.5 },
      { label: "plain", contacted: 2, replied: 1, rate: 0.5 },
    ]);
  });

  it("measures hours to first reply, as a median", () => {
    // venue 1 took 2 hours, venue 3 took 24 hours
    expect(out.hoursToFirstReply).toBe(13);
  });

  it("measures how fast we answered, and how many replies have no answer yet", () => {
    // venue 1 was answered after 4 hours; venue 3 has no answer
    expect(out.ourResponse).toEqual({ answered: 1, unanswered: 1, medianHours: 4 });
  });

  it("reports opens and clicks among contacted venues", () => {
    expect(out.engagement).toEqual({ opened: 1, clicked: 1, contacted: 4 });
  });

  it("says how small a group must be before its rate is noise", () => {
    expect(out.smallSampleBelow).toBe(20);
  });

  it("copes with no data at all", () => {
    const empty = analyzeReplies({ sends: [], replies: [], venues: new Map() });
    expect(empty.overall).toEqual({ contacted: 0, replied: 0, rate: null });
    expect(empty.byRegion).toEqual([]);
    expect(empty.hoursToFirstReply).toBeNull();
    expect(empty.ourResponse).toEqual({ answered: 0, unanswered: 0, medianHours: null });
  });
});

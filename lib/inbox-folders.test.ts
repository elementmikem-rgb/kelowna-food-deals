import { describe, it, expect } from "vitest";
import { folderFilter, isConversationalSend, asksQuestion, type FolderThread } from "./inbox-folders";

const t = (o: Partial<FolderThread> = {}): FolderThread => ({
  inboundCount: 0,
  archived: false,
  unreadCount: 0,
  lastFromMe: true,
  starred: false,
  snoozed: false,
  lastAt: "2026-11-22T12:00:00Z",
  unsubscribed: false,
  lastSendWasReply: false,
  lastSendAsked: false,
  ...o,
});

describe("folderFilter", () => {
  it("Inbox shows only conversations the venue replied to", () => {
    expect(folderFilter(t({ inboundCount: 0 }), "inbox", false)).toBe(false);
    expect(folderFilter(t({ inboundCount: 2, lastFromMe: false }), "inbox", false)).toBe(true);
  });

  it("a replied conversation stays in Inbox even after we reply last", () => {
    expect(folderFilter(t({ inboundCount: 1, lastFromMe: true }), "inbox", false)).toBe(true);
  });

  it("a search widens Inbox to every non-archived conversation, including unreplied outreach", () => {
    expect(folderFilter(t({ inboundCount: 0 }), "inbox", true)).toBe(true);
  });

  it("Sent shows conversations where we wrote last, including unreplied outreach", () => {
    expect(folderFilter(t({ lastFromMe: true }), "sent", false)).toBe(true);
    expect(folderFilter(t({ inboundCount: 1, lastFromMe: false }), "sent", false)).toBe(false);
  });

  it("Unread shows only unread, non-archived conversations", () => {
    expect(folderFilter(t({ inboundCount: 1, unreadCount: 1 }), "unread", false)).toBe(true);
    expect(folderFilter(t({ inboundCount: 1, unreadCount: 0 }), "unread", false)).toBe(false);
    expect(folderFilter(t({ inboundCount: 1, unreadCount: 1, archived: true }), "unread", false)).toBe(false);
  });

  it("Archived shows only archived conversations; everything else hides them", () => {
    expect(folderFilter(t({ archived: true }), "archive", false)).toBe(true);
    expect(folderFilter(t({ archived: false }), "archive", false)).toBe(false);
    expect(folderFilter(t({ archived: true, inboundCount: 1 }), "inbox", false)).toBe(false);
    expect(folderFilter(t({ archived: true }), "sent", false)).toBe(false);
  });

  it("Starred shows every starred conversation, even an archived one", () => {
    expect(folderFilter(t({ starred: true }), "starred", false)).toBe(true);
    expect(folderFilter(t({ starred: true, archived: true }), "starred", false)).toBe(true);
    expect(folderFilter(t({ starred: false }), "starred", false)).toBe(false);
  });

  it("Snoozed shows only snoozed, non-archived conversations", () => {
    expect(folderFilter(t({ snoozed: true }), "snoozed", false)).toBe(true);
    expect(folderFilter(t({ snoozed: false }), "snoozed", false)).toBe(false);
    expect(folderFilter(t({ snoozed: true, archived: true }), "snoozed", false)).toBe(false);
  });

  it("a snoozed conversation leaves Inbox, Unread and Sent until it wakes", () => {
    const snoozed = t({ inboundCount: 1, unreadCount: 1, lastFromMe: true, snoozed: true });
    expect(folderFilter(snoozed, "inbox", false)).toBe(false);
    expect(folderFilter(snoozed, "unread", false)).toBe(false);
    expect(folderFilter(snoozed, "sent", false)).toBe(false);
  });

  it("searching still finds a snoozed conversation", () => {
    expect(folderFilter(t({ inboundCount: 0, snoozed: true }), "inbox", true)).toBe(true);
  });
});

describe("Follow up folder (they replied, we answered last, then silence)", () => {
  const now = new Date("2026-11-22T12:00:00Z");
  const quiet = (o: Partial<FolderThread> = {}) =>
    t({ inboundCount: 1, lastFromMe: true, lastSendWasReply: true, lastSendAsked: true, lastAt: "2026-11-10T12:00:00Z", ...o });

  it("shows a replied conversation where our answer has had no reply for 7 or more days", () => {
    expect(folderFilter(quiet(), "followup", false, now)).toBe(true);
    expect(folderFilter(quiet({ lastAt: "2026-11-15T12:00:00Z" }), "followup", false, now)).toBe(true);
  });
  it("not yet: under 7 days", () => {
    expect(folderFilter(quiet({ lastAt: "2026-11-16T12:00:00Z" }), "followup", false, now)).toBe(false);
  });
  it("never for cold outreach that nobody replied to", () => {
    expect(folderFilter(quiet({ inboundCount: 0 }), "followup", false, now)).toBe(false);
  });
  it("not when they wrote last", () => {
    expect(folderFilter(quiet({ lastFromMe: false }), "followup", false, now)).toBe(false);
  });
  it("not when our last send was bulk outreach rather than an answer to them", () => {
    expect(folderFilter(quiet({ lastSendWasReply: false }), "followup", false, now)).toBe(false);
  });
  it("not when our last message asked them nothing (a finished conversation)", () => {
    expect(folderFilter(quiet({ lastSendAsked: false }), "followup", false, now)).toBe(false);
  });
  it("not for an unsubscribed venue, archived, or snoozed conversation", () => {
    expect(folderFilter(quiet({ unsubscribed: true }), "followup", false, now)).toBe(false);
    expect(folderFilter(quiet({ archived: true }), "followup", false, now)).toBe(false);
    expect(folderFilter(quiet({ snoozed: true }), "followup", false, now)).toBe(false);
  });
});

describe("isConversationalSend (an answer from Mike, not bulk outreach)", () => {
  it("is true for an admin reply", () => {
    expect(isConversationalSend({ kind: "admin_reply", variant: null, subject: "Re: x" })).toBe(true);
  });
  it("is true for an older reply filed as first_contact with a Re: subject and no variant", () => {
    expect(isConversationalSend({ kind: "first_contact", variant: null, subject: "Re: Got a listing" })).toBe(true);
  });
  it("is false for real outreach, follow-ups and promos", () => {
    expect(isConversationalSend({ kind: "first_contact", variant: "A", subject: "Got a listing started" })).toBe(false);
    expect(isConversationalSend({ kind: "first_contact", variant: null, subject: "Got a listing started" })).toBe(false);
    expect(isConversationalSend({ kind: "follow_up", variant: null, subject: "Re: Got a listing" })).toBe(false);
    expect(isConversationalSend({ kind: "weekend_promo", variant: null, subject: "Weekend" })).toBe(false);
  });
});

describe("asksQuestion", () => {
  it("is true when the message contains a question", () => {
    expect(asksQuestion("<p>Thanks! Could you send the Friday hours?</p>")).toBe(true);
    expect(asksQuestion("Pourriez-vous confirmer les heures ?")).toBe(true);
  });
  it("is false for a statement, and ignores a question mark inside a web address", () => {
    expect(asksQuestion("<p>Done. It is live at <a href=\"https://todaystab.com/x?utm=1\">here</a>.</p>")).toBe(false);
    expect(asksQuestion("Thanks, added.")).toBe(false);
    expect(asksQuestion(null)).toBe(false);
  });
});

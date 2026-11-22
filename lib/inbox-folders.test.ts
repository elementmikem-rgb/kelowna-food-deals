import { describe, it, expect } from "vitest";
import { folderFilter, type FolderThread } from "./inbox-folders";

const t = (o: Partial<FolderThread> = {}): FolderThread => ({
  inboundCount: 0,
  archived: false,
  unreadCount: 0,
  lastFromMe: true,
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
});

// Which conversations each admin inbox folder shows. Kept pure so the rules are tested.
//
// The thread list is built from inbound replies AND every outreach email we sent, so most
// conversations are unreplied outreach. Inbox is only for conversations a venue wrote back to;
// unreplied outreach lives in Sent (or turns up when searching), like Gmail.

export type Folder = "inbox" | "unread" | "starred" | "snoozed" | "followup" | "sent" | "archive";

// A replied conversation that has been quiet this long after our answer is worth a nudge.
export const FOLLOW_UP_DAYS = 7;

export interface FolderThread {
  inboundCount: number; // messages received from the venue
  archived: boolean;
  unreadCount: number;
  lastFromMe: boolean; // the newest message is one we sent
  starred: boolean;
  snoozed: boolean; // currently snoozed (see isSnoozedNow in lib/inbox-snooze.ts)
  lastAt: string; // ISO time of the newest message
  unsubscribed: boolean; // the venue has been unsubscribed
  lastSendWasReply: boolean; // our newest message was an answer to them (not bulk outreach)
  lastSendAsked: boolean; // that message asked them something, so silence is worth a nudge
}

// Whether a message we sent asks the reader something. Tags and web addresses are ignored so a "?" in a tracking
// link does not count.
export function asksQuestion(html: string | null | undefined): boolean {
  if (!html) return false;
  const text = html.replace(/<[^>]*>/g, " ").replace(/https?:\/\/\S+/gi, " ");
  return text.includes("?");
}

// Whether a message we sent was a human answer in a conversation, as opposed to bulk outreach, a follow-up or a
// promo. Replies sent before the admin_reply label existed were filed as first_contact with a "Re:" subject and
// no email style (variant).
export function isConversationalSend(s: { kind: string; variant: string | null; subject: string | null }): boolean {
  if (s.kind === "admin_reply") return true;
  return s.kind === "first_contact" && s.variant === null && /^re:/i.test(s.subject ?? "");
}

export function folderFilter(t: FolderThread, folder: Folder, hasQuery: boolean, now: Date = new Date()): boolean {
  if (folder === "starred") return t.starred;
  if (folder === "archive") return t.archived;
  if (t.archived) return false;
  if (folder === "snoozed") return t.snoozed;
  // A snoozed conversation is out of the way everywhere else until it wakes, but searching still finds it.
  if (t.snoozed && !hasQuery) return false;
  switch (folder) {
    case "inbox":
      return hasQuery || t.inboundCount > 0;
    case "unread":
      return t.unreadCount > 0;
    case "followup": {
      if (t.inboundCount === 0 || !t.lastFromMe || !t.lastSendWasReply || !t.lastSendAsked || t.unsubscribed) return false;
      const quietDays = (now.getTime() - new Date(t.lastAt).getTime()) / 86_400_000;
      return quietDays >= FOLLOW_UP_DAYS;
    }
    case "sent":
      return t.lastFromMe;
  }
}

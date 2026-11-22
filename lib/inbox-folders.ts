// Which conversations each admin inbox folder shows. Kept pure so the rules are tested.
//
// The thread list is built from inbound replies AND every outreach email we sent, so most
// conversations are unreplied outreach. Inbox is only for conversations a venue wrote back to;
// unreplied outreach lives in Sent (or turns up when searching), like Gmail.

export type Folder = "inbox" | "unread" | "starred" | "snoozed" | "sent" | "archive";

export interface FolderThread {
  inboundCount: number; // messages received from the venue
  archived: boolean;
  unreadCount: number;
  lastFromMe: boolean; // the newest message is one we sent
  starred: boolean;
  snoozed: boolean; // currently snoozed (see isSnoozedNow in lib/inbox-snooze.ts)
}

export function folderFilter(t: FolderThread, folder: Folder, hasQuery: boolean): boolean {
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
    case "sent":
      return t.lastFromMe;
  }
}

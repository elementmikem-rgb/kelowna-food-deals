// Which conversations each admin inbox folder shows. Kept pure so the rules are tested.
//
// The thread list is built from inbound replies AND every outreach email we sent, so most
// conversations are unreplied outreach. Inbox is only for conversations a venue wrote back to;
// unreplied outreach lives in Sent (or turns up when searching), like Gmail.

export type Folder = "inbox" | "unread" | "sent" | "archive";

export interface FolderThread {
  inboundCount: number; // messages received from the venue
  archived: boolean;
  unreadCount: number;
  lastFromMe: boolean; // the newest message is one we sent
}

export function folderFilter(t: FolderThread, folder: Folder, hasQuery: boolean): boolean {
  if (folder === "archive") return t.archived;
  if (t.archived) return false;
  switch (folder) {
    case "inbox":
      return hasQuery || t.inboundCount > 0;
    case "unread":
      return t.unreadCount > 0;
    case "sent":
      return t.lastFromMe;
  }
}

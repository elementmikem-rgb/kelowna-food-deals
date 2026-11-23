// Who an inbox reply is addressed to. A venue's address on file is not always the person who wrote: about 1 in 6
// replies come from a different address (a staff member, a manager, a parent company). Like any mail client, reply to
// whoever wrote last, and only fall back to the address on file when nobody has written or the sender is a system
// address that cannot receive replies.

export interface ReplyAddress {
  to: string | null;
  differsFromFile: boolean; // the reply goes to someone other than the venue's address on file
}

const NOT_REPLYABLE = /^(no-?reply|do-?not-?reply|mailer-daemon|postmaster|bounces?)([._+-].*)?@/i;

function clean(email: string | null | undefined): string | null {
  if (!email) return null;
  const e = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null;
}

export function pickReplyAddress(a: { lastInboundEmail: string | null; venueContactEmail: string | null }): ReplyAddress {
  const sender = clean(a.lastInboundEmail);
  const onFile = clean(a.venueContactEmail);
  const senderUsable = sender !== null && !NOT_REPLYABLE.test(sender);
  const to = senderUsable ? sender : onFile;
  return { to, differsFromFile: senderUsable && onFile !== null && sender !== onFile };
}

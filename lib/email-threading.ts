// In-Reply-To / References headers for a reply sent from the admin inbox, so
// the venue's mail client threads it under their message. Built from
// inboundEmails.brevoMessageId (the inbound message's own Message-ID, as
// Brevo's inbound webhook reports it) and inboundEmails.inReplyTo.

function asMessageId(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  // A line break would let a stored value inject extra headers.
  if (!trimmed || /[\r\n]/.test(trimmed)) return null;
  return trimmed.startsWith("<") ? trimmed : `<${trimmed}>`;
}

export function buildThreadingHeaders(
  inbound: { messageId: string | null; inReplyTo: string | null } | null
): Record<string, string> | undefined {
  const messageId = asMessageId(inbound?.messageId);
  if (!messageId) return undefined;
  const parent = asMessageId(inbound?.inReplyTo);
  return {
    "In-Reply-To": messageId,
    References: parent && parent !== messageId ? `${parent} ${messageId}` : messageId,
  };
}

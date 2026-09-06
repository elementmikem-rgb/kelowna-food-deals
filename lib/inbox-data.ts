import { db, outreachSends, inboundEmails, venues } from "@/db";
import { desc, eq, isNull } from "drizzle-orm";

function stripTags(text: string): string {
  return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function snippet(text: string | null, max = 140): string {
  if (!text) return "";
  const stripped = stripTags(text);
  return stripped.length > max ? stripped.slice(0, max) + "…" : stripped;
}

// Inbound htmlBody comes from whoever emails the reply address — untrusted
// content that must never be rendered as raw HTML in the admin UI. Only
// outbound (our own composed) HTML is safe to render directly.
function safeInboundText(textBody: string | null, htmlBody: string | null): string | null {
  if (textBody) return textBody;
  if (htmlBody) return stripTags(htmlBody);
  return null;
}

export interface InboxThread {
  key: string; // "v{venueId}" for venue-matched, "u{encodeURIComponent(email)}" for unmatched senders
  venueId: number | null;
  displayName: string;
  contactEmail: string | null;
  lastSnippet: string;
  lastAt: Date;
  unreadCount: number;
  messageCount: number;
}

export async function getInboxThreads(): Promise<InboxThread[]> {
  const [sends, inbound] = await Promise.all([
    db
      .select({
        venueId: outreachSends.venueId,
        venueName: venues.name,
        toEmail: outreachSends.toEmail,
        subject: outreachSends.subject,
        htmlBody: outreachSends.htmlBody,
        createdAt: outreachSends.createdAt,
      })
      .from(outreachSends)
      .innerJoin(venues, eq(outreachSends.venueId, venues.id)),
    db
      .select({
        venueId: inboundEmails.venueId,
        venueName: venues.name,
        fromEmail: inboundEmails.fromEmail,
        fromName: inboundEmails.fromName,
        subject: inboundEmails.subject,
        textBody: inboundEmails.textBody,
        htmlBody: inboundEmails.htmlBody,
        read: inboundEmails.read,
        receivedAt: inboundEmails.receivedAt,
      })
      .from(inboundEmails)
      .leftJoin(venues, eq(inboundEmails.venueId, venues.id)),
  ]);

  const threads = new Map<string, InboxThread>();

  for (const s of sends) {
    const key = `v${s.venueId}`;
    const existing = threads.get(key);
    if (!existing || s.createdAt > existing.lastAt) {
      threads.set(key, {
        key,
        venueId: s.venueId,
        displayName: s.venueName,
        contactEmail: s.toEmail,
        lastSnippet: `You: ${snippet(s.htmlBody)}`,
        lastAt: s.createdAt,
        unreadCount: existing?.unreadCount ?? 0,
        messageCount: (existing?.messageCount ?? 0) + 1,
      });
    } else {
      existing.messageCount++;
    }
  }

  for (const e of inbound) {
    const key = e.venueId !== null ? `v${e.venueId}` : `u${encodeURIComponent(e.fromEmail)}`;
    const existing = threads.get(key);
    const isNewest = !existing || e.receivedAt > existing.lastAt;
    if (!existing) {
      threads.set(key, {
        key,
        venueId: e.venueId,
        displayName: e.venueName ?? e.fromName ?? e.fromEmail,
        contactEmail: e.fromEmail,
        lastSnippet: snippet(safeInboundText(e.textBody, e.htmlBody)),
        lastAt: e.receivedAt,
        unreadCount: e.read ? 0 : 1,
        messageCount: 1,
      });
    } else {
      existing.messageCount++;
      if (!e.read) existing.unreadCount++;
      if (isNewest) {
        existing.lastSnippet = snippet(safeInboundText(e.textBody, e.htmlBody));
        existing.lastAt = e.receivedAt;
      }
    }
  }

  return [...threads.values()].sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime());
}

export interface ThreadMessage {
  id: string;
  direction: "outbound" | "inbound";
  fromLabel: string;
  subject: string | null;
  bodyHtml: string | null;
  bodyText: string | null;
  at: Date;
  inboundId: number | null; // set for inbound messages, used to mark-read
}

export interface ThreadDetail {
  venueId: number | null;
  displayName: string;
  contactEmail: string | null;
  messages: ThreadMessage[];
}

export async function getThreadMessages(key: string): Promise<ThreadDetail | null> {
  if (key.startsWith("v")) {
    const venueId = Number(key.slice(1));
    if (!Number.isInteger(venueId)) return null;

    const [venue] = await db
      .select({ id: venues.id, name: venues.name, contactEmail: venues.contactEmail })
      .from(venues)
      .where(eq(venues.id, venueId))
      .limit(1);
    if (!venue) return null;

    const [sends, inbound] = await Promise.all([
      db
        .select()
        .from(outreachSends)
        .where(eq(outreachSends.venueId, venueId))
        .orderBy(outreachSends.createdAt),
      db
        .select()
        .from(inboundEmails)
        .where(eq(inboundEmails.venueId, venueId))
        .orderBy(inboundEmails.receivedAt),
    ]);

    const messages: ThreadMessage[] = [
      ...sends.map((s) => ({
        id: `s${s.id}`,
        direction: "outbound" as const,
        fromLabel: "You",
        subject: s.subject,
        bodyHtml: s.htmlBody,
        bodyText: null,
        at: s.createdAt,
        inboundId: null,
      })),
      ...inbound.map((e) => ({
        id: `i${e.id}`,
        direction: "inbound" as const,
        fromLabel: e.fromName ?? e.fromEmail,
        subject: e.subject,
        bodyHtml: null,
        bodyText: safeInboundText(e.textBody, e.htmlBody),
        at: e.receivedAt,
        inboundId: e.id,
      })),
    ].sort((a, b) => a.at.getTime() - b.at.getTime());

    return {
      venueId: venue.id,
      displayName: venue.name,
      contactEmail: venue.contactEmail,
      messages,
    };
  }

  if (key.startsWith("u")) {
    const email = decodeURIComponent(key.slice(1));
    const inbound = await db
      .select()
      .from(inboundEmails)
      .where(isNull(inboundEmails.venueId))
      .orderBy(inboundEmails.receivedAt);
    const matching = inbound.filter((e) => e.fromEmail === email);
    if (matching.length === 0) return null;

    const messages: ThreadMessage[] = matching.map((e) => ({
      id: `i${e.id}`,
      direction: "inbound" as const,
      fromLabel: e.fromName ?? e.fromEmail,
      subject: e.subject,
      bodyHtml: null,
      bodyText: safeInboundText(e.textBody, e.htmlBody),
      at: e.receivedAt,
      inboundId: e.id,
    }));

    return {
      venueId: null,
      displayName: matching[0].fromName ?? email,
      contactEmail: email,
      messages,
    };
  }

  return null;
}

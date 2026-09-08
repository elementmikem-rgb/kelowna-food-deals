import { db, outreachSends, inboundEmails, venues, emailAttachments } from "@/db";
import { and, eq, isNull, inArray } from "drizzle-orm";
import { regionScopeCondition } from "@/lib/admin-region";

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
  archived: boolean;
  messageCount: number;
}

export async function getInboxThreads(regionIds: number[] | "all"): Promise<InboxThread[]> {
  // A left join means an unmatched sender's venues.regionId is NULL --
  // inArray(column, [...]) evaluates NULL to unknown (excluded) under a
  // specific scope, while regionScopeCondition returns undefined (no filter
  // at all) under "all", so unmatched threads surface only when unscoped.
  const [inbound, sends] = await Promise.all([
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
        archivedAt: inboundEmails.archivedAt,
        receivedAt: inboundEmails.receivedAt,
      })
      .from(inboundEmails)
      .leftJoin(venues, eq(inboundEmails.venueId, venues.id))
      .where(regionScopeCondition(venues.regionId, regionIds)),
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
      .leftJoin(venues, eq(outreachSends.venueId, venues.id))
      .where(and(eq(outreachSends.hiddenFromInbox, false), regionScopeCondition(venues.regionId, regionIds))),
  ]);

  const threads = new Map<string, InboxThread>();

  // Inbound processed first so a real name (the venue's, or the sender's own
  // fromName) is established before a reply/auto-reply -- which only knows a
  // bare email address for an unmatched sender -- could become the only
  // source of a display name for that thread.
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
        unreadCount: !e.read && e.archivedAt === null ? 1 : 0,
        archived: e.archivedAt !== null,
        messageCount: 1,
      });
    } else {
      existing.messageCount++;
      if (!e.read && e.archivedAt === null) existing.unreadCount++;
      if (isNewest) {
        existing.lastSnippet = snippet(safeInboundText(e.textBody, e.htmlBody));
        existing.lastAt = e.receivedAt;
        existing.archived = e.archivedAt !== null;
      }
    }
  }

  for (const s of sends) {
    const key = s.venueId !== null ? `v${s.venueId}` : `u${encodeURIComponent(s.toEmail)}`;
    const existing = threads.get(key);
    if (!existing || s.createdAt > existing.lastAt) {
      threads.set(key, {
        key,
        venueId: s.venueId,
        displayName: existing?.displayName ?? s.venueName ?? s.toEmail,
        contactEmail: s.toEmail,
        lastSnippet: `You: ${snippet(s.htmlBody)}`,
        lastAt: s.createdAt,
        unreadCount: existing?.unreadCount ?? 0,
        archived: existing?.archived ?? false,
        messageCount: (existing?.messageCount ?? 0) + 1,
      });
    } else {
      existing.messageCount++;
    }
  }

  return [...threads.values()].sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime());
}

export interface ThreadMessage {
  id: string;
  direction: "outbound" | "inbound";
  fromLabel: string;
  fromEmail: string | null; // set for inbound messages; null for outbound ("You")
  subject: string | null;
  bodyHtml: string | null;
  bodyText: string | null;
  at: Date;
  inboundId: number | null; // set for inbound messages, used to mark-read
  attachments: { id: number; fileName: string; contentType: string; sizeBytes: number }[];
}

export interface ThreadDetail {
  venueId: number | null;
  displayName: string;
  contactEmail: string | null;
  archived: boolean;
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
        .where(and(eq(outreachSends.venueId, venueId), eq(outreachSends.hiddenFromInbox, false)))
        .orderBy(outreachSends.createdAt),
      db
        .select()
        .from(inboundEmails)
        .where(eq(inboundEmails.venueId, venueId))
        .orderBy(inboundEmails.receivedAt),
    ]);

    const inboundIds = inbound.map((e) => e.id);
    const attachmentRows = inboundIds.length > 0
      ? await db
          .select({
            id: emailAttachments.id,
            inboundEmailId: emailAttachments.inboundEmailId,
            fileName: emailAttachments.fileName,
            contentType: emailAttachments.contentType,
            sizeBytes: emailAttachments.sizeBytes,
          })
          .from(emailAttachments)
          .where(inArray(emailAttachments.inboundEmailId, inboundIds))
      : [];
    const attachmentsByEmail = new Map<number, typeof attachmentRows>();
    for (const a of attachmentRows) {
      const list = attachmentsByEmail.get(a.inboundEmailId) ?? [];
      list.push(a);
      attachmentsByEmail.set(a.inboundEmailId, list);
    }

    const messages: ThreadMessage[] = [
      ...sends.map((s) => ({
        id: `s${s.id}`,
        direction: "outbound" as const,
        fromLabel: "You",
        fromEmail: null,
        subject: s.subject,
        bodyHtml: s.htmlBody,
        bodyText: null,
        at: s.createdAt,
        inboundId: null,
        attachments: [],
      })),
      ...inbound.map((e) => ({
        id: `i${e.id}`,
        direction: "inbound" as const,
        fromLabel: e.fromName ?? e.fromEmail,
        fromEmail: e.fromEmail,
        subject: e.subject,
        bodyHtml: null,
        bodyText: safeInboundText(e.textBody, e.htmlBody),
        at: e.receivedAt,
        inboundId: e.id,
        attachments: attachmentsByEmail.get(e.id) ?? [],
      })),
    ].sort((a, b) => a.at.getTime() - b.at.getTime());

    return {
      venueId: venue.id,
      displayName: venue.name,
      contactEmail: venue.contactEmail,
      archived: inbound.length > 0 ? inbound[inbound.length - 1].archivedAt !== null : false,
      messages,
    };
  }

  if (key.startsWith("u")) {
    const email = decodeURIComponent(key.slice(1));
    const [inbound, sends] = await Promise.all([
      db
        .select()
        .from(inboundEmails)
        .where(and(isNull(inboundEmails.venueId), eq(inboundEmails.fromEmail, email)))
        .orderBy(inboundEmails.receivedAt),
      db
        .select()
        .from(outreachSends)
        .where(
          and(
            isNull(outreachSends.venueId),
            eq(outreachSends.toEmail, email),
            eq(outreachSends.hiddenFromInbox, false)
          )
        )
        .orderBy(outreachSends.createdAt),
    ]);
    if (inbound.length === 0 && sends.length === 0) return null;

    const inboundIds = inbound.map((e) => e.id);
    const attachmentRows = inboundIds.length > 0
      ? await db
          .select({
            id: emailAttachments.id,
            inboundEmailId: emailAttachments.inboundEmailId,
            fileName: emailAttachments.fileName,
            contentType: emailAttachments.contentType,
            sizeBytes: emailAttachments.sizeBytes,
          })
          .from(emailAttachments)
          .where(inArray(emailAttachments.inboundEmailId, inboundIds))
      : [];
    const attachmentsByEmail = new Map<number, typeof attachmentRows>();
    for (const a of attachmentRows) {
      const list = attachmentsByEmail.get(a.inboundEmailId) ?? [];
      list.push(a);
      attachmentsByEmail.set(a.inboundEmailId, list);
    }

    const messages: ThreadMessage[] = [
      ...sends.map((s) => ({
        id: `s${s.id}`,
        direction: "outbound" as const,
        fromLabel: "You",
        fromEmail: null,
        subject: s.subject,
        bodyHtml: s.htmlBody,
        bodyText: null,
        at: s.createdAt,
        inboundId: null,
        attachments: [],
      })),
      ...inbound.map((e) => ({
        id: `i${e.id}`,
        direction: "inbound" as const,
        fromLabel: e.fromName ?? e.fromEmail,
        fromEmail: e.fromEmail,
        subject: e.subject,
        bodyHtml: null,
        bodyText: safeInboundText(e.textBody, e.htmlBody),
        at: e.receivedAt,
        inboundId: e.id,
        attachments: attachmentsByEmail.get(e.id) ?? [],
      })),
    ].sort((a, b) => a.at.getTime() - b.at.getTime());

    return {
      venueId: null,
      displayName: inbound[0]?.fromName ?? email,
      contactEmail: email,
      archived: inbound.length > 0 ? inbound[inbound.length - 1].archivedAt !== null : false,
      messages,
    };
  }

  return null;
}

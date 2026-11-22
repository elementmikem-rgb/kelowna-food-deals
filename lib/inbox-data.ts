import { threadSignals, type ThreadSignals } from "@/lib/inbox-signals";
import { db, outreachSends, inboundEmails, venues, emailAttachments, regions, inboxThreadState, type InboxThreadStatus } from "@/db";
import { and, eq, isNull, inArray } from "drizzle-orm";
import { regionScopeCondition } from "@/lib/admin-region";
import { parseThreadKey, threadKeyFor } from "@/lib/inbox-thread-key";
import { isSnoozedNow } from "@/lib/inbox-snooze";
import { getPendingProposalVenueIds } from "@/lib/inbox-proposals";

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
export function safeInboundText(textBody: string | null, htmlBody: string | null): string | null {
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
  lastSubject: string; // subject of the newest message, shown before the snippet like Gmail does
  lastFromMe: boolean; // newest message is one we sent (drives the Sent folder)
  hasAttachments: boolean;
  inboundCount: number; // messages received from the venue; 0 means unreplied outreach
  starred: boolean;
  snoozed: boolean; // currently snoozed (wake time in the future and no reply since)
  snoozedUntil: Date | null;
  status: InboxThreadStatus | null;
  signals: ThreadSignals; // what the newest reply from them is about (stop request, decline, sales lead)
  hasProposal: boolean; // a suggestion from the reply is waiting for Mike's click
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
        id: inboundEmails.id,
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

  const attachmentRows = inbound.length > 0
    ? await db
        .selectDistinct({ inboundEmailId: emailAttachments.inboundEmailId })
        .from(emailAttachments)
        .where(inArray(emailAttachments.inboundEmailId, inbound.map((e) => e.id)))
    : [];
  const withAttachments = new Set(attachmentRows.map((a) => a.inboundEmailId));

  const threads = new Map<string, InboxThread>();
  const lastInboundAt = new Map<string, Date>();

  // Inbound processed first so a real name (the venue's, or the sender's own
  // fromName) is established before a reply/auto-reply -- which only knows a
  // bare email address for an unmatched sender -- could become the only
  // source of a display name for that thread.
  for (const e of inbound) {
    const key = threadKeyFor(e.venueId, e.fromEmail);
    const prevInbound = lastInboundAt.get(key);
    if (!prevInbound || e.receivedAt > prevInbound) lastInboundAt.set(key, e.receivedAt);
    const existing = threads.get(key);
    const isNewest = !existing || e.receivedAt > existing.lastAt;
    if (!existing) {
      threads.set(key, {
        key,
        venueId: e.venueId,
        displayName: e.venueName ?? e.fromName ?? e.fromEmail,
        contactEmail: e.fromEmail,
        lastSnippet: snippet(safeInboundText(e.textBody, e.htmlBody)),
        lastSubject: e.subject ?? "",
        lastFromMe: false,
        hasAttachments: withAttachments.has(e.id),
        inboundCount: 1,
        starred: false,
        snoozed: false,
        snoozedUntil: null,
        status: null,
        signals: threadSignals(safeInboundText(e.textBody, e.htmlBody)),
        hasProposal: false,
        lastAt: e.receivedAt,
        unreadCount: !e.read && e.archivedAt === null ? 1 : 0,
        archived: e.archivedAt !== null,
        messageCount: 1,
      });
    } else {
      existing.messageCount++;
      existing.inboundCount++;
      if (!e.read && e.archivedAt === null) existing.unreadCount++;
      if (withAttachments.has(e.id)) existing.hasAttachments = true;
      if (isNewest) {
        existing.lastSubject = e.subject ?? "";
        existing.lastSnippet = snippet(safeInboundText(e.textBody, e.htmlBody));
        existing.signals = threadSignals(safeInboundText(e.textBody, e.htmlBody));
        existing.lastAt = e.receivedAt;
        existing.archived = e.archivedAt !== null;
      }
    }
  }

  for (const s of sends) {
    const key = threadKeyFor(s.venueId, s.toEmail);
    const existing = threads.get(key);
    if (!existing || s.createdAt > existing.lastAt) {
      threads.set(key, {
        key,
        venueId: s.venueId,
        displayName: existing?.displayName ?? s.venueName ?? s.toEmail,
        contactEmail: s.toEmail,
        lastSnippet: `You: ${snippet(s.htmlBody)}`,
        lastSubject: s.subject ?? "",
        lastFromMe: true,
        hasAttachments: existing?.hasAttachments ?? false,
        inboundCount: existing?.inboundCount ?? 0,
        starred: existing?.starred ?? false,
        snoozed: existing?.snoozed ?? false,
        snoozedUntil: existing?.snoozedUntil ?? null,
        status: existing?.status ?? null,
        signals: existing?.signals ?? { stop: false, decline: false, lead: false },
        hasProposal: existing?.hasProposal ?? false,
        lastAt: s.createdAt,
        unreadCount: existing?.unreadCount ?? 0,
        archived: existing?.archived ?? false,
        messageCount: (existing?.messageCount ?? 0) + 1,
      });
    } else {
      existing.messageCount++;
    }
  }

  // Stars, snoozes and status live in a small side table keyed by thread key. No row means defaults.
  const stateRows = await db.select().from(inboxThreadState);
  const now = new Date();
  for (const st of stateRows) {
    const t = threads.get(st.threadKey);
    if (!t) continue;
    t.starred = st.starred;
    t.status = st.status;
    t.snoozedUntil = st.snoozedUntil;
    t.snoozed = isSnoozedNow(
      { snoozedUntil: st.snoozedUntil ? st.snoozedUntil.toISOString() : null, updatedAt: st.updatedAt.toISOString() },
      lastInboundAt.get(st.threadKey)?.toISOString() ?? null,
      now
    );
  }

  for (const venueId of await getPendingProposalVenueIds()) {
    const t = threads.get(`v${venueId}`);
    if (t) t.hasProposal = true;
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
  openedAt: Date | null; // outbound only, null for inbound
  clickedAt: Date | null; // outbound only, null for inbound
}

export interface ThreadDetail {
  venueId: number | null;
  displayName: string;
  contactEmail: string | null;
  venueUrl: string | null; // public listing page, used to fill {{link}} in canned replies
  starred: boolean;
  status: InboxThreadStatus | null;
  snoozedUntil: Date | null;
  archived: boolean;
  messages: ThreadMessage[];
}

async function loadThreadState(key: string) {
  const [st] = await db.select().from(inboxThreadState).where(eq(inboxThreadState.threadKey, key)).limit(1);
  return {
    starred: st?.starred ?? false,
    status: st?.status ?? null,
    snoozedUntil: st && st.snoozedUntil && st.snoozedUntil.getTime() > Date.now() ? st.snoozedUntil : null,
  };
}

export async function getThreadMessages(key: string): Promise<ThreadDetail | null> {
  const parsed = parseThreadKey(key);
  if (parsed?.type === "venue") {
    const venueId = parsed.venueId;

    const [venue] = await db
      .select({ id: venues.id, name: venues.name, contactEmail: venues.contactEmail, regionId: venues.regionId })
      .from(venues)
      .where(eq(venues.id, venueId))
      .limit(1);
    if (!venue) return null;

    // Same URL shape the outreach emails link to (lib/outreach-send.ts).
    const [region] = venue.regionId
      ? await db.select({ slug: regions.slug }).from(regions).where(eq(regions.id, venue.regionId)).limit(1)
      : [];
    const venueUrl = region
      ? `https://${process.env.PATH_BASED_DOMAIN ?? "todaystab.com"}/${region.slug}/venues/${venue.id}`
      : null;

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
        openedAt: s.openedAt,
        clickedAt: s.clickedAt,
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
        openedAt: null,
        clickedAt: null,
      })),
    ].sort((a, b) => a.at.getTime() - b.at.getTime());

    return {
      venueId: venue.id,
      displayName: venue.name,
      contactEmail: venue.contactEmail,
      venueUrl,
      ...(await loadThreadState(key)),
      archived: inbound.length > 0 ? inbound[inbound.length - 1].archivedAt !== null : false,
      messages,
    };
  }

  if (parsed?.type === "email") {
    const email = parsed.email;
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
        openedAt: s.openedAt,
        clickedAt: s.clickedAt,
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
        openedAt: null,
        clickedAt: null,
      })),
    ].sort((a, b) => a.at.getTime() - b.at.getTime());

    return {
      venueId: null,
      displayName: inbound[0]?.fromName ?? email,
      contactEmail: email,
      venueUrl: null,
      ...(await loadThreadState(key)),
      archived: inbound.length > 0 ? inbound[inbound.length - 1].archivedAt !== null : false,
      messages,
    };
  }

  return null;
}

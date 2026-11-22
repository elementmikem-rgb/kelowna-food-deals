// Reads new venue replies with `claude -p` (your Claude login, no tools, no API key) and stores a PROPOSAL for each:
// the special, phone and a draft reply it found. A proposal never changes a listing or sends an email. It waits on the
// conversation in the admin inbox until Mike clicks Apply or Dismiss.
//
// Run:  npx tsx --env-file=.env.local scripts/propose-replies.ts          (dry run: lists replies, calls nothing)
//       npx tsx --env-file=.env.local scripts/propose-replies.ts --run     (reads them with Claude and saves proposals)
// Env:  DAYS (default 14), MAX (default 10 per run), CLAUDE_EXE (path to claude.exe if not found automatically)
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { db, inboxProposals } from "@/db";
import { PROPOSER_SCHEMA, parseProposerOutput, proposerSystemPrompt, replyForPrompt } from "@/lib/reply-proposal";

const RUN = process.argv.includes("--run");
const DAYS = Number(process.env.DAYS ?? 14);
const MAX = Number(process.env.MAX ?? 10);
const LOCK_KEY = 8_412_993; // distinct from cron/index.ts (8_412_991) and cron/timezoneOutreach.ts (8_412_992)

function findClaude(): string | null {
  const candidates = [
    process.env.CLAUDE_EXE,
    process.env.APPDATA && join(process.env.APPDATA, "npm", "node_modules", "@anthropic-ai", "claude-code", "bin", "claude.exe"),
  ].filter(Boolean) as string[];
  return candidates.find((p) => existsSync(p)) ?? null;
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

interface Candidate {
  id: number;
  venue_id: number;
  subject: string | null;
  text_body: string | null;
  html_body: string | null;
  received_at: string;
  attempts: number | null;
}

async function main() {
  const [lock] = (await db.execute(sql`select pg_try_advisory_lock(${LOCK_KEY}) as got`)) as unknown as Array<{ got: boolean }>;
  if (!lock.got) {
    console.log("another run is in progress, exiting");
    return;
  }

  // The newest reply of each venue that has no proposal yet (or a failed one with attempts left), that we have not
  // already answered by hand. Archived replies are auto-replies and blocked senders, so they are skipped.
  const rows = (await db.execute(sql`
    WITH newest AS (
      SELECT DISTINCT ON (e.venue_id) e.id, e.venue_id, e.subject, e.text_body, e.html_body, e.received_at
      FROM specials.inbound_emails e
      WHERE e.venue_id IS NOT NULL
        AND e.archived_at IS NULL
        AND e.received_at > now() - make_interval(days => ${DAYS})
      ORDER BY e.venue_id, e.received_at DESC
    )
    SELECT n.id, n.venue_id, n.subject, n.text_body, n.html_body, n.received_at,
           (SELECT p.attempts FROM specials.inbox_proposals p WHERE p.inbound_email_id = n.id) AS attempts
    FROM newest n
    WHERE NOT EXISTS (
            SELECT 1 FROM specials.inbox_proposals p
            WHERE p.inbound_email_id = n.id AND (p.status <> 'failed' OR p.attempts >= 3))
      AND NOT EXISTS (
            SELECT 1 FROM specials.outreach_sends s
            WHERE s.venue_id = n.venue_id AND s.status = 'sent' AND s.created_at > n.received_at
              AND (s.kind = 'admin_reply' OR (s.kind = 'first_contact' AND s.variant IS NULL AND s.subject ILIKE 're:%')))
    ORDER BY n.received_at DESC
    LIMIT ${MAX}`)) as unknown as Candidate[];

  console.log(`${rows.length} repl${rows.length === 1 ? "y" : "ies"} waiting (last ${DAYS} days, max ${MAX}). Mode: ${RUN ? "RUN" : "dry run"}`);
  for (const r of rows) console.log(`  inbound ${r.id}, venue ${r.venue_id}, ${r.received_at}, "${(r.subject ?? "").slice(0, 60)}"`);
  if (!RUN || rows.length === 0) return;

  const exe = findClaude();
  if (!exe) {
    console.error("could not find claude.exe. Set CLAUDE_EXE to its full path.");
    process.exitCode = 1;
    return;
  }
  const cwd = join(tmpdir(), "claude-proposer"); // an empty folder, so no project files or notes are picked up
  mkdirSync(cwd, { recursive: true });

  let saved = 0;
  let failed = 0;
  for (const r of rows) {
    const text = replyForPrompt(r.text_body ?? (r.html_body ? stripTags(r.html_body) : ""));
    if (text.replace(/\s/g, "").length < 15) {
      console.log(`  inbound ${r.id}: too short to read, skipped`);
      continue;
    }
    const attempts = (r.attempts ?? 0) + 1;
    const res = spawnSync(
      exe,
      ["-p", "--tools", "", "--no-session-persistence", "--output-format", "json", "--json-schema", JSON.stringify(PROPOSER_SCHEMA), "--system-prompt", proposerSystemPrompt()],
      { input: text, cwd, encoding: "utf8", timeout: 180_000 }
    );

    let error: string | null = null;
    let proposal: ReturnType<typeof parseProposerOutput> | null = null;
    if (res.error) error = `claude did not run: ${res.error.message}`;
    else if (res.status !== 0) error = `claude exited ${res.status}: ${(res.stderr || res.stdout || "").slice(0, 300)}`;
    else {
      try {
        const out = JSON.parse(res.stdout);
        if (out.is_error) error = `claude reported an error: ${String(out.result ?? "").slice(0, 300)}`;
        else proposal = parseProposerOutput(out.structured_output);
      } catch {
        error = "could not read claude's output";
      }
    }
    if (proposal && !proposal.ok) error = `rejected: ${proposal.error}`;

    if (proposal && proposal.ok) {
      const v = proposal.value;
      await db
        .insert(inboxProposals)
        .values({ inboundEmailId: r.id, venueId: r.venue_id, status: "pending", intent: v.intent, confidence: v.confidence, proposal: v, attempts })
        .onConflictDoUpdate({
          target: inboxProposals.inboundEmailId,
          set: { status: "pending", intent: v.intent, confidence: v.confidence, proposal: v, error: null, attempts },
        });
      saved++;
      console.log(`  inbound ${r.id}: ${v.intent}, ${v.confidence} confidence${v.special ? `, special "${v.special.title}"` : ""}`);
    } else {
      await db
        .insert(inboxProposals)
        .values({ inboundEmailId: r.id, venueId: r.venue_id, status: "failed", intent: "other", confidence: "low", proposal: {}, error, attempts })
        .onConflictDoUpdate({ target: inboxProposals.inboundEmailId, set: { status: "failed", error, attempts } });
      failed++;
      console.log(`  inbound ${r.id}: FAILED (attempt ${attempts}): ${error}`);
    }
  }
  console.log(`done: ${saved} proposal(s) saved, ${failed} failed`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.execute(sql`select pg_advisory_unlock(${LOCK_KEY})`).catch(() => {});
    process.exit(process.exitCode ?? 0);
  });

import { startOfDayPacific, addDaysISO, pacificTodayISODate } from "./time";

// Daily TodaysTab income, read from specials.payments with plain SQL, reported to
// Photaro's finance ingest API (POST /api/finance/ingest/income). The entry point is
// cron/financeIncomeReport.ts; everything here takes its DB, fetch, clock and logger
// as arguments so the rules are testable without a database or network.
// See docs/finance-income-report.md.

export type Source = "stripe" | "credit_bundle";

const SALE_KINDS = new Set(["tip", "booking", "credit_bundle", "renewal"]);
const CAD = "cad";
const NOTE_MAX = 200;
const MAX_ATTEMPTS = 3; // first try + 2 retries
const BACKOFF_MS = [2_000, 6_000];
const RATE_LIMIT_WAIT_MS = 61_000; // Photaro allows 60 requests a minute per key

export const MAX_DAYS = 31;
export const DEFAULT_DAYS = 7;

export const REQUIRED_PAYMENT_COLUMNS = [
  "id",
  "kind",
  "amount_cents",
  "currency",
  "stripe_fee_cents",
  "tax_cents",
  "livemode",
  "paid_at",
  "related_payment_id",
] as const;

export const ALLOWED_PAYLOAD_FIELDS = [
  "day",
  "currency",
  "gross_cents",
  "fee_cents",
  "refunds_cents",
  "tax_collected_cents",
  "sales_count",
  "source",
  "note",
] as const;

export interface PaymentRow {
  kind: string;
  amountCents: number; // signed, refunds are negative
  currency: string;
  stripeFeeCents: number | null;
  taxCents: number;
  livemode: boolean;
  paidAt: Date;
  relatedKind: string | null; // kind of the payment a refund reverses
}

export interface SourceDay {
  day: string;
  source: Source;
  grossCents: number;
  feeCents: number;
  refundsCents: number;
  taxCollectedCents: number;
  salesCount: number;
  salesMissingFee: number;
  nonCad: { count: number; byCurrency: Record<string, number> };
  rowCount: number; // live rows of any currency attributed to this day and source
}

export interface IngestPayload {
  day: string;
  currency: "CAD";
  gross_cents: number;
  fee_cents: number;
  refunds_cents: number;
  tax_collected_cents: number;
  sales_count: number;
  source: Source;
  note: string;
}

export type QueryFn = (text: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;

export interface Logger {
  info: (msg: string) => void;
  error: (msg: string) => void;
}

// Half-open [start, end) UTC instants for one America/Vancouver calendar day, from the
// DST-aware helper in lib/time.ts, so 2026-03-08 is 23 hours and 2026-11-01 is 25.
export function financeDayBounds(day: string): { start: Date; end: Date } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error(`"${day}" is not YYYY-MM-DD`);
  const d = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== day) {
    throw new Error(`"${day}" is not a real calendar date`);
  }
  return { start: startOfDayPacific(day), end: startOfDayPacific(addDaysISO(day, 1)) };
}

// The `days` completed Pacific days ending yesterday, oldest first. Today is never
// included because it is still in progress.
export function reportWindow(now: Date, days: number): string[] {
  const yesterday = addDaysISO(pacificTodayISODate(now), -1);
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) out.push(addDaysISO(yesterday, -i));
  return out;
}

function emptySourceDay(day: string, source: Source): SourceDay {
  return {
    day,
    source,
    grossCents: 0,
    feeCents: 0,
    refundsCents: 0,
    taxCollectedCents: 0,
    salesCount: 0,
    salesMissingFee: 0,
    nonCad: { count: 0, byCurrency: {} },
    rowCount: 0,
  };
}

function sourceOf(r: PaymentRow): Source {
  if (r.kind === "credit_bundle") return "credit_bundle";
  if (r.kind === "refund" && r.relatedKind === "credit_bundle") return "credit_bundle";
  return "stripe";
}

// Per (day, source) totals for the given Pacific days. Returns a stripe and a
// credit_bundle summary for every day, in day order.
export function summarizeSourceDays(days: string[], rows: PaymentRow[]): SourceDay[] {
  const bounds = days.map((day) => ({ day, ...financeDayBounds(day) }));
  const byKey = new Map<string, SourceDay>();
  const refundSums = new Map<string, number>();
  for (const day of days) {
    for (const source of ["stripe", "credit_bundle"] as Source[]) byKey.set(`${day}|${source}`, emptySourceDay(day, source));
  }

  for (const r of rows) {
    if (r.livemode !== true) continue; // test-mode money is never income
    const at = (r.paidAt instanceof Date ? r.paidAt : new Date(r.paidAt)).getTime();
    const b = bounds.find((x) => at >= x.start.getTime() && at < x.end.getTime());
    if (!b) continue;
    const key = `${b.day}|${sourceOf(r)}`;
    const s = byKey.get(key)!;
    s.rowCount += 1;

    const cur = r.currency.toLowerCase();
    if (cur !== CAD) {
      s.nonCad.count += 1;
      s.nonCad.byCurrency[cur] = (s.nonCad.byCurrency[cur] ?? 0) + r.amountCents;
      continue;
    }
    if (r.kind === "refund") {
      refundSums.set(key, (refundSums.get(key) ?? 0) + r.amountCents);
      continue;
    }
    if (!SALE_KINDS.has(r.kind)) continue;
    s.grossCents += r.amountCents;
    s.salesCount += 1;
    s.taxCollectedCents += r.taxCents;
    if (r.stripeFeeCents === null || r.stripeFeeCents === undefined) s.salesMissingFee += 1;
    else s.feeCents += r.stripeFeeCents;
  }

  for (const [key, sum] of refundSums) byKey.get(key)!.refundsCents = Math.abs(sum);
  return [...byKey.values()];
}

const CAVEAT_LONG = "totals depend on the webhook having recorded every payment";
const CAVEAT_SHORT = "webhook-dependent";

// Priority within 200 chars: missing_fee, then non_cad, then the webhook caveat.
export function buildNote(s: SourceDay): string {
  const parts: string[] = [];
  const used = () => parts.join("; ").length + (parts.length ? 2 : 0);

  if (s.salesMissingFee > 0) parts.push(`missing_fee=${s.salesMissingFee}`);

  if (s.nonCad.count > 0) {
    const head = `non_cad=${s.nonCad.count} excluded`;
    const budget = NOTE_MAX - used();
    let detail = "";
    for (const [cur, cents] of Object.entries(s.nonCad.byCurrency)) {
      const next = detail ? `${detail}, ${cur} ${cents}` : `${cur} ${cents}`;
      if (`${head} (${next})`.length > budget) {
        detail = detail ? `${detail}, ...` : "";
        break;
      }
      detail = next;
    }
    const part = detail ? `${head} (${detail})` : head;
    parts.push(part.length <= budget ? part : part.slice(0, Math.max(0, budget)));
  }

  for (const caveat of [CAVEAT_LONG, CAVEAT_SHORT]) {
    if (used() + caveat.length <= NOTE_MAX) {
      parts.push(caveat);
      break;
    }
  }
  return parts.join("; ").slice(0, NOTE_MAX);
}

// stripe every day (zero totals are the heartbeat); credit_bundle only on days with a
// live row attributed to it. Payments are append-only, so such a day stays non-zero.
export function buildPayloads(summaries: SourceDay[]): IngestPayload[] {
  return summaries
    .filter((s) => s.source === "stripe" || s.rowCount > 0)
    .map((s) => ({
      day: s.day,
      currency: "CAD" as const,
      gross_cents: s.grossCents,
      fee_cents: s.feeCents,
      refunds_cents: s.refundsCents,
      tax_collected_cents: s.taxCollectedCents,
      sales_count: s.salesCount,
      source: s.source,
      note: buildNote(s),
    }));
}

export function parseArgs(argv: string[]): { dryRun: boolean; days: number } {
  let dryRun = false;
  let days = DEFAULT_DAYS;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") dryRun = true;
    else if (a === "--days" || a.startsWith("--days=")) {
      const raw = a === "--days" ? argv[++i] : a.slice("--days=".length);
      if (!raw || !/^\d+$/.test(raw)) throw new Error(`--days needs a whole number from 1 to ${MAX_DAYS}`);
      days = Number(raw);
      if (days < 1 || days > MAX_DAYS) throw new Error(`--days must be from 1 to ${MAX_DAYS}, got ${days}`);
    } else throw new Error(`unknown argument "${a}" (allowed: --dry-run, --days N)`);
  }
  return { dryRun, days };
}

// Strips credentials and any query string so a URL is safe to print.
export function maskUrl(raw: string): string {
  try {
    const u = new URL(raw);
    const hadQuery = u.search.length > 0;
    return `${u.protocol}//${u.host}${u.pathname}${hadQuery ? "?***" : ""}`;
  } catch {
    return "(unparseable FINANCE_INGEST_URL)";
  }
}

function makeRedactor(url: string | undefined, key: string | undefined): (msg: string) => string {
  return (msg) => {
    let out = msg;
    if (key) out = out.split(key).join("***");
    if (url) {
      out = out.split(url).join(maskUrl(url));
      try {
        const q = new URL(url).search.slice(1);
        if (q) out = out.split(q).join("***");
      } catch {
        // unparseable URL: nothing more to mask
      }
    }
    return out.replace(/Bearer\s+\S+/gi, "[credential]").replace(/Authorization/gi, "[header]");
  };
}

async function checkSchema(query: QueryFn): Promise<void> {
  const cols = await query(
    "select column_name from information_schema.columns where table_schema = 'specials' and table_name = 'payments'"
  );
  const have = new Set(cols.map((c) => String(c.column_name)));
  if (have.size === 0) {
    throw new Error("specials.payments does not exist in this database; run the payments migration before this job");
  }
  const missing = REQUIRED_PAYMENT_COLUMNS.filter((c) => !have.has(c));
  if (missing.length) {
    throw new Error(`specials.payments is missing column(s): ${missing.join(", ")}; run the latest migrations before this job`);
  }
}

async function loadRows(query: QueryFn, days: string[]): Promise<PaymentRow[]> {
  const from = financeDayBounds(days[0]).start;
  const to = financeDayBounds(days[days.length - 1]).end;
  const raw = await query(
    `select p.kind, p.amount_cents, p.currency, p.stripe_fee_cents, p.tax_cents, p.livemode, p.paid_at, r.kind as related_kind
       from specials.payments p
       left join specials.payments r on r.id = p.related_payment_id
      where p.livemode = true and p.paid_at >= $1::timestamptz and p.paid_at < $2::timestamptz`,
    [from.toISOString(), to.toISOString()]
  );
  return raw.map((r) => ({
    kind: String(r.kind),
    amountCents: Number(r.amount_cents),
    currency: String(r.currency),
    stripeFeeCents: r.stripe_fee_cents === null || r.stripe_fee_cents === undefined ? null : Number(r.stripe_fee_cents),
    taxCents: Number(r.tax_cents ?? 0),
    livemode: r.livemode === true,
    paidAt: r.paid_at instanceof Date ? r.paid_at : new Date(String(r.paid_at)),
    relatedKind: r.related_kind === null || r.related_kind === undefined ? null : String(r.related_kind),
  }));
}

type SendResult = { ok: true } | { ok: false; reason: string };

async function send(
  p: IngestPayload,
  opts: { url: string; key: string; fetchFn: typeof fetch; sleep: (ms: number) => Promise<void>; redact: (m: string) => string }
): Promise<SendResult> {
  let lastReason = "";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let retryWait: number | null = null;
    try {
      const res = await opts.fetchFn(opts.url, {
        method: "POST",
        headers: { Authorization: `Bearer ${opts.key}`, "Content-Type": "application/json" },
        body: JSON.stringify(p),
      });
      const text = await res.text().catch(() => "");
      let body: unknown = null;
      try {
        body = JSON.parse(text);
      } catch {
        body = null;
      }
      const errMsg =
        body && typeof body === "object" && "error" in body ? String((body as { error: unknown }).error).slice(0, 200) : text.slice(0, 200);
      if (res.status >= 200 && res.status < 300) {
        if (body && typeof body === "object" && (body as { ok?: unknown }).ok === true) return { ok: true };
        return { ok: false, reason: `HTTP ${res.status} without ok:true` };
      }
      if (res.status === 409) {
        return { ok: false, reason: `409: a hand-typed row exists in Photaro for ${p.day}/${p.source}; a report never overwrites it (${errMsg})` };
      }
      if (res.status === 401) return { ok: false, reason: `401: FINANCE_INGEST_KEY is bad or revoked (${errMsg})` };
      if (res.status === 429) {
        lastReason = `429: rate limited (${errMsg})`;
        retryWait = RATE_LIMIT_WAIT_MS;
      } else if (res.status >= 500) {
        lastReason = `HTTP ${res.status} (${errMsg})`;
        retryWait = BACKOFF_MS[attempt - 1] ?? BACKOFF_MS[BACKOFF_MS.length - 1];
      } else {
        return { ok: false, reason: `HTTP ${res.status} (${errMsg})` };
      }
    } catch (err) {
      lastReason = `network error: ${err instanceof Error ? err.message : String(err)}`;
      retryWait = BACKOFF_MS[attempt - 1] ?? BACKOFF_MS[BACKOFF_MS.length - 1];
    }
    if (attempt < MAX_ATTEMPTS && retryWait !== null) await opts.sleep(retryWait);
  }
  return { ok: false, reason: `${lastReason} after ${MAX_ATTEMPTS} attempts` };
}

export interface RunOptions {
  query: QueryFn;
  fetchFn: typeof fetch;
  now: Date;
  url: string | undefined;
  key: string | undefined;
  dryRun: boolean;
  days: number;
  log: Logger;
  sleep: (ms: number) => Promise<void>;
}

export interface RunResult {
  payloads: IngestPayload[];
  sent: number;
  failed: number;
  failures: string[];
}

export async function runFinanceIncomeReport(o: RunOptions): Promise<RunResult> {
  const redact = makeRedactor(o.url, o.key);
  if (!o.dryRun) {
    if (!o.url) throw new Error("FINANCE_INGEST_URL is not set (use --dry-run to only print payloads)");
    if (!o.key) throw new Error("FINANCE_INGEST_KEY is not set (use --dry-run to only print payloads)");
  }
  if (!Number.isInteger(o.days) || o.days < 1 || o.days > MAX_DAYS) throw new Error(`days must be from 1 to ${MAX_DAYS}`);

  await checkSchema(o.query);
  const days = reportWindow(o.now, o.days);
  const rows = await loadRows(o.query, days);
  const summaries = summarizeSourceDays(days, rows);
  const payloads = buildPayloads(summaries);

  for (const s of summaries) {
    if (s.nonCad.count > 0) {
      const detail = Object.entries(s.nonCad.byCurrency)
        .map(([c, v]) => `${c} ${v}`)
        .join(", ");
      o.log.error(`${s.day}/${s.source}: ${s.nonCad.count} non-CAD row(s) left out of CAD totals: ${detail}`);
    }
  }

  o.log.info(
    `finance income report: ${days[0]}..${days[days.length - 1]} (${days.length} Pacific days), ${rows.length} live row(s), ${payloads.length} payload(s)${
      o.dryRun ? ", DRY RUN" : ` to ${maskUrl(o.url!)}`
    }`
  );

  if (o.dryRun) {
    for (const p of payloads) o.log.info(redact(JSON.stringify(p)));
    return { payloads, sent: 0, failed: 0, failures: [] };
  }

  let sent = 0;
  const failures: string[] = [];
  for (const p of payloads) {
    const r = await send(p, { url: o.url!, key: o.key!, fetchFn: o.fetchFn, sleep: o.sleep, redact });
    if (r.ok) {
      sent += 1;
      o.log.info(`sent ${p.day}/${p.source}: gross=${p.gross_cents} fee=${p.fee_cents} refunds=${p.refunds_cents} tax=${p.tax_collected_cents} sales=${p.sales_count}`);
    } else {
      const line = redact(`FAILED ${p.day}/${p.source}: ${r.reason}`);
      failures.push(line);
      o.log.error(line);
    }
  }
  return { payloads, sent, failed: failures.length, failures };
}

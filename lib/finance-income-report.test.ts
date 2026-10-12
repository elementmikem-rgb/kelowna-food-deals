import { describe, it, expect } from "vitest";
import {
  financeDayBounds,
  reportWindow,
  summarizeSourceDays,
  buildPayloads,
  buildNote,
  parseArgs,
  maskUrl,
  runFinanceIncomeReport,
  REQUIRED_PAYMENT_COLUMNS,
  ALLOWED_PAYLOAD_FIELDS,
  type PaymentRow,
  type SourceDay,
  type QueryFn,
} from "./finance-income-report";

const KEY = "fin_SECRETkeyAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const URL_ = "https://photaro.example/api/finance/ingest/income";

function row(overrides: Partial<PaymentRow> = {}): PaymentRow {
  return {
    kind: "tip",
    amountCents: 500,
    currency: "cad",
    stripeFeeCents: 45,
    taxCents: 0,
    livemode: true,
    paidAt: new Date("2026-10-10T19:00:00.000Z"), // 12:00 Pacific on 2026-10-10
    relatedKind: null,
    ...overrides,
  };
}

function find(days: SourceDay[], day: string, source: string): SourceDay {
  const s = days.find((d) => d.day === day && d.source === source);
  if (!s) throw new Error(`no ${source} summary for ${day}`);
  return s;
}

describe("financeDayBounds (DST aware, half open)", () => {
  it("is 24 hours on a normal PDT day", () => {
    const { start, end } = financeDayBounds("2026-10-10");
    expect(start.toISOString()).toBe("2026-10-10T07:00:00.000Z");
    expect(end.toISOString()).toBe("2026-10-11T07:00:00.000Z");
  });

  it("is 23 hours on the spring-forward day 2026-03-08", () => {
    const { start, end } = financeDayBounds("2026-03-08");
    expect(start.toISOString()).toBe("2026-03-08T08:00:00.000Z");
    expect(end.toISOString()).toBe("2026-03-09T07:00:00.000Z");
    expect((end.getTime() - start.getTime()) / 3_600_000).toBe(23);
  });

  it("is 25 hours on the fall-back day 2026-11-01", () => {
    const { start, end } = financeDayBounds("2026-11-01");
    expect(start.toISOString()).toBe("2026-11-01T07:00:00.000Z");
    expect(end.toISOString()).toBe("2026-11-02T08:00:00.000Z");
    expect((end.getTime() - start.getTime()) / 3_600_000).toBe(25);
  });

  it("rejects malformed and rolled-over dates", () => {
    expect(() => financeDayBounds("2026-02-31")).toThrow();
    expect(() => financeDayBounds("10/11/2026")).toThrow();
  });
});

describe("summarizeSourceDays: day assignment across DST", () => {
  it("puts a payment at 23:30 PST on 2026-11-01 (07:30Z next day) into 2026-11-01, and 00:30 PST 11-02 into 11-02", () => {
    const rows = [
      row({ amountCents: 100, paidAt: new Date("2026-11-02T07:30:00.000Z") }), // 23:30 PST 11-01
      row({ amountCents: 200, paidAt: new Date("2026-11-02T08:30:00.000Z") }), // 00:30 PST 11-02
    ];
    const s = summarizeSourceDays(["2026-11-01", "2026-11-02"], rows);
    expect(find(s, "2026-11-01", "stripe").grossCents).toBe(100);
    expect(find(s, "2026-11-02", "stripe").grossCents).toBe(200);
  });

  it("on 2026-03-08 a payment at 07:30Z belongs to 03-07 and one at 08:00Z to 03-08 (start is inclusive)", () => {
    const rows = [
      row({ amountCents: 100, paidAt: new Date("2026-03-08T07:30:00.000Z") }),
      row({ amountCents: 200, paidAt: new Date("2026-03-08T08:00:00.000Z") }),
      row({ amountCents: 400, paidAt: new Date("2026-03-09T06:59:59.999Z") }),
      row({ amountCents: 800, paidAt: new Date("2026-03-09T07:00:00.000Z") }), // end is exclusive
    ];
    const s = summarizeSourceDays(["2026-03-07", "2026-03-08", "2026-03-09"], rows);
    expect(find(s, "2026-03-07", "stripe").grossCents).toBe(100);
    expect(find(s, "2026-03-08", "stripe").grossCents).toBe(600);
    expect(find(s, "2026-03-09", "stripe").grossCents).toBe(800);
  });

  it("accepts paidAt as a string (raw driver value)", () => {
    const s = summarizeSourceDays(["2026-10-10"], [row({ paidAt: "2026-10-10T19:00:00.000Z" as unknown as Date })]);
    expect(find(s, "2026-10-10", "stripe").grossCents).toBe(500);
  });
});

describe("summarizeSourceDays: rules", () => {
  const DAY = "2026-10-10";

  it("ignores test-mode rows entirely", () => {
    const s = summarizeSourceDays([DAY], [row({ livemode: false, amountCents: 99999 }), row({ amountCents: 500 })]);
    const st = find(s, DAY, "stripe");
    expect(st.grossCents).toBe(500);
    expect(st.salesCount).toBe(1);
    expect(st.feeCents).toBe(45);
  });

  it("gross sums tip, booking, renewal (stripe) and credit_bundle (its own source)", () => {
    const s = summarizeSourceDays(
      [DAY],
      [
        row({ kind: "tip", amountCents: 500 }),
        row({ kind: "booking", amountCents: 3000 }),
        row({ kind: "renewal", amountCents: 2500 }),
        row({ kind: "credit_bundle", amountCents: 25000, stripeFeeCents: 755 }),
      ]
    );
    expect(find(s, DAY, "stripe").grossCents).toBe(6000);
    expect(find(s, DAY, "stripe").salesCount).toBe(3);
    expect(find(s, DAY, "stripe").feeCents).toBe(135);
    expect(find(s, DAY, "credit_bundle").grossCents).toBe(25000);
    expect(find(s, DAY, "credit_bundle").feeCents).toBe(755);
    expect(find(s, DAY, "credit_bundle").salesCount).toBe(1);
  });

  it("keeps non-CAD rows out of totals but counts and sums them per currency", () => {
    const s = summarizeSourceDays([DAY], [row({ currency: "usd", amountCents: 1500 }), row({ currency: "USD", amountCents: 100 }), row({ amountCents: 500 })]);
    const st = find(s, DAY, "stripe");
    expect(st.grossCents).toBe(500);
    expect(st.salesCount).toBe(1);
    expect(st.nonCad).toEqual({ count: 2, byCurrency: { usd: 1600 } });
  });

  it("reports refunds positive, by the refund's own paid_at, not the sale's day", () => {
    const s = summarizeSourceDays(
      ["2026-10-09", DAY],
      [
        row({ kind: "booking", amountCents: 3000, paidAt: new Date("2026-10-09T19:00:00.000Z") }),
        row({ kind: "refund", amountCents: -1000, stripeFeeCents: null, relatedKind: "booking", paidAt: new Date("2026-10-10T19:00:00.000Z") }),
      ]
    );
    expect(find(s, "2026-10-09", "stripe").refundsCents).toBe(0);
    expect(find(s, "2026-10-09", "stripe").grossCents).toBe(3000);
    const d = find(s, DAY, "stripe");
    expect(d.refundsCents).toBe(1000);
    expect(d.grossCents).toBe(0);
    expect(d.salesCount).toBe(0);
    expect(d.salesMissingFee).toBe(0); // a refund is not a sale
  });

  it("attributes a refund of a credit bundle to the credit_bundle source via the related payment", () => {
    const s = summarizeSourceDays(
      [DAY],
      [
        row({ kind: "refund", amountCents: -25000, stripeFeeCents: null, relatedKind: "credit_bundle" }),
        row({ kind: "refund", amountCents: -300, stripeFeeCents: null, relatedKind: null }),
      ]
    );
    expect(find(s, DAY, "credit_bundle").refundsCents).toBe(25000);
    expect(find(s, DAY, "stripe").refundsCents).toBe(300);
  });

  it("refunds are abs of the sum, so a stray positive refund row nets", () => {
    const s = summarizeSourceDays([DAY], [row({ kind: "refund", amountCents: -1000, stripeFeeCents: null }), row({ kind: "refund", amountCents: 200, stripeFeeCents: null })]);
    expect(find(s, DAY, "stripe").refundsCents).toBe(800);
  });

  it("counts sale rows whose Stripe fee is still null", () => {
    const s = summarizeSourceDays([DAY], [row({ stripeFeeCents: null }), row({ stripeFeeCents: null }), row({ stripeFeeCents: 45 })]);
    const st = find(s, DAY, "stripe");
    expect(st.salesMissingFee).toBe(2);
    expect(st.feeCents).toBe(45);
  });

  it("sums tax on sale rows only", () => {
    const s = summarizeSourceDays([DAY], [row({ taxCents: 25 }), row({ taxCents: 30 }), row({ kind: "refund", amountCents: -500, taxCents: 25, stripeFeeCents: null })]);
    expect(find(s, DAY, "stripe").taxCollectedCents).toBe(55);
  });

  it("ignores rows outside every requested day", () => {
    const s = summarizeSourceDays([DAY], [row({ paidAt: new Date("2026-10-11T19:00:00.000Z") })]);
    expect(find(s, DAY, "stripe").grossCents).toBe(0);
  });
});

describe("reportWindow", () => {
  it("is the 7 completed Pacific days ending yesterday, oldest first", () => {
    // 2026-10-11 05:00Z is still 2026-10-10 22:00 Pacific, so yesterday is 2026-10-09.
    expect(reportWindow(new Date("2026-10-11T05:00:00.000Z"), 7)).toEqual([
      "2026-10-03",
      "2026-10-04",
      "2026-10-05",
      "2026-10-06",
      "2026-10-07",
      "2026-10-08",
      "2026-10-09",
    ]);
  });

  it("never includes today in progress (02:30 Pacific run)", () => {
    const w = reportWindow(new Date("2026-10-11T09:30:00.000Z"), 7);
    expect(w[w.length - 1]).toBe("2026-10-10");
    expect(w).not.toContain("2026-10-11");
    expect(w).toHaveLength(7);
  });

  it("supports --days N", () => {
    expect(reportWindow(new Date("2026-10-11T09:30:00.000Z"), 1)).toEqual(["2026-10-10"]);
    expect(reportWindow(new Date("2026-10-11T09:30:00.000Z"), 31)).toHaveLength(31);
  });
});

describe("buildPayloads", () => {
  it("sends stripe for every day as a heartbeat, credit_bundle only on days it has activity", () => {
    const days = ["2026-10-09", "2026-10-10"];
    const s = summarizeSourceDays(days, [row({ kind: "credit_bundle", amountCents: 25000, paidAt: new Date("2026-10-10T19:00:00.000Z") })]);
    const p = buildPayloads(s);
    expect(p.map((x) => `${x.day}/${x.source}`)).toEqual(["2026-10-09/stripe", "2026-10-10/stripe", "2026-10-10/credit_bundle"]);
    const hb = p[0];
    expect(hb).toMatchObject({ gross_cents: 0, fee_cents: 0, refunds_cents: 0, tax_collected_cents: 0, sales_count: 0, currency: "CAD" });
  });

  it("sends credit_bundle on a day with only a credit bundle refund", () => {
    const s = summarizeSourceDays(["2026-10-10"], [row({ kind: "refund", amountCents: -100, stripeFeeCents: null, relatedKind: "credit_bundle" })]);
    expect(buildPayloads(s).map((x) => x.source)).toEqual(["stripe", "credit_bundle"]);
  });

  it("has only the allowed fields, never project, all integers, note <= 200", () => {
    const s = summarizeSourceDays(
      ["2026-10-10"],
      [row({ stripeFeeCents: null }), row({ currency: "usd", amountCents: 123456789 }), row({ currency: "eur", amountCents: 987654321 }), row({ currency: "gbp", amountCents: 5 })]
    );
    for (const p of buildPayloads(s)) {
      expect(Object.keys(p).sort()).toEqual([...ALLOWED_PAYLOAD_FIELDS].sort());
      expect(p).not.toHaveProperty("project");
      expect(p.day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      for (const k of ["gross_cents", "fee_cents", "refunds_cents", "tax_collected_cents", "sales_count"] as const) {
        expect(Number.isInteger(p[k])).toBe(true);
        expect(p[k]).toBeGreaterThanOrEqual(0);
      }
      expect(p.note.length).toBeLessThanOrEqual(200);
    }
  });
});

describe("buildNote", () => {
  const base: SourceDay = {
    day: "2026-10-10",
    source: "stripe",
    grossCents: 0,
    feeCents: 0,
    refundsCents: 0,
    taxCollectedCents: 0,
    salesCount: 0,
    salesMissingFee: 0,
    nonCad: { count: 0, byCurrency: {} },
    rowCount: 0,
  };

  it("always carries the webhook caveat when nothing else needs the space", () => {
    expect(buildNote(base)).toMatch(/webhook/);
  });

  it("puts missing_fee first, then non_cad, then the caveat", () => {
    const n = buildNote({ ...base, salesMissingFee: 3, nonCad: { count: 1, byCurrency: { usd: 1500 } } });
    expect(n.indexOf("missing_fee=3")).toBe(0);
    expect(n.indexOf("non_cad=1")).toBeGreaterThan(0);
    expect(n).toContain("usd 1500");
    expect(n.indexOf("webhook")).toBeGreaterThan(n.indexOf("non_cad"));
  });

  it("stays within 200 chars and keeps missing_fee and non_cad when many currencies crowd it", () => {
    const byCurrency: Record<string, number> = {};
    for (const c of ["usd", "eur", "gbp", "aud", "jpy", "chf", "nzd", "sek", "nok", "dkk", "mxn", "brl", "inr", "hkd", "sgd"]) byCurrency[c] = 123456789;
    const n = buildNote({ ...base, salesMissingFee: 12, nonCad: { count: 99, byCurrency } });
    expect(n.length).toBeLessThanOrEqual(200);
    expect(n.startsWith("missing_fee=12")).toBe(true);
    expect(n).toContain("non_cad=99");
  });
});

describe("parseArgs", () => {
  it("defaults to 7 days, not dry run", () => {
    expect(parseArgs([])).toEqual({ dryRun: false, days: 7 });
  });
  it("reads --dry-run and --days N", () => {
    expect(parseArgs(["--dry-run", "--days", "14"])).toEqual({ dryRun: true, days: 14 });
    expect(parseArgs(["--days=3"])).toEqual({ dryRun: false, days: 3 });
  });
  it("rejects days outside 1..31 and junk", () => {
    expect(() => parseArgs(["--days", "32"])).toThrow();
    expect(() => parseArgs(["--days", "0"])).toThrow();
    expect(() => parseArgs(["--days", "abc"])).toThrow();
    expect(() => parseArgs(["--bogus"])).toThrow();
  });
});

describe("maskUrl", () => {
  it("drops a query string and credentials", () => {
    expect(maskUrl("https://u:p@photaro.example/api/x?token=abc")).toBe("https://photaro.example/api/x?***");
    expect(maskUrl(URL_)).toBe(URL_);
  });
});

// ---------- runner with injected DB, fetch, clock and logger ----------

const ALL_COLUMNS = REQUIRED_PAYMENT_COLUMNS.map((c) => ({ column_name: c }));

function fakeQuery(rows: PaymentRow[], columns = ALL_COLUMNS): { query: QueryFn; calls: { text: string; params: unknown[] }[] } {
  const calls: { text: string; params: unknown[] }[] = [];
  const query: QueryFn = async (text, params = []) => {
    calls.push({ text, params });
    if (text.includes("information_schema")) return columns;
    return rows.map((r) => ({
      kind: r.kind,
      amount_cents: r.amountCents,
      currency: r.currency,
      stripe_fee_cents: r.stripeFeeCents,
      tax_cents: r.taxCents,
      livemode: r.livemode,
      paid_at: r.paidAt,
      related_kind: r.relatedKind,
    }));
  };
  return { query, calls };
}

function logger() {
  const lines: string[] = [];
  return {
    lines,
    log: { info: (m: string) => lines.push(`INFO ${m}`), error: (m: string) => lines.push(`ERROR ${m}`) },
  };
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

type FetchCall = { url: string; init: RequestInit };

function okFetch(calls: FetchCall[]): typeof fetch {
  return (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    const body = JSON.parse(String(init?.body));
    return jsonResponse(200, { ok: true, day: body.day, project: "todaystab" });
  }) as typeof fetch;
}

const NOW = new Date("2026-10-11T09:30:00.000Z"); // 02:30 Pacific
const noSleep = async () => {};

describe("runFinanceIncomeReport", () => {
  it("fails clearly when specials.payments or a needed column is missing, before posting anything", async () => {
    const { query } = fakeQuery([], ALL_COLUMNS.filter((c) => c.column_name !== "related_payment_id"));
    const calls: FetchCall[] = [];
    const { log } = logger();
    await expect(
      runFinanceIncomeReport({ query, fetchFn: okFetch(calls), now: NOW, url: URL_, key: KEY, dryRun: false, days: 7, log, sleep: noSleep })
    ).rejects.toThrow(/specials\.payments.*related_payment_id/);
    expect(calls).toHaveLength(0);
  });

  it("with an empty table still sends 7 stripe heartbeats with the right headers", async () => {
    const { query, calls: q } = fakeQuery([]);
    const calls: FetchCall[] = [];
    const { log } = logger();
    const r = await runFinanceIncomeReport({ query, fetchFn: okFetch(calls), now: NOW, url: URL_, key: KEY, dryRun: false, days: 7, log, sleep: noSleep });
    expect(r.failed).toBe(0);
    expect(r.sent).toBe(7);
    expect(calls).toHaveLength(7);
    expect(calls.map((c) => JSON.parse(String(c.init.body)).day)).toEqual(["2026-10-04", "2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10"]);
    const h = calls[0].init.headers as Record<string, string>;
    expect(h.Authorization).toBe(`Bearer ${KEY}`);
    expect(h["Content-Type"]).toBe("application/json");
    expect(calls[0].init.method).toBe("POST");
    expect(calls[0].url).toBe(URL_);
    // the rows query is bounded by the DST-aware window and filters livemode in SQL too
    const rowsQuery = q.find((c) => !c.text.includes("information_schema"))!;
    expect(rowsQuery.text).toMatch(/livemode\s*=\s*true/i);
    expect(rowsQuery.params).toEqual(["2026-10-04T07:00:00.000Z", "2026-10-11T07:00:00.000Z"]);
  });

  it("dry run prints payloads and sends nothing", async () => {
    const { query } = fakeQuery([]);
    const calls: FetchCall[] = [];
    const { log, lines } = logger();
    const r = await runFinanceIncomeReport({ query, fetchFn: okFetch(calls), now: NOW, url: undefined, key: undefined, dryRun: true, days: 2, log, sleep: noSleep });
    expect(calls).toHaveLength(0);
    expect(r.payloads).toHaveLength(2);
    expect(lines.join("\n")).toContain('"day":"2026-10-10"');
  });

  it("refuses a real run without the URL or key", async () => {
    const { query } = fakeQuery([]);
    const { log } = logger();
    await expect(runFinanceIncomeReport({ query, fetchFn: okFetch([]), now: NOW, url: URL_, key: undefined, dryRun: false, days: 1, log, sleep: noSleep })).rejects.toThrow(/FINANCE_INGEST_KEY/);
    await expect(runFinanceIncomeReport({ query, fetchFn: okFetch([]), now: NOW, url: undefined, key: KEY, dryRun: false, days: 1, log, sleep: noSleep })).rejects.toThrow(/FINANCE_INGEST_URL/);
  });

  it("prints non-CAD rows to stderr", async () => {
    const { query } = fakeQuery([row({ currency: "usd", amountCents: 1500, paidAt: new Date("2026-10-10T19:00:00.000Z") })]);
    const { log, lines } = logger();
    await runFinanceIncomeReport({ query, fetchFn: okFetch([]), now: NOW, url: URL_, key: KEY, dryRun: false, days: 1, log, sleep: noSleep });
    expect(lines.some((l) => l.startsWith("ERROR") && /non.?CAD/i.test(l) && l.includes("usd 1500"))).toBe(true);
  });

  it("retries 5xx and 429 up to 2 times, then succeeds", async () => {
    const statuses = [500, 429, 200];
    let n = 0;
    const sleeps: number[] = [];
    const fetchFn = (async (_u: string, init: RequestInit) => {
      const s = statuses[n++];
      const body = JSON.parse(String(init.body));
      return s === 200 ? jsonResponse(200, { ok: true, day: body.day, project: "todaystab" }) : jsonResponse(s, { error: "x" });
    }) as unknown as typeof fetch;
    const { query } = fakeQuery([]);
    const { log } = logger();
    const r = await runFinanceIncomeReport({ query, fetchFn, now: NOW, url: URL_, key: KEY, dryRun: false, days: 1, log, sleep: async (ms) => void sleeps.push(ms) });
    expect(n).toBe(3);
    expect(r.failed).toBe(0);
    expect(sleeps).toHaveLength(2);
  });

  it("retries network errors and gives up after 3 attempts", async () => {
    let n = 0;
    const fetchFn = (async () => {
      n++;
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    const { query } = fakeQuery([]);
    const { log } = logger();
    const r = await runFinanceIncomeReport({ query, fetchFn, now: NOW, url: URL_, key: KEY, dryRun: false, days: 1, log, sleep: noSleep });
    expect(n).toBe(3);
    expect(r.failed).toBe(1);
  });

  it.each([401, 400, 409])("does not retry %i and counts the day as failed", async (status) => {
    let n = 0;
    const fetchFn = (async () => {
      n++;
      return jsonResponse(status, { error: "nope" });
    }) as unknown as typeof fetch;
    const { query } = fakeQuery([]);
    const { log, lines } = logger();
    const r = await runFinanceIncomeReport({ query, fetchFn, now: NOW, url: URL_, key: KEY, dryRun: false, days: 2, log, sleep: noSleep });
    expect(n).toBe(2); // one attempt per day
    expect(r.failed).toBe(2);
    if (status === 409) expect(lines.join("\n")).toMatch(/hand-typed/);
  });

  it("keeps going after one day fails and reports the rest", async () => {
    let n = 0;
    const fetchFn = (async (_u: string, init: RequestInit) => {
      n++;
      const body = JSON.parse(String(init.body));
      return body.day === "2026-10-09" ? jsonResponse(409, { error: "manual" }) : jsonResponse(200, { ok: true, day: body.day, project: "todaystab" });
    }) as unknown as typeof fetch;
    const { query } = fakeQuery([]);
    const { log } = logger();
    const r = await runFinanceIncomeReport({ query, fetchFn, now: NOW, url: URL_, key: KEY, dryRun: false, days: 3, log, sleep: noSleep });
    expect(n).toBe(3);
    expect(r.failed).toBe(1);
    expect(r.sent).toBe(2);
  });

  it("never puts the key or the Authorization header in logs or errors, and masks the URL query", async () => {
    const leakyUrl = `${URL_}?sig=topsecretquery`;
    const fetchFn = (async () => {
      throw new Error(`connect failed for Bearer ${KEY} at ${leakyUrl}`);
    }) as unknown as typeof fetch;
    const { query } = fakeQuery([]);
    const { log, lines } = logger();
    const r = await runFinanceIncomeReport({ query, fetchFn, now: NOW, url: leakyUrl, key: KEY, dryRun: false, days: 1, log, sleep: noSleep });
    expect(r.failed).toBe(1);
    const all = lines.join("\n") + JSON.stringify(r);
    expect(all).not.toContain(KEY);
    expect(all).not.toContain("topsecretquery");
    expect(all).not.toMatch(/Authorization/i);

    // dry run output too
    const dry = logger();
    await runFinanceIncomeReport({ query, fetchFn, now: NOW, url: leakyUrl, key: KEY, dryRun: true, days: 1, log: dry.log, sleep: noSleep });
    expect(dry.lines.join("\n")).not.toContain(KEY);
    expect(dry.lines.join("\n")).not.toContain("topsecretquery");
  });

  it("a 200 without ok:true is a failure", async () => {
    const fetchFn = (async () => jsonResponse(200, { nope: true })) as unknown as typeof fetch;
    const { query } = fakeQuery([]);
    const { log } = logger();
    const r = await runFinanceIncomeReport({ query, fetchFn, now: NOW, url: URL_, key: KEY, dryRun: false, days: 1, log, sleep: noSleep });
    expect(r.failed).toBe(1);
  });
});

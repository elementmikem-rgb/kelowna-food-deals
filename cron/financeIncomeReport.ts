import postgres from "postgres";
import { fileURLToPath } from "url";
import { parseArgs, runFinanceIncomeReport, type QueryFn } from "@/lib/finance-income-report";

// Daily job: sends the last N completed Pacific days of TodaysTab income from
// specials.payments to Photaro's finance ingest API. Reads only DATABASE_URL,
// FINANCE_INGEST_URL and FINANCE_INGEST_KEY. See docs/finance-income-report.md.
// Exits non-zero if any day failed (including a 409) so Railway's crash email fires.

async function main(): Promise<number> {
  const { dryRun, days } = parseArgs(process.argv.slice(2));
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");

  const client = postgres(process.env.DATABASE_URL, { max: 1 });
  const query: QueryFn = async (text, params = []) =>
    (await client.unsafe(text, params as postgres.ParameterOrJSON<never>[])) as unknown as Record<string, unknown>[];

  try {
    const result = await runFinanceIncomeReport({
      query,
      fetchFn: fetch,
      now: new Date(),
      url: process.env.FINANCE_INGEST_URL,
      key: process.env.FINANCE_INGEST_KEY,
      dryRun,
      days,
      log: { info: (m) => console.log(m), error: (m) => console.error(m) },
      sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    });
    if (result.failed > 0) {
      console.error(`finance income report: ${result.failed} payload(s) failed, ${result.sent} sent`);
      return 1;
    }
    console.log(`finance income report: done, ${dryRun ? "dry run, nothing sent" : `${result.sent} sent`}`);
    return 0;
  } finally {
    await client.end({ timeout: 5 });
  }
}

const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      const key = process.env.FINANCE_INGEST_KEY;
      let msg = err instanceof Error ? err.message : String(err);
      if (key) msg = msg.split(key).join("***");
      console.error(`finance income report failed: ${msg}`);
      process.exit(1);
    });
}

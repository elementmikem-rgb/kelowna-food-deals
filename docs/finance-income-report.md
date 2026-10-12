# Finance income report (TodaysTab to Photaro)

`cron/financeIncomeReport.ts` (rules in `lib/finance-income-report.ts`, tests in
`lib/finance-income-report.test.ts`) sends TodaysTab's daily income to Photaro's
finance ingest API (`POST /api/finance/ingest/income`, see
`C:\photaro\docs\finance-ingest.md`).

## What it does

Each run:

1. Checks via `information_schema` that `specials.payments` exists with the columns it
   needs, and stops with a clear message if not.
2. Reads `specials.payments` with SQL only (no Stripe API, no other app code) for the
   7 completed Pacific (America/Vancouver) days ending yesterday. Today is never sent.
   Day bounds come from `startOfDayPacific` in `lib/time.ts`, so the 23 hour and
   25 hour DST days are correct.
3. Per day it posts up to two rows to Photaro, keyed by day and `source`:
   - `stripe`: tips, bookings and renewals, and refunds of those. Sent every day,
     zero totals included, as a heartbeat.
   - `credit_bundle`: prepaid credit purchases, and refunds whose original payment
     (`related_payment_id`) was a credit bundle. Sent only on days that have one.
4. Rules: live rows only (`livemode = true`); CAD rows only in the totals.
   `gross_cents` = sum of sales, `refunds_cents` = refunds by the refund's own
   `paid_at` (positive), `fee_cents` = Stripe fees on sales, `tax_collected_cents` =
   tax on sales, `sales_count` = sale rows. The note carries, in this order and
   within 200 characters: `missing_fee=N` (sales whose Stripe fee is not known yet,
   so fees are understated), `non_cad=N excluded (...)` (non-CAD rows, also printed
   to stderr), and a short reminder that totals depend on the webhook.

Re-sending a day replaces Photaro's row for that day and source, so the 7 day window
lets late fees and refunds correct earlier days. No local state is kept.

Failures: 5xx, 429 and network errors are retried up to 2 times with backoff (a
minute for 429). 400 and 401 are not retried. A 409 means the owner typed a row
by hand for that day and source; the report never overwrites it. If any day failed
(409 included) the job exits 1 so Railway's crash email fires. The key, the
Authorization header and any URL query string are never printed.

## Schedule

A separate Railway cron service from the same image, start command
`npm run cron:finance-income`, scheduled daily at 02:30 Pacific (`30 9 * * *` UTC
in PDT, `30 10 * * *` in PST; or `30 10 * * *` all year, which is 02:30 PST / 03:30
PDT and still after midnight Pacific).

## Environment variables

| Variable             | Meaning                                                                    |
| -------------------- | -------------------------------------------------------------------------- |
| `DATABASE_URL`       | Existing Postgres connection string                                        |
| `FINANCE_INGEST_URL` | Full URL of Photaro's `/api/finance/ingest/income`                         |
| `FINANCE_INGEST_KEY` | The `fin_...` key from Photaro's Finance tab (project todaystab). Secret. |

## Dry run

```
npm run cron:finance-income -- --dry-run
npm run cron:finance-income -- --dry-run --days 14
```

`--dry-run` prints the payloads and sends nothing (the URL and key are not needed).
`--days N` changes the window (default 7, max 31).

## Limitations

- Tips and other payments before 2026-10-11 are not in `specials.payments` and are
  not backfilled, so earlier days report zero.
- A failed webhook ledger write is not retried, so a day can be understated. The
  report cannot see payments the webhook did not record.
- The Stripe account is shared with Photaro and Callova, so only
  `specials.payments` (this site's own rows) is read, never Stripe directly.
- `gross_cents` includes the card processing fee passed through to the buyer,
  because that is part of what the buyer paid; the real Stripe fee is `fee_cents`.
- `refunds_cents` needs the Photaro side to accept that field; until it does, every
  post is a 400 and the job exits 1.

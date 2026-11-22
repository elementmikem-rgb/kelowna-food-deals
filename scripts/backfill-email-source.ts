// Records the origin of existing contact addresses, but ONLY where it can be proven:
//   owner_reply: the owner wrote to us from that exact address (a row in inbound_emails)
//   web_search : the address matches what the web-search backfill logged in scratch/backfill-emails-log.json
// Everything else stays null ("origin not recorded"): guessing would create a false record, which is worse than none.
// Changes only venues.contact_email_source, and only where it is currently null. It never changes who gets emailed.
//
// Run:  npx tsx --env-file=.env.local scripts/backfill-email-source.ts          (dry run: counts only)
//       npx tsx --env-file=.env.local scripts/backfill-email-source.ts --run     (writes)
import { existsSync, readFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { db } from "@/db";

const RUN = process.argv.includes("--run");

async function main() {
  const owner = (await db.execute(sql`
    select v.id from specials.venues v
    where v.contact_email is not null and v.contact_email_source is null
      and exists (select 1 from specials.inbound_emails e where e.venue_id = v.id and lower(e.from_email) = lower(v.contact_email))`)) as unknown as { id: number }[];
  console.log(`owner_reply: ${owner.length} venue(s) where the owner wrote to us from the stored address`);
  if (RUN && owner.length > 0) {
    await db.execute(sql`
      update specials.venues v set contact_email_source = 'owner_reply'
      where v.contact_email is not null and v.contact_email_source is null
        and exists (select 1 from specials.inbound_emails e where e.venue_id = v.id and lower(e.from_email) = lower(v.contact_email))`);
  }

  const logPath = "scratch/backfill-emails-log.json";
  if (!existsSync(logPath)) {
    console.log("no web-search log found, skipping web_search");
  } else {
    const log = JSON.parse(readFileSync(logPath, "utf8")) as { id: number; email: string | null }[];
    const entries = log.filter((l) => l.email).map((l) => ({ id: l.id, email: l.email!.toLowerCase() }));
    // Ids go in as one JSON value: postgres-js would expand a JS array into separate parameters.
    const idsJson = JSON.stringify(entries.map((e) => e.id));
    const current = (await db.execute(sql`
      select id, lower(contact_email) as em from specials.venues
      where id in (select jsonb_array_elements_text(${idsJson}::jsonb)::int)
        and contact_email is not null and contact_email_source is null`)) as unknown as { id: number; em: string }[];
    const byId = new Map(entries.map((e) => [e.id, e.email]));
    const match = current.filter((c) => byId.get(c.id) === c.em).map((c) => c.id);
    console.log(`web_search: ${match.length} venue(s) whose stored address equals the logged web-search result (${entries.length} logged)`);
    if (RUN && match.length > 0) {
      const matchJson = JSON.stringify(match);
      await db.execute(sql`
        update specials.venues set contact_email_source = 'web_search'
        where id in (select jsonb_array_elements_text(${matchJson}::jsonb)::int) and contact_email_source is null`);
    }
  }

  const [tot] = (await db.execute(sql`
    select count(*) filter (where contact_email is not null) as with_email,
           count(*) filter (where contact_email_source is not null) as with_source,
           count(*) filter (where contact_email_source = 'owner_reply') as owner_reply,
           count(*) filter (where contact_email_source = 'web_search') as web_search
    from specials.venues`)) as unknown as Array<Record<string, string>>;
  console.log(`${RUN ? "after" : "currently"}: ${tot.with_email} with an address, ${tot.with_source} with a recorded source (owner_reply ${tot.owner_reply}, web_search ${tot.web_search})`);
  console.log(RUN ? "done" : "dry run only, nothing written. Add --run to write.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => process.exit(process.exitCode ?? 0));

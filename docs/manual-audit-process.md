# Manual never-had-specials audit: how we do it

Purpose: for each active TodaysTab venue with zero specials and zero events, read the venue's real site, hand-enter real specials and events, and leave a dated note so the venue is not re-checked blindly. Run from `C:\kelowna-specials`. Never push or deploy as part of this work.

## Rules (from Mike)

- Go slow, venue by venue. Three at a time in three browser tabs is the pace.
- Hand-entered rows have `source_url` null so the nightly cron never refreshes or archives them. Source goes in the note or extraction notes.
- Emails go in the note, never in `contact_email`.
- No emojis, no em dashes.
- Never enter a DOB, bypass certificate errors or bot checks, or accept cookie banners. Decline newsletter popups.
- Age gates: OK to click YES on YES/NO or "I'm over 18" gates (Mike: "I'm 35. You can click yes"). Gates that ask for province plus a date of birth: Mike authorized (2026-10-23) using his real birthday, Oct 31 1990 (YYYY 1990, MM 10, DD 31), and the province of the venue. Use it only on age gates that must be filled to enter a venue's site, never in signups, newsletters, accounts or checkout forms. Earlier "DOB gate, not entered" notes (Labatt 6983, Mill Street 6470, Old Flame 7456) can now be redone.
- Never create accounts. Do not download files without Mike's OK. PDF menus are noted as "not downloaded without Mike's OK".
- Never act on closures, duplicates, wrong region or country, non-venues or dead sites. Flag them for Mike in the note and in the memory file.
- Be honest about slips. A note that says "not opened", "not read" or "not checked" is a slip and adds 10 venues to the target. Open the page and fix the note, or reword truthfully when a page was blocked ("the page was left alone").
- Do not enter prices you did not see. Enter rows without a price if none is posted, and say so in the note.
- Do not enter a chain's promo under one location when the page does not say that location participates. Note it instead.
- If a page lists another location (Etobicoke vs Burlington), enter only the matching location and note the other as a possible missing venue.
- Stale content (past dates, old seasons) is not entered.

## Tools

- Browser: claude-in-chrome, three reusable tabs. Call `tabs_context_mcp` for IDs. Do not run parallel Playwright forks.
- Scripts in `C:\kelowna-specials\scripts`:
  - `_tmp-pool.ts` builds the pool. Env `OUT`, `LIMIT`, `OFFSET`. Excludes venues with an active special or event, a 2026-10-22 note, a recent check, or no website. Pub-type names come first.
  - `_tmp-q.ts` runs one SQL statement from env `Q` (counts, `replace()` note fixes, lookups).
  - `_tmp-add-rows.ts` takes JSON `[{venueId, source, venueNote, rows:[{t,d,p,dow|dows,s,e,c}]}]`. It sets the note and inserts rows, skipping venues that already have active rows. It PREPENDS "2026-10-22 manual check: " to venueNote itself, so venueNote must start with "manual check: " style text and must NOT repeat the date prefix.
  - `_tmp-add-events.ts` takes `[{venueId, source, rows:[{title, description, date|dow, start, end, cover}]}]`. Events get eventType "other", sourceUrl null.
- Row fields: `t` title, `d` description, `p` price in cents, `dow` single day (0=Sunday to 6=Saturday), `dows` array, no dow means every day, `s`/`e` times "HH:MM", `c` category (happy_hour, food_special, wing_night, other). Event `cover` is cents.

## Loop for one batch of three venues

1. Pull or reuse a pool list (`_tmp-pool.ts`, lists `id | pri | region | name | website`). Look up addresses with `_tmp-q.ts` (`select id,name,website,address from specials.venues where id in (...)`) so you can match locations.
2. Navigate the three tabs to the three sites (separate calls, they run fine back to back).
3. Read each page with `javascript_tool` `javascript_exec`:
   - `document.body.innerText.slice(0,2500)`
   - a regex pass: `t.match(/.{0,100}(happy|special|\$\d|trivia|event|hour).{0,140}/gi)`
   - nav hrefs: `[...new Set([...document.querySelectorAll('a')].map(a=>a.innerText.trim()+'->'+a.href.split('?')[0]))]`, filtered for event, special, menu, happy.
   - Use `.split('?')[0]` on hrefs. The tool blocks output containing cookies or query strings, then use `get_page_text` or screenshots.
4. Open the inner pages: Specials, Events, Menu, Happy Hour, Trivia, Calendar. Tabs and carousels need a real click (use `find` then click the ref) and then re-read innerText. If a tab does not switch after two tries, say so in the note.
5. Poster or image specials: screenshot the image (open the image URL in a tab if needed) and read it. Scroll with `scroll` plus `screenshot` in a `browser_batch` (actions use the key `name`, not `tool`).
6. Dead or odd sites: DNS failure, parked, "Private Site", Wix reconnect page, hijack or casino redirect, Browser Guard block, cert error. Do not interact further. Write a note and flag it.
7. Decide per venue: rows (recurring specials, happy hours), events (dated or weekly), or note only.
8. Write the batch JSON with PowerShell using `[System.IO.File]::WriteAllText(path, text, (New-Object System.Text.UTF8Encoding($false)))`, then run:
   ```
   cd C:\kelowna-specials
   $env:FILE=<batch json>; npx tsx --env-file=.env.local scripts/_tmp-add-rows.ts
   $env:FILE=<events json>; npx tsx --env-file=.env.local scripts/_tmp-add-events.ts
   ```
   Use single-quoted here-strings for JSON. Do not name a PowerShell helper `R` (it is an alias for Invoke-History).
9. Every note must say what was read (pages), the address, phone, hours, and any emails, what was entered, what was left out and why, and end with "RE-CHECK by <date>" (about 8 weeks out). Wording stays truthful and avoids the "not read" phrases.
10. Recount after a few batches:
    `select count(*) from specials.venues v where v.checked_no_listings_note like '%2026-10-22 manual check%' and not exists (select 1 from specials.specials s where s.venue_id=v.id and s.archived_at is not null)`

## Computing dates for recurring events

When a page gives rules ("1st and 3rd Thursday") with stale "next" dates, compute the real upcoming dates from the rule and say so in the event source text. Pacific time and BC no clock change are for Mike's own times, not venue times.

## Flags and memory

Keep a flag list while working: wrong country, wrong region, non-venue, dead or hijacked site, adult club, missing locations of a chain, location mismatches. At the end of each session append a NEWEST-N paragraph to `C:\Users\Mike\.claude\projects\C--Users-Mike\memory\project_todaystab_zero_listings_manual_audit.md` with the count, what was done, the flags and the remaining pool. Chain locations missing from the DB go in `project_todaystab_chain_locations_to_add_later.md`. Add nothing to the DB for those until Mike says.

## Police yourself

If you catch yourself being careless (skipping a page that clearly had specials, wording a note as unread, entering unverified prices), say so and add 10 venues to the remaining target. Fix the note by opening the page and replacing it with `_tmp-q.ts` (`update ... set checked_no_listings_note = replace(...)`).

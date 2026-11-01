# TodaysTab blog coverage tracker

One row per region. Update this file every time a guide is written, verified, refreshed or deployed. Data numbers are active venues and live (non-archived) specials as of 2026-10-31; re-pull them with `scripts/_tmp-snap.ts` and the region query in this file's history before choosing the next wave.

## How a cycle runs (the loop)

1. Pick the next 5 regions: highest `with specials` count among Status = Queued, preferring regions with Search Console impressions. Merge sub-regions that share one city (Calgary, Toronto).
2. Snapshot the region data (`scripts/_tmp-snap.ts`), then run the `todaystab-blog-post` skill: writer, independent verifier, writer applies corrections, checker, tsc, vitest.
3. Every verifier finding that says a venue is closed, a duplicate, the wrong address or the wrong price goes on that region's Open issues list below. Mike approves, then the database is fixed, so the guide and the site agree.
4. Commit, deploy (Railway link check, local build, `railway up`, poll, live curl check), then request Search Console indexing for each new URL.
5. Refresh: every guide is re-checked monthly. Re-pull the snapshot, re-verify the numbers and any venue marked open or hedged, bump `updatedAt`, redeploy, re-request indexing. Oldest `Last verified` first.
6. After a wave, update this file, then start the next wave.

## Status key
Done = live and indexed-requested. WIP = draft or verify in progress. Queued = not started. Covered = included in another region's guide.

## Non-region posts (all live)
how-we-verify-every-special (site-wide), real-kelowna-happy-hour-guide, best-wing-nights-kelowna, cheap-eats-kelowna-under-10, kelowna-west-kelowna-peachland-deals, trivia-karaoke-nights-kelowna. Manually re-checked against live data 2026-10-31 (commit 0760842).

## All regions

| # | Region (slug) | Province | Venues | With specials | Status | Guide slug | Published | Last verified | Next refresh due | Notes / open issues |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Edmonton (edmonton) | Alberta | 228 | 110 | Done | happy-hours-edmonton-2026 | 2026-10-29 | 2026-10-31 (text re-checked) | 2026-11-30 | Original wave. Flame & Barrel days hedged. |
| 2 | Ottawa (ottawa) | Ontario | 230 | 82 | Done | happy-hours-ottawa | 2026-10-31 | 2026-10-31 | 2026-11-30 | Wave 2. Venue 1024 Clocktower Glebe deactivated (closed). Corner Bar & Grill (1031) happy hour 3-6 and 9-close daily confirmed on its site 2026-10-31. |
| 3 | Kelowna (kelowna) | British Columbia | 119 | 81 | Done | happy-hours-kelowna-2026 | 2026-10-29 | 2026-10-31 (text re-checked) | 2026-11-30 | Original wave. Kelly O'Bryan's Tue+Sun Power Hour confirmed on venue site 2026-10-31. |
| 4 | Calgary (calgary) | Alberta | 157 | 75 | Done | happy-hours-calgary | 2026-10-31 | 2026-10-31 | 2026-11-30 | Wave 2. Covers calgary, calgary-sw, calgary-nw, calgary-ne, calgary-se. Comery Block DB row 'South Block Draught' was $2 off stored as a $2 price: fixed 2026-10-31. |
| 5 | Hamilton (hamilton) | Ontario | 137 | 52 | Done | happy-hours-hamilton | 2026-10-31 | 2026-10-31 | 2026-11-30 | Wave 2. Duplicate listings: deactivated 2247 and 2262; still open 1014/6768 (Squire) and 6784 (events differ). |
| 6 | Kitchener-Waterloo-Cambridge (kitchener-waterloo-cambridge) | Ontario | 132 | 52 | Done | happy-hours-kitchener-waterloo-cambridge-2026 | 2026-10-29 | 2026-10-31 (text re-checked) | 2026-11-30 | Original wave. Older-verifier flags re-checked 2026-10-31: all DB-supported. |
| 7 | Halifax (halifax) | Nova Scotia | 153 | 51 | Done | happy-hours-halifax | 2026-10-31 | 2026-10-31 | 2026-11-30 | Wave 2. Salt + Ash $12/$7/$1 confirmed on venue site. |
| 8 | Barrie & Simcoe County (barrie-simcoe-county) | Ontario | 116 | 42 | Done | happy-hours-barrie | 2026-10-31 | 2026-10-31 | 2026-11-30 | Wave 2. ATLAS bites/oysters prices unconfirmed (hedged in post). Donaleigh's spelling is right in the post (DB says Donaleighs). Tipsy Goose (4519) not listed; add at refresh. |
| 9 | Penticton (penticton) | British Columbia | 56 | 36 | Done | happy-hours-penticton-2026 | 2026-10-29 | 2026-10-31 (text re-checked) | 2026-11-30 | Original wave. BNA DB rows mix Kelowna/Vernon/Penticton (post fixed). Yellow Dog site offline, call-ahead wording. |
| 10 | Revelstoke & Golden (revelstoke-golden) | British Columbia | 15 | 5 | Done | happy-hours-revelstoke-golden-2026 | 2026-10-29 | 2026-10-31 (text re-checked) | 2026-11-30 | Original wave. DB venue 3161 (BC liquor records confirm The Golden Taps Pub at 505 9 Ave N) is named 'The Bar & Grill (Golden)' but is The Golden Taps (rename pending approval). SEOUL STREET happy hour not on its site. |
| 11 | Vancouver (vancouver) | British Columbia | 338 | 190 | Done | happy-hours-vancouver | 2026-10-31 | 2026-10-31 | 2026-11-30 | Wave 3. Verified by separate agent; Park Pub wings softened, Amber Gastown days unconfirmed, Steamworks discount amounts not in data (worded generically). |
| 12 | Winnipeg (winnipeg) | Manitoba | 193 | 59 | Done | happy-hours-winnipeg | 2026-10-31 | 2026-10-31 | 2026-11-30 | Wave 3. La Roca removed (fire Nov 2025). Hy's, Peasant Cookery, 1928 Eatery corrected. 2-5 PM at 11 venues. |
| 13 | Toronto Core (toronto-core) | Ontario | 116 | 54 | Done | happy-hours-toronto | 2026-10-31 | 2026-10-31 | 2026-11-30 | Wave 3, spans toronto-core/-north/-east/-west. Late-window count corrected to 4. Boutique Bar $3 rests on our record only. |
| 14 | London (london) | Ontario | 140 | 50 | Done | happy-hours-london-ontario | 2026-10-31 | 2026-10-31 | 2026-11-30 | Wave 3 (London, Ontario). Craft Farmacy and Turtle Jack's moved to correct areas. Tue/Wed 30 of 35 counts daily specials. |
| 15 | Saskatoon (saskatoon) | Saskatchewan | 131 | 46 | Done | happy-hours-saskatoon | 2026-10-31 | 2026-10-31 | 2026-11-30 | Wave 3. Better Brother is City Park. Leopold's Kensington record looks copied from Broadway (call-to-confirm). Wendel Clark's 0.6-confidence rows excluded. |
| 16 | Calgary SW (calgary-sw) | Alberta | 156 | 82 | Covered |  |  |  |  | In the Calgary guide. |
| 17 | Toronto North (toronto-north) | Ontario | 146 | 63 | Covered |  |  |  |  | In the Toronto guide (wave 3). |
| 18 | Calgary NW (calgary-nw) | Alberta | 83 | 52 | Covered |  |  |  |  | In the Calgary guide. |
| 19 | Calgary SE (calgary-se) | Alberta | 58 | 35 | Covered |  |  |  |  | In the Calgary guide. |
| 20 | Toronto West (toronto-west) | Ontario | 92 | 30 | Covered |  |  |  |  | In the Toronto guide (wave 3). |
| 21 | Toronto East (toronto-east) | Ontario | 78 | 26 | Covered |  |  |  |  | In the Toronto guide (wave 3). |
| 22 | Calgary NE (calgary-ne) | Alberta | 66 | 25 | Covered |  |  |  |  | In the Calgary guide. |
| 23 | Niagara Region (niagara-region) | Ontario | 179 | 58 | Queued |  |  |  |  |  |
| 24 | Halton Region (halton-region) | Ontario | 174 | 58 | Queued |  |  |  |  |  |
| 25 | Surrey & White Rock (surrey) | British Columbia | 112 | 55 | Queued |  |  |  |  |  |
| 26 | Durham Region (durham-region) | Ontario | 139 | 53 | Queued |  |  |  |  |  |
| 27 | York Region (york-region) | Ontario | 161 | 51 | Queued |  |  |  |  |  |
| 28 | Mississauga (mississauga) | Ontario | 123 | 48 | Queued |  |  |  |  |  |
| 29 | Regina (regina) | Saskatchewan | 118 | 48 | Queued |  |  |  |  |  |
| 30 | Québec (quebec-city) | Quebec | 184 | 47 | Queued |  |  |  |  |  |
| 31 | Montréal Centre (montreal-core) | Quebec | 151 | 47 | Queued |  |  |  |  |  |
| 32 | Laval (laval) | Quebec | 133 | 38 | Queued |  |  |  |  |  |
| 33 | Peterborough & the Kawarthas (peterborough-kawarthas) | Ontario | 94 | 37 | Queued |  |  |  |  |  |
| 34 | Guelph (guelph) | Ontario | 91 | 37 | Queued |  |  |  |  |  |
| 35 | Montréal Nord (montreal-north) | Quebec | 208 | 36 | Queued |  |  |  |  |  |
| 36 | Sunshine Coast (sunshine-coast) | British Columbia | 89 | 35 | Queued |  |  |  |  |  |
| 37 | Sherbrooke (sherbrooke) | Quebec | 101 | 32 | Queued |  |  |  |  |  |
| 38 | Montréal Est (montreal-east) | Quebec | 117 | 30 | Queued |  |  |  |  |  |
| 39 | Red Deer (red-deer) | Alberta | 89 | 30 | Queued |  |  |  |  |  |
| 40 | Collingwood & Blue Mountain (collingwood-blue-mountain) | Ontario | 87 | 29 | Queued |  |  |  |  |  |
| 41 | Prince George (prince-george) | British Columbia | 67 | 29 | Queued |  |  |  |  |  |
| 42 | Brossard (brossard) | Quebec | 87 | 27 | Queued |  |  |  |  |  |
| 43 | St. John's (st-johns-nl) | Newfoundland and Labrador | 119 | 25 | Queued |  |  |  |  |  |
| 44 | Lévis (levis) | Quebec | 93 | 25 | Queued |  |  |  |  |  |
| 45 | Charlottetown (charlottetown) | Prince Edward Island | 89 | 25 | Queued |  |  |  |  |  |
| 46 | Moncton (moncton) | New Brunswick | 105 | 24 | Queued |  |  |  |  |  |
| 47 | North Bay (north-bay) | Ontario | 69 | 24 | Queued |  |  |  |  |  |
| 48 | Brantford (brantford) | Ontario | 74 | 23 | Queued |  |  |  |  |  |
| 49 | Medicine Hat (medicine-hat) | Alberta | 72 | 23 | Queued |  |  |  |  |  |
| 50 | Brandon (brandon-mb) | Manitoba | 77 | 22 | Queued |  |  |  |  |  |
| 51 | Edmonton South (edmonton-south) | Alberta | 39 | 22 | Queued |  |  |  |  |  |
| 52 | Laurentides (laurentides-mont-tremblant) | Quebec | 114 | 21 | Queued |  |  |  |  |  |
| 53 | Saguenay (saguenay) | Quebec | 99 | 21 | Queued |  |  |  |  |  |
| 54 | Annapolis Valley (annapolis-valley) | Nova Scotia | 92 | 21 | Queued |  |  |  |  |  |
| 55 | Saint-Jean-sur-Richelieu (saint-jean-sur-richelieu) | Quebec | 91 | 21 | Queued |  |  |  |  |  |
| 56 | Granby (granby) | Quebec | 70 | 21 | Queued |  |  |  |  |  |
| 57 | Fort McMurray (fort-mcmurray) | Alberta | 60 | 21 | Queued |  |  |  |  |  |
| 58 | Thunder Bay (thunder-bay) | Ontario | 87 | 20 | Queued |  |  |  |  |  |
| 59 | Trois-Rivières (trois-rivieres) | Quebec | 86 | 20 | Queued |  |  |  |  |  |
| 60 | Ouest-de-l'Île (west-island) | Quebec | 82 | 20 | Queued |  |  |  |  |  |
| 61 | Drummondville (drummondville) | Quebec | 84 | 19 | Queued |  |  |  |  |  |
| 62 | Charlevoix (charlevoix) | Quebec | 82 | 18 | Queued |  |  |  |  |  |
| 63 | Gatineau (gatineau) | Quebec | 114 | 17 | Queued |  |  |  |  |  |
| 64 | Longueuil (longueuil) | Quebec | 95 | 17 | Queued |  |  |  |  |  |
| 65 | Sault Ste. Marie (sault-ste-marie) | Ontario | 82 | 17 | Queued |  |  |  |  |  |
| 66 | Whistler (whistler) | British Columbia | 23 | 17 | Queued |  |  |  |  |  |
| 67 | Lethbridge (lethbridge) | Alberta | 22 | 17 | Queued |  |  |  |  |  |
| 68 | North Okanagan (north-okanagan) | British Columbia | 18 | 17 | Queued |  |  |  |  |  |
| 69 | Edmonton North (edmonton-north) | Alberta | 35 | 16 | Queued |  |  |  |  |  |
| 70 | Fredericton (fredericton) | New Brunswick | 94 | 15 | Queued |  |  |  |  |  |
| 71 | Banff & Canmore (banff-canmore) | Alberta | 19 | 15 | Queued |  |  |  |  |  |
| 72 | Burnaby & Tri-Cities (burnaby-tricities) | British Columbia | 18 | 15 | Queued |  |  |  |  |  |
| 73 | North Shore (north-shore) | British Columbia | 18 | 15 | Queued |  |  |  |  |  |
| 74 | Prince Edward County (prince-edward-county) | Ontario | 100 | 14 | Queued |  |  |  |  |  |
| 75 | Saint John (saint-john-nb) | New Brunswick | 96 | 14 | Queued |  |  |  |  |  |
| 76 | Victoria (victoria) | British Columbia | 22 | 14 | Queued |  |  |  |  |  |
| 77 | Richmond (richmond) | British Columbia | 19 | 14 | Queued |  |  |  |  |  |
| 78 | Kamloops (kamloops) | British Columbia | 19 | 14 | Queued |  |  |  |  |  |
| 79 | Grande Prairie (grande-prairie) | Alberta | 18 | 12 | Queued |  |  |  |  |  |
| 80 | Sherwood Park (sherwood-park) | Alberta | 18 | 12 | Queued |  |  |  |  |  |
| 81 | St. Albert & Spruce Grove (st-albert-spruce-grove) | Alberta | 16 | 12 | Queued |  |  |  |  |  |
| 82 | Fraser Valley (fraser-valley) | British Columbia | 15 | 12 | Queued |  |  |  |  |  |
| 83 | Windsor-Essex (windsor-essex) | Ontario | 21 | 11 | Queued |  |  |  |  |  |
| 84 | Nanaimo (nanaimo) | British Columbia | 16 | 11 | Queued |  |  |  |  |  |
| 85 | Cape Breton (cape-breton) | Nova Scotia | 102 | 10 | Queued |  |  |  |  |  |
| 86 | Abitibi-Témiscamingue (abitibi-temiscamingue) | Quebec | 101 | 10 | Queued |  |  |  |  |  |
| 87 | Kingston (kingston) | Ontario | 25 | 10 | Queued |  |  |  |  |  |
| 88 | Sudbury (sudbury) | Ontario | 19 | 10 | Queued |  |  |  |  |  |
| 89 | Airdrie & Cochrane (airdrie-cochrane) | Alberta | 20 | 9 | Queued |  |  |  |  |  |
| 90 | Comox Valley (comox-valley) | British Columbia | 17 | 9 | Queued |  |  |  |  |  |
| 91 | Cranbrook & Fernie (cranbrook-fernie) | British Columbia | 16 | 9 | Queued |  |  |  |  |  |
| 92 | Brampton (brampton) | Ontario | 17 | 8 | Queued |  |  |  |  |  |
| 93 | Chatham-Kent (chatham-kent) | Ontario | 18 | 5 | Queued |  |  |  |  |  |
| 94 | Muskoka (muskoka) | Ontario | 21 | 4 | Queued |  |  |  |  |  |
| 95 | Nelson (nelson) | British Columbia | 19 | 4 | Queued |  |  |  |  |  |
| 96 | Gaspésie Nord (gaspesie-nord) | Quebec | 20 | 1 | Queued |  |  |  |  |  |
| 97 | Rimouski (rimouski) | Quebec | 20 | 1 | Queued |  |  |  |  |  |
| 98 | Gaspésie Sud (gaspesie-sud) | Quebec | 15 | 1 | Queued |  |  |  |  |  |

## Open data issues (need Mike's OK before the database is touched)
- Venue 3161: name 'The Bar & Grill (Golden)' should be The Golden Taps.
- Hamilton: Squire pair 1014/6768 and Collective Arts 6784 are duplicates with different events; merge events before deactivating.
- Done 2026-10-31: cleared the $2 mis-extracted price on Comery Block 'South Block Draught' rows (venue 3387).
- Venue 1570: stored as Donaleighs; the venue writes Donaleigh's. Rename needs OK.
- Done 2026-10-31: deactivated 1024 (Clocktower Glebe, closed), 2247 (Bardo dup), 2262 (Collective Arts dup).

## Search Console indexing log
- 2026-10-31: indexing requested for Calgary, Ottawa, Halifax, Hamilton, Barrie. Ottawa inspected later the same day: "Crawled - currently not indexed" (normal for a brand-new page; recheck in a week).
- 2026-10-31: Vancouver, Toronto, Winnipeg, Saskatoon, London (ON) deployed (deployment a84df486). Request Indexing hit "Quota Exceeded" (daily limit). TODO 2026-11-01: request indexing for /vancouver/blog/happy-hours-vancouver, /toronto-core/blog/happy-hours-toronto, /winnipeg/blog/happy-hours-winnipeg, /saskatoon/blog/happy-hours-saskatoon, /london/blog/happy-hours-london-ontario. The sitemap already lists all five.

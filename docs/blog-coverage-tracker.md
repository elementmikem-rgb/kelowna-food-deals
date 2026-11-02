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
| 23 | Niagara Region (niagara-region) | Ontario | 179 | 58 | Done | happy-hours-niagara | 2026-11-01 | 2026-11-01 | 2026-12-01 | Wave 4. La Favella days fixed, Newark Stein Club price removed, Cold Break Monday removed, Sala 61 is west St. Catharines. $5 lowest price is a tie. |
| 24 | Halton Region (halton-region) | Ontario | 174 | 58 | Done | happy-hours-halton | 2026-11-01 | 2026-11-01 | 2026-12-01 | Wave 4. Chuck's $4 beer was an expired June promo (removed). Keenan's Milton specials page shows the Brampton site (softened). Tipsy Fox Burlington unconfirmed. Street names used instead of unverified neighbourhoods. |
| 25 | Surrey & White Rock (surrey) | British Columbia | 112 | 55 | Done | happy-hours-surrey | 2026-11-01 | 2026-11-01 | 2026-12-01 | Wave 4. Boathouse White Rock closed Sept 2025 (removed). Lowest price stated as "lowest confirmed". Par4 is Sullivan Station side of Newton. DB dup ids 405/408 for one venue. |
| 26 | Durham Region (durham-region) | Ontario | 139 | 53 | Done | happy-hours-durham | 2026-11-01 | 2026-11-01 | 2026-12-01 | Wave 4. Lowest price is $3.99 stein at Canadian Brewhouse. Whitby split by area. Whisky John's is west Oshawa. Fox Goes Free prices removed. Brooklin Pub and Cloud Nine rest on undated listings. |
| 27 | York Region (york-region) | Ontario | 161 | 51 | Done | happy-hours-york-region | 2026-11-02 | 2026-11-02 | 2026-12-02 | Wave 5. 26 venues across 6 districts. Filly & Co Monday prices fixed, Scaddabush is $2 off, Smash/CLASSIC/Symposium times added. 9 PM window stat: 11 venues publish one. Bar6ix (5811) trades as Bar6ix Sports & Wings, open status unconfirmed. StatCan page 403, figures from search extract. |
| 28 | Mississauga (mississauga) | Ontario | 123 | 48 | Done | happy-hours-mississauga | 2026-11-02 | 2026-11-02 | 2026-12-02 | Wave 5. Gabby's prices softened (rows carried other locations' menus). Lionheart $4 ties Social Eatery, uncorroborated. Bristol Bar & Grill moved to not-on-list (stale site). Official Plan link is the 2024 PDF, not re-read. Pump House open status rests on a May 2025 post. |
| 29 | Regina (regina) | Saskatchewan | 118 | 48 | Done | happy-hours-regina | 2026-11-01 | 2026-11-01 | 2026-12-01 | Wave 4. Moxies is East Regina. Roots weekday deals removed (expired promos). 4529 Gordon Rd (Lancaster Taphouse, closed per OpenTable) left out; DB duplicate Leopold's 7877 not linked. Centre Square and Cathedral labels unverified against the City. |
| 30 | Québec (quebec-city) | Quebec | 184 | 47 | Queued |  |  |  |  |  |
| 31 | Montréal Centre (montreal-core) | Quebec | 151 | 47 | Queued |  |  |  |  |  |
| 32 | Laval (laval) | Quebec | 133 | 38 | Queued |  |  |  |  |  |
| 33 | Peterborough & the Kawarthas (peterborough-kawarthas) | Ontario | 94 | 37 | Done | happy-hours-peterborough | 2026-11-02 | 2026-11-02 | 2026-12-02 | Wave 5. 17 venues. Berc's is Tuesday 5-9. Maple Moose follows its own specials page. Canoe & Paddle unconfirmed (out of quick answer). Population figure dropped (StatCan 403). Neighbourhoods use street names. |
| 34 | Guelph (guelph) | Ontario | 91 | 37 | Done | happy-hours-guelph | 2026-11-02 | 2026-11-02 | 2026-12-02 | Wave 5. 20 venues. Lead price is $1 beers at Trappers Alley (Mon/Thu); Partytown $1 wings softened. Cowboys is Exhibition Park. Shoeless Joe's OpenTable window (2-5, 9-close) conflicts with our 3-6. Royal City, State & Main, Shoeless Joe's, Kelsey's open status from listings only. |
| 35 | Montréal Nord (montreal-north) | Quebec | 208 | 36 | Queued |  |  |  |  |  |
| 36 | Sunshine Coast (sunshine-coast) | British Columbia | 89 | 35 | Done | happy-hours-sunshine-coast | 2026-11-02 | 2026-11-02 | 2026-12-02 | Wave 5. 10 venues. Shift Kitchen & Bar (588) unconfirmed, left out. Backeddy Pub closed Dec 21 to Feb 4. Ferry times and population from secondary sources. Region has 3 misfiled rows (6294 Pepe's Squamish, 6240 Game On Merritt, 6284 Stillhead Duncan). |
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

- Done 2026-11-02: deactivated duplicate rows 1747 (Castle John's, kept 7689), 2817 and 7678 (Publican House, kept 7671), 6212 (Sechelt Lighthouse Pub, kept 589), 6528 (Snug Harbour, kept 2264). Buccaneers 6215 is a separate restaurant, left active.
- Done 2026-11-02: moved the three misfiled Sunshine Coast venues (city, region, specials and events): 6294 Pepe's Chophouse to whistler (Squamish), 6284 Stillhead Distillery to victoria (Duncan, next to Cobble Hill), 6240 Game On to kamloops (Merritt, nearest region, about 85 km). Coordinates set 2026-11-02 and approx_coords cleared: 6294 from OpenStreetMap (49.73992, -123.13238), 6284 from the Google place pin on stillhead.ca (48.76416, -123.69305), 6240 from OpenStreetMap node 4499487291 and a Trip.com listing agreeing within 1 m (50.12430, -120.75837). Game On and Stillhead open status not confirmed as currently trading.
- Open: Mississauga Gabby's rows carry other locations' menu prices; Bristol Bar & Grill site is stale (2021).

- Done 2026-11-02 (Google Places check of the 536 guide-linked venues, businessStatus + location, read-only, 536 Text Search Pro calls): WINGS West Kelowna 222 (closed, Castanet lease termination) and Ikemen Ramen Bar 2894 (replaced by Tiger K, Daily Hive Aug 2023) removed from the Kelowna and Calgary guides (22 to 21, 25 to 24) and deactivated; deployed as 22c0f2c (deployment f6171419), IndexNow pinged for both URLs. Google said Social Eatery Meadowvale 2280 is closed but its own site and an Aug 2026 listing say open, so it stays. 81 map pins corrected (53 approximate, 28 more than 300 m off) and 5 placeholder addresses filled (2187, 4243, 4249, 4250, 4253); old values are in scratch/coord-address-backup-2026-11-02.json. Add businessStatus to every monthly refresh. Bad Luck Bar Guelph: its site says 10 Wyndham St N (we keep it), directories say 59 Macdonell St.
- Done 2026-11-02 (Ontario licence audit plus Google status check of 36 more venues, manual search of 7): deactivated 2984 Hana Don Fairview (lease ended, news roundup Oct 2026), 1542 Sleeping Giant Brewing (closed March 2026, brand sold), 1556 Barcadia Kingston (Princess St closed, relocation unannounced; undated sources, re-add if it reopens). Addresses and coordinates fixed: 4420 The Wine Bar (2362 Lakeshore Rd W), 4561 Provenance (133 Mississaga St E, butcher part unconfirmed), 5211 Sharkeys (50 Craig St Unit 2, moderate confidence), 1537 My Thai Palace (240 Main St W). Old values: scratch/venue-fix-backup-2026-11-02-b.json. AGCO licence data was too noisy to use for closures (335 name mismatches, 0 closures confirmed from 6 checks). Mulligans (6453) and Mackenzie Pub (7443) are operational per Google but have no dated venue evidence; call to confirm.
- Done 2026-11-02 (new venues from government licence lists, specials verified on each venue's own page by a second reader; specials then linked to that page via source_url on 2026-11-02 so the nightly cron owns, refreshes and retires them): Penticton 9076 Copper Mug Pub, 9077 The Underdog; Revelstoke 9078 Big Eddy Pub (pin approximate); Kelowna region 9081 Bar One (Kelowna) (venues.name is unique across the table, so chains need a location suffix; pin approximate), 9082 Shore Line Brewing, 9083 Moxie's Classic Grill (KLO), 9084 Buffalo Rouge Brewing, 9085 Midnight Kings Hookah Lounge Grill, 9086 Il Mercato Social Kitchen (pin approximate), 9087 Neighbour's Pub. 10 venues, 45 specials. Not added (could not verify): Ricky's, Yuzu, Bouchons (no days on page), Taki (site copyright 2021), heyhey, Samurai Sushi (two stores), Saha, Bar Travelling Man, Gunbarrel Pub (page blocked). Licence-list yield was low: about 2 to 5 publishable venues per 60 premises on the raw list, about 15 per 115 after a name filter. Rule: free methods only (see memory free-only-no-paid-spend).
## Search Console indexing log
- 2026-11-02 (about 10:00 PT): Request Indexing went through for 11 URLs (all showed "Indexing requested"): vancouver, toronto-core, winnipeg, saskatoon, london, niagara-region, halton-region, surrey, durham-region, regina, york-region. The 12th (mississauga) returned "Oops! Something went wrong ... try again later", treated as the daily limit, not retried. Inspection said "URL is not on Google" and "No referring sitemaps detected" for each (Google's sitemap read may predate the new guides; check Sitemaps in Search Console). STILL TO DO after the quota resets (about 24 hours): /mississauga/blog/happy-hours-mississauga, /peterborough-kawarthas/blog/happy-hours-peterborough, /guelph/blog/happy-hours-guelph, /sunshine-coast/blog/happy-hours-sunshine-coast, and re-request the updated /kelowna/blog/happy-hours-kelowna-2026 and /calgary/blog/happy-hours-calgary. Method: Search Console home, type the URL in the top bar, press Enter, click Request indexing (the direct inspect URL 404s).
- 2026-11-02: Wave 5 (York Region, Mississauga, Guelph, Peterborough, Sunshine Coast) deployed (deployment 69a38aab, commit ded64c0), all five live 200 with FAQ and ItemList, in sitemap and llms.txt. IndexNow ping sent (128 URLs, status 200). Google Request Indexing NOT attempted (quota blocked 2026-11-01). TODO: request indexing for the 5 wave 3, 5 wave 4 and 5 wave 5 URLs: /york-region/blog/happy-hours-york-region, /mississauga/blog/happy-hours-mississauga, /peterborough-kawarthas/blog/happy-hours-peterborough, /guelph/blog/happy-hours-guelph, /sunshine-coast/blog/happy-hours-sunshine-coast.
- 2026-11-01: Bing set up. IndexNow key file live at /0a6488b8bbeff4d4fa9bc33c3b8dc9d7.txt (deployment 58fdec70). Ran `npx tsx scripts/indexnow-ping.ts` (123 blog URLs, status 202). todaystab.com imported into Bing Webmaster Tools from Google Search Console (account also holds photaro.live); sitemap.xml "Processing". After each wave: run the ping script. Check Bing Webmaster (Sitemaps, IndexNow, AI Performance) in about a week.
- 2026-11-01: Wave 4 (Niagara, Halton, Surrey, Durham, Regina) deployed (deployment 7713dedb, commit 34cb583), live 200 with FAQ and ItemList, in sitemap and llms.txt. Search Console still "Quota Exceeded" at 07:55 PST on 2026-11-01 (quota looks like a rolling 24 hours). TODO: request indexing for the 5 wave 3 URLs listed below, then the 5 wave 4 URLs: /niagara-region/blog/happy-hours-niagara, /halton-region/blog/happy-hours-halton, /surrey/blog/happy-hours-surrey, /durham-region/blog/happy-hours-durham, /regina/blog/happy-hours-regina. Try again after about 9 PM PST 2026-11-01 or tomorrow.
- 2026-10-31: indexing requested for Calgary, Ottawa, Halifax, Hamilton, Barrie. Ottawa inspected later the same day: "Crawled - currently not indexed" (normal for a brand-new page; recheck in a week).
- 2026-10-31: Vancouver, Toronto, Winnipeg, Saskatoon, London (ON) deployed (deployment a84df486). Request Indexing hit "Quota Exceeded" (daily limit). TODO 2026-11-01: request indexing for /vancouver/blog/happy-hours-vancouver, /toronto-core/blog/happy-hours-toronto, /winnipeg/blog/happy-hours-winnipeg, /saskatoon/blog/happy-hours-saskatoon, /london/blog/happy-hours-london-ontario. The sitemap already lists all five.

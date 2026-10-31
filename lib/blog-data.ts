export type BlogCategory = "Guide" | "Explainer" | "Data";

export interface BlogPost {
  slug: string;
  title: string;
  metaDescription: string;
  publishedAt: string; // YYYY-MM-DD
  // Set when a post is refreshed (new data, new prices). Feeds dateModified in the post's JSON-LD and
  // the sitemap's lastModified, so search and AI crawlers see the post as current. Omit on a new post.
  updatedAt?: string; // YYYY-MM-DD
  excerpt: string;
  contentHtml: string;
  category: BlogCategory;
  // Set true for a paid venue-spotlight post. Renders a visible "Sponsored" label --
  // this is close to a legal disclosure requirement once one of these is actually
  // sold, not just a style choice, so it's on by default rather than opt-in.
  sponsored?: boolean;
  // Region slug(s) this post is actually about, e.g. ["kelowna"]. Omit entirely only
  // for a genuinely region-agnostic post (how this site's verification works, etc).
  // Until 2026-10-02 every post rendered under every region's /[region]/blog/[slug]
  // -- a Kelowna-specific post with real Kelowna venue names was reachable (and
  // sitemap-submitted, and declared canonical) at 97 different region URLs
  // simultaneously, a duplicate-content problem that let Google pick an arbitrary
  // non-Kelowna URL as the "winning" copy instead of the real one, and almost
  // certainly suppressed all 97 copies' ranking relative to a single canonical page.
  regions?: string[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "how-we-verify-every-special",
    category: "Explainer",
    title: "How We Actually Verify Every Special on This Site",
    metaDescription:
      "Most Kelowna deals sites are copy-pasted lists nobody's checked in years. Here's exactly how we confirm a special is real before it goes live.",
    publishedAt: "2026-06-12",
    excerpt:
      "Every special on this site has to survive one rule: if we can't point to where it came from, it doesn't get published. Here's how that actually works.",
    contentHtml: `
<p>There are a handful of Kelowna food-deals sites out there, and most of them share the same problem: someone built a list once, maybe two years ago, and nobody's touched it since. Restaurants close, happy hours get cancelled, prices go up -- the list doesn't know. You show up for $5 wings and pay $9.</p>
<p>We built this site around one non-negotiable rule: <strong>a special only gets published if we can point to the exact place it came from.</strong> Not "we're pretty sure," not "it was probably still running." An actual source.</p>
<h2>Where the data comes from</h2>
<p>Every listing on this site traces back to one of three sources:</p>
<ul>
<li><strong>The venue's own website</strong>, scraped daily and re-checked against what was there the day before. If nothing changed, we don't touch the listing. If something did, we re-extract it.</li>
<li><strong>A visitor submission</strong> -- a photo of a chalkboard, a menu, a sign -- that a person actually took at the venue.</li>
<li><strong>Public event listings</strong> for things like live music and trivia nights, cross-checked against the venue itself where possible.</li>
</ul>
<h2>The rule that stops us from making things up</h2>
<p>Whatever the source, the system extracting the special has to quote the exact words that prove it -- a real price, a real discount, a real day. If it can't find that verbatim text, the item gets dropped. Not published with a caveat. Dropped entirely.</p>
<p>That sounds strict, and it is. It means this site will always have gaps -- venues we know run specials but haven't been able to confirm the exact terms of. We'd rather show you fewer things and have them be right than show you everything and have half of it be wrong.</p>
<h2>What happens when something changes</h2>
<p>When a venue updates or drops a special, the old one doesn't just vanish -- it moves to that venue's "Previously Featured" list, so you can see what used to run there. Every listing also shows when it was last checked, right on the card. If it says "stale," that's the site telling you on itself: this hasn't been re-confirmed recently, treat it with a grain of salt.</p>
<h2>You can help keep it honest</h2>
<p>If you spot something wrong -- a special that's ended, a price that's changed -- there's a "Report incorrect" link on every single card. If you spot something we're <em>missing</em>, you can <a href="/submit">submit it</a> with a photo, and it goes through the same verification process before it goes live.</p>
<p>That's the whole system. No magic, no guessing -- just a hard rule about evidence, applied consistently, every single day.</p>
`,
  },
  {
    slug: "real-kelowna-happy-hour-guide",
    category: "Guide",
    regions: ["kelowna"],
    title: "The Real Kelowna Happy Hour Guide",
    metaDescription:
      "A happy hour guide for Kelowna built from specials we've actually confirmed are still running -- not a list from 2022.",
    publishedAt: "2026-06-20",
    excerpt:
      "Forget the lists that haven't been updated since before the pandemic. Here's what's actually on right now, verified against each venue directly.",
    contentHtml: `
<p>Search "Kelowna happy hour" and you'll find the same three articles everyone else finds -- dated, vague, and missing half the venues that actually run one. Here's what we've confirmed is real, verified against each venue's own current pricing.</p>
<h2>Creekside Pub &amp; Grill (Lakeshore Road)</h2>
<p>Creekside runs the most consistent happy hour rotation we've tracked in Kelowna -- a different drink special most days of the week, starting around $4.75-$5.00. If you only bookmark one happy hour page this year, make it theirs; it changes often enough that checking day-of actually matters.</p>
<h2>BNA Brewing Co. &amp; Eatery (Ellis St)</h2>
<p>BNA's "Super Save Hour" runs $5 beers, $9 cocktails, $10 small plates, and $2 off wine -- a genuinely full happy hour menu, not just a beer discount. They also run a Friday "Late Nite Power Hour" from 9pm with $4.99 highballs.</p>
<h2>Kelly O'Bryan's &amp; Carlos O'Bryan's (Bernard Ave)</h2>
<p>Their "Power Hour" gets you drinks for $3.50 -- one of the lowest confirmed prices on this list -- on top of a rotating weekly food-and-drink lineup that runs 20+ different specials across the week.</p>
<h2>Gulfstream (Airport Way)</h2>
<p>Run by the Four Points by Sheraton, Gulfstream's happy hour includes $5 house-liquor highballs, $11 dry ribs, and $15 margherita pizza -- solid food options if you actually want to eat, not just drink.</p>
<h2>Earls, Moxies, JOEY, Cactus Club</h2>
<p>Yes, the chains run happy hour too -- most confirmed at the familiar $5-drinks, $5-$13-apps formula, typically 2-5pm and again after 9pm. We've verified current pricing for each; check the individual venue pages for exact items, since chain menus rotate seasonally.</p>
<h2>The honest caveat</h2>
<p>Happy hour timing is the single most common thing venues change without warning. Every card on this site shows when it was last verified -- if a listing says "checked today," trust it; if it's been a couple weeks, it's still probably right, but we'd rather you know than assume.</p>
<p>See the <a href="/">full, current list</a> filtered by day and category -- this post is a snapshot, the site itself is always current.</p>
`,
  },
  {
    slug: "best-wing-nights-kelowna",
    category: "Guide",
    regions: ["kelowna"],
    title: "Best Wing Nights in Kelowna Right Now",
    metaDescription:
      "Every confirmed wing night special in Kelowna, with actual prices -- from $0.35 wings to $12 all-you-can-handle deals.",
    publishedAt: "2026-07-03",
    excerpt:
      "We pulled every wing special we've verified across Kelowna and sorted them by day. Some of these prices are genuinely surprising.",
    contentHtml: `
<p>Wing night is the one special almost every pub in Kelowna runs -- and the one where prices vary the most wildly. We've confirmed the following directly against each venue. Sorted by day.</p>
<h2>Sunday</h2>
<p><strong>WINGS Rutland</strong> -- $12 wings all day, one flavour per order, dine-in only, beverage purchase required.</p>
<h2>Monday</h2>
<p><strong>Montana's BBQ &amp; Bar</strong> (Banks Rd) -- half-price wings with a beverage purchase.<br>
<strong>Turtle Jack's</strong> (West Kelowna) -- 1 lb of wings for $13.99, paired with a $6 Molson Canadian or Coors Light.</p>
<h2>Wednesday -- the busiest wing night in town</h2>
<p><strong>Baxter's Bar &amp; Grill</strong> (Spall Rd) -- $0.35 per wing, the lowest per-wing price we've confirmed anywhere in Kelowna.<br>
<strong>McCulloch Station Pub</strong> -- $6 per dozen.<br>
<strong>WINGS Rutland</strong> -- $12 all day (same deal as Sunday).<br>
<strong>Tonics Pub</strong> (Ellis St) -- $10 per pound.<br>
<strong>Train Station Pub</strong> (Ellis St) -- half-price wings.<br>
<strong>Creekside Pub &amp; Grill</strong> -- $5 off a pound of wings.</p>
<h2>Whenever (no set day confirmed)</h2>
<p><strong>Boomers Bar &amp; Grill</strong> -- wings by the pound at $5.</p>
<h2>The pattern worth noticing</h2>
<p>Wednesday is, by a wide margin, Kelowna's real wing night -- six of the ten wing specials we've verified land on a Wednesday. If you're planning around price alone, Baxter's $0.35/wing Wednesday is the cheapest confirmed deal in the city; if you want volume, Tonics' $10/lb or Turtle Jack's $13.99/lb (paired with a cheap beer) go further per dollar for a group.</p>
<p>Prices and days shift without notice -- that's true everywhere, not just here. Check the <a href="/?category=wing_night">live wing night list</a> before you go; it updates as soon as we catch a change.</p>
`,
  },
  {
    slug: "cheap-eats-kelowna-under-10",
    category: "Guide",
    regions: ["kelowna"],
    title: "Cheap Eats in Kelowna: Where $10 Still Buys You Something Real",
    metaDescription:
      "Confirmed Kelowna food and drink specials under $10 -- real prices from real venues, not a generic 'budget dining' listicle.",
    publishedAt: "2026-07-18",
    excerpt:
      "We filtered every verified special on this site down to $10 or less. Here's what held up and what's actually worth the trip.",
    contentHtml: `
<p>"Budget dining guide" posts are usually just restaurant names with no prices attached, because nobody actually checked. We did the opposite: we filtered our full database down to specials confirmed at $10 or under, and kept only the ones we can point to a real source for.</p>
<h2>Under $5</h2>
<p><strong>Baxter's Bar &amp; Grill</strong> -- $0.35 wings, Wednesdays.<br>
<strong>Baxter's Bar &amp; Grill</strong> -- Friday tacos at $2 each.<br>
<strong>Erica Jane</strong> -- $2 oysters, Thursdays, alongside sociable plates and rotating live music.<br>
<strong>Kelly O'Bryan's</strong> -- $3.50 Power Hour drinks.<br>
<strong>Craft Beer Market</strong> -- $4 happy hour sliders or spicy ahi tacos.<br>
<strong>Jac's On The Beach</strong> (Peachland) -- happy hour starting at $4, running all day, every day.</p>
<h2>$5-$10</h2>
<p>This is where most of Kelowna's happy hour drink specials cluster: $5 highballs at Gulfstream, Cactus Club (both locations), and BNA Brewing; $4.75-$5 domestic beer at Creekside across multiple weekday specials; $4.99 happy hour drinks at BNA's Friday late-night hour and Montana's Monday happy hour.</p>
<p>On the food side: Boomers' $5/lb wings, Leopold's Tavern's $5 late-night menu, and Montana's Tuesday $5 tacos (with a beverage purchase) all confirmed under the $10 line.</p>
<h2>What this list doesn't include</h2>
<p>Notably absent: anything we found mentioned online but couldn't confirm against a real source. Several venues -- Friends Pub, The Canadian Brewhouse, Whiski-Jack's -- are reported by patrons to run wing or drink specials in this price range, but we couldn't verify the exact number, so they're not on this list. If you've got a photo of one of those boards, <a href="/submit">send it our way</a> and we'll add it properly.</p>
<p>This snapshot will age -- that's the nature of a list like this. The <a href="/">live site</a> re-checks these daily.</p>
`,
  },
  {
    slug: "kelowna-west-kelowna-peachland-deals",
    category: "Data",
    regions: ["kelowna"],
    title: "Kelowna vs. West Kelowna vs. Peachland: What We've Actually Verified So Far",
    metaDescription:
      "An honest look at food and drink special coverage across Kelowna, West Kelowna, Peachland, and Lake Country -- including where the gaps still are.",
    publishedAt: "2026-08-02",
    excerpt:
      "We track specials across four Okanagan communities, but the coverage isn't even yet -- and pretending otherwise would go against the whole point of this site.",
    contentHtml: `
<p>Most local guides act like a region is one uniform blob. It isn't, and pretending otherwise defeats the purpose of a site built around accuracy. So here's an honest breakdown of where our coverage actually stands across the four communities we track.</p>
<h2>Kelowna proper: the deep end</h2>
<p>The bulk of what's on this site -- dozens of venues and well over a hundred verified specials -- is in Kelowna itself, concentrated around Bernard Avenue, Harvey Avenue, and the downtown waterfront strip on Water Street. If you're looking for the widest selection on a given night, this is where it is, simply because it's where the density of pubs and restaurants is highest.</p>
<h2>West Kelowna: thinner, but real</h2>
<p>We track venues like Turtle Jack's, Sammy J's, Friends Pub, and 19 Okanagan Grill + Bar out here, but confirmed specials are sparser than across the bridge -- partly because fewer of these venues publish specials on their own websites in a way we can verify, and partly because we simply haven't gotten as many visitor submissions from this side yet.</p>
<h2>Peachland: mostly untapped</h2>
<p>Peachland has real venues on our books -- Jac's On The Beach, Edgewater Inn, Gasthaus on the Lake -- but verified special data here is thin. Jac's confirmed all-day happy hour (starting at $4) is one of the few things we can point to with real confidence right now.</p>
<h2>Lake Country / Winfield: the frontier</h2>
<p>The smallest slice of what we track. Turtle Bay Pub and Woody's Pub are on the list, but we've only confirmed a couple of specials between them so far.</p>
<h2>Why the gap exists, and how it closes</h2>
<p>It's not that West Kelowna, Peachland, and Lake Country run fewer deals -- it's that we haven't verified as many yet. Independent venues outside Kelowna's downtown core are less likely to list specials on a website we can scrape automatically, which means the fastest way to close this gap is exactly the kind of thing this site was built for: someone who's actually there sending in a photo of the board.</p>
<p>If you're in West Kelowna, Peachland, or Lake Country and you know a spot with a standing deal that isn't on here yet, <a href="/submit">tell us</a> -- that's genuinely the fastest way this list gets more even.</p>
`,
  },
  {
    slug: "trivia-karaoke-nights-kelowna",
    category: "Guide",
    regions: ["kelowna"],
    title: "Trivia and Karaoke Nights in Kelowna: What's Actually Running",
    metaDescription:
      "Every trivia and karaoke night we've confirmed in Kelowna, sorted by day of the week -- pulled straight from our verified events database.",
    publishedAt: "2026-10-01",
    excerpt:
      "Wednesday is stacked for both. Here's every trivia and karaoke night we've confirmed in Kelowna, sorted by day.",
    contentHtml: `
<p>Searching "trivia night Kelowna" or "karaoke Kelowna" mostly turns up venue-discovery pages that don't tell you which night anything actually runs. We pulled every trivia and karaoke night we've verified against each venue directly, sorted by day of the week.</p>
<h2>Trivia nights</h2>
<p><strong>Monday</strong> -- The Office Brewery, 6:30pm.</p>
<p><strong>Wednesday -- the busiest trivia night in town</strong><br>
97 Street Pub, 7pm.<br>
Cutwater Brewing's "Epic Trivia Night," 7pm.<br>
Original Joe's Kelowna, 7pm.</p>
<p><strong>Friday</strong> -- Creekside Pub &amp; Grill's "Friday Night Trivia," 8pm.</p>
<h2>Karaoke nights</h2>
<p><strong>Monday</strong> -- O'Flannigan's "Karaoke Madness," 8:30pm.</p>
<p><strong>Tuesday</strong><br>
Kelly O'Bryan's &amp; Carlos O'Bryan's, 8pm.<br>
Edgewater Inn Bar &amp; Grill, 7pm.</p>
<p><strong>Wednesday</strong><br>
O'Flannigan's runs karaoke again midweek, 8:30pm.<br>
Dakoda's Sports Bar &amp; Grill's "Wings and Karaoke Night" -- an all-day deal running 11am to 11pm, not a set evening start time; Dakoda's own site frames it as wings-and-karaoke for the whole Wednesday, 18 flavors included.</p>
<p><strong>Saturday</strong> -- Creekside Pub &amp; Grill, 8:30pm.</p>
<h2>The pattern worth noticing</h2>
<p>Wednesday is stacked for both -- three confirmed trivia nights and two karaoke nights, all in the same city, the same evening. If you want options without a long drive, that's the night to build around. O'Flannigan's is the only venue running karaoke twice a week (Monday and Wednesday).</p>
<p>This is a snapshot of a database that changes as venues update their own listings. See the live, always-current <a href="/kelowna/events/trivia">trivia night page</a> and <a href="/kelowna/events/karaoke">karaoke page</a> -- both filterable by day, both re-checked against each venue's own source.</p>
`,
  },
  {
    slug: "happy-hours-kelowna-2026",
    category: "Guide",
    regions: ["kelowna"],
    title: "Happy Hours in Kelowna: Every Confirmed Spot, by Neighbourhood (2026)",
    metaDescription:
      "25+ confirmed happy hour spots in Kelowna organized by neighbourhood — Water Street, Pandosy, Lower Mission, West Kelowna — with actual prices. Updated October 2026.",
    publishedAt: "2026-10-29",
    excerpt:
      "Most Kelowna happy hours run 3–5 PM and again after 9 PM. Here's every one we've verified, organized by neighbourhood, with real prices and addresses.",
    contentHtml: `
<p>Quick answer: most Kelowna happy hours run 3–5&nbsp;PM and again after 9&nbsp;PM on weeknights. The highest concentration is on Water Street downtown and in the North End brewery district — BNA Brewing, Kelowna Beer Institute, Cactus Club, and Earls are within a 10-minute walk of each other. Below is every venue we've confirmed is currently running one, organized by neighbourhood.</p>
<p>For context: in 2023, Kelowna became Canada's first UNESCO City of Gastronomy — partly on the strength of a restaurant density that's genuinely unusual for a city of 145,000. There are over 500 licensed venues here, which is why there are real options in most neighbourhoods rather than everything funnelling downtown.</p>

<h2>North End / Brewery District</h2>
<p>The former industrial strip north of downtown has become the highest-density bar area in the city. BNA anchors it; The Office and Rustic Reel are within a couple of blocks.</p>
<p><strong>BNA Brewing Co. &amp; Eatery (1250 Ellis St)</strong> — BNA runs the most complete happy hour menu in Kelowna. Their daily "Super Save Hour" covers the whole table: $5 beer, $9 cocktails, $2 off wine, and $10 small plates (buffalo wings, truffle fries, bang bang shrimp tacos, tuna tartare). Friday late nights add a "Power Hour" with double highballs and $4.99 singles from 9&nbsp;PM. If you're with a group and want options, this is the obvious first choice. <a href="/kelowna">See current BNA specials →</a></p>
<p><strong>The Office Brewery (890 Clement Ave)</strong> — Smaller and quieter. Happy hour is $1 off 20&nbsp;oz draught, half-price bottles of wine, and $2 off cocktails. They also do beer flights and cocktail flights at happy hour pricing — useful if you don't know the menu yet.</p>
<p><strong>Rustic Reel Brewing (760 Vaughan Ave)</strong> — Mainly a taproom. Craft beer on tap, pitchers, house wine. Pretzels, popcorn, a smashburger. Good if you want to stay for a couple of hours without the pub-food noise.</p>

<h2>Downtown Water Street / Bernard Ave</h2>
<p>The tourist-facing strip, but residents use it too. Walk south on Water Street from the brewery district and you'll pass Kelowna Beer Institute, Cactus Club, and Match Eatery before hitting Bernard Ave.</p>
<p><strong>Kelowna Beer Institute (1346 Water St)</strong> — Rotating craft on tap, and a consistent daily structure: $2 off craft beer, $2 off glasses of wine, $2 off cocktails. Mondays add half-price bottles of wine and pitcher deals. Cask Thursdays feature an exclusive cask that's typically gone by late evening. This one's underused by people who aren't already regulars.</p>
<p><strong>Cactus Club Cafe (1370 Water St, Kelowna Yacht Club)</strong> — The location matters more than it does at other Cactus Clubs: it's on the water. Standard chain happy hour format (half-price wine and cocktails, discounted apps), but the patio changes the calculus. Goes fast on summer evenings.</p>
<p><strong>Earls Kelowna (211 Bernard Ave)</strong> — Earls' happy hour is solid in the chain tier. Confirmed running: half-price Aperol Spritz, frozen espresso martini, Earls Lime Margarita, sangria, and Crush cocktails. Sparkling wine bottles are half-price before 2&nbsp;PM. CedarCreek Pinot Gris at half-price is worth flagging — it's a local Okanagan wine, not a house pour. Petite Steak Frites is the food standout.</p>
<p><strong>Match Eatery &amp; Public House (1300 Water St)</strong> — Happy hour covers Corona, craft beer, and highballs; half-price pizza and half-price wine also confirmed. They run free wings on Okanagan Sun game days during the 2026 season if you want to tie it to football.</p>
<p><strong>Kelly O'Bryan's &amp; Carlos O'Bryan's (262 Bernard Ave)</strong> — "Power Hour" gets you $3.50 drinks on evenings throughout the week — one of the lowest confirmed prices downtown. Weekly lineup across both sides of the venue spans 20+ different specials: 2-for-1 appetizers, domestic draft, house wine, double highballs, half-price bottles of wine on Thursdays. One of the longest-running pubs on Bernard; not flashy, but consistently the cheapest confirmed option in the downtown core.</p>
<p><strong>Room 272 (Bernard Ave)</strong> — Confirmed happy hour all day on at least one day per week. Aperol Spritz, Classic Margarita, Old Fashioned, Fish &amp; Chips, Mixed Fries. Good for a quick stop before or after something else on Bernard.</p>
<p><strong>Skinny Duke's Glorious Emporium (1481 Water St)</strong> — After-dark bar with a deliberately small menu. Late night shumai and smashburger; cocktails (Negroni, Old Fashioned, Tom Collins, Moscow Mule) by the glass; a proper Okanagan wine list including Pinot Gris, Pinot Noir, Syrah, and Riesling all by the 5&nbsp;oz glass. Skip it if you want a standard pub; this is for people who want somewhere quieter after 9.</p>

<h2>Pandosy Village / South Kelowna</h2>
<p>Runs south of downtown along Pandosy Street — more neighbourhood-feeling than Bernard Ave, less tourist-facing. Specials here skew toward food-with-drink rather than drink-first.</p>
<p><strong>The Canadian Brewhouse (3030 Pandosy St)</strong> — Large menu with day-specific deals every night of the week: pizza Sundays, taco Tuesdays, pasta Thursdays, prime rib Fridays, ribeye Saturdays. Also runs daily wing and drinks specials. Better for a group dinner than a quick after-work drink.</p>
<p><strong>Original Joe's (2728 Pandosy St)</strong> — Happy hour includes $2 off margaritas, $1 off Caesars, half-price bottles of wine, and well highballs. Food-side: half-price wings, dynamite shrimp, lil' cheeseburger &amp; fries, sweet potato fries. Solid for the eat-and-drink combo. Power hour drink deals also confirmed running on evenings.</p>
<p><strong>DICE Kitchen + Bar (1585 Springfield Rd)</strong> — Confirmed running: sangria slush, slushy margarita, wings, $12 smash burger. Also does a 2-Can-Dine deal and a roast beef dinner on certain days. More eclectic than the pub options nearby.</p>
<p><strong>O'Flannigan's (319 Queensway)</strong> — Straightforward pub. Confirmed: wing nights, highball specials, draft beer, house wine, beef dips, classic burgers, fish &amp; chips. Good if you want something uncomplicated without driving.</p>

<h2>Lakeshore / Lower Mission</h2>
<p>South along Okanagan Lake — more residential, fewer options, but a couple worth the drive if you're already out this way.</p>
<p><strong>Hotel Eldorado (500 Cook Rd)</strong> — The only confirmed lakefront happy hour in Kelowna. Drink list is Okanagan-focused: VQA wines by the glass (Heirloom Red, Heirloom White, Le Cinq Rosé), prosecco, domestic draught, sangria by the glass or pitcher. This one's about the setting as much as the deal — but the setting is legitimately good.</p>
<p><strong>Creekside Pub &amp; Grill (3929 Lakeshore Rd)</strong> — The most consistent rotating specials program in Kelowna. Different deals most days of the week: craft sleeves, house wine, double Caesars, double Long Islands on Saturdays. Sunday runs a dedicated "happy appy hour" with dry garlic ribs, fish tacos, half nachos, potato skins, and spinach dip. If you're in the Lower Mission area, check here first.</p>
<p><strong>Erica Jane (1187 Sunset Dr)</strong> — $2 oysters on Thursdays is the deal to know. Small plates run $15–$22 after dark, and their signature cocktails are $13 in the evening. More upscale than most on this list; worth knowing about for the right occasion.</p>

<h2>West Kelowna</h2>
<p>Across the bridge. Less concentrated but a few solid options if you're on the Westside.</p>
<p><strong>WINGS West Kelowna (2484 Main St)</strong> — Happiest Hours cover wings &amp; fries, country-style perogies, fried pickles, and highballs (both 1&nbsp;oz and 2&nbsp;oz confirmed). Lunch specials run Mon–Fri. Half-price bottles of wine is also confirmed. Fish &amp; chips and lunch combos round it out.</p>
<p><strong>Whiski-Jack's Pins &amp; Pints (525 BC-97)</strong> — A bowling alley pub, which works better than it sounds. Confirmed: half-price wings, 16&nbsp;oz draft beer, all-menu cocktail deals, bowling Caesars. PBR jugs at $18 for groups. Works well if you want something to do alongside the drinking.</p>
<p><strong>Sammy J's Grill &amp; Bar (190-525 Hwy 97)</strong> — Wing Wednesdays $5 off, fajita Tuesdays $5 off, thin crust pizza $5 off on certain nights. Neighbourhood bar that doesn't try to be anything else.</p>

<h2>Rutland / East Kelowna</h2>
<p><strong>Freddy's Brewpub (948 McCurdy Rd)</strong> — One of the better specials programs in the city, and easy to overlook because it's not on the main strips. Dedicated happy hour menu: Happy Hour Highballs, House Wine, No Pants Pilsner (house lager), Garlic Fries, Dirty Tots, Dry Garlic Ribs, Classic Caesar, Single Smashburger, Thai Garlic Prawn Tacos, Classic Pizza. Weekly specials run every day of the week: Monday smash burger, Tuesday enchilada tacos, Wednesday hot dog, Thursday wings, Friday salisbury steak, Saturday prime rib, Sunday wings. Out of the way enough that it's rarely as packed for weekday specials as downtown options.</p>
<p><strong>WINGS Rutland (170 Hollywood Rd S)</strong> — Same Happiest Hours structure as West Kelowna (wings, perogies, pickles, highballs). $12 wing Wednesdays and Sundays. Lunch specials Mon–Fri.</p>
<p><strong>McCulloch Station Pub (2789 KLO Rd)</strong> — Wing Wednesdays at $6/dozen. Happy hour covers boneless wings, chicken fingers, tempura prawns, crispy dills, and dry garlic ribs. Neighbourhood pub, not a happy hour destination — but the wing pricing is legitimate.</p>
<p><strong>Bin 4 Burger Lounge (1616 Powick Rd)</strong> — Half-price burgers after 9&nbsp;PM is the deal to know here: three options confirmed (Mr. Bean 2.0, Smash That, Smashville). Happy hour earlier in the day also covers spiced chicken wings, yam fries, deep-fried pickles, and a drinks menu that includes $0-proof options if that matters.</p>

<h2>Late night (after 9 PM)</h2>
<p>The list thins out past 9&nbsp;PM. Here's what's confirmed still running:</p>
<ul>
<li><strong>BNA Brewing</strong> (Friday Power Hour, 9&nbsp;PM): double highballs, singles, rotating shots, non-alc options</li>
<li><strong>Bin 4 Burger Lounge</strong>: half-price burgers after 9&nbsp;PM, any night</li>
<li><strong>Kelly O'Bryan's</strong>: late night Power Hour most evenings</li>
<li><strong>Skinny Duke's</strong>: late night shumai and smashburger, cocktails by the glass, no hard end time</li>
</ul>

<h2>What's not on this list</h2>
<p>A few places show up in other Kelowna happy hour articles but aren't here: Gulfstream (Four Points Sheraton), Baxter's Bar &amp; Grill, and Craft Beer Market are all mentioned in older lists. We haven't re-confirmed their current specials against their own menus recently, so we're leaving them out rather than printing numbers we can't stand behind. Same for a handful of pubs in West Kelowna and the Westside that run specials we know about anecdotally but haven't gotten a menu source for.</p>
<p>If you know of one we're missing — a photo of a chalkboard works — the <a href="/kelowna/submit">submit page</a> is how to add it properly.</p>

<h2>How to use the live site alongside this post</h2>
<p>This post is a reference. For what's running <em>tonight specifically</em> — filtered by day of week, with each item's last-verified date visible — the <a href="/kelowna">Kelowna specials page</a> is what you want. Every deal has to be confirmed against a real source before it goes live. If something's changed since the last check, there's a Report button right on the card.</p>
`,
  },
  {
    slug: "happy-hours-penticton-2026",
    category: "Guide",
    regions: ["penticton"],
    title: "Happy Hours in Penticton: Every Confirmed Spot, by Neighbourhood (2026)",
    metaDescription:
      "Every confirmed happy hour in Penticton BC — downtown Martin Street, Okanagan Lake waterfront, and Skaha Lake side. Actual prices and current specials. Updated 2026.",
    publishedAt: "2026-10-29",
    excerpt:
      "Penticton has more craft breweries per capita than anywhere in Canada. Here's every confirmed happy hour spot, organized by neighbourhood, with real prices.",
    contentHtml: `
<p>Quick answer: most Penticton happy hours run 3–5&nbsp;PM on weekdays, with a handful adding a late-night window. Downtown concentrates on Martin Street and the blocks around it; the waterfront scene splits between Okanagan Lake (north, louder) and Skaha Lake (south, quieter). Below is every venue we've confirmed is currently running one.</p>
<p>Worth knowing: Penticton has more craft breweries per capita than anywhere else in Canada — 8 breweries for a city of 35,000. The wine angle is real too (Naramata Bench is a 15-minute drive north, with 80+ wineries), but the beer density is what makes this town unusual for its size.</p>

<h2>Downtown / Martin Street</h2>
<p>Martin Street and the blocks around Westminster and Winnipeg are the spine of Penticton's bar scene. Most of what's worth knowing is within a short walk of here.</p>
<p><strong>BNA Brewing (218 Martin St)</strong> — BNA's Penticton location opened in 2025 and brought the same Super Save Hour format from Kelowna: beer, cocktails (Moscow Mule confirmed), house wine (Super Save Red, White, Rosé), and non-alc options. Bowling lanes and bocce also on site — Monday and Thursday nights are 50% off bowling. If you want one spot that covers drinks, food, and something to do, this is it. <a href="/penticton">See current BNA specials →</a></p>
<p><strong>Highway 97 Brewery (200 Ellis St)</strong> — The most consistent happy hour deal in town. $5 sleeves daily during happy hour. Thirsty Thursdays drop pints to $6. Wing Wednesdays: wings $9.97/lb, pitchers $19.97. Beef dip Fridays. Taster Tuesdays let you work through the tap list before committing. Good if you want to stay in the craft beer lane without paying chain prices.</p>
<p><strong>Orolo Restaurant at Time Winery (361 Martin St)</strong> — The wine bar option on this list. Happy hour runs oysters, prawn cocktail, steak bites, crispy green beans, tallow fries, and a burger alongside local draft beer and Time Winery pours (Chronos Merlot, Evolve Chardonnay both confirmed at happy hour pricing). Steak Thursdays and Wine Wednesdays are the week's anchors. More upscale than most on this list — oysters at happy hour pricing is the standout.</p>
<p><strong>Kin &amp; Folk (557 Main St)</strong> — Craft cocktails and a food menu that's more interesting than the pub average: Dan Dan fries, beef potstickers, chili shrimp dumplings, Korean fried chicken sandwich, pork belly double double. Okanagan wine pours include Nichol Syrah, Deep Roots Merlot, Three Sisters Pinot Noir, and Stoneboat bubbles. Worth knowing for something other than wings and highballs.</p>
<p><strong>The Hub on Martin (260 Martin St)</strong> — Double highballs, Slackwater Brewery taps (sleeves and jugs confirmed), Pilsner jugs, Long Islands, wing nights. Solid neighbourhood pub. The Slackwater jugs are one of the better-value confirmed deals in the downtown core.</p>
<p><strong>The Black Antler (215 Winnipeg St)</strong> — Free wings with any drink purchase is the most unusual confirmed offer in town. Also confirmed: $2 off cocktails, 20 oz Antler Lager, singles and doubles, house wine, martinis, Buck N' Beer. Worth checking the current time window before planning specifically around the wings deal.</p>
<p><strong>Pizzeria Tratto (256 Westminster Ave)</strong> — Wednesday 2-for-1 full sleeves with any pizza order. Also running a "Bottleshock" deal: buy a bottle of wine, get a free pizza. The combination makes Wednesday the obvious night here.</p>
<p><strong>The Pasta Factory (236 Martin St)</strong> — Italian-leaning: jugs of sangria, pints of draft, Throwback Thursday deals, steak night, date night pasta specials. Better for dinner with drinks than a standalone happy hour stop.</p>
<p><strong>Neighbourhood Brewing (187 Westminster Ave W)</strong> — Taproom, limited food. Worth knowing if you're doing the brewery circuit and want to walk between spots.</p>

<h2>Okanagan Lake / Lakeshore Drive</h2>
<p>The northern waterfront. Busy in summer, noticeably quieter in winter. All four spots below are within a short walk of each other along the beach.</p>
<p><strong>Salty's Beach House (1000 Lakeshore Dr W)</strong> — Beach bar in the straightforward sense: patio, Okanagan Lake view, casual food (margherita pizza, prawn &amp; chips, ahi tuna nachos, sliders, rasta pasta). Drinks include Parallel 49 Ale, Neighbourhood Passion Fruit Wheat Ale, cocktails, and house wine. When the patio's open, this is the obvious call for the waterfront.</p>
<p><strong>Sociale on Lakeshore (950 Lakeshore Dr W)</strong> — Italian-influenced "Tappy Hour": Aperol Spritz, prosecco (5&nbsp;oz), local craft beer and cider pints, 2&nbsp;oz house highballs, sangria and margarita pitchers. Food runs bocconcini fritto, Calabrian chili prawns, gorgonzola potato chips, meatballs, parmesan fries, truffle popcorn. More of a cocktails-and-small-plates setup than a pub.</p>
<p><strong>The Barking Parrot (21 Lakeshore Dr W)</strong> — $2 burgers with any $5+ drink purchase. Also confirmed: wing nights, Budweiser draft, Canucks home game specials (Bud draft + wings), Penticton Vees Blue Card deals. No-frills waterfront bar; the $2 burger deal is what sets it apart.</p>
<p><strong>Patio Burger (796 Lakeshore Dr)</strong> — Local craft beer pints, highballs, shooters. Straightforward. Good for a quick drink on the water without waiting for a table.</p>

<h2>Skaha Lake / South Penticton</h2>
<p>The south end of town, quieter and more residential. Barley Mill anchors it.</p>
<p><strong>Barley Mill Brew Pub &amp; Bistro (2460 Skaha Lake Rd)</strong> — Penticton's most complete rotating specials program. They brew their own beer and run $5 off bottles and jugs most days. Monday: $2 off 9&nbsp;oz wine and double highballs. Thursday: $5 off jugs + $2 off wine + shooter specials + double highballs. Friday: $5 off bottles and jugs + shooters. Saturday: Buck Off Iced Tees. Sunday: $5 off jugs + Caesar deals. Food: half-price wings, burgers $5 off, all flatbreads, full rack baby back ribs, cod and chips, sirloin dinner. If you're south of downtown and want the most options, come here.</p>
<p><strong>Dragonboat Pub (3895 Lakeside Rd)</strong> — The most unusual happy hour structure in Penticton: two separate windows in the same day — 10&nbsp;AM to 11:30&nbsp;AM and again 2&nbsp;PM to 4&nbsp;PM. Both run house wine (6&nbsp;oz) and Cannery Lakeboat Lager (14&nbsp;oz). Also confirmed: lime margarita doubles, Dragonboat Caesars, mimosas, jam jar cocktails (sangria, blue lagoon, long island, rum runner). The early window is worth knowing if you're on a day trip and starting before lunch.</p>

<h2>North Penticton / Upper Main</h2>
<p><strong>Local Public Eatery (1070 Eckhardt Ave W)</strong> — The most complete happy hour food menu on this list. Confirmed food: pinche pork tacos, single fish taco, spicy crispy chicken sandwich with fries, hot wings, LOCAL burger, shrimp dumplings, spicy garlic edamame, nachos. Drinks: rail highballs, house lager, $2 off wine (both 5&nbsp;oz and 8&nbsp;oz), spicy guava margarita, sassy sangria crush, Jameson, Old Fashioned, cold tea shots. The food range here is the standout — this isn't just a drink discount.</p>
<p><strong>Bar One (939 Burnaby Ave W)</strong> — Day-specific deals every day: Taco Tuesday (tacos + cervezas), wing nights Thursday and Saturday, wine Wednesday (bottles and glasses), Friday double highballs and house draft, Sunday Caesars. Neighbourhood bar without much else going on — good if you're in the area and want something that rotates by the day.</p>
<p><strong>Yellow Dog Brewing (169 Estabrook Ave)</strong> — Taproom with a simple food menu: hot dogs, wings (1&nbsp;lb), small pizza, fries. El Perro pints and general taps. Good for the brewery visit; not a dinner destination.</p>
<p><strong>Palmer Kitchen + Spirits (903 Vernon Ave)</strong> — Local craft beer, house red and white wine, vodka Caesar, truffle parmesan fries, fried chicken wings, crispy calamari. Slightly off the main strips.</p>

<h2>Just outside Penticton</h2>
<p>Worth knowing if you're exploring the surrounding area or ending a winery day.</p>
<p><strong>Naramata Pub &amp; Grill (985 Robinson Ave, Naramata)</strong> — 15 minutes north on the Naramata Bench. 2 Can Dine with a bottle of wine is the deal. Also confirmed: pasta nights and a salmon burger special. Good reason to end an afternoon on the bench with a proper meal rather than driving straight back.</p>
<p><strong>Giant's Head Brewing (13224 Victoria Rd N, Summerland)</strong> — Wing Wednesday, burger and beer Thursdays, Senior Sunday deals (available to everyone, despite the name). 20 minutes north. Worth the stop if you're heading to or from Kelowna.</p>
<p><strong>Okanagan Falls Hotel Bar &amp; Grill (1045 Main St, Okanagan Falls)</strong> — Wing night, burger &amp; beer Sundays and Thursdays, prime rib dinner, fish &amp; chips. 15 minutes south on the way toward Oliver and Osoyoos.</p>

<h2>What's not on this list</h2>
<p>Cannery Brewing is Penticton's best-known local brand and has a real following — we haven't confirmed their current happy hour specials against their own menu, so they're not here. Same for Abandoned Rail Brewing (1220 Davenport Ave), which is in our database with limited confirmed specials. If you know what either is currently running, a photo of the board is how to get it added properly via the <a href="/penticton/submit">submit page</a>.</p>
<p>Match Eatery at Cascades Casino (553 Vees Dr) is also confirmed and running a full specials program — worth knowing if you're at the casino end of town, but we've kept the focus here on the main dining areas.</p>

<h2>How to check what's on tonight</h2>
<p>This post is a reference snapshot. For what's running on a specific day — filtered by day of week, with each item's last-verified date — the <a href="/penticton">Penticton specials page</a> is what to check. Every deal on it has been confirmed against a real source. Report button on each card if something's changed.</p>
`,
  },
  {
    slug: "happy-hours-revelstoke-golden-2026",
    category: "Guide",
    regions: ["revelstoke-golden"],
    title: "Happy Hours in Revelstoke & Golden: Every Confirmed Spot (2026)",
    metaDescription: "Confirmed happy hour spots in Revelstoke and Golden BC — downtown MacKenzie Ave, Revelstoke Mountain Resort base, and Golden's 9th Ave core. Actual specials and current deals. Updated 2026.",
    publishedAt: "2026-10-29",
    excerpt: "Revelstoke runs its happy hours mostly 2–5 PM at the resort base and 4 PM onward downtown; Golden is lighter on published specials, with confirmed deals at Raven + Pine on the Trans-Canada and Tuesdays at Riverhouse Tavern in the core.",
    contentHtml: `
<p>Quick answer: Revelstoke runs its happy hours mostly 2–5 PM at the resort base and 4 PM onward downtown; Golden is lighter on published specials, with confirmed deals at Raven + Pine on the Trans-Canada and Tuesdays at Riverhouse Tavern in the core. The two towns are 1 hour 45 minutes apart on Highway 1 — close enough for a multi-day trip, different enough that each warrants its own stop.</p>

<p>Worth knowing up front: Revelstoke (roughly 8,500 people) and Golden (roughly 4,000) are both Columbia Mountains towns built around ski resorts that arrived after the towns had already established their own characters. Revelstoke Mountain Resort opened in 2008 and has the longest vertical drop of any ski resort in North America. Golden's Kicking Horse Mountain Resort sits adjacent to Yoho National Park — one of the most scenically dense corners of the country. Neither town has been overrun the way Banff and Whistler have. The bar scenes are small and local; that's the point.</p>

<h2>Revelstoke</h2>

<p>Downtown MacKenzie Avenue and the resort base (Camozzi Rd) are about 15 minutes apart. Most of the bar life is downtown. The resort base has more going on in ski season and very little in shoulder seasons.</p>

<h3>Downtown / MacKenzie Avenue Corridor</h3>

<p><strong>Seoul Street (314 1 St W)</strong> — Korean street food, soju and k-cocktails in a small room on First Street. Confirmed snacks in our database: crispy wontons, edamame, street fries. Thursday Jeopardy nights at 7 PM. More of a small-plates and cocktails spot than a traditional happy hour — check the board for current drink specials.</p>

<p><strong>Big Eddy Pub (2108 Big Eddy Rd)</strong> — Slightly off the MacKenzie Ave strip (a short drive toward the river) but worth knowing. Confirmed food specials: 2-for-1 wings on Wednesdays, discounted burgers on Thursdays. Seasonal beach volleyball court, spacious patio. Wheelchair accessible. A locals' pub rather than a tourist stop.</p>

<p><strong>Bar One</strong> — Day-specific food specials confirmed: $4 tacos Tuesdays from 4 PM, wing nights Thursdays and Saturdays from 4 PM. No drink specials confirmed.</p>

<p><strong>River City Pub &amp; Patio (112 First St E)</strong> — The old-timer. Established 1932 at the same MacKenzie Ave address. Daily food and drink specials confirmed on seerevelstoke.com, but no times or prices are listed anywhere we could find. Live music, billiards, local microbrews, patio. Worth a walk-in to check the board — the daily specials reputation is consistent across multiple local sources.</p>

<h3>Revelstoke Mountain Resort Base (Camozzi Rd)</h3>

<p><strong>Rockford Bar &amp; Grill (2950 Camozzi Rd)</strong> — Inside the Sutton Place Hotel at the RMR base. The most confirmed-specials venue in this entire region. Happy hour published as 2–5 PM daily on a 2022 RMR menu document — confirm current times directly. Our confirmed specials include: Happy Hour Craft Pints, Happy Hour Feature Cocktails, Happy Hour Vodka Soda, Moscow Mule, Local Draft, House Wine (6 oz and 9 oz), Caesars &amp; Mimosas, White Sangria, Peach Mango Bellini, Stella 40cl, and food specials including Governor Tso's Chicken and Vegetable Dumplings. If you're at the mountain, this is the obvious call.</p>

<p><strong>The Den (1701 Coursier Ave)</strong> — Resort-adjacent, in the Cabot Lodge development. Confirmed in our database: 50% off burgers. Check current times directly.</p>

<p><strong>Mackenzie Common Tavern &amp; Food Truck</strong> — At the RMR base alongside Rockford. Happy hour windows noted by a lodging guide as 12–1 PM and 8–11 PM, though we couldn't confirm this from the resort's own pages. Menu includes cocktails, margaritas, local brews, shafts, hot chocolates. Open noon–midnight. The food truck runs the lunch and après crowd; the tavern side runs later.</p>

<h2>Golden</h2>

<p>Golden's bar scene is concentrated in a compact downtown core along 8th–10th Avenue North. Kicking Horse Resort's base has Eagle's Eye at the summit (open 11:30 AM–4 PM, gondola required — more of a views-and-lunch destination than a happy hour stop). Most evening specials are downtown or on the Trans-Canada corridor.</p>

<h3>Downtown (8th–10th Ave N)</h3>

<p><strong>Riverhouse Tavern (506 8 Ave N)</strong> — Open since 2005, described consistently as the locals' favourite in Golden. Confirmed in our database: Taco Tuesdays and Wood-Fired Pizza Nights. Can stay open until 2 AM. Burgers, loaded baked potatoes, good beer at affordable prices. No published happy hour window — check in person.</p>

<p><strong>Stolen Bell Distillery</strong> — Craft distillery with cocktail lounge, share-plate kitchen, 19+. The Golden Chamber of Commerce directory confirms they have a happy hour menu. No times or prices have been published anywhere we could find — worth asking directly.</p>

<p><strong>Whitetooth Brewing Company</strong> — Tasting room open daily, noon–10 PM (family-friendly noon–4 PM, 19+ after 4 PM). Downtown. No happy hour pricing confirmed, but consistent stop for anyone spending an afternoon in Golden.</p>

<p><strong>Rockwater Grill &amp; Bar</strong> — Music venue with patio and views of the Kicking Horse River. Steaks, burgers, wings, live music, DJs. Open until midnight Sun–Thu, 2 AM Fri–Sat — one of the later-closing spots in town. No happy hour times confirmed.</p>

<p><strong>Island Restaurant</strong> — On a small island in the Columbia River with two patios. Confirmed Taco Tuesdays and daily specials. More of a restaurant than a bar, but the waterfront setting is the standout and the daily specials are real.</p>

<h3>Trans-Canada / South of Downtown</h3>

<p><strong>Raven + Pine Mountain Eatery (1049 Trans-Canada Hwy)</strong> — On the highway rather than in the downtown core, so a separate stop from the 8th Ave cluster. This is the most complete confirmed-specials menu in Golden: cocktails (2 oz), warmers (1.5 oz), house wine (6 oz), draft beer (16 oz), fireside frites, wagyu beef gyoza, tempura prawn roll, the Raven Burger, rigatoni bolognese, teriyaki ember bowl. Good option if you're coming in from Kicking Horse or heading through on Highway 1.</p>

<h2>What's Not on This List</h2>

<p><strong>Revelstoke:</strong> The Last Drop Pub (200 Third St W, Powder Springs Inn) has a reputation for nightly drink specials and live music — we found a seasonal listing for $9 double highballs but no current confirmed window. The Village Idiot Bar &amp; Grill (306 MacKenzie Ave) is a well-known après-ski spot and USA Today 10Best nominee but no confirmed happy hour times. Quartermaster Eatery at the Explorers Society Hotel is tagged as having happy hour on OpenTable but no published details. Rumpus Beer Company (208 1 St E) lists 3 PM–8 PM hours from a single source — the window suggests something runs in there, but no prices confirmed. Craft Bierhaus (107 Second St E) for 24 rotating taps.</p>

<p><strong>Golden:</strong> Mad Trapper Pub (1203 9th St S) is listed in Tourism Golden's bar guide but no specials details available anywhere. The Golden Taps (505 9 Ave N) is marketed as Golden's après hub but no published specials. Eleven22 (1122 10th Ave) for fine dining. The Wolf's Den (624 9 Ave N) for AAA Angus steaks with live music on summer weekends. If you know what any of these are currently running, a photo of the board gets it into the live listings.</p>

<h2>How to Check Tonight</h2>

<p>This post is a reference snapshot. For what's confirmed and currently running in Revelstoke &amp; Golden — filtered by day of week, with each item's last-verified date — the live specials page is what to check. Every deal on it has been confirmed against a real source. Report button on any card if something's changed.</p>

<p><a href="/revelstoke-golden">See tonight's specials in Revelstoke &amp; Golden</a> &nbsp;&middot;&nbsp; <a href="/revelstoke-golden/submit">Submit a special</a></p>
`,
  },
  {
    slug: "happy-hours-kitchener-waterloo-cambridge-2026",
    category: "Guide",
    regions: ["kitchener-waterloo-cambridge"],
    title: "Happy Hours in Kitchener-Waterloo: Every Confirmed Spot, by Neighbourhood (2026)",
    metaDescription: "Every confirmed happy hour in Kitchener, Waterloo, and Cambridge — Uptown Waterloo's King Street strip, downtown Kitchener, and the Cambridge Galt core. Actual prices and times. Updated 2026.",
    publishedAt: "2026-10-29",
    excerpt: "Uptown Waterloo's King Street is the most walkable happy hour strip in the region — Abe Erb, The Pub on King, Hop House, and Morty's are all within a few blocks. Downtown Kitchener runs longer with more variety; the ION LRT connects the two in under 15 minutes.",
    contentHtml: `
<p>Quick answer: Uptown Waterloo's King Street is the most walkable happy hour strip in the region — Abe Erb, The Pub on King, Hop House, and Morty's are all within a few blocks. Downtown Kitchener runs on a longer strip with more variety; the ION LRT connects the two in under 15 minutes, which makes a crawl between them genuinely practical. Cambridge has its own scene in the Galt core and along Hespeler Road, smaller but with solid confirmed specials.</p>

<p>Worth knowing first: Kitchener-Waterloo is Canada's most productive tech corridor outside Toronto — Communitech, Google's Waterloo office, and a dense startup ecosystem anchor the after-work happy hour culture here in a way that doesn't happen in most mid-size cities. And KW's Oktoberfest is the largest Bavarian festival in North America outside Munich. Kitchener was named "Berlin, Ontario" until WWI. Beer culture here is a real local identity, not just a trend. Abe Erb, one of the most-confirmed breweries in this post, is named after an early Mennonite settler who farmed in Waterloo in the 1800s.</p>

<h2>Uptown Waterloo</h2>

<p>King Street between William Street and Erb Street is where Waterloo's happy hour life concentrates. Multiple venues sit within a 3–4 block stretch; you can walk between them in under five minutes. The ION LRT stops at Willis Way, connecting directly to downtown Kitchener.</p>

<p><strong>Abe Erb (15 King St S, Waterloo)</strong> — The most consistently confirmed happy hour program in the region. Weekdays 3–5 PM: $2 off all draft beer, cocktails, and appetizers. Confirmed from abeerb.com. Also at 151 Charles St W in Kitchener.</p>

<p><strong>The Pub on King (77 King St N)</strong> — Detailed day-by-day specials confirmed from their own website. Monday: $5 domestic pints, $15.50 pitchers, $4.50 burgers, 75-cent wings with a drink. Tuesday: $15.50 pitchers all day, $9 Don Julio/Hennessy shots. Wednesday: $8.50 schooners, half-off wine bottles. Friday: $17.95 fish &amp; chips with a pint. Saturday: $9.50 sangria mini pitchers before 11 PM.</p>

<p><strong>Hop House (49 King St N)</strong> — Confirmed: Hoppy Hour half-priced appetizers and pints. Also running: Monday Taco Trio and Modelo/Corona pints, Tuesday buy-a-pound-get-a-pound wings, Wednesday half-price apps and Mill St./Brickworks pints, Thursday rib dinner, Sunday signature pizzas and wing night.</p>

<p><strong>White Rabbit (47 King St N)</strong> — Cocktail-focused. Confirmed: Yacht Rock Margarita Mondays (classic margaritas, Hornitos Reposado, Modelo, $3 tacos), Single Malt Mondays, Girl Dinner Tuesdays (martinis, espresso margarita, cosmos).</p>

<p><strong>LaLa Social House (181 King St S)</strong> — Confirmed social hour: Peroni draft, Peroni 0.0%, cocktails, mocktails, PEI oysters (half dozen), chicken katsu skewers, lamb galbi skewers, Lala garlic bread, Niagara Foods N'duja, whipped goat cheese, marinated beets. The Lower Lounge downstairs runs an overlapping menu. More upscale than the rest of the strip.</p>

<p><strong>Duke of Wellington (100 King St S)</strong> — British pub confirmed specials: Cowbell pints, Duke's Lager pints, Moosehead pints, Irish pints, nachos 50% off, poutines $5 off, wings, Duke Burger and fries deal.</p>

<p><strong>Proof Kitchen + Lounge (110 Erb St W)</strong> — Confirmed: all signature cocktails at happy hour pricing (weekdays 3–5 PM), Ribeye Mondays, Tequila + Taco Tuesdays (margaritas + tacos), Wine Wednesdays (bottles), Bottomless Brunch. More upscale than the pub cluster.</p>

<p><strong>Loloan Lobby Bar (14 Princess St W)</strong> — Oysters and bubbly, grilled oysters, red curry oyster shots, cereal prawns. Confirmed small-plates menu. The oyster option in Waterloo.</p>

<p><strong>Morty's Pub (272 King St N)</strong> — Confirmed wing special. One of Waterloo's oldest pubs, consistently mentioned in local guides.</p>

<p><strong>Ethel's Lounge (114 King St N)</strong> — Confirmed day specials: Burger Monday, Taco Tuesday, Wing Ding Wednesday, wing nights.</p>

<h2>Downtown Kitchener</h2>

<p>King Street West between Cedar and Charles, plus the Charles Street corridor toward the Communitech Hub. More spread out than Uptown Waterloo but ION-connected. The tech sector density here creates a strong weekday after-work culture.</p>

<p><strong>Abe Erb (151 Charles St W)</strong> — Same weekday 3–5 PM program as Waterloo: $2 off all draft beer, cocktails, and appetizers. Inside the Communitech Hub, a converted tannery. Different setting from the Waterloo location — industrial, open-concept.</p>

<p><strong>Bobby O'Brien's (125 King St W)</strong> — Confirmed extensive specials: $5.25 Canadian and Coors pints (daily 2–5 PM), $2 off domestic pitchers, $5 off burgers/chicken sandwiches, $5 off large pizzas, $5 off nachos, $5 off wine bottles, 10 wings for $10.</p>

<p><strong>Grand Trunk Saloon (87 King St W)</strong> — Cocktail-focused happy hour confirmed in our database: Aperol Spritz, Coffee &amp; Cigarettes, Corpse Reviver #2, Espresso Martini, Old Fashioned, Farm League Hauler Lager, hominy frites. Craft cocktail bar rather than traditional pub.</p>

<p><strong>Don Julio Tacos &amp; Tequila Bar (147A King St W)</strong> — Confirmed: Margarita Night $10.25, Taco Night all tacos $6, Sunday $2 off Dos Equis and Madri on tap, Thursday $2 off tequila and mezcal shots.</p>

<p><strong>TWH Social (1 King St W)</strong> — Confirmed Wine Wednesdays: 50% off selected bottles, 9 oz glasses of wine. King and Victoria corner, central downtown Kitchener.</p>

<p><strong>PUBLIC Kitchen &amp; Bar (300 Victoria St N)</strong> — Confirmed from their own site: Tue–Sat 4–6 PM, happy hour small plates and beverages from $8 (dine-in only). Tuesday is all-night happy hour. Wednesday: $1 oysters open to close while supplies last. The $1 oyster Wednesday is the standout confirmed price in this post.</p>

<p><strong>Dallas Night Club (312 King St W)</strong> — Confirmed: Dollar Beer Fridays.</p>

<h2>Kitchener — Beyond the Core</h2>

<p>These are destinations rather than walkable stops — most require a drive or the ION from downtown.</p>

<p><strong>Malt &amp; Barley Public House (1187 Fischer-Hallman Rd)</strong> — Confirmed everyday happy hour: all pints and glasses of wine. Research confirms the window as 2–5 PM and again 9–10 PM at $6. Also: Donair Monday, Fish Tuesday, Wing Wednesday, Burger Thursday, Sunday mains special.</p>

<p><strong>Borealis Grille &amp; Bar (4336 King St E)</strong> — Confirmed: Mon–Fri 2–5 PM, $10 appetizers, $6 taps including cocktails on tap. Also: Taco Night with margaritas and cervezas, Fried Chicken Thursday, Date Night two-can-dine.</p>

<p><strong>Whale &amp; Ale British Pub (1120 Victoria St N)</strong> — Confirmed: 2-for-1 fish and chips, wings half price, nacho madness, half-price brownies, 32 oz mini pitchers. The fish and chips deal is the standout.</p>

<p><strong>Piper Arms (4391 King St E)</strong> — Confirmed everyday: $5 domestic 20 oz pints. Late night: $5 pints, $5 bar rails, $6 house wine, 99-cent wings, half-price apps. One of the most consistent daily deals in the region.</p>

<p><strong>The Three Idiots (2979 King St E)</strong> — Confirmed daily specials including a $9.99/$4.99 combo. Research confirms 1–5 PM (half-price apps and drinks) and 8 PM–close (half-price apps). Also: Monday growlers, Tuesday wing night, Wednesday tall cans, Thursday half-price wine bottles, Sunday domestic pitchers.</p>

<p><strong>Moxies (385 Fairway Rd S)</strong> — Confirmed: $5 beer, $5 house highballs, $5 wine, and a late-night happy hour at the same pricing. Half-price wine bottles.</p>

<p><strong>Waterloo Brewing Taphouse (400 Bingemans Centre Dr)</strong> — Confirmed specials: $5 off charcuterie nachos, Fest pretzel, half-price wine bottles. The taproom for Waterloo Brewing, open Wed–Sat noon–10 PM, Sun noon–8 PM.</p>

<p><strong>Graffiti Market (137 Glasgow St)</strong> — Confirmed: Monday Pint &amp; Pizza, Wednesday Wing Night, Thursday take-away special. Food market and restaurant in the Belmont Village area.</p>

<h2>Cambridge</h2>

<p>Cambridge is three merged towns: Galt (stone buildings along the Grand River, the most character), Preston, and Hespeler. The Galt core has the best independent bar scene; Hespeler Road is the chain-heavy strip that runs through the city.</p>

<h3>Galt / Old Cambridge Core</h3>

<p><strong>Cambridge Mill (100 Water St N)</strong> — Confirmed: half-price oysters &amp; prosecco, half-price wine. Heritage limestone building on the Grand River. The most upscale confirmed happy hour in Cambridge.</p>

<p><strong>The Aging Oak (3 Queen St E)</strong> — Confirmed day specials: wing night, flatbreads, Thirsty Thursday (flatbreads + cocktail kit), Wine &amp; Whiskey Wednesdays (bottle of wine), nachos Saturday with a litre of draft.</p>

<p><strong>The Black Badger (55 Water St N)</strong> — Confirmed: double Caesars, double well shots, fish fry, rib night, wings. Straightforward pub near Cambridge Mill.</p>

<p><strong>The Underwing (58 Grand Ave S)</strong> — Confirmed late night menu: aguachile shrimp tacos, fried halloumi, frites, gochujang sliders, kung pao Brussels sprouts, schnitzel &amp; frites, smoked taleggio burger, truffle fries. The late-night food option in Galt.</p>

<h3>Hespeler Road / Cambridge Strip</h3>

<p><strong>Fiddle &amp; Firkin (707 King St E)</strong> — Confirmed everyday happy hour: bar rail, beer of the day, espresso martini, house wine. Also: Monday burgers and tall boys, Tuesday pasta night (spicy beef penne, arrabiata, Tuscan chicken linguine) and Guinness pints, Wednesday pint + pound wings (Canadian, Creemore, or Heineken), Thursday curry club (butter chicken, curry chicken, veggie curry), Friday halibut &amp; chips and wine bottles, weekend brunch Caesars and mimosas.</p>

<p><strong>State &amp; Main (375 Hespeler Rd)</strong> — Confirmed: happy hour drinks and snacks from $5, half-priced wings, $2 off sangria and Caesars, Margarita Mondays, half-priced wine bottles Thursdays.</p>

<p><strong>The Keg Cambridge (44 Pinebush Rd)</strong> — Confirmed from thekeg.com: Mon–Fri open until 6 PM, Sat–Sun open until 5 PM, and nightly 9 PM–close in the bar and lounge.</p>

<p><strong>Browns Socialhouse Cambridge (355 Hespeler Rd)</strong> — Confirmed social hour: Social Ale, Social Lager, Social Wine (6 oz and 9 oz), Long Island Social, Passion Fruit Crush, 50% off bottles of wine. Food: crispy yam &amp; avocado roll, hot honey stracciatella, snackin' nachos, steakhouse sliders, sticky Thai chicken, truffle garlic fries.</p>

<p><strong>Gator's Tail Sports Shack (970 Franklin Blvd)</strong> — Confirmed day specials: Tuesdays wings, Wednesdays classic burger &amp; fries, Thursdays rib dinner, Fridays fish &amp; chips, Sundays appetizers, Saturdays wine bottles.</p>

<h2>What's Not on This List</h2>

<p>Beertown Public House (75 King St S, Waterloo) is one of the most-mentioned happy hour spots in local Yelp reviews — we couldn't confirm current pricing from a primary source; worth calling before making it a destination. Arabella Park Beer Bar (Belmont Village, 18 rotating taps) is in our database as a venue but no confirmed specials. Lancaster Smokehouse (574 Lancaster St W) runs Tue–Thu 4–6 PM drink specials and $6 pizza slices from an aggregator — check directly. The Charcoal Steak House (2980 King St E) has been in Kitchener since 1956 and is a genuine local institution but no confirmed happy hour. Chicago Pub &amp; Billiards (725 Ottawa St S, Kitchener) is in our database with an extensive pints-and-pitchers menu — worth checking for pool nights.</p>

<h2>How to Check Tonight</h2>

<p>This post is a reference snapshot. For what's confirmed and currently running in Kitchener-Waterloo-Cambridge — filtered by day of week, each item's last-verified date — the live specials page is what to check. Every deal on it has been confirmed against a real source. Report button on any card if something's changed.</p>

<p><a href="/kitchener-waterloo-cambridge">See tonight's specials in KWC</a> &nbsp;&middot;&nbsp; <a href="/kitchener-waterloo-cambridge/submit">Submit a special</a></p>
`,
  },
  {
    slug: "happy-hours-edmonton-2026",
    category: "Guide",
    regions: ["edmonton"],
    title: "Happy Hours in Edmonton: Every Confirmed Spot, by Neighbourhood (2026)",
    metaDescription:
      "Confirmed happy hour spots in Edmonton AB by neighbourhood — Whyte Ave / Old Strathcona, ICE District, 124 Street, and beyond. Specific deals, verified from primary sources.",
    publishedAt: "2026-10-29",
    excerpt:
      "Whyte Ave concentrates the most walkable happy hour strip in Edmonton — more than a dozen bars in four blocks. Most deals run 3–6 PM; the Black Dog and Sugarbowl both start at 2 PM and run until 7. For Oilers game-night specials, the ICE District is the move.",
    contentHtml: `
<p>Edmonton's happy hour scene concentrates on Whyte Avenue in Old Strathcona, where more than a dozen bars sit within a short walk of each other. Most deals run from roughly 3–6 PM, though the Black Dog Freehouse and Sugarbowl both start at 2 PM and run until 7 PM. For game-night specials, the ICE District around Rogers Place is the move — bars there fill up two hours before Oilers puck drop. The 124 Street corridor in Oliver has the best craft beer concentration outside of Whyte Ave.</p>

<p>Edmonton is Canada's northernmost major city, at 53° north. That makes patio season a genuine event: daylight past 10 PM in June, rooftop bars packed from May through September, and the Black Dog Freehouse keeping its outdoor space open year-round (including at &minus;30&deg;C). The Fringe Festival in August brings North America's largest English-language fringe theatre run to Whyte Ave and surrounding streets. The University of Alberta is 10 minutes from the strip. Rogers Place opened in 2016 and rebuilt downtown bar expectations. And the oil-and-government mix in the city's workforce sustains weekday after-work crowds that hold up even midweek.</p>

<h2>Old Strathcona / Whyte Ave</h2>

<p>The walkable core. 82 Avenue from around 104 Street to 107 Street has more bars per block than anywhere else in Edmonton — a mix of old-school pubs, brewery taprooms, and cocktail bars. The rooftop patio at the Black Dog is an institution. Sea Change and Campio's Ritchie taproom are a short walk south of the main strip and worth the detour.</p>

<p><strong>The Black Dog Freehouse (10425 Whyte Ave NW)</strong> — Daily happy hour starting at 2 PM through 7 PM. Confirmed specials include 20 oz pints, well highballs, shots, and tall cans. Rooftop patio stays open through winter. Drinks only — no kitchen.</p>

<p><strong>Hudsons Canada's Pub (10307 82 Ave NW)</strong> — Confirmed specials on house draft (16.5 oz), hi-balls, Corona, and seasoned fries. Wing Wednesday is 50% off wings. Thursday happy hour from $5. Maritime Mondays: 2-piece fish &amp; chips special. Straightforward pub value on the main strip.</p>

<p><strong>O'Byrne's Irish Pub (10616 Whyte Ave NW)</strong> — Confirmed half-price wings, half-price nachos, and half-price wine during happy hour. Monday Industry Night. Guinness on draft. Classic Irish pub feel without the tourist markup.</p>

<p><strong>Blowers &amp; Grafton (10550 82 Ave NW)</strong> — Confirmed specials include 20 oz pours of house lager and amber ale, Alexander Keith's pints, cocktails, fish &amp; chips, oysters by the half dozen, garlic fingers, and pizza. Power hour runs at the close of happy hour — check their schedule for exact times.</p>

<p><strong>The Buckingham (10439 Whyte Ave NW)</strong> — Confirmed: 50% off burgers, 20% off appetizers, well highballs, $5 Fireball shots, and all-you-can-eat corn dogs on happy hour. One of the better burger deals on the strip.</p>

<p><strong>Spade's Kitchen &amp; Bar (10401 82 Ave NW)</strong> — Confirmed specials span both food and drinks: margaritas, dirty martinis, house wine, wings, chicken sandwich, pasta, fries, and salads, alongside Stella, Corona, and Pilsner. One of the more complete happy hour menus on the avenue.</p>

<p><strong>Bodega (10314 82 Ave NW; also 12417 Stony Plain Rd NW and Highlands)</strong> — Portuguese-Spanish tapas and wine bar with three Edmonton locations. Confirmed: half-price feature wine, beer, and cocktails. Wine Wednesdays and Seafood Sundays run as recurring weekly specials. The Whyte Ave location has the most street energy.</p>

<p><strong>Coterie Restaurant &amp; Bar (10330 80 Ave NW)</strong> — Confirmed happy hour specials include oysters, olives, and devils on horseback. Quieter end of the strip; good for a more sit-down start to the evening.</p>

<p><strong>The Next Act Pub (8224 104 St NW)</strong> — Confirmed "Curtain Call" happy hour with draft and snacks, plus rotating "Fail Pails" specials. Strong imported and local craft beer selection. Known for good burgers. Daily happy hour, 4–7 PM widely reported — verify times directly.</p>

<h3>Garneau (5 min walk east)</h3>

<p><strong>Sugarbowl (10922 88 Ave NW)</strong> — Two blocks east of main Whyte Ave in the Garneau neighbourhood. Confirmed daily happy hour 2–7 PM — a 5-hour window, longer than nearly anywhere else in the city. Specials include tap beer and Aperol Spritz, with 15 rotating taps and a bottle list over 160. Smoked paprika popcorn and yam fries available. Popular with U of A students and faculty.</p>

<p><strong>Duggan's Boundary Irish Pub (9013 88 Ave NW)</strong> — Confirmed happy hour specials and Sunday all-day happy hour. Good neighbourhood pub for the Garneau/Mill Creek edge of the Whyte Ave zone.</p>

<h3>Ritchie (short drive south)</h3>

<p><strong>The Bell in Scona Brewery (10416 80 Ave NW)</strong> — Confirmed Sunday all-day happy hour, plus a late-night window on other days. Specials cover all draft beers, beer cocktails, wings, and steak frites. Good option when you want to drink local and eat something substantial.</p>

<p><strong>Sea Change Brewing Co. (9850 62 Ave NW)</strong> — Confirmed Tuesday all-day $5.50 pints. Trivia runs Tuesday evenings. A solid destination if you prefer a brewery taproom over a pub — worth the short drive from Whyte Ave.</p>

<p><strong>Campio Brewing Co. (9570 76 Ave NW)</strong> — Confirmed specials on tap beers, gin cocktails, wings, and snacks during happy hour. The downtown Campio location (10257 105 St NW) runs the same program if you're in the ICE District.</p>

<h2>ICE District &amp; Downtown</h2>

<p>Anchored by Rogers Place (opened 2016), the 104 Street / 101 Avenue corridor has the most polished and event-driven bar scene in the city. On Oilers game nights, the three blocks around Rogers Place fill up two hours before puck drop — happy hour pricing disappears fast. On off-nights it's quieter than Whyte Ave, but there's real quality here, especially on Eleven Eleven's themed days and the midweek deals at Woodwork and Black Pearl.</p>

<p><strong>Eleven Eleven Kitchen &amp; Bar (10305 100 Ave NW)</strong> — The most programmed happy hour downtown, with confirmed day-specific prices: Monday — 3 tacos for $11.11 and margaritas; Tuesday — 20% off small bites; Wednesday — smoked Old Fashioned $7.25; Thursday — pizzas 50% off and craft draft 20% off; Friday — $5.50 vodka drinks; Saturday — fish &amp; chips special; weekend brunch — $6 mimosas and Caesars.</p>

<p><strong>The Public Exchange (10909 Jasper Ave NW)</strong> — Confirmed daily theme specials: Mixer Monday all-day happy hour; Taco Tuesday half-off tacos and tequila; Wing Wednesday half-off wings and $6 draft; Girls Night Thursday half-off wine, bubbles, and desserts; Public Fridays $6 well doubles. One of the more consistent week-long programs in the city.</p>

<p><strong>Woodwork (10132 100 St NW)</strong> — In the historic McLeod Building on Rice Howard Way. Confirmed weekday happy hour 2–5 PM: all draft beers, classic cocktails (shaken and stirred), feature wine by the glass, frites, and olives. More upscale-casual than the Whyte Ave pubs — better suited to a work drink than a bar crawl.</p>

<p><strong>Black Pearl Seafood Bar (10132 104 St NW)</strong> — Confirmed weekly seafood specials: "buck &amp; a bit" oyster happy hour, Mussel Monday, Tower Tuesday (tower of oysters), Wine Wednesday, Tequila Thursday, Caesar Sunday. Also runs a late-night happy hour. Good for a seated oyster session at bar prices.</p>

<p><strong>Braven Restaurant &amp; Lobby Bar (10344 102 St NW, JW Marriott)</strong> — Hotel lobby bar overlooking the ICE District plaza. Confirmed "Golden Hour" beverage specials, half-price wine bottles, and game-day specials during Oilers season. Weekly rotating food specials: burgers, flatbreads, wings, tacos. Better value than the setting suggests.</p>

<p><strong>Rocky Mountain Icehouse (10516 Jasper Ave NW)</strong> — Confirmed power happy hour with Pimm's Cup, Tom Collins, and Aperol Spritz alongside well highballs. Recurring theme nights: Whisky Wednesdays, Taps Tuesdays (domestic pints), Sunday Caesars. One of the more active week-long programs downtown.</p>

<p><strong>The Sherlock Holmes Pub — Downtown (10012 101A Ave NW)</strong> — Confirmed: half-price dry ribs, wings, and Korean BBQ chicken during happy hour; $2 off fish &amp; chips. Sunday is all-day happy hour. The University location at 8519 112 St NW runs the same structure — better positioned if you're coming from the south side.</p>

<p><strong>1st RND (11248 104 Ave NW)</strong> — Confirmed "3 Star Happy Hour": house league draught sleeves, fish tacos, and sliders. Day specials include Boneless Mondays (half-price boneless wings and Budweiser), Wing Wednesday (half-price), and Tacomania (half-price tacos). Late happy hour also confirmed. Sports bar energy with honest prices.</p>

<p><strong>District 102 (10222 102 St NW)</strong> — Confirmed daily happy hour twice per day: 3–5 PM and 9 PM to close. The double window is useful if you miss the afternoon session.</p>

<p><strong>Black Pearl Seafood Bar aside — Baijiu (103-10359 104 St NW)</strong> — Asian-inspired cocktail bar and small plates on the 104 Street corridor. Confirmed happy hour specials on bao, dumplings, cocktails, and Coors Light. Different vibe from the Irish pubs and steakhouses nearby.</p>

<p><strong>Bar Henry (10220 103 Ave NW)</strong> — European-style aperitivo hour. Confirmed specials include classic martinis at $14 and rotating aperitivo cocktails and wines. More cocktail-forward than most of the downtown lineup.</p>

<h2>124 Street / Oliver (Wihkwentôwin)</h2>

<p>The 124 Street corridor has been building into Edmonton's most interesting food and wine neighbourhood over the past decade. Less of a bar-crawl zone than Whyte Ave — slower pace, more sit-down, slightly older crowd — but the craft beer and wine bar options here are genuinely good. Three Vikings and Slow Pour are the anchors.</p>

<p><strong>Three Vikings (10713 124 St NW)</strong> — Neighbourhood pub with a rotating local tap list. Confirmed pours include Bent Stick, Sea Change, Parallel 49, Snake Lake, and Longroof. Happy hour covers pints, fish &amp; chips, and grilled cheese. "Wine and Cheese O'Clock" runs as a weekly feature. Casual and walkable.</p>

<p><strong>Slow Pour Beer Bar (10416 122 St NW)</strong> — Day-specific confirmed specials: Tuesdays 20% off all draft; Wednesdays $20 off wine bottles; Thursdays $3 off fresh tins; Sundays negroni and Boulevardier specials with pierogies and Pilsner Urquell. One of the better week-long beer programs in the city.</p>

<p><strong>Arcadia Brewing Co. (10712 120 St NW)</strong> — Confirmed: $1 off all pints during happy hour, $20 pitchers, $2 hot dogs, $5 grilled cheese. Microbrewery atmosphere with straightforward pricing. The $20 pitcher is useful if you're going with a group.</p>

<p><strong>Bodega 124 Street (12417 Stony Plain Rd NW)</strong> — Sister location to the Whyte Ave spot. Confirmed: half-price feature wine, beer, and cocktails; Thursday tapas and wine specials; Wine Wednesday half-price wines. Same Portuguese-Spanish food philosophy as the other locations.</p>

<h2>What's Not on This List</h2>

<p>Several Edmonton spots came up in research or appear in our database but we couldn't re-confirm current specials, or the timing details were too uncertain to publish:</p>
<ul>
<li><strong>Pip</strong> (Old Strathcona) — confirmed daily "Rush Hour" from their own website: 4–5 PM and a late evening window. $5 off cocktails, snacks, and wines. Check <a href="https://pipyeg.com">pipyeg.com</a> for the current schedule; the window is only one hour so timing matters.</li>
<li><strong>LOCAL Public Eatery</strong> (Jasper Ave NW and South Common) — confirmed specials on draft, margaritas, martinis, wine, and $5 off pizzas; both Edmonton locations run the same program.</li>
<li><strong>Craft Beer Market</strong> (10013 101A Ave NW) — confirmed daily 2–5 PM happy hour and game-day specials at <a href="https://craftbeermarket.ca/locations/edmonton/">craftbeermarket.ca</a>.</li>
<li><strong>Blakbar</strong> (10762 Whyte Ave NW) — confirmed $5 Fireball and Jäger shots and select pint specials, but current hours not confirmed.</li>
<li><strong>Ampersand 27</strong> (10612 82 Ave NW) — confirmed happy hour pints, cocktails, flatbreads, charcuterie, and smash burger; hours not confirmed in primary sources.</li>
<li><strong>The Buckingham Pub</strong> also has a late-night happy hour window in addition to the evening session listed above — verify directly for the second window.</li>
<li>South Edmonton (Windermere, Ellerslie, South Common) is mostly chain territory: Earls, Cactus Club, Chop Steakhouse, Browns Socialhouse, Canadian Brewhouse, and Flame &amp; Barrel (Windermere) all run happy hours. Flame &amp; Barrel in particular has an extensive confirmed program including a late happy hour and nightly themed specials — check their page directly for current Windermere pricing.</li>
<li><strong>Three Boars Eatery</strong> — permanently closed as of 2024. Skip any list that still includes it.</li>
</ul>

<h2>How to Check Tonight</h2>

<p>This post is a snapshot from late 2026. Happy hours change seasonally, and bar programs evolve — especially after summer-to-winter transitions. Before heading out:</p>
<ul>
<li>Check the live Edmonton page at <a href="/edmonton">/edmonton</a> — it pulls from the same database but updates in real time as venues report changes.</li>
<li>Spot a deal we're missing? Submit it at <a href="/edmonton/submit">/edmonton/submit</a> and we'll add it.</li>
</ul>
`,
  },
];

// A post with no `regions` is region-agnostic and visible everywhere; a post
// with `regions` is only visible under one of those region slugs -- see the
// BlogPost.regions comment for why this check exists at all.
function isVisibleInRegion(post: BlogPost, regionSlug: string): boolean {
  return post.regions === undefined || post.regions.includes(regionSlug);
}

export function getBlogPost(slug: string, regionSlug: string): BlogPost | undefined {
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post || !isVisibleInRegion(post, regionSlug)) return undefined;
  return post;
}

// The date search engines should treat this post as last changed on.
export function blogLastModified(post: BlogPost): Date {
  return new Date(post.updatedAt ?? post.publishedAt);
}

export function getBlogPostsForRegion(regionSlug: string): BlogPost[] {
  return BLOG_POSTS.filter((p) => isVisibleInRegion(p, regionSlug));
}

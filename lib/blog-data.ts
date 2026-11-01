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
    updatedAt: "2026-10-31",
    excerpt:
      "Every special on this site has to survive one rule: if we can't point to where it came from, it doesn't get published. Here's how that actually works.",
    contentHtml: `
<p>There are a handful of local food-deals sites out there, and most of them share the same problem: someone built a list once, maybe two years ago, and nobody's touched it since. Restaurants close, happy hours get cancelled, prices go up -- the list doesn't know. You show up for $5 wings and pay $9.</p>
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
    updatedAt: "2026-10-31",
    excerpt:
      "Forget the lists that haven't been updated since before the pandemic. Here's what's actually on right now, verified against each venue directly.",
    contentHtml: `
<p>Search "Kelowna happy hour" and you'll find the same three articles everyone else finds -- dated, vague, and missing half the venues that actually run one. Here's what we've confirmed is real, verified against each venue's own current pricing.</p>
<h2>Creekside Pub &amp; Grill (Lakeshore Road)</h2>
<p>Creekside runs the most consistent happy hour rotation we've tracked in Kelowna -- a different special most days of the week, from $5 domestic bottles and $5.50 craft sleeves to discounted wings, fish and chips and burgers, plus a Sunday appy menu. If you only bookmark one happy hour page this year, make it theirs; it changes often enough that checking day-of actually matters.</p>
<h2>BNA Brewing Co. &amp; Eatery (Ellis St)</h2>
<p>BNA's "Super Save Hour" runs $5 beers and $10 small plates, and the daily happy hour menu adds $9.99 cocktails and $6.99 wine -- a genuinely full happy hour menu, not just a beer discount. They also run a Friday "Late Nite Power Hour" with $4.99 highballs.</p>
<h2>Kelly O'Bryan's &amp; Carlos O'Bryan's (Bernard Ave)</h2>
<p>Their "Power Hour" gets you single highballs and shots for $3.50 and domestic draft sleeves for $4 -- among the lowest confirmed prices on this list -- on top of a rotating weekly food-and-drink lineup. Check their venue page for the day and time.</p>
<h2>Gulfstream (Airport Way)</h2>
<p>Run by the Four Points by Sheraton, Gulfstream's happy hour includes $5 house-liquor highballs, $13 chili chicken, and $15 margherita pizza -- solid food options if you actually want to eat, not just drink.</p>
<h2>Earls, Moxies, JOEY, Cactus Club</h2>
<p>Yes, the chains run happy hour too -- most following the familiar cheap-drinks, discounted-apps formula in the mid-afternoon or early evening, and often again late at night. Hours differ by chain and location (Earls, for example, runs 3-6pm), so check the individual venue pages for exact times and items, since chain menus rotate seasonally.</p>
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
      "Every confirmed wing night special in Kelowna, with actual prices -- from 75 cent wings to $12 wing-and-fries deals.",
    publishedAt: "2026-07-03",
    updatedAt: "2026-10-31",
    excerpt:
      "We pulled every wing special we've verified across Kelowna and sorted them by day. Some of these prices are genuinely surprising.",
    contentHtml: `
<p>Wing night is the one special almost every pub in Kelowna runs -- and the one where prices vary the most wildly. We've confirmed the following directly against each venue. Sorted by day.</p>
<h2>Sunday</h2>
<p><strong>Tonics Pub</strong> (Sutherland Ave) -- $10 per pound of wings, Sundays and Wednesdays.</p>
<p><strong>WINGS Rutland</strong> -- $12 wings and fries, Monday through Saturday. One flavour per order, dine-in only, beverage purchase required.</p>
<h2>Monday</h2>
<p><strong>Montana's BBQ &amp; Bar</strong> (Banks Rd) -- half-price wings with a beverage purchase.<br>
<strong>Turtle Jack's</strong> (West Kelowna) -- Monday wings and beer for $13.99.</p>
<h2>Wednesday -- the busiest wing night in town</h2>
<p><strong>Whiski-Jack's Pub</strong> (Drought Rd, West Kelowna) -- 75 cent wings, the lowest per-wing price we've confirmed in the Central Okanagan.<br>
<strong>McCulloch Station Pub</strong> (KLO Rd) -- Super Wing Wednesday, $15.<br>
<strong>WINGS Rutland</strong> -- $12 wings special.<br>
<strong>Tonics Pub</strong> (Sutherland Ave) -- $10 per pound (same deal as Sunday).<br>
<strong>Creekside Pub &amp; Grill</strong> -- $5 off a pound of wings.</p>
<h2>Tuesday</h2>
<p><strong>Boomers Bar &amp; Grill</strong> (Gordon Dr) -- wings by the pound at $5.</p>
<h2>The pattern worth noticing</h2>
<p>Wednesday is, by a wide margin, Kelowna's real wing night -- five of the ten wing specials we've verified land on a Wednesday. If you're planning around price alone, Whiski-Jack's 75 cent wings on Wednesday is the cheapest confirmed per-wing deal; if you want volume, Tonics' $10/lb or Turtle Jack's $13.99 wings and beer go further per dollar for a group.</p>
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
    updatedAt: "2026-10-31",
    excerpt:
      "We filtered every verified special on this site down to $10 or less. Here's what held up and what's actually worth the trip.",
    contentHtml: `
<p>"Budget dining guide" posts are usually just restaurant names with no prices attached, because nobody actually checked. We did the opposite: we filtered our full database down to specials confirmed at $10 or under, and kept only the ones we can point to a real source for.</p>
<h2>Under $5</h2>
<p><strong>Whiski-Jack's Pub</strong> (West Kelowna) -- 75 cent wings, Wednesdays.<br>
<strong>Erica Jane</strong> -- $2 oysters, Thursdays, alongside sociable plates and rotating live music.<br>
<strong>Kelly O'Bryan's</strong> -- $3.50 Power Hour singles and shots.<br>
<strong>The Canadian Brewhouse</strong> (Pandosy St) -- $3.99 birria, beef or chicken tacos.<br>
<strong>Friends Pub</strong> (West Kelowna) -- $4.25 pilsner.</p>
<h2>$5-$10</h2>
<p>This is where most of Kelowna's happy hour drink specials cluster: $5 house highballs at Gulfstream; $5 Longboard lager or Sunset Soda at Cactus Club (both locations); $5 beers during BNA Brewing's Super Save Hour; $5 domestic bottles at Creekside across multiple weekday specials; $4.99 highballs at BNA's Friday late-night hour; and $4.99 bar drinks at Montana's on Monday.</p>
<p>On the food side: Boomers' $5/lb wings, Leopold's Tavern's $5 late-night menu, and Montana's Tuesday $5 tacos (with a beverage purchase) all confirmed under the $10 line.</p>
<h2>What this list doesn't include</h2>
<p>Notably absent: anything we found mentioned online but couldn't confirm against a real source. Several venues are reported by patrons to run drink or food specials in this price range, but we couldn't verify the exact number, so they're not on this list. Whiski-Jack's also runs $5 drink specials and Friends Pub has $10 wings, if you'd like to look beyond the under-$5 list. If you've got a photo of a board we're missing, <a href="/submit">send it our way</a> and we'll add it properly.</p>
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
    updatedAt: "2026-10-31",
    excerpt:
      "We track specials across four Okanagan communities, but the coverage isn't even yet -- and pretending otherwise would go against the whole point of this site.",
    contentHtml: `
<p>Most local guides act like a region is one uniform blob. It isn't, and pretending otherwise defeats the purpose of a site built around accuracy. So here's an honest breakdown of where our coverage actually stands across the four communities we track.</p>
<h2>Kelowna proper: the deep end</h2>
<p>The bulk of what's on this site -- dozens of venues and well over a hundred verified specials -- is in Kelowna itself, concentrated around Bernard Avenue, Harvey Avenue, and the downtown waterfront strip on Water Street. If you're looking for the widest selection on a given night, this is where it is, simply because it's where the density of pubs and restaurants is highest.</p>
<h2>West Kelowna: thinner, but real</h2>
<p>We track venues like Turtle Jack's, Sammy J's, Friends Pub, and 19 Okanagan Grill + Bar out here, but confirmed specials are sparser than across the bridge -- partly because fewer of these venues publish specials on their own websites in a way we can verify, and partly because we simply haven't gotten as many visitor submissions from this side yet.</p>
<h2>Peachland: mostly untapped</h2>
<p>Peachland has real venues on our books -- Jac's On The Beach, Edgewater Inn, Gasthaus on the Lake -- but verified special data here is thin. Gasthaus on the Lake is the one place here where we can point to a solid set of confirmed specials right now.</p>
<h2>Lake Country / Winfield: the frontier</h2>
<p>The smallest slice of what we track. Turtle Bay Pub and Woody's Pub are on the list, but we don't have confirmed specials for either one yet.</p>
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
    updatedAt: "2026-10-31",
    excerpt:
      "Wednesday is the trivia night, Tuesday the karaoke night. Here's every trivia and karaoke night we've confirmed in Kelowna, sorted by day.",
    contentHtml: `
<p>Searching "trivia night Kelowna" or "karaoke Kelowna" mostly turns up venue-discovery pages that don't tell you which night anything actually runs. We pulled every trivia and karaoke night we've verified against each venue directly, sorted by day of the week.</p>
<h2>Trivia nights</h2>
<p><strong>Monday</strong> -- The Office Brewery, 6:30pm.</p>
<p><strong>Wednesday -- the busiest trivia night in town</strong><br>
97 Street Pub, 7pm.<br>
Cutwater Brewing's "Epic Trivia Night," 7pm.<br>
Original Joe's Kelowna, 7pm.</p>
<p><strong>Thursday</strong> -- The Canadian Brewhouse Kelowna, 9pm.</p>
<p><strong>Friday</strong> -- Creekside Pub &amp; Grill's "Friday Night Trivia," 8pm.</p>
<h2>Karaoke nights</h2>
<p><strong>Monday</strong> -- O'Flannigan's "Karaoke Madness," 8:30pm.</p>
<p><strong>Tuesday</strong><br>
Kelly O'Bryan's &amp; Carlos O'Bryan's, 8pm.<br>
Edgewater Inn Bar &amp; Grill, 7pm.</p>
<p><strong>Wednesday</strong><br>
Dakoda's Sports Bar &amp; Grill's "Wings and Karaoke Night" -- an all-day deal running 11am to 11pm, not a set evening start time; Dakoda's own site frames it as wings-and-karaoke for the whole Wednesday, 18 flavors included.</p>
<p><strong>Thursday</strong> -- King Taps Kelowna Lakeside, "Thursday Karaoke with Walter Wilcox," 8pm.</p>
<p><strong>Saturday</strong> -- Creekside Pub &amp; Grill, 8:30pm.</p>
<h2>The pattern worth noticing</h2>
<p>Wednesday is the night for trivia -- three confirmed trivia nights in the same city, the same evening, so if you want options without a long drive, that's the night to build around. Tuesday is the karaoke night with the most choice, with Kelly O'Bryan's &amp; Carlos O'Bryan's and Edgewater Inn both running one.</p>
<p>This is a snapshot of a database that changes as venues update their own listings. See the live, always-current <a href="/kelowna/events/trivia">trivia night page</a> and <a href="/kelowna/events/karaoke">karaoke page</a> -- both filterable by day, both re-checked against each venue's own source.</p>
`,
  },
  {
    slug: "happy-hours-kelowna-2026",
    category: "Guide",
    regions: ["kelowna"],
    title: "Kelowna Happy Hours 2026: Every Confirmed Spot",
    metaDescription:
      "Kelowna happy hours 2026: 22 confirmed spots with real prices, from $3.50 highballs and draft beer. Checked October 31, 2026, by neighbourhood.",
    publishedAt: "2026-10-29",
    updatedAt: "2026-10-31",
    excerpt:
      "The lowest confirmed Kelowna happy hour drink price on October 31, 2026 is $3.50, and 14 venues run a second window after 8 PM.",
    contentHtml: `
<p>Quick answer: most Kelowna happy hours run 2 to 5&nbsp;PM or 3 to 6&nbsp;PM, and 14 venues in our data add a second window after 8&nbsp;PM. Confirmed prices start at $3.50 for a highball or a draft beer. The North End brewery district and downtown (Water Street and Bernard Avenue) hold the most spots. This guide covers 22 venues TodaysTab re-checked in the last 45 days.</p>
<p>Last verified October 31, 2026. We re-check every special on this list monthly.</p>

<table>
<thead>
<tr><th>Venue</th><th>Deal</th><th>Days and times</th><th>Price</th><th>Neighbourhood</th></tr>
</thead>
<tbody>
<tr><td><a href="/kelowna/venues/22">Kelly O'Bryan's &amp; Carlos O'Bryan's</a></td><td>Power Hour single highballs and select shots</td><td>Tue and Sun, 8 to 9&nbsp;PM</td><td>$3.50</td><td>Downtown (Bernard Ave)</td></tr>
<tr><td><a href="/kelowna/venues/280">Packing House Pub</a></td><td>12&nbsp;oz draft beer and shots</td><td>Daily, 9&nbsp;PM to close</td><td>$3.50</td><td>Rutland</td></tr>
<tr><td><a href="/kelowna/venues/132">Original Joe's Kelowna</a></td><td>Blonde lager, house wine, well highballs</td><td>Daily, 4 to 5&nbsp;PM and 8 to 9&nbsp;PM</td><td>From $3.75</td><td>Pandosy</td></tr>
<tr><td><a href="/kelowna/venues/150">Pretty Not Bad</a></td><td>House wine, house beer, single highball</td><td>Daily, 4 to 5&nbsp;PM</td><td>About $3.88</td><td>North End</td></tr>
<tr><td><a href="/kelowna/venues/135">The Canadian Brewhouse</a></td><td>315&nbsp;ml Bud Light stein, appetizers</td><td>Mon to Sat, 2 to 6&nbsp;PM and from 9&nbsp;PM</td><td>$3.99</td><td>Pandosy</td></tr>
<tr><td><a href="/kelowna/venues/31">BNA Brewing Co. &amp; Eatery</a></td><td>BNA Lite and XPA</td><td>Daily, 4 to 6&nbsp;PM</td><td>$5.49</td><td>North End</td></tr>
<tr><td><a href="/kelowna/venues/155">The Office Brewery</a></td><td>16&nbsp;oz draught beer</td><td>Mon to Fri, 2 to 5&nbsp;PM</td><td>$5.00</td><td>North End</td></tr>
<tr><td><a href="/kelowna/venues/17">Freddy's Brewpub</a></td><td>14&nbsp;oz No Pants Pilsner</td><td>Sun and Tue to Sat, 3 to 6&nbsp;PM</td><td>$5.00</td><td>Rutland</td></tr>
<tr><td><a href="/kelowna/venues/158">Rustic Reel Brewing Company</a></td><td>5&nbsp;oz house wine, single highball</td><td>Sun and Wed to Sat, 3 to 5&nbsp;PM</td><td>$5.00</td><td>North End</td></tr>
<tr><td><a href="/kelowna/venues/3">Earls Kelowna</a></td><td>Oysters on the half shell</td><td>Daily, 3 to 6&nbsp;PM</td><td>$3.50</td><td>Downtown (Bernard Ave)</td></tr>
</tbody>
</table>

<p>Kelowna became Canada's first UNESCO Creative City of Gastronomy in 2025, according to <a href="https://www.tourismkelowna.com/explore/city-of-gastronomy/">Tourism Kelowna</a> and the <a href="https://www.kelowna.ca/node/571888">City of Kelowna</a>. According to TodaysTab's checks on October 31, 2026, 76 of the 119 active venues in our Kelowna database have at least one special with a stated day or time window, confidence of 0.7 or higher, and a verification date within 45 days. Of those, 59 run a happy hour. Of the 50 with a stated afternoon window, 17 use 2 to 5&nbsp;PM as their main window and 11 use 3 to 6&nbsp;PM. As of October 31, 2026, 14 venues in our data run a happy hour that starts at 8&nbsp;PM or later, and the lowest confirmed drink price is $3.50, at Packing House Pub daily and Kelly O'Bryan's on Tuesdays and Sundays.</p>

<h2>North End brewery district</h2>
<p>Ellis Street, Clement Avenue and Vaughan Avenue north of downtown form the city's densest cluster of breweries and brewpubs, all within a few blocks of each other.</p>
<p><strong><a href="/kelowna/venues/31">BNA Brewing Co. &amp; Eatery (1250 Ellis St)</a></strong> runs the longest daily menu on this list. From 4 to 6&nbsp;PM every day: $5.49 BNA Lite and XPA, $5.99 other BNA beer, $6.99 for a 5&nbsp;oz glass of wine, $9.99 for an Old Fashioned, Negroni or Moscow Mule, $13 buffalo wings and $6 bang bang shrimp tacos. A Super Save Hour from 5 to 6&nbsp;PM adds $5 beers and $10 small plates. On Fridays from 9&nbsp;PM, single highballs and rotating shots are $4.99 and double highballs are $8.99.</p>
<p><strong><a href="/kelowna/venues/150">Pretty Not Bad (740 Clement Ave)</a></strong> keeps a one-hour window, 4 to 5&nbsp;PM daily, with a flat price on a 5&nbsp;oz house red or white, a 12&nbsp;oz house lager, hazy or sour, and a 1&nbsp;oz single highball: about $3.88 as recorded on October 27, 2026, though the restaurant's OpenTable page has listed $3.33, so confirm before you go. A $12 smash burger is on the same hour.</p>
<p><strong><a href="/kelowna/venues/155">The Office Brewery (890 Clement Ave)</a></strong> runs 2 to 5&nbsp;PM Monday to Friday: $5 for a 16&nbsp;oz draught beer, $7 for a 20&nbsp;oz, $7 for a 6&nbsp;oz glass of rotating VQA wine and $10 for a Spicy Pineapple Margarita. Mondays and Tuesdays also have half-price bottles of wine, with no time window stated.</p>
<p><strong><a href="/kelowna/venues/158">Rustic Reel Brewing Company (760 Vaughan Ave)</a></strong> is a taproom with a 3 to 5&nbsp;PM happy hour on Sunday and Wednesday to Saturday. A 16&nbsp;oz craft beer is $7, a 5&nbsp;oz house wine and a 1&nbsp;oz single highball are $5 each, a pitcher is $15 and a basket of potatoes, cauliflower or chips is $4.</p>

<h2>Downtown: Water Street, Bernard Avenue and the waterfront</h2>
<p>The walkable core between Okanagan Lake and Bernard Avenue has the most variety, from chain restaurants to late-night taverns.</p>
<p><strong><a href="/kelowna/venues/338">Kelowna Beer Institute (1346 Water St)</a></strong> takes $2 off cocktails, craft beer and glasses of wine from 3 to 6&nbsp;PM Monday to Friday. Cask Thursday pours a 16&nbsp;oz cask beer for $6 from 4 to 9&nbsp;PM. Sundays and Mondays have a $20 pitcher of beer and half-price bottles of wine, with no time window stated.</p>
<p><strong><a href="/kelowna/venues/26">OAK + CRU Social Kitchen &amp; Wine Bar (1310 Water St)</a></strong> runs 3 to 5&nbsp;PM daily: $12 for an Aperol spritz, Old Fashioned, margarita or Negroni, $9 for a 5&nbsp;oz barrel-to-tap wine and $1 off every beer tap.</p>
<p><strong><a href="/kelowna/venues/139">Match Eatery &amp; Public House (1300 Water St)</a></strong> runs 3 to 5:30&nbsp;PM daily with $2 off a 16&nbsp;oz craft beer, $1 off well highballs and a $6.95 car hop slider. Wednesday is half-price wine in any size, excluding bubbles.</p>
<p><strong><a href="/kelowna/venues/37">Skinny Duke's Glorious Emporium (1481 Water St)</a></strong> has a 5 to 6&nbsp;PM window daily: $5.99 for Coors Original on tap or a Miller High Life, $9.99 for an Aperol Spritz, Old Fashioned, Negroni or Moscow Mule, and $7.99 for a 5&nbsp;oz Hester Creek Pinot Gris.</p>
<p><strong><a href="/kelowna/venues/3">Earls Kelowna (211 Bernard Ave)</a></strong> runs 3 to 6&nbsp;PM daily. Oysters on the half shell are $3.50 on the happy hour menu according to TodaysTab's October 27 check, so confirm the unit with the restaurant. Fries are $5, and Rascal wine, sangria and the nitro espresso martini are half price.</p>
<p><strong><a href="/kelowna/venues/22">Kelly O'Bryan's &amp; Carlos O'Bryan's (262 Bernard Ave)</a></strong> has a daily 2 to 5&nbsp;PM window and a Power Hour on Tuesdays and Sundays. From 2 to 5&nbsp;PM: $6.25 single highballs and 16&nbsp;oz domestic draft, $7.75 for a 9&nbsp;oz house wine, $8.75 for a 20&nbsp;oz Irish pint and $9.25 for double highballs. On Tuesdays and Sundays, from 8 to 9&nbsp;PM, the Power Hour drops single highballs and select shots to $3.50 and domestic sleeves to $4 (per our October 27 check; the pub's site also lists a late-night happy hour from 9&nbsp;PM to close daily).</p>
<p><strong><a href="/kelowna/venues/35">Leopold's Tavern (279 Bernard Ave)</a></strong> owns the latest window on the list. According to TodaysTab's October 27 check, from 11&nbsp;PM daily, a 20&nbsp;oz pint of Leo's Lager and a Leo's Island Iced Tea are $5 each, and a Smash Burger Jr. is $5.</p>
<p><strong><a href="/kelowna/venues/433">Room 272 (Bernard Ave, no street number listed)</a></strong> runs happy hour all day on Sundays, and its site lists happy hour Thursday to Monday. On Mondays, 3 to 5&nbsp;PM brings a $10 Aperol Spritz, Old Fashioned or classic margarita, $15 fish and chips and $5 mixed fries, and a second window runs 10 to 11&nbsp;PM.</p>
<p><strong><a href="/kelowna/venues/33">Erica Jane (1187 Sunset Dr)</a></strong> lists a 2 to 5&nbsp;PM happy hour every day, plus 9 to 11&nbsp;PM Monday to Wednesday and 11&nbsp;AM to 11&nbsp;PM on Mondays. Thursday from 6 to 9&nbsp;PM, oysters are $2. These times are from TodaysTab's October check, and we have no confirmed prices for its regular happy hour.</p>

<h2>Pandosy, Lakeshore and the Lower Mission</h2>
<p>South of downtown, Pandosy Street and Lakeshore Road lead toward the Mission, with a mix of neighbourhood restaurants and lake-side pubs.</p>
<p><strong><a href="/kelowna/venues/135">The Canadian Brewhouse (3030 Pandosy St)</a></strong> runs Monday to Saturday, 2 to 6&nbsp;PM and again from 9&nbsp;PM. A 315&nbsp;ml Bud Light stein is $3.99, highballs and Fireball are $4.99, a 6&nbsp;oz house wine is $5.99 and an espresso martini is $9.99. Tuesday tacos are $3.99 each.</p>
<p><strong><a href="/kelowna/venues/132">Original Joe's Kelowna (2728 Pandosy St)</a></strong> runs a Power Hour twice daily, 4 to 5&nbsp;PM and 8 to 9&nbsp;PM, with blonde lager, house wine and well highballs from $3.75. Tuesday adds half-price wings after 2&nbsp;PM.</p>
<p><strong><a href="/kelowna/venues/19">Hotel Eldorado Kelowna (500 Cook Rd, on the lake south of KLO Rd)</a></strong> lists a 3 to 5&nbsp;PM daily happy hour in TodaysTab's October checks, and the hotel's own site links a happy hour menu, so confirm before you go. In that check, a 12&nbsp;oz Miller High Life is $6, White Claw is $5, Heirloom red or white wine is $6, a Le Cinq Sink Rose is $9 and a sangria pitcher is $25.</p>
<p><strong><a href="/kelowna/venues/36">Creekside Pub &amp; Grill (3929 Lakeshore Rd)</a></strong> rotates a different deal each day, with no times stated. Sunday has $9.50 double Caesars and $6 house wine. Monday and Tuesday have $5 domestic bottles and $5.50 craft sleeves. Wednesday has $5 bottles and $5 off a pound of wings. Saturday has $5 off bottles of wine and double Long Islands for about $9.</p>

<h2>Rutland</h2>
<p>Inland and east of Highway 97, these pubs serve a neighbourhood that rarely appears on downtown lists.</p>
<p><strong><a href="/kelowna/venues/17">Freddy's Brewpub (948 McCurdy Rd)</a></strong> lists a 3 to 6&nbsp;PM happy hour Sunday and Tuesday to Saturday in TodaysTab's October checks (its own website does not show one, so call ahead): $5 for a 14&nbsp;oz No Pants Pilsner, $6 for a 5&nbsp;oz house wine, $5.50 for a 1&nbsp;oz highball, $7.50 for a Caesar and $8 for a single smashburger. Wings are $10 on Sundays and Thursdays after 3&nbsp;PM.</p>
<p><strong><a href="/kelowna/venues/280">Packing House Pub (663 Finns Rd)</a></strong> has a late-night happy hour from 9&nbsp;PM to close every day: $3.50 for a 12&nbsp;oz draft beer, $3.50 for lemon drop and Burt Reynolds shots, $1 off house wine and 25% off snacks and shares. Wednesdays bring half-price wings from 4&nbsp;PM.</p>

<h2>West Kelowna</h2>
<p>Across the William R. Bennett Bridge, the Highway 97 and Main Street corridors hold several pubs with steady afternoon windows.</p>
<p><strong><a href="/kelowna/venues/82">Whiski-Jack's Pins &amp; Pints (525 BC-97 #620)</a></strong> lists a 2 to 5&nbsp;PM daily happy hour in TodaysTab's October check (the venue's site says only that drinks are on special every day): $1 off 16&nbsp;oz draft, $2 off double highballs, a $5 flat top beef taco, a $9 hot honey pizza and $7 garlic parm fries.</p>
<p><strong><a href="/kelowna/venues/40">Sammy J's Grill &amp; Bar (190-525 Hwy 97)</a></strong> lists a 3 to 6&nbsp;PM daily happy hour in TodaysTab's October check, with a 14&nbsp;oz Sammy's Lager for $5 and an 18&nbsp;oz pint for $6. Wednesdays take $5 off wings.</p>
<p><strong><a href="/kelowna/venues/222">WINGS West Kelowna (#1-2484 Main St)</a></strong> lists Happiest Hours from 2 to 6&nbsp;PM Monday to Saturday in TodaysTab's October 27 check, so call to confirm: a $9 Mule, $12 wings and fries and $7 country-style perogies. Sundays have a $12 wings special.</p>

<h2>What's not on this list</h2>
<p>Competitor guides name several places we cannot confirm. Table Nineteen and Shore Line Brewing appear on other lists but are not in our database, so we have no verified data on them. Red Bird Brewing is in our database with no confirmed special. Baxter's Bar &amp; Grill, The Landing Kitchen + Bar and Wildling are tracked, but their specials were last verified more than 45 days ago, so we left them out. Social 242 Lounge and Grill and Mickie's Pub have closed permanently, and some older guides still list them.</p>

<h2>Frequently asked questions</h2>
<h3>What time is happy hour in Kelowna?</h3>
<p>Most Kelowna happy hours run 2 to 5&nbsp;PM or 3 to 6&nbsp;PM. According to TodaysTab's checks on October 31, 2026, 2 to 5&nbsp;PM is the most common main window, used by 17 of the 50 venues with a stated afternoon window. Fourteen venues also run a second window starting at 8&nbsp;PM or later.</p>
<h3>Where is the cheapest happy hour in Kelowna?</h3>
<p>The lowest confirmed drink price is $3.50. Kelly O'Bryan's at 262 Bernard Ave charges it for single highballs and select shots from 8 to 9&nbsp;PM on Tuesdays and Sundays, and Packing House Pub at 663 Finns Rd charges it for a 12&nbsp;oz draft beer from 9&nbsp;PM to close. Original Joe's follows at $3.75 from 4 to 5&nbsp;PM.</p>
<h3>Which Kelowna bars have a late-night happy hour?</h3>
<p>Fourteen venues start a happy hour at 8&nbsp;PM or later, including BNA Brewing on Fridays from 9&nbsp;PM, The Canadian Brewhouse from 9&nbsp;PM Monday to Saturday, Packing House Pub from 9&nbsp;PM daily and Leopold's Tavern from 11&nbsp;PM daily, where a pint of Leo's Lager is $5.</p>
<h3>Is there a happy hour in Kelowna on Sundays?</h3>
<p>Yes. On Sundays, BNA Brewing runs 4 to 6&nbsp;PM, Hotel Eldorado runs 3 to 5&nbsp;PM, Rustic Reel runs 3 to 5&nbsp;PM, Freddy's Brewpub runs 3 to 6&nbsp;PM, Erica Jane runs 2 to 5&nbsp;PM, and Room 272 runs happy hour all day. Creekside Pub has $9.50 double Caesars on Sundays.</p>
<h3>Which Kelowna happy hour has the best food deals?</h3>
<p>Earls Kelowna at 211 Bernard Ave lists oysters on the half shell at $3.50 from 3 to 6&nbsp;PM daily in TodaysTab's October 27 check. BNA Brewing has $6 bang bang shrimp tacos and $9 truffle fries from 4 to 6&nbsp;PM daily, and Whiski-Jack's Pins &amp; Pints has a $5 beef taco from 2 to 5&nbsp;PM.</p>
<h3>How do I know these Kelowna happy hour deals are current?</h3>
<p>Every special on this list has a confidence score of 0.7 or higher and was re-verified within the 45 days before October 31, 2026. We recheck monthly, drop closed venues, and list only prices we have confirmed. The live Kelowna page always shows today's deals, so use it for same-day plans.</p>

<h2>Plan your night with TodaysTab</h2>
<p>This post is a snapshot from October 31, 2026. The live <a href="/kelowna">Kelowna deals page</a> is always current. See what is on tonight with the <a href="/kelowna/friday">Friday</a>, <a href="/kelowna/thursday">Thursday</a> and <a href="/kelowna/sunday">Sunday</a> pages. Run a venue that is missing or out of date? <a href="/kelowna/submit">Submit a special</a>. Read how we check each deal in <a href="/kelowna/blog/how-we-verify-every-special">how we verify every special</a>, or browse the <a href="/kelowna/blog">Kelowna blog</a>, including our guides to <a href="/kelowna/blog/best-wing-nights-kelowna">wing nights</a>, <a href="/kelowna/blog/cheap-eats-kelowna-under-10">cheap eats under $10</a> and <a href="/kelowna/blog/trivia-karaoke-nights-kelowna">trivia and karaoke nights</a>.</p>
`,
  },
  {
    slug: "happy-hours-penticton-2026",
    category: "Guide",
    regions: ["penticton"],
    title: "Penticton Happy Hours 2026: 21 Spots With Deals",
    metaDescription:
      "21 Penticton spots with happy hour deals in our October 2026 checks, from $5 beers at Highway 97 Brewery to $2 oysters at Orolo. Call ahead to confirm.",
    publishedAt: "2026-10-29",
    updatedAt: "2026-10-31",
    excerpt:
      "Penticton has 21 spots with happy hour deals in our October 2026 checks, and the most common window is 2 to 5 PM with $5 beer at three of them.",
    contentHtml: `
<p>Quick answer: Penticton happy hour most often runs 2 to 5&nbsp;PM, and this list covers 21 venues with a special in our October checks. Beer starts at $5 (Highway 97 Brewery, Yellow Dog Brewing, Local Public Eatery) and a single highball at The Black Antler is $4. Downtown, around Martin Street, has the most spots.</p>
<p>Last verified October 31, 2026. Where a venue's own site and our records differ, or a venue publishes no times or prices, we say so, and you should call ahead. We re-check the list monthly.</p>

<h2>Penticton happy hours at a glance</h2>
<table>
<thead><tr><th>Venue</th><th>Deal</th><th>Days and times</th><th>Price</th><th>Neighbourhood</th></tr></thead>
<tbody>
<tr><td><a href="/penticton/venues/235">Highway 97 Brewery</a></td><td>Sleeves</td><td>Mon-Fri, 2 to 5&nbsp;PM</td><td>$5</td><td>Downtown</td></tr>
<tr><td><a href="/penticton/venues/228">Yellow Dog Brewing</a></td><td>El Perro pints</td><td>Daily, 2 to 5&nbsp;PM</td><td>$5</td><td>Downtown</td></tr>
<tr><td><a href="/penticton/venues/223">The Black Antler</a></td><td>Single highball</td><td>Mon-Fri, 2 to 5&nbsp;PM</td><td>$4</td><td>Downtown</td></tr>
<tr><td><a href="/penticton/venues/234">Orolo Restaurant at Time Winery</a></td><td>Oysters</td><td>Daily, 4 to 5&nbsp;PM</td><td>$2 each</td><td>Downtown</td></tr>
<tr><td><a href="/penticton/venues/227">Local Public Eatery</a></td><td>House lager (0.35&nbsp;L)</td><td>Daily, 2 to 5&nbsp;PM; also from 8 or 9&nbsp;PM</td><td>$5</td><td>West of downtown</td></tr>
<tr><td><a href="/penticton/venues/231">Palmer Kitchen + Spirits</a></td><td>Local craft beer, vodka Caesar</td><td>Daily, 4:30 to 7:30&nbsp;PM (unconfirmed)</td><td>$6.50</td><td>West of downtown</td></tr>
<tr><td><a href="/penticton/venues/232">BNA Brewing</a></td><td>Super Save Happy Hour beer</td><td>Daily, 4 to 6&nbsp;PM</td><td>$5.49</td><td>Downtown</td></tr>
<tr><td><a href="/penticton/venues/236">Salty's Beach House</a></td><td>Well highballs</td><td>Daily, 2 to 5&nbsp;PM</td><td>$6</td><td>Lakeshore</td></tr>
<tr><td><a href="/penticton/venues/314">Barley Mill Brew Pub &amp; Bistro</a></td><td>Double highballs</td><td>Tuesday</td><td>$9</td><td>Skaha Lake</td></tr>
</tbody>
</table>

<p>Penticton sits between Okanagan Lake and Skaha Lake, and Statistics Canada's 2021 Census counted <a href="https://www.penticton.ca/node/33998">36,885 residents, up 9.3 per cent in five years</a>, according to the City of Penticton. According to TodaysTab's checks on October 31, 2026, we track 56 active venues in the Penticton region and 30 of them have a current special that meets our rules (confidence of 0.7 or higher, re-checked within 45 days, with a stated day or time). Of the 12 venues in the city with a stated happy hour window, 5 run 2 to 5&nbsp;PM, the most common window (Kin &amp; Folk is left out of that count because its own website and our records disagree). The lowest confirmed drink price is $4, at Local Public Eatery (a cold tea shot) and at The Black Antler (a single highball and a Sunday mimosa or Caesar). In our records only Local Public Eatery has a window that starts at 8&nbsp;PM or later; Kin &amp; Folk and Sociale on Lakeshore list late windows on their own websites.</p>

<h2>Downtown: Martin Street, Winnipeg Street and Main Street</h2>
<p>Downtown is the walkable core, with most bars within a few blocks of Martin Street and Winnipeg Street.</p>
<p><strong><a href="/penticton/venues/232">BNA Brewing (218 Martin St)</a></strong> runs its Super Save Happy Hour daily from 4 to 6&nbsp;PM, according to BNA's menu as of October 30 (BNA opens at 4&nbsp;PM, so this is its first two hours): BNA beer at $5.49, other BNA beer at $5.99, white wine at $6.99, and Moscow Mules and Silly Sodas at $9.99. Mocktails are $5.99. Bowling lanes reserve from 5&nbsp;PM; call ahead to ask about bowling deals.</p>
<p><strong><a href="/penticton/venues/234">Orolo Restaurant at Time Winery (361 Martin St)</a></strong> has a one-hour happy hour daily from 4 to 5&nbsp;PM, according to its happy hour menu as of October 30. Oysters are $2 each, local draft is $6, wine is $9 (including the Evolve Chardonnay) and the Chronos Merlot is $13. Food includes tallow fries at $8, a burger at $18 and steak bites at $23. Tuesday is Steak Date Night and Thursday is Bone-in Steak, both wine-with-dinner deals rather than part of the happy hour. Orolo is closed Thursday, November 26 for a private event.</p>
<p><strong><a href="/penticton/venues/233">The Hub on Martin (260 Martin St)</a></strong> rotates deals by day, according to TodaysTab's October 28 check (its website does not list them, so call 250-490-0304 to confirm). Sunday: Molson Canadian or Coors Light at $6. Monday: a double Paralyzer at $9. Tuesday: jugs at $18 and sleeves at $6. Wednesday: pilsner jugs at $18, double highballs at $8 and wing night at $6.95. Thursday to Saturday: Long Islands at $9.</p>
<p><strong><a href="/penticton/venues/238">The Pasta Factory (236 Martin St)</a></strong> is open Tuesday to Saturday, 3 to 9&nbsp;PM, and closed Sunday and Monday. Our records show a 3 to 5&nbsp;PM happy hour with draft pints at $7, sangria jugs at $15 and a 6&nbsp;oz NY steak sandwich at $15, so call 250-492-6088 to confirm. Wednesday (4 to 8&nbsp;PM) adds an 8&nbsp;oz flatiron steak dinner at $25.</p>
<p><strong><a href="/penticton/venues/223">The Black Antler (215 Winnipeg St)</a></strong> has the most unusual offer in town: free wings (one pound per person, while supplies last) with any regular-priced drink over $9, Monday to Friday, 2 to 5&nbsp;PM, dine in only. In our records the same window has house red or white at $6, a single highball at $4, a martini at $7, a Buck N' Beer at $16 and a 20&nbsp;oz Antler Lager, amber or sour at $6. Thursday is $2 off cocktails, and Sunday mimosas and Caesars are $4.</p>
<p><strong><a href="/penticton/venues/354">The Forest (#104-215 Winnipeg St)</a></strong> calls its happy hour Enchanted Hour: Thursdays and Fridays, 4 to 6&nbsp;PM, a free Forest Margherita flatbread with any drink purchase of $9 or more. Hours vary by day, so call ahead to confirm.</p>
<p><strong><a href="/penticton/venues/320">Pizzeria Tratto (256 Westminster Ave)</a></strong> opens for dinner at 5&nbsp;PM. On Mondays and Tuesdays, Bottleshock gives you a free pizza when you buy a bottle of wine. On Wednesdays, Full Sleeve Wednesday is a 2-for-1 on beers with any pizza.</p>
<p><strong><a href="/penticton/venues/224">Kin &amp; Folk (557 Main St)</a></strong> runs happy hour daily from 3 to 5&nbsp;PM and again from 9&nbsp;PM to close, according to its website; call 778-531-6170 to confirm. Prices in our records: Low Life at $5, Folk Lager at $6, Dan Dan fries at $12 and beef potstickers at $16. Wednesdays are half-price wine bottles.</p>
<p><strong><a href="/penticton/venues/235">Highway 97 Brewery (200 Ellis St)</a></strong> pours $5 sleeves Monday to Friday from 2 to 5&nbsp;PM, according to our October 23 check. Thirsty Thursday has $6 pints from 5&nbsp;PM. Wing Wednesday is wings at $9.97 and pitchers at $19.97, and Friday is a beef dip at $19.97.</p>
<p><strong><a href="/penticton/venues/228">Yellow Dog Brewing (169 Estabrook Ave)</a></strong> is in the heart of downtown. Its website was offline when we checked, so call before you go. In our records, from 2 to 5&nbsp;PM daily: El Perro pints at $5, general pints at $6, cocktails at $7, a pound of wings at $10, hot dogs and fries at $5 each, and a small pizza or the Chase burger and beer at $15.</p>

<h2>Lakeshore: the Okanagan Lake beachfront</h2>
<p>Lakeshore Drive West runs along the north beach, with patios facing the water.</p>
<p><strong><a href="/penticton/venues/236">Salty's Beach House (1000 Lakeshore Dr W)</a></strong> has a 2 to 5&nbsp;PM happy hour, according to our October 30 check (it may be limited to inside seating), with Parallel 49 beer at $8, Neighbourhood Passion Fruit Wheat Ale at $8.50, well highballs at $6 and The Captain's Wife at $12.</p>
<p><strong><a href="/penticton/venues/230">Sociale on Lakeshore (950 Lakeshore Dr W)</a></strong> calls its offer Tappy Hour: tapas and beer-on-tap specials from 3 to 5&nbsp;PM and from 9&nbsp;PM to close, according to its website. The restaurant is closed Mondays, so expect Tappy Hour Tuesday to Sunday. We have no confirmed prices.</p>
<p><strong><a href="/penticton/venues/312">The Barking Parrot (21 Lakeshore Dr W)</a></strong> announced Burger Fridays starting October 23: $2 burgers with any drink of $5 or more, 4:30 to 6:30&nbsp;PM (per the venue's announcement; not shown on its website). It is at the Penticton Lakeside Resort on the downtown waterfront and is open daily from noon to 2&nbsp;AM. Call 250-493-9753 to confirm.</p>

<h2>West of downtown: Eckhardt, Burnaby and Vernon Avenues and Vees Drive</h2>
<p>These bars sit along Eckhardt Avenue West, Burnaby Avenue West, Vernon Avenue and Vees Drive, roughly 1 to 1.5&nbsp;km west and southwest of Martin Street. The Cherry Lane shopping centre at 2111 Main Street is about 3&nbsp;km south.</p>
<p><strong><a href="/penticton/venues/227">Local Public Eatery (1070 Eckhardt Ave W)</a></strong> has the biggest food menu of any happy hour here. From 2 to 5&nbsp;PM daily: house lager (0.35&nbsp;L) at $5, draft at $6, wine $2 off, a cold tea shot at $4, rail highballs at $5.25 and an Old Fashioned at $10. Food: a fish taco at $5, hot wings at $12 and the LOCAL burger with fries at $14. A second window starts at 8&nbsp;PM Sunday to Thursday and 9&nbsp;PM Friday and Saturday (the restaurant's page also shows 10&nbsp;PM for weekends, so call 250-493-3388 to confirm).</p>
<p><strong><a href="/penticton/venues/315">Bar One (939 Burnaby Ave W)</a></strong> has a deal every day, dine in only. Sunday Caesars are $5 all day, Tuesday tacos are $4 each and Coronas are $5.25 from 4&nbsp;PM, and Wednesday takes $1 off 8&nbsp;oz glasses of wine and $5 off bottles. Thursday is 50% off wings with a $6 house draft, according to Bar One's Penticton page. Our records also list $6 house draft on Friday and Saturday, half-price wings on Saturday from 4&nbsp;PM and $7.50 double highballs on Friday, so call to confirm those.</p>
<p><strong><a href="/penticton/venues/231">Palmer Kitchen + Spirits (903 Vernon Ave)</a></strong> in the Four Points by Sheraton lists a happy hour menu on its website; our records show a daily 4:30 to 7:30&nbsp;PM window, which the restaurant has not confirmed: local craft beer and vodka Caesars at $6.50, house red or white at $9.50, crispy calamari at $12.80, fried chicken wings at $14 and truffle parmesan fries at $10.40. The restaurant's website shows a happy hour menu without times, so call 778-476-9202 to confirm.</p>
<p><strong><a href="/penticton/venues/225">Match Eatery &amp; Public House (553 Vees Dr #201)</a></strong> at Cascades Casino lists a 3 to 9&nbsp;PM daily window in our October 15 check, on craft beer, wine, highballs and Free Spirited cocktails (call (778) 476-8555 to confirm), plus a Car Hop slider at $6.95. Monday is fish and chips at $15, and Friday is chicken parmigiana at $19.99. We do not have confirmed drink prices.</p>

<h2>Skaha Lake and South Penticton</h2>
<p><strong><a href="/penticton/venues/314">Barley Mill Brew Pub &amp; Bistro (2460 Skaha Lake Rd)</a></strong> has a different deal almost every day. Monday: a buck off 9&nbsp;oz wine. Tuesday: double highballs at $9. Wednesday: tequila shooters at $5.50 and half-price wings from 3&nbsp;PM. Thursday: $5 off bottles and jugs of Barley Brew beer and $12.99 flatbreads. Friday: $5 off bottles and jugs plus $5.50 shooters. Sunday: $5 off jugs and a buck off Caesars.</p>

<h2>Just outside Penticton</h2>
<p><strong><a href="/penticton/venues/246">Naramata Pub &amp; Grill (985 Robinson Avenue, Naramata)</a></strong> posts its weekly specials on Facebook; our October 29 check found a Thursday family-style pasta night at $18 and a Friday and Saturday 2 Can Dine with a bottle of wine at $85.99. Summer hours were closed Monday and Tuesday, so check before you go.</p>
<p><strong><a href="/penticton/venues/316">Giant's Head Brewing (13224 Victoria Rd N, Summerland)</a></strong> has Wing Wednesday at $8.99 from 4&nbsp;PM, a Thursday burger and beer at $25, and a Senior Sunday menu for guests 55 and older (our records show a 12&nbsp;oz beer at $6).</p>
<p><strong><a href="/penticton/venues/339">Okanagan Falls Hotel Bar &amp; Grill (1045 Main St, Okanagan Falls)</a></strong> has, according to our October 26 check, burger and beer at $24 on Sundays and Thursdays, fish and chips at $13 on Mondays, wing night at $12 from 5&nbsp;PM on Wednesdays.</p>

<h2>What's not on this list</h2>
<p>These venues are in our database or on competitor lists, but we cannot confirm a current happy hour to our standard.</p>
<p>Dragonboat Pub (3895 Lakeside Rd) and Earls Kitchen + Bar (1848 Main St) have specials in our records, but our confidence score for them is 0.5 or lower. Abandoned Rail Brewing (1220 Davenport Ave) scores 0.4 or lower. Patio Burger (796 Lakeshore Dr) says on its website that it is closed for the season and expects to reopen in April 2027. Cannery Brewing (198 Ellis St), The Hooded Merganser (21 Lakeshore Dr W) and Tin Whistle Brewing (1475 Fairview Rd) have no confirmed special on file. Neighbourhood Brewing (187 Westminster Ave W), Boston Pizza (1900 Main St) and White Spot (1770 Main St) each have a single food special and no drink happy hour. If you know what any of them runs, send a photo of the board through <a href="/penticton/submit">our submit page</a>.</p>

<h2>Frequently asked questions</h2>
<h3>What time is happy hour in Penticton?</h3>
<p>Most Penticton happy hours run 2 to 5&nbsp;PM. Of 12 venues with a stated window in TodaysTab's data on October 31, 2026, 5 use it, including Highway 97 Brewery, Local Public Eatery and The Black Antler. Others differ: Orolo is 4 to 5&nbsp;PM, BNA is 4 to 6&nbsp;PM and Match runs 3 to 9&nbsp;PM.</p>
<h3>Where is the cheapest beer in Penticton during happy hour?</h3>
<p>Three Penticton venues pour a $5 beer: Highway 97 Brewery (sleeves, Monday to Friday, 2 to 5&nbsp;PM), Yellow Dog Brewing (El Perro pints, daily, 2 to 5&nbsp;PM) and Local Public Eatery (0.35&nbsp;L house lager, daily, 2 to 5&nbsp;PM). BNA Brewing is next at $5.49 from 4 to 6&nbsp;PM.</p>
<h3>Which Penticton bars have a late-night happy hour?</h3>
<p>In our confirmed data, only Local Public Eatery (1070 Eckhardt Ave W) has a window that starts at 8&nbsp;PM or later: from 8&nbsp;PM Sunday to Thursday and from 9&nbsp;PM Friday and Saturday, with a $5 house lager. Match Eatery runs until 9&nbsp;PM, and Kin &amp; Folk and Sociale list late windows on their own sites.</p>
<h3>Is there a Penticton happy hour on Sundays?</h3>
<p>Yes. Local Public Eatery runs its 2 to 5&nbsp;PM happy hour daily, so Sunday is covered. The Black Antler has $4 mimosas and Caesars, Bar One has $5 Caesars, The Hub on Martin sells Molson Canadian or Coors Light at $6, and Barley Mill takes $5 off jugs of its own beer.</p>
<h3>Where can I get free food with a drink in Penticton?</h3>
<p>The Black Antler gives free wings with any regular-priced drink over $9, Monday to Friday, 2 to 5&nbsp;PM, dine in only. The Forest gives a free Margherita flatbread with a drink of $9 or more on Thursdays and Fridays, 4 to 6&nbsp;PM. Pizzeria Tratto gives a free pizza with a bottle of wine on Mondays and Tuesdays.</p>
<h3>How do I know these Penticton happy hour deals are current?</h3>
<p>Every special on this list has a confidence score of 0.7 or higher and was re-checked within 45 days of October 31, 2026. We re-check the list monthly, and every venue page shows a last-verified date. Where a venue's own website does not show a deal, this guide says so. Our method is written up in <a href="/penticton/blog/how-we-verify-every-special">how we verify every special</a>.</p>

<h2>Check tonight's specials and see the sibling guides</h2>
<p>This post is a snapshot from October 31, 2026. The live <a href="/penticton">Penticton specials page</a> is always current, and you can browse by day: <a href="/penticton/wednesday">Wednesday</a>, <a href="/penticton/friday">Friday</a> and <a href="/penticton/sunday">Sunday</a>. If a deal has changed, tell us on the <a href="/penticton/submit">submit page</a>. More reading is in the <a href="/penticton/blog">Penticton blog</a>, and the same method is used in our guides for <a href="/kelowna/blog/happy-hours-kelowna-2026">Kelowna</a> and <a href="/edmonton/blog/happy-hours-edmonton-2026">Edmonton</a>.</p>
`,
  },
  {
    slug: "happy-hours-revelstoke-golden-2026",
    category: "Guide",
    regions: ["revelstoke-golden"],
    title: "Revelstoke & Golden Happy Hours 2026: Confirmed Spots",
    metaDescription:
      "Happy hours in Revelstoke and Golden BC: 3 confirmed venues, drinks from $6, daily 2-6 PM windows plus a 9 PM to close round in Golden. Verified Oct 31, 2026.",
    publishedAt: "2026-10-29",
    updatedAt: "2026-10-31",
    excerpt:
      "TodaysTab confirmed current happy hour specials at 3 of 14 tracked venues in Revelstoke and Golden, with drinks from $6 at Rockford Bar | Grill.",
    contentHtml: `
<p>Quick answer: Happy hour in Revelstoke and Golden runs between 2 and 6&nbsp;PM daily at the three spots TodaysTab has confirmed, with drinks from $6, and one Golden restaurant adds a second round from 9&nbsp;PM to close. Revelstoke Mountain Resort has the most deals. Only 3 of the 14 venues we track have a current confirmed special.</p>

<p>Last verified October 31, 2026. We re-check every special on this list monthly.</p>

<table>
<thead>
<tr><th>Venue</th><th>Deal</th><th>Days and times</th><th>Price</th><th>Neighbourhood</th></tr>
</thead>
<tbody>
<tr><td><a href="/revelstoke-golden/venues/3158">Rockford Bar | Grill</a></td><td>Craft pints, vodka soda (1&nbsp;oz), feature cocktails (1&nbsp;oz); dine in only</td><td>Daily, 3-6&nbsp;PM</td><td>$6 each</td><td>Revelstoke Mountain Resort</td></tr>
<tr><td><a href="/revelstoke-golden/venues/3158">Rockford Bar | Grill</a></td><td>Vegetable dumplings, Governor Tso's chicken; dine in only</td><td>Daily, 3-6&nbsp;PM</td><td>$7 each</td><td>Revelstoke Mountain Resort</td></tr>
<tr><td><a href="/revelstoke-golden/venues/3164">Raven + Pine Mountain Eatery</a></td><td>Draft beer (16&nbsp;oz) and house wine (6&nbsp;oz)</td><td>Daily, 2-5&nbsp;PM and 9&nbsp;PM to close</td><td>$7 each</td><td>Golden, Trans-Canada Highway</td></tr>
<tr><td><a href="/revelstoke-golden/venues/3164">Raven + Pine Mountain Eatery</a></td><td>Wagyu beef gyoza, tempura prawn roll, Southern Heat chicken bites</td><td>Daily, 2-5&nbsp;PM and 9&nbsp;PM to close</td><td>$12 each</td><td>Golden, Trans-Canada Highway</td></tr>
<tr><td><a href="/revelstoke-golden/venues/3164">Raven + Pine Mountain Eatery</a></td><td>The Raven Burger</td><td>Daily, 2-5&nbsp;PM and 9&nbsp;PM to close</td><td>$19</td><td>Golden, Trans-Canada Highway</td></tr>
<tr><td><a href="/revelstoke-golden/venues/3151">SEOUL STREET</a></td><td>Original edamame</td><td>Daily, 4-6&nbsp;PM</td><td>$5</td><td>Downtown Revelstoke</td></tr>
<tr><td><a href="/revelstoke-golden/venues/3151">SEOUL STREET</a></td><td>Original fries</td><td>Daily, 4-6&nbsp;PM</td><td>$6</td><td>Downtown Revelstoke</td></tr>
</tbody>
</table>

<p>Revelstoke and Golden are about 150&nbsp;km apart on Highway 1, and they have very different drinking scenes. Statistics Canada's <a href="https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/index.cfm?Lang=E">2021 Census</a> counted 8,275 people in Revelstoke and about 4,000 in Golden, so both are small towns where a bar's specials often live on a chalkboard or an Instagram story rather than a website. That is why this guide is short. According to TodaysTab's checks on October 31, 2026, we track 14 venues across the two towns and 3 of them have a current, confirmed special with a stated day or time window.</p>

<p>The numbers behind that, as of October 31, 2026: the lowest confirmed price on a drink is $6, at Rockford Bar | Grill (craft pints, vodka soda and feature cocktails). The lowest price on any item in our records is $5, for original edamame at SEOUL STREET. One venue of the 3, Raven + Pine Mountain Eatery, runs a late-night window (9&nbsp;PM to close). The three afternoon happy hours start between 2 and 4&nbsp;PM and finish by 6&nbsp;PM; Raven + Pine adds its late round from 9&nbsp;PM to close.</p>

<h2>Revelstoke Mountain Resort</h2>

<p>The resort village on Camozzi Road and Coursier Avenue sits at the base of the ski hill, a short drive from downtown. It is the busiest spot for specials in this region, and the most seasonal: it is lively in ski season and quieter in the shoulder months.</p>

<p><strong><a href="/revelstoke-golden/venues/3158">Rockford Bar | Grill (2950 Camozzi Rd)</a></strong> has the longest list of confirmed deals in the region. Happy hour runs 3-6&nbsp;PM every day, dine in only. Craft pints are $6, a vodka soda (1&nbsp;oz) is $6 and feature cocktails (1&nbsp;oz) are $6. Vegetable dumplings and Governor Tso's chicken are $7 each.</p>

<p>Rockford also runs a different drink feature each day, confirmed on October 29, 2026. Sunday is Caesars and mimosas (1&nbsp;oz) at $6. Monday is Double Happiness (16&nbsp;oz) at $6, house wine at $6 for 6&nbsp;oz or $9 for 9&nbsp;oz. Tuesday takes $2 off all local draft. Wednesday is half-price bottles of wine. Thursday is a Peach Mango Bellini (1&nbsp;oz) at $7. Friday takes $2 off a 2&nbsp;oz Moscow Mule. Saturday has white sangria (1&nbsp;oz) at $7.50 and a 40&nbsp;cl Stella at $8. Our data does not state a time window for the daily features, so ask your server whether they overlap with the 3-6&nbsp;PM happy hour.</p>

<h2>Downtown Revelstoke</h2>

<p>Downtown Revelstoke is a walkable grid around First Street and MacKenzie Avenue, with the old-town pubs and most of the independent restaurants. Distances between venues are a few minutes on foot.</p>

<p><strong><a href="/revelstoke-golden/venues/3151">SEOUL STREET (314 1 St W)</a></strong> is a Korean-themed pub and restaurant. According to our records as of October 28, 2026, happy hour runs 4-6&nbsp;PM daily, and every item we have is food: original edamame $5, street edamame $7, original fries $6, street fries $10 and crispy chicken wontons $10. We could not find a happy hour posted on the venue's website, so call to confirm, and we have no drink prices. Check <a href="https://seoul-street.ca">seoul-street.ca</a> or their Instagram for the current menu. This is the cheapest snack in our records for the region.</p>

<h2>Golden: Trans-Canada Highway</h2>

<p>Golden's bars cluster downtown along 8th and 9th Avenue North, but the one venue with confirmed, priced specials sits on the highway. According to <a href="https://www.tourismgolden.com/dining/pubs-bars">Tourism Golden</a>, daily specials and happy hours are common at local pubs, though most do not publish times.</p>

<p><strong><a href="/revelstoke-golden/venues/3164">Raven + Pine Mountain Eatery (1049 Trans-Canada Hwy)</a></strong> is inside the Prestige Golden Hotel and runs two windows every day, 2-5&nbsp;PM and 9&nbsp;PM to close, with the same menu in both. Prices below are from the venue's menu as recorded on October 23, 2026, so check before you go. The hotel's own <a href="https://www.prestigehotelsandresorts.com/locations/golden/dining">dining page</a> lists the same two windows. Drinks: draft beer (16&nbsp;oz, Steamworks and Whitetooth Brewing) $7, house Stone Road wine (6&nbsp;oz) $7, a 2&nbsp;oz cocktail (Canadian Caesar, mojito or mule) $10, and a 1.5&nbsp;oz warmer (B52, Monte Cristo or blueberry tea) $9.</p>

<p>Food in both windows: wagyu beef gyoza $12, tempura prawn roll $12, Southern Heat chicken bites $12, The Raven Burger $19, rigatoni bolognese $20, teriyaki ember bowl $20 and Fireside Frites (6&nbsp;oz sirloin with fries) $29. It is the only place in either town where we have confirmed a late-night happy hour.</p>

<h2>What's not on this list</h2>

<p>These venues are in our database, but we do not have a current confirmed special with a day or time window, so we do not list a deal for them. <a href="/revelstoke-golden/venues/3160">Riverhouse Tavern (506 8 Ave N)</a> in Golden is the closest call: the Golden chamber of commerce lists it and reviews mention Taco Tuesday, but we could not confirm current hours, times or prices, so call ahead. We have left it out of the deals above. <a href="/revelstoke-golden/venues/3156">The Den (1701 Coursier Ave #4104)</a>, on Coursier Avenue near Revelstoke Mountain Resort, ran a burger promotion in October that has ended, and we have no current confirmed special for it.</p>

<p>Also tracked without a confirmed special: <a href="/revelstoke-golden/venues/3153">Craft Bierhaus (107 2 St E)</a>, <a href="/revelstoke-golden/venues/3154">River City Pub &amp; Patio (112 1 St E)</a>, <a href="/revelstoke-golden/venues/3157">The Last Drop Pub (200 3 St W)</a> and <a href="/revelstoke-golden/venues/3152">The Village Idiot Bar and Grill (306 MacKenzie Ave)</a> in Revelstoke, plus <a href="/revelstoke-golden/venues/3159">Rockwater Grill and Bar (429 9 Ave N)</a>, <a href="/revelstoke-golden/venues/3163">Stolen Bell Distillery (616 8 Ave N)</a>, <a href="/revelstoke-golden/venues/3161">The Golden Taps (505 9 Ave N)</a>, <a href="/revelstoke-golden/venues/3162">The Wolf's Den (1105 9 St S)</a> and <a href="/revelstoke-golden/venues/3165">Whitetooth Brewing Company (623 8 Ave N)</a> in Golden.</p>

<p>Some other lists name additional pubs in both towns that we could not confirm as current, so we leave them off rather than guess. If you know a current deal at any pub in either town, the submit link below takes a minute.</p>

<h2>Frequently asked questions</h2>

<h3>What time is happy hour in Revelstoke?</h3>
<p>Among the Revelstoke venues TodaysTab has confirmed, Rockford Bar | Grill at the resort runs happy hour from 3 to 6&nbsp;PM daily, dine in only, and SEOUL STREET downtown runs 4 to 6&nbsp;PM daily for snacks. Both were checked in late October 2026. Windows can change with the season, so confirm before a ski-day detour.</p>

<h3>Where is the cheapest drink in Revelstoke and Golden?</h3>
<p>The lowest confirmed drink price in either town is $6, at Rockford Bar | Grill (2950 Camozzi Rd): craft pints, a 1&nbsp;oz vodka soda and 1&nbsp;oz feature cocktails, 3 to 6&nbsp;PM daily, dine in only. In Golden, Raven + Pine Mountain Eatery charges $7 for a 16&nbsp;oz draft beer or a 6&nbsp;oz glass of house wine during happy hour.</p>

<h3>Is there a late-night happy hour in Golden?</h3>
<p>Yes, at one place we have confirmed. Raven + Pine Mountain Eatery (1049 Trans-Canada Hwy) repeats its happy hour from 9&nbsp;PM to close daily, according to its own website, with $7 draft beer, $7 house wine, a $10 cocktail and the same food specials as the afternoon window, as of October 23, 2026. No other venue in either town has a confirmed late window.</p>

<h3>Does Rockford have a happy hour on weekends?</h3>
<p>Yes. Rockford Bar | Grill's 3 to 6&nbsp;PM happy hour runs every day, dine in only, so it includes Saturday and Sunday. It also lists a daily feature: Caesars and mimosas (1&nbsp;oz) for $6 on Sunday, and white sangria (1&nbsp;oz) at $7.50 or a 40&nbsp;cl Stella at $8 on Saturday.</p>

<h3>What is the cheapest food special in Revelstoke?</h3>
<p>SEOUL STREET (314 1 St W) has the lowest food prices in our records for the region: original edamame is $5 and original fries are $6, both during its 4 to 6&nbsp;PM daily happy hour. At Rockford, vegetable dumplings and Governor Tso's chicken are $7 each from 3 to 6&nbsp;PM.</p>

<h3>How do I know these deals are current?</h3>
<p>Each special on this page was checked against a venue source, and the newest check was October 29, 2026, and the oldest was October 23, 2026 for Raven + Pine Mountain Eatery. We only list specials with a stated day or time window and high confidence, and we re-check monthly. Prices change, so the live page for the region is always the current version.</p>

<h2>Check what is on today</h2>

<p>This guide is a snapshot as of October 31, 2026. The live <a href="/revelstoke-golden">Revelstoke and Golden specials page</a> shows what is running right now, and you can browse by day: <a href="/revelstoke-golden/friday">Friday</a>, <a href="/revelstoke-golden/saturday">Saturday</a> and <a href="/revelstoke-golden/tuesday">Tuesday</a>. Know a deal we missed or one that has changed? <a href="/revelstoke-golden/submit">Submit it here</a>. See the <a href="/revelstoke-golden/blog">region blog</a> for other guides and <a href="/revelstoke-golden/blog/how-we-verify-every-special">how we verify every special</a>. If you are driving through the Okanagan, compare with our <a href="/penticton/blog/happy-hours-penticton-2026">Penticton happy hour guide</a> or <a href="/kelowna/blog/happy-hours-kelowna-2026">Kelowna happy hour guide</a>.</p>
`,
  },
  {
    slug: "happy-hours-kitchener-waterloo-cambridge-2026",
    category: "Guide",
    regions: ["kitchener-waterloo-cambridge"],
    title: "Kitchener-Waterloo Happy Hours 2026: 26 Confirmed Spots",
    metaDescription:
      "Every confirmed happy hour in Kitchener, Waterloo and Cambridge: 26 venues, beers from $1.25, cocktails at $12, and 2-5 PM windows. Checked October 31, 2026.",
    publishedAt: "2026-10-29",
    updatedAt: "2026-10-31",
    excerpt:
      "Of 132 venues TodaysTab tracks in Kitchener-Waterloo-Cambridge, 26 are listed here with a confirmed special, and the lowest confirmed beer price is $1.25.",
    contentHtml: `
<p>Quick answer: Kitchener-Waterloo-Cambridge happy hours mostly run 2 to 5&nbsp;PM or 4 to 6&nbsp;PM, with many pubs adding a second window from 9&nbsp;PM. Confirmed prices run from $1.25 beers to $12 cocktails. Uptown Waterloo's King Street is the densest strip. This guide lists 26 venues with a special TodaysTab has confirmed.</p>

<p>Last verified October 31, 2026. We re-check every special on this list monthly.</p>

<table>
<thead><tr><th>Venue</th><th>Deal</th><th>Days and times</th><th>Price</th><th>Neighbourhood</th></tr></thead>
<tbody>
<tr><td><a href="/kitchener-waterloo-cambridge/venues/6589">Dallas Night Club</a></td><td>Dollar Beer Fridays</td><td>Fridays, all night</td><td>$1.25</td><td>Downtown Kitchener</td></tr>
<tr><td><a href="/kitchener-waterloo-cambridge/venues/6571">The Pub On King</a></td><td>6&nbsp;oz beers</td><td>Tuesdays after 8&nbsp;PM</td><td>$1.25</td><td>Uptown Waterloo</td></tr>
<tr><td><a href="/kitchener-waterloo-cambridge/venues/6605">The Canadian Brewhouse</a></td><td>Stein of Bud Light</td><td>Mon-Sat 2-6&nbsp;PM and from 9&nbsp;PM</td><td>$3.99</td><td>Kingsway Drive, Kitchener</td></tr>
<tr><td><a href="/kitchener-waterloo-cambridge/venues/6542">The Three Idiots</a></td><td>341&nbsp;ml domestic bottle</td><td>After 9&nbsp;PM, closed Tuesdays</td><td>$4.49</td><td>King Street East, Kitchener</td></tr>
<tr><td><a href="/kitchener-waterloo-cambridge/venues/6552">The Duke of Wellington</a></td><td>Duke's Lager pints</td><td>Sunday to Thursday</td><td>$5</td><td>Uptown Waterloo</td></tr>
<tr><td><a href="/kitchener-waterloo-cambridge/venues/6558">Piper Arms</a></td><td>20&nbsp;oz domestic pint</td><td>Daily 11&nbsp;AM-4&nbsp;PM and after 9&nbsp;PM</td><td>$5</td><td>King Street East, Kitchener</td></tr>
<tr><td><a href="/kitchener-waterloo-cambridge/venues/6569">Bobby O'Brien's</a></td><td>16&nbsp;oz Canadian and Coors Light draught</td><td>Daily 2-5&nbsp;PM</td><td>$5.50</td><td>Downtown Kitchener</td></tr>
<tr><td><a href="/kitchener-waterloo-cambridge/venues/6561">Browns Socialhouse Cambridge</a></td><td>Social Lager, 385&nbsp;ml</td><td>Daily 2-5&nbsp;PM and from 9&nbsp;PM</td><td>$5.75</td><td>Hespeler Road, Cambridge</td></tr>
<tr><td><a href="/kitchener-waterloo-cambridge/venues/2353">Malt &amp; Barley Public House</a></td><td>All pints and glasses of wine</td><td>Daily 2-5&nbsp;PM and 9-10&nbsp;PM</td><td>$6</td><td>Fischer-Hallman Road, Kitchener</td></tr>
</tbody>
</table>

<p>Statistics Canada counted <a href="https://www12.statcan.gc.ca/census-recensement/2021/as-sa/fogs-spg/page.cfm?lang=E&amp;topic=1&amp;dguid=2021S0503541">575,847 people in the Kitchener-Cambridge-Waterloo census metropolitan area</a> in the 2021 Census, spread across three cities with three different bar scenes. According to TodaysTab's checks on October 31, 2026, we track 132 active venues, and 26 of them are listed here with a confirmed special and a stated day or time window. Among the venues listed, the most common window is 2 to 5&nbsp;PM, at 8 venues, followed by 4 to 6&nbsp;PM at 4. Eleven of them run a deal that starts at 8&nbsp;PM or later. The lowest confirmed beer price is $1.25, shared by Dallas Night Club on Fridays and The Pub On King on Tuesdays after 8&nbsp;PM.</p>

<h2>Uptown Waterloo</h2>

<p>Uptown is the King Street core of Waterloo, where pubs and cocktail rooms sit within a few blocks of each other. Most weekday deals here are daily rotations, so check the day before you go.</p>

<p><strong><a href="/kitchener-waterloo-cambridge/venues/6571">The Pub On King (77 King St N)</a></strong> rotates a deal each night. Mondays have $5 domestic pints and $15.50 pitchers. Tuesdays have $15.50 domestic pitchers and $9 Don Julio and Hennessy shots, and after 8&nbsp;PM, 6&nbsp;oz beers at $1.25 and 6&nbsp;oz Cottage Springs at $2.25. Wednesdays have $8.50 schooners and half-price wine bottles. Thursdays after 8&nbsp;PM have 12&nbsp;oz beers at $2.25 and Cottage Springs at $4.50. Saturdays before 11&nbsp;PM have sangria mini pitchers at $9.50.</p>

<p><strong><a href="/kitchener-waterloo-cambridge/venues/6552">The Duke of Wellington (100 King St S)</a></strong> posts rotating daily drink specials, so call ahead for current prices. In TodaysTab's data, Duke's Lager pints are $5 from Sunday to Thursday. Sunday adds a $10 Caesar, Monday has $5 Moosehead pints, Tuesday has $6.50 Irish pints, Wednesday has $10 wings and $5 6&nbsp;oz Two Oceans wine, and Thursday has $5.50 Cowbell pints.</p>

<p><strong><a href="/kitchener-waterloo-cambridge/venues/1048">LaLa Social House (181 King St S)</a></strong> runs a social hour Tuesday to Saturday, 4 to 6&nbsp;PM; according to the venue's social hour menu, Peroni draft is $9 and Peroni 0.0% is $7. <strong><a href="/kitchener-waterloo-cambridge/venues/6618">Lower Lounge at Lala (181 King St S Lower Level)</a></strong> has the same hours, and the same menu lists draft Peroni at $9, Peroni 0.0% at $7 and Collective Arts Ransack the Universe at $9.</p>

<p><strong><a href="/kitchener-waterloo-cambridge/venues/2358">Proof Kitchen + Lounge (110 Erb St W)</a></strong> prices all signature cocktails at $12 from Monday to Friday, 4 to 6&nbsp;PM. Tuesday margaritas are $12, and Wednesday has half-price bottles of select wines.</p>

<p><strong><a href="/kitchener-waterloo-cambridge/venues/2362">Ethel's Lounge (114 King St N)</a></strong> has run a Wing Ding Wednesday wings deal (BBQ wings in your choice of sauce for $11 after 4&nbsp;PM with a drink, in TodaysTab's data), so call ahead to confirm the price.</p>

<h2>Northfield Drive, Waterloo</h2>

<p>Northfield Drive East is the chain-restaurant stretch in north Waterloo, with two chain venues that run daily happy hours.</p>

<p><strong><a href="/kitchener-waterloo-cambridge/venues/6646">The Keg Steakhouse + Bar (42 Northfield Dr E)</a></strong> runs happy hour in the bar and lounge, dine-in only: Monday to Friday 4 to 6&nbsp;PM, Saturday and Sunday 3 to 5&nbsp;PM, and nightly from 9&nbsp;PM. We have no confirmed prices for it.</p>

<p><strong><a href="/kitchener-waterloo-cambridge/venues/6556">Browns Socialhouse Waterloo (255 Northfield Dr E)</a></strong> runs social hour daily 2 to 5&nbsp;PM and from 9&nbsp;PM. Prices in TodaysTab's data: Social Lager (385&nbsp;ml) at $5.75, Social Ale at $6.25, 1&nbsp;oz social cocktails at $6, 6&nbsp;oz wine at $7.50 and half-price wine bottles.</p>

<h2>Downtown Kitchener</h2>

<p>Downtown Kitchener centres on King Street West, with one stop just north on Victoria Street North. Deals here lean toward day-specific pub specials and a few late-night options.</p>

<p><strong><a href="/kitchener-waterloo-cambridge/venues/6569">Bobby O'Brien's (125 King St W)</a></strong> pours 16&nbsp;oz Canadian or Coors Light draught at $5.50 daily from 2 to 5&nbsp;PM, with wings at $1 each, according to its own site. TodaysTab's data also lists $5.25 Molson pints on Mondays, $9.29 Molson schooners on Wednesdays, $5 off bottles of wine and 10 wings for $10 after 5&nbsp;PM on Thursdays, and $2 off domestic pitchers on Sundays, which the venue's page does not show, so call ahead.</p>

<p><strong><a href="/kitchener-waterloo-cambridge/venues/2352">Don Julio Tacos &amp; Tequila Bar (147A King St W)</a></strong> starts its deals at 4:30&nbsp;PM, according to its drink menu as recorded by TodaysTab: $2 off Dos Equis and Madri on tap on Sundays, $10.25 margaritas on Wednesdays, and $2 off tequila and mezcal shots on Thursdays.</p>

<p><strong><a href="/kitchener-waterloo-cambridge/venues/2351">TWH Social Bar &amp; Bistro (1 King St W)</a></strong> runs Wine Wednesday: 50% off selected bottles and half-price 9&nbsp;oz glasses.</p>

<p><strong><a href="/kitchener-waterloo-cambridge/venues/1045">PUBLIC Kitchen &amp; Bar (300 Victoria St N, just north of downtown)</a></strong> serves a tapas and beverage happy hour Tuesday to Saturday, 4 to 6&nbsp;PM, with selections from $8, dine-in only.</p>

<p><strong><a href="/kitchener-waterloo-cambridge/venues/6589">Dallas Night Club (312 King St W)</a></strong> sells beers for $1.25 all night on Fridays, the lowest confirmed beer price on this list.</p>

<h2>Kitchener Beyond the Core</h2>

<p>These venues sit along King Street East, Victoria Street North, Fairway Road and Kingsway Drive, and most are easier to reach by car.</p>

<p><strong><a href="/kitchener-waterloo-cambridge/venues/2353">Malt &amp; Barley Public House (1187 Fischer-Hallman Rd)</a></strong> lists a daily 2 to 5&nbsp;PM and 9 to 10&nbsp;PM happy hour, with all pints and glasses of wine at $6 in TodaysTab's data, so confirm prices with the pub. Wednesday is half-price wings, dine-in only.</p>

<p><strong><a href="/kitchener-waterloo-cambridge/venues/6562">Borealis Grille &amp; Bar (4336 King St E)</a></strong> advertises a weekday 2 to 5&nbsp;PM happy hour with $6 drinks on its company site (cocktails, draft beer, wine and kombucha); confirm it applies to the Kitchener location at 519-219-9007.</p>

<p><strong><a href="/kitchener-waterloo-cambridge/venues/6558">Piper Arms (4391 King St E)</a></strong> lists daily pint and late-night specials, so call ahead to confirm. In TodaysTab's data, a 20&nbsp;oz domestic pint is $5 daily from 11&nbsp;AM to 4&nbsp;PM, and after 9&nbsp;PM it offers $5 domestic pints, $5 bar rails, 99-cent wings, half-price appetizers and $6 house wine.</p>

<p><strong><a href="/kitchener-waterloo-cambridge/venues/6542">The Three Idiots (2979 King St E)</a></strong> has a 1 to 5&nbsp;PM happy hour (call for prices) and, after 9&nbsp;PM, 341&nbsp;ml domestic bottles at $4.49 and imported or premium bottles at $6.49 in TodaysTab's data. Sunday to Friday have rotating drink deals; call (226) 647-0638 for current prices. The pub is closed on Tuesdays.</p>

<p><strong><a href="/kitchener-waterloo-cambridge/venues/6605">The Canadian Brewhouse (2960 Kingsway Dr, Unit P004)</a></strong> runs Monday to Saturday 2 to 6&nbsp;PM and again from 9&nbsp;PM: Bud Light steins at $3.99, Stella Artois steins at $5.49, 6&nbsp;oz house wine at $5.99, highballs and Fireball shots at $4.99, and tacos at $3.99.</p>

<p><strong><a href="/kitchener-waterloo-cambridge/venues/6559">Moxies Kitchener (385 Fairway Rd S)</a></strong> runs dine-in happy hour daily 2 to 5&nbsp;PM and again from 9 to 11&nbsp;PM on Sunday and Monday or 9&nbsp;PM to midnight Tuesday to Saturday. In TodaysTab's data, 6&nbsp;oz wine is from $5, 16&nbsp;oz Big Life beer at $5, house highballs at $5 and half-price wine bottles.</p>

<p><strong><a href="/kitchener-waterloo-cambridge/venues/6549">Jack Astor's Bar &amp; Grill (2960 Kingsway Dr, Unit 15A)</a></strong> starts select beers, wines and cocktails at $6 daily from 2 to 5&nbsp;PM, with half-price 750&nbsp;ml wine bottles all day Monday and Tuesday.</p>

<p><strong><a href="/kitchener-waterloo-cambridge/venues/2355">Chicago Pub &amp; Billiards (725 Ottawa St S)</a></strong> posts a drink for every day: $5 Caesars and $6 Kronenbourg on Sunday, $6 Heineken pints Monday, $4.50 tequila shots Tuesday, $5 Corona Wednesday, $6 Guinness Thursday, $9.99 espresso martinis Friday and $6 Hazy Days Saturday.</p>

<p><strong><a href="/kitchener-waterloo-cambridge/venues/6567">Whale &amp; Ale British Pub (1120 Victoria St N, Unit 2)</a></strong> has $6 Caesars on Sundays and half-price wings with a beverage on Tuesdays.</p>

<h2>Cambridge</h2>

<p>These Cambridge spots sit on or just off Hespeler Road, with the Keg on Pinebush Road a few minutes north.</p>

<p><strong><a href="/kitchener-waterloo-cambridge/venues/6561">Browns Socialhouse Cambridge (355 Hespeler Rd)</a></strong> runs social hour daily 2 to 5&nbsp;PM and from 9&nbsp;PM. Prices in TodaysTab's data: Social Lager (385&nbsp;ml) at $5.75, Social Ale at $6.25, 6&nbsp;oz wine at $7.50, 1&nbsp;oz social cocktails at $6 and half-price wine bottles.</p>

<p><strong><a href="/kitchener-waterloo-cambridge/venues/871">State &amp; Main Kitchen and Bar (375 Hespeler Rd, Unit 2)</a></strong> runs dine-in happy hour daily 2 to 5&nbsp;PM and 9&nbsp;PM to close, with snacks and drinks from $5. Mondays take $2 off margaritas, Wednesdays have half-price wings after 2&nbsp;PM, Thursdays have half-price wine bottles, and Saturdays take $2 off sangria.</p>

<p><strong><a href="/kitchener-waterloo-cambridge/venues/6645">The Keg Steakhouse + Bar (44 Pinebush Rd)</a></strong> runs happy hour in the bar and lounge from opening until 6&nbsp;PM on weekdays, from opening until 5&nbsp;PM on weekends, and nightly from 9&nbsp;PM, dine-in only. We have no confirmed prices.</p>

<p><strong><a href="/kitchener-waterloo-cambridge/venues/2369">Blackshop Restaurant &amp; Wine Bar (595 Hespeler Rd)</a></strong> serves Sunday endless brunch from 10&nbsp;AM to 3&nbsp;PM at $48 per adult and $27 under 10, with one mimosa or Caesar included per adult.</p>

<h2>What's not on this list</h2>

<p>The Hop House and White Rabbit entries at 47 King St N in Uptown Waterloo disagree across listings, including whether they open on Mondays and Tuesdays, so we left them out until we can re-confirm. Our records for The Black Badger (55 Water St N, Cambridge), The Aging Oak (3 Queen St E, Cambridge), Gator's Tail (970 Franklin Blvd, Cambridge), The Rabbid Fox (123 Pioneer Dr, Kitchener), Graffiti Market (137 Glasgow St, Kitchener) and Howl At The Moon (1271 Victoria St N, Kitchener) hold deals, but we could not confirm independently that each is currently operating, so they are held back.</p>

<p>The Fiddle and Firkin (707 King St E, Cambridge) is also out: its listed specials name the Swan, the Frog and Firkin on Yonge, which are other pubs, so we do not treat them as Cambridge deals. Competitor lists also name Abe Erb, Morty's Pub, Grand Trunk Saloon and Loloan Lobby Bar. We have no current confirmed schedule for any of them, and Beertown in Waterloo and Cambridge has no confirmed special either.</p>

<h2>Frequently asked questions</h2>

<h3>What time is happy hour in Kitchener-Waterloo?</h3>
<p>The most common window in TodaysTab's October 31, 2026 data is 2 to 5&nbsp;PM, used by 8 of the venues listed here, including Bobby O'Brien's and Malt &amp; Barley. Four more run 4 to 6&nbsp;PM, such as Proof Kitchen + Lounge and LaLa Social House. Several chains add a second window from 9&nbsp;PM.</p>

<h3>Where is the cheapest beer in Kitchener-Waterloo?</h3>
<p>The lowest confirmed beer price is $1.25. Dallas Night Club (312 King St W, Kitchener) sells $1.25 beers all night on Fridays, and The Pub On King (77 King St N, Waterloo) sells 6&nbsp;oz beers at $1.25 on Tuesdays after 8&nbsp;PM. For a larger pour, The Canadian Brewhouse has Bud Light steins at $3.99.</p>

<h3>Which bars have late-night happy hour in Waterloo Region?</h3>
<p>Eleven of the venues listed here have a deal starting at 8&nbsp;PM or later. Piper Arms (4391 King St E) offers $5 domestic pints and 99-cent wings after 9&nbsp;PM, Browns Socialhouse runs its menu from 9&nbsp;PM, and The Pub On King starts Tuesday and Thursday deals after 8&nbsp;PM.</p>

<h3>Is there a happy hour in Uptown Waterloo?</h3>
<p>Yes. Proof Kitchen + Lounge (110 Erb St W) prices signature cocktails at $12 from 4 to 6&nbsp;PM on weekdays, LaLa Social House (181 King St S) pours Peroni at $9 from 4 to 6&nbsp;PM Tuesday to Saturday, and The Duke of Wellington (100 King St S) has $5 Duke's Lager from Sunday to Thursday.</p>

<h3>Which Kitchener-Waterloo happy hours are on Sundays?</h3>
<p>According to TodaysTab's data, Sunday deals include $5 Duke's Lager and a $10 Caesar at The Duke of Wellington, $2 off domestic pitchers at Bobby O'Brien's, $2 off Dos Equis and Madri on tap at Don Julio from 4:30&nbsp;PM, $6 Caesars at Whale &amp; Ale, and the Keg Waterloo's 3 to 5&nbsp;PM weekend happy hour.</p>

<h3>Is there a happy hour in Cambridge, Ontario?</h3>
<p>Yes. Browns Socialhouse (355 Hespeler Rd) and State &amp; Main (375 Hespeler Rd, Unit 2) both run daily happy hours from 2 to 5&nbsp;PM and again from 9&nbsp;PM. Browns sells Social Lager at $5.75, and State &amp; Main lists snacks and drinks from $5.</p>

<h3>How do I know these deals are current?</h3>
<p>Every special published on this list has a TodaysTab verification date within the last 45 days, as of October 31, 2026, and a confidence score of 0.7 or higher. We re-check the list monthly, and our <a href="/kitchener-waterloo-cambridge/blog/how-we-verify-every-special">verification process</a> is public.</p>

<h2>Find tonight's deals</h2>

<p>This guide is a snapshot. For what is running now, open <a href="/kitchener-waterloo-cambridge">today's specials in Kitchener-Waterloo-Cambridge</a> or filter by day: <a href="/kitchener-waterloo-cambridge/wednesday">Wednesday</a>, <a href="/kitchener-waterloo-cambridge/thursday">Thursday</a> and <a href="/kitchener-waterloo-cambridge/friday">Friday</a>. Know a special we missed? <a href="/kitchener-waterloo-cambridge/submit">Submit it here</a>. More reading: the <a href="/kitchener-waterloo-cambridge/blog">region blog index</a>, <a href="/kitchener-waterloo-cambridge/blog/how-we-verify-every-special">how we verify every special</a>, and our sibling guides for <a href="/kelowna/blog/happy-hours-kelowna-2026">Kelowna</a>, <a href="/penticton/blog/happy-hours-penticton-2026">Penticton</a> and <a href="/edmonton/blog/happy-hours-edmonton-2026">Edmonton</a>.</p>
`,
  },
  {
    slug: "happy-hours-edmonton-2026",
    category: "Guide",
    regions: ["edmonton"],
    title: "Edmonton Happy Hours 2026: 27 Spots With Deals",
    metaDescription:
      "27 Edmonton happy hour spots from our October 2026 checks, from $3.99 sleeves at 1st RND to Whyte Avenue and ICE District deals, with days and times.",
    publishedAt: "2026-10-29",
    updatedAt: "2026-10-31",
    excerpt:
      "The most common Edmonton happy hour window is 2-5 PM (about a dozen venues), and a 12 oz sleeve of draught is $3.99 at 1st RND, per TodaysTab's October 31, 2026 checks.",
    contentHtml: `
<p>Quick answer: Edmonton happy hours most often run 2-5&nbsp;PM or 2-6&nbsp;PM. A 12&nbsp;oz sleeve of draught is $3.99 at 1st RND and a 20&nbsp;oz pint is $4.75 at The Black Dog Freehouse, with shorter power hours as low as $2.99 at The Pint Whyte. Old Strathcona (Whyte Avenue) has the most spots. TodaysTab tracks about 95 Edmonton venues with current, dated deals.</p>

<p>Last verified October 31, 2026. We re-check every special on this list monthly.</p>

<table>
<thead>
<tr><th>Venue</th><th>Deal</th><th>Days and times</th><th>Price</th><th>Neighbourhood</th></tr>
</thead>
<tbody>
<tr><td><a href="/edmonton/venues/742">The Black Dog Freehouse</a></td><td>20&nbsp;oz draught pints, well highballs, shots</td><td>Mon-Sat 2-7&nbsp;PM; Sunday specials</td><td>$4.75 pints, $4 highballs</td><td>Old Strathcona</td></tr>
<tr><td><a href="/edmonton/venues/7268">1st RND</a></td><td>Sliders, fish tacos, 12&nbsp;oz house draught</td><td>Mon-Sat 2-6&nbsp;PM and 9&nbsp;PM-close</td><td>$3.99 each</td><td>Oliver (Wihkwentowin)</td></tr>
<tr><td><a href="/edmonton/venues/7344">The Pint Whyte</a></td><td>Highballs, wine, domestic taps</td><td>Tue-Sat 3-7&nbsp;PM; all day Sunday</td><td>$5</td><td>Old Strathcona</td></tr>
<tr><td><a href="/edmonton/venues/7198">The Bell in Scona Brewery</a></td><td>14&nbsp;oz draft, house wine, food from $5.45</td><td>Daily 2-5&nbsp;PM; all day Sunday</td><td>$5 draft</td><td>Old Strathcona</td></tr>
<tr><td><a href="/edmonton/venues/7341">Sugarbowl</a></td><td>Select house and rotating taps</td><td>Daily 3-6&nbsp;PM</td><td>$8</td><td>Garneau</td></tr>
<tr><td><a href="/edmonton/venues/740">O'Byrne's Irish Pub (ICE District)</a></td><td>Hi-balls, house pints, Jameson</td><td>2-7&nbsp;PM (call to confirm)</td><td>$5</td><td>ICE District</td></tr>
<tr><td><a href="/edmonton/venues/3023">Woodwork</a></td><td>Draft beer, feature wine, classic cocktails</td><td>Mon-Fri 2-5&nbsp;PM</td><td>$8 draft, $14 cocktails</td><td>Downtown</td></tr>
<tr><td><a href="/edmonton/venues/7366">Bodega Whyte Avenue</a></td><td>Half-price feature wine, beer, cocktails</td><td>Tue-Sun 2-5&nbsp;PM</td><td>Half price</td><td>Old Strathcona</td></tr>
</tbody>
</table>

<p>In June 2016 Alberta changed the rules that shape these deals: the Alberta Gaming, Liquor and Cannabis commission <a href="https://www.aglc.ca/news/responsible-liquor-service-focus-happy-hours-policy-change">removed the 8&nbsp;PM limit on happy hours</a>, so a bar can discount at any time it is open, as long as prices stay above the provincial minimum. According to TodaysTab's checks on October 31, 2026, we track 228 active Edmonton venues, 110 have live specials, and about 95 of those pass our test (confidence of 0.7 or higher, re-checked within 45 days, with a stated day or time). The most common happy hour window is 2-5&nbsp;PM (about a dozen venues), then 2-6&nbsp;PM (about eight). About 23 venues run a happy hour that starts at 9&nbsp;PM or later, and about 39 have a Sunday happy hour or Sunday drink special.</p>

<h2>Old Strathcona (Whyte Avenue)</h2>

<p>The densest strip in the city: 82 Avenue between 101 and 106 Street, plus 104 Street and 80 Avenue just south. Most bars here run daily windows that start at 2&nbsp;PM.</p>

<p><strong><a href="/edmonton/venues/742">The Black Dog Freehouse (10425 Whyte Ave NW)</a></strong> runs Monday to Saturday 2-7&nbsp;PM with 20&nbsp;oz draught pints at $4.75, $5 domestic bottles, and $4 shots and well highballs. Sunday pints and caesars are $5.25. Late-night specials follow from 7&nbsp;PM to 2&nbsp;AM.</p>

<p><strong><a href="/edmonton/venues/7346">The Buckingham (10439 Whyte Avenue)</a></strong> has a different special each day from 3&nbsp;PM to 2&nbsp;AM: $4.50 well highballs Monday and Wednesday, $5.25 tequila and margaritas Tuesday, 50% off burgers Thursday, $10 all-you-can-eat corn dogs Monday.</p>

<p><strong><a href="/edmonton/venues/7219">O'Byrne's Irish Pub (10616 Whyte Ave NW)</a></strong> runs a Tuesday happy hour from 2 to 7&nbsp;PM with $8 Guinness family pints. It posts other weekday features, including house pints and half-price wine bottles on Thursday and shots on Friday, so check its page. Closed Mondays.</p>

<p><strong><a href="/edmonton/venues/739">Hudsons Canada's Pub (10307 82 Ave NW)</a></strong> starts its Monday and Tuesday deals at 6&nbsp;PM: $6.75 Alexander Keith's on Monday, $6 rotating taps on Tuesday. Wednesday is 50% off wings with a drink purchase.</p>

<p><strong><a href="/edmonton/venues/2183">Blowers &amp; Grafton (10550 82 Ave NW)</a></strong> posts a daily feature instead of a window: $1 off 20&nbsp;oz house lager Monday, $5 off any pizza Monday, $15 for half a dozen oysters Thursday, half-price wine bottles Thursday.</p>

<p><strong><a href="/edmonton/venues/7366">Bodega Whyte Avenue (10314 82 Ave NW)</a></strong> takes half off feature wine, beer and cocktails from 2 to 5&nbsp;PM Tuesday to Sunday, according to TodaysTab's data; call ahead, because the venue's hours header says it opens at 4&nbsp;PM. Wednesday adds half-price wine from 5 to 9&nbsp;PM.</p>

<p><strong><a href="/edmonton/venues/7198">The Bell in Scona Brewery (10416 80 Ave NW)</a></strong> charges $5 for 14&nbsp;oz drafts and 5&nbsp;oz house wine from 2 to 5&nbsp;PM daily, with beer towers at $37. Sunday is all-day happy hour, and Monday rotating taps are $5.</p>

<p><strong><a href="/edmonton/venues/7344">The Pint Whyte (8032 104 Street NW, at 80 Avenue just south of Whyte Avenue)</a></strong> charges $5 for highballs, wine and domestic taps Tuesday to Saturday from 3 to 7&nbsp;PM and all day Sunday. Tuesday has $2.25 8&nbsp;oz mini beers, and Friday and Saturday have a $2.99 power hour from 9 to 10&nbsp;PM.</p>

<p><strong><a href="/edmonton/venues/741">The Next Act Pub (8224 104 Street NW)</a></strong> starts a "Curtain Call" window at 9&nbsp;PM Sunday to Thursday: $1 off all draft, $3 off fail pails, and six late-night snacks for $8.</p>

<p><strong><a href="/edmonton/venues/7345">Boxer Albertan Kitchen &amp; Bar (10315 83 Ave NW)</a></strong> runs happy hour in the afternoon until 5:30&nbsp;PM Sunday to Thursday and until 5&nbsp;PM Friday and Saturday (opening times vary, so call ahead). According to the venue's happy hour menu, items include $11 classic cocktails, 20% off pizza, 20% off draft beer and wine and $6 bread and butter, so check the menu for the exact list.</p>

<h2>Garneau and Ritchie</h2>

<p>South of the river but off the main strip: a university-side tap house and a Ritchie brewery with weekday afternoons.</p>

<p><strong><a href="/edmonton/venues/7341">Sugarbowl (10922 88 Avenue NW)</a></strong> sets all select house and rotating taps at $8 from 3 to 6&nbsp;PM daily.</p>

<p><strong><a href="/edmonton/venues/2192">Campio Brewing Co. Ritchie (9570 76 Ave NW)</a></strong> runs Monday to Friday 3-6&nbsp;PM: $6.50 for 16&nbsp;oz beer, a $13 sampler of six 4&nbsp;oz pours, $7 wine, and $6 canned gin cocktails.</p>

<h2>Downtown and ICE District</h2>

<p>Rogers Place anchors the north end. Bars here lean on afternoon windows and late-night menus.</p>

<p><strong><a href="/edmonton/venues/7268">1st RND (104 Avenue at 112 Street, on the Oliver side of downtown)</a></strong> runs its "3 Star Happy Hour" Monday to Saturday 2-6&nbsp;PM and again from 9&nbsp;PM to close: $3.99 sliders, fish tacos and 12&nbsp;oz sleeves of house draught. Wednesday wings are half price after 6&nbsp;PM.</p>

<p><strong><a href="/edmonton/venues/3023">Woodwork (10132 100 Street NW)</a></strong> serves Monday to Friday 2-5&nbsp;PM: $8 draft, $12 feature wine, $14 shaken or stirred classic cocktails, and $8 hickory frites.</p>

<p><strong><a href="/edmonton/venues/7200">Bar Henry (10220 103 Ave NW)</a></strong> holds an aperitivo hour from 3 to 5&nbsp;PM Wednesday to Saturday, with $13 cocktails and wine by the glass and snacks from $7.</p>

<p><strong><a href="/edmonton/venues/3027">Black Pearl Seafood Bar (10132 104 Street NW)</a></strong> starts a late-night happy hour at 8&nbsp;PM daily: $6 prosecco, $12 king crab mushroom caps. Tuesday adds a $99 cold seafood tower, and Wednesday wine bottles are half price.</p>

<p><strong><a href="/edmonton/venues/740">O'Byrne's Irish Pub, ICE District (10235 101 Street NW)</a></strong> lists $5 hi-balls, house pints and Jameson from 2 to 7&nbsp;PM, with $8 Guinness family pints on Tuesday; call ahead to confirm.</p>

<p><strong><a href="/edmonton/venues/747">The Canadian Icehouse (10332 103 Street NW)</a></strong> posts a different special each day (check its daily specials page for the current list): $4.99 Jameson shots Sunday, $6.99 margaritas Tuesday, $10.99 tankards of any draught Thursday.</p>

<p><strong><a href="/edmonton/venues/7201">The Sherlock Holmes Pub Downtown (10012 101A Ave)</a></strong> says happy hour "starts at just $3" Monday to Saturday 2-6&nbsp;PM and from 11&nbsp;AM on Sunday. Tuesday is half-price dry ribs or wings.</p>

<p><strong><a href="/edmonton/venues/3021">Campio Brewing Co. (10257 105 Street NW)</a></strong> runs Monday to Thursday 3-6&nbsp;PM: $6.50 for 16&nbsp;oz beer, $7 wine, $13 for six 4&nbsp;oz samples, and $13 wings.</p>

<h2>124 Street and Oliver</h2>

<p>Galleries, wine bars and small restaurants. Windows here are shorter, often one or two hours.</p>

<p><strong><a href="/edmonton/venues/751">Bodega 124 Street (12417 Stony Plain Rd)</a></strong> runs half-price feature wine, beer and cocktails Tuesday to Saturday 4-5&nbsp;PM, and half-price wine by the bottle and glass on Wednesday from 4 to 9&nbsp;PM.</p>

<p><strong><a href="/edmonton/venues/7218">Three Vikings (10713 124 Street)</a></strong> takes 25% off all wine on Tuesdays 2-5&nbsp;PM in our confirmed data (check for other days), with a $5 cheese and olive plate. Daily pint features run $6.75 to $8.75.</p>

<p><strong><a href="/edmonton/venues/7267">Clementine (11957 Jasper Avenue NW)</a></strong> holds a 5-6&nbsp;PM window Tuesday to Saturday: $8 pilsner (16&nbsp;oz), $14 shaken or stirred cocktails, and $2 off feature wine pours.</p>

<p><strong><a href="/edmonton/venues/7354">Slow Pour Beer Bar (10416 122 St NW)</a></strong> has Sunday $7 Pilsner Urquell and $10 negronis, Friday 4-6&nbsp;PM pints of rotating cask ale (the venue's page lists $6 and $7, so check on arrival) and Wednesday $20 off bottles of wine. It opens at 5&nbsp;PM on Sunday, Wednesday and Thursday and is closed Monday and Tuesday.</p>

<h2>West and south Edmonton</h2>

<p>Suburban and mall locations with long, consistent windows.</p>

<p><strong><a href="/edmonton/venues/7223">Brewco Craft Kitchen &amp; Brewery (8882 170 Street NW, West Edmonton Mall)</a></strong> takes $3 off 16&nbsp;oz house draft and house wine daily 3-5&nbsp;PM and from 9&nbsp;PM to close, with starters from $2 for popcorn.</p>

<p><strong><a href="/edmonton/venues/7277">The Canadian Brewhouse, Lewis Estates (1320 Webber Greens Dr NW)</a></strong> runs Monday to Saturday 2-6&nbsp;PM: $3.99 Bud Light steins, $4.99 highballs and Fireball, $5.99 house wine.</p>

<p><strong><a href="/edmonton/venues/7199">Flame &amp; Barrel (1237 Windermere Way SW)</a></strong> lists a happy hour, 3-5&nbsp;PM according to our data, plus a late happy hour from 8:30&nbsp;PM to close, with $5.50 domestic draft, $6 house wine, $5 highballs and a $9 small cheese pizza; check the venue's happy hour menu for days and any evening window.</p>

<h2>What's not on this list</h2>

<p>Of the 110 Edmonton venues with live specials, 83 are not described above. We kept this list to the 27 spots with the clearest prices and windows. Others, such as <a href="/edmonton/venues/7348">The Public Exchange (10909 Jasper Ave)</a>, <a href="/edmonton/venues/2187">The Common</a> and the other Canadian Brewhouse locations, are confirmed but only partly covered here. The Common's data shows weekly features such as $5.50 Tuesday margaritas, with no 3-6&nbsp;PM window like the one competitor lists give. Beer Revolution closed in September 2025. Tavern on Whyte and El Cortez appear on older roundups, and we hold no confirmed specials for them. Malt &amp; Mortar (10416 82 Avenue), which older lists still recommend, is shown as closed on listings and in 2024 news. The Mash (10402 Whyte Ave NW) appears in our data, but it is not on the chain's own current location list, so we left it out.</p>

<h2>Frequently asked questions</h2>

<h3>What time is happy hour in Edmonton?</h3>
<p>The most common window in TodaysTab's October 31, 2026 data is 2-5&nbsp;PM, shared by about a dozen venues, followed by 2-6&nbsp;PM at about eight. The Black Dog Freehouse and O'Byrne's run 2-7&nbsp;PM, the longest windows on our list. Many Edmonton venues also run a second window from 9&nbsp;PM to close.</p>

<h3>Where is the cheapest happy hour in Edmonton?</h3>
<p>1st RND (104 Avenue at 112 Street) charges $3.99 for a 12&nbsp;oz sleeve of house draught, sliders and fish tacos, Monday to Saturday 2-6&nbsp;PM. For a 20&nbsp;oz pint, The Black Dog Freehouse is lowest at $4.75 from 2 to 7&nbsp;PM. Shorter windows go lower: The Pint Whyte has $2.25 mini beers on Tuesdays and a $2.99 power hour on Friday and Saturday from 9 to 10&nbsp;PM.</p>

<h3>Which Edmonton bars have a late-night happy hour?</h3>
<p>About 23 venues in our data start a happy hour at 9&nbsp;PM or later. Examples are 1st RND (9&nbsp;PM to close, Monday to Saturday), <a href="/edmonton/venues/741">The Next Act Pub (8224 104 Street NW)</a> (Sunday to Thursday), <a href="/edmonton/venues/7349">The Banquet (10332 103 Street NW, Unit 210)</a>, and <a href="/edmonton/venues/7211">JOEY Bell Tower (10310 101 Street NW)</a> (per JOEY's happy hour menu). <a href="/edmonton/venues/3027">Black Pearl Seafood Bar</a> starts at 8&nbsp;PM daily.</p>

<h3>Is there a happy hour on Sunday in Edmonton?</h3>
<p>Yes. About 39 venues in our data have a Sunday happy hour or drink special. The Pint Whyte (all day, $5 highballs, wine and domestic taps), The Bell in Scona Brewery (all day, $5 drafts), The Buckingham (3&nbsp;PM to 2&nbsp;AM) and The Sherlock Holmes Pub Downtown (from 11&nbsp;AM) all run one.</p>

<h3>Which Edmonton neighbourhood has the most happy hours?</h3>
<p>Old Strathcona, around Whyte Avenue (82 Avenue). Ten of the 27 venues on this list sit within a few blocks of it, from The Black Dog at 10425 Whyte Ave to The Pint Whyte on 104 Street. Downtown and the ICE District follow, with eight venues in that section of this guide.</p>

<h3>Can bars discount drinks after 8 PM in Alberta?</h3>
<p>Yes. The Alberta Gaming, Liquor and Cannabis commission removed the 8&nbsp;PM limit on happy hours, so bars can discount at any time they are open if prices meet the minimum drink price. Edmonton bars such as <a href="/edmonton/venues/7268">1st RND</a>, <a href="/edmonton/venues/7223">Brewco</a> and <a href="/edmonton/venues/3027">Black Pearl</a> now advertise late-night windows.</p>

<h3>How do I know these Edmonton deals are current?</h3>
<p>Every special on this list was re-checked in the 45 days before October 31, 2026, has a confidence score of 0.7 or higher, and states a day or time. We re-check the list monthly. Our method is described in <a href="/edmonton/blog/how-we-verify-every-special">how we verify every special</a>.</p>

<h2>More Edmonton deals</h2>

<p>This guide is a snapshot from October 31, 2026. The live <a href="/edmonton">Edmonton deals page</a> is always current, and you can <a href="/edmonton/submit">submit a deal or correction</a>. Browse by day: <a href="/edmonton/friday">Friday</a>, <a href="/edmonton/sunday">Sunday</a> and <a href="/edmonton/tuesday">Tuesday</a>. See all posts on the <a href="/edmonton/blog">Edmonton blog</a>, or compare with our guides to <a href="/kelowna/blog/happy-hours-kelowna-2026">Kelowna</a> and <a href="/penticton/blog/happy-hours-penticton-2026">Penticton</a> happy hours.</p>
`,
  },
  {
    slug: "happy-hours-ottawa",
    category: "Guide",
    regions: ["ottawa"],
    title: "Ottawa Happy Hours 2026: 21 Spots With Deals",
    metaDescription:
      "21 Ottawa happy hour spots in our October 2026 checks, from $5 beer at JOEY to $2 oysters in ByWard Market. Includes 5 à 7 deals. Call ahead to confirm.",
    publishedAt: "2026-10-31",
    excerpt:
      "Ottawa has 21 spots with happy hour deals in our October 2026 checks, and the two most common windows, 2 to 5 PM and 3 to 6 PM, tie at 11 venues each.",
    contentHtml: `
<p>Quick answer: Ottawa happy hour most often runs 2 to 5&nbsp;PM or 3 to 6&nbsp;PM on weekdays, and locals call the after-work version "5 to 7" (5 à 7). Beer or highballs start at $5 at JOEY Rideau and JOEY Lansdowne, and most downtown deals sit at $6 to $7. This guide covers 21 venues, with ByWard Market and downtown the biggest group.</p>
<p>Last verified October 31, 2026. Where a venue's own site and our records differ, or a venue publishes no times or prices, we say so, and you should call ahead. We re-check the list monthly.</p>

<h2>Ottawa happy hours at a glance</h2>
<table>
<thead><tr><th>Venue</th><th>Deal</th><th>Days and times</th><th>Price</th><th>Neighbourhood</th></tr></thead>
<tbody>
<tr><td><a href="/ottawa/venues/1021">Grey's Social Eatery</a></td><td>Draught, highballs, 5&nbsp;oz wine</td><td>Tue-Sun, 4 to 6&nbsp;PM</td><td>$6</td><td>ByWard Market</td></tr>
<tr><td><a href="/ottawa/venues/2085">Somewhere Dine Bar</a></td><td>Oysters</td><td>Daily, 4:30 to 6&nbsp;PM</td><td>$2</td><td>ByWard Market</td></tr>
<tr><td><a href="/ottawa/venues/4716">JOEY Rideau</a></td><td>Highballs, Muskoka lager (14&nbsp;oz)</td><td>Daily, 3 to 6&nbsp;PM</td><td>$5</td><td>Downtown</td></tr>
<tr><td><a href="/ottawa/venues/2111">Browns Socialhouse Centretown</a></td><td>Social Lager (385&nbsp;ml)</td><td>Daily, 2 to 5&nbsp;PM</td><td>$5.75</td><td>Centretown</td></tr>
<tr><td><a href="/ottawa/venues/2122">Mati</a></td><td>Oysters (minimum 3)</td><td>Wed-Fri, 3 to 5&nbsp;PM</td><td>$3 each</td><td>Little Italy</td></tr>
<tr><td><a href="/ottawa/venues/2099">Banditos</a></td><td>Draft, sangria, tequila</td><td>Mon-Fri, 4 to 6&nbsp;PM</td><td>$6 to $8</td><td>The Glebe</td></tr>
<tr><td><a href="/ottawa/venues/7612">10Fourteen</a></td><td>Draft beer, wine</td><td>Daily, 5 to 7&nbsp;PM</td><td>$6 draft, $8 wine</td><td>Hintonburg</td></tr>
<tr><td><a href="/ottawa/venues/7639">The Barley Mow Westboro</a></td><td>Bar rail, 5&nbsp;oz house wine</td><td>Mon-Fri, 2 to 5&nbsp;PM</td><td>$6</td><td>Westboro</td></tr>
<tr><td><a href="/ottawa/venues/7549">The Black Pug</a></td><td>Pug Lager, Pug Lite, IPA, Old Style</td><td>Mon-Fri, 2 to 5&nbsp;PM</td><td>$6</td><td>East end</td></tr>
</tbody>
</table>

<p>The City of Ottawa dates the ByWard Market to May 1, 1827 and is marking its 200th anniversary in 2027, according to the <a href="https://ottawa.ca/en/business/economic-development-services/ottawa-200-celebrations/byward-market-200th-2027">City of Ottawa</a>. According to TodaysTab's checks on October 31, 2026, we track 230 active venues in the Ottawa region and 67 of them have a current special that meets our rules (confidence of 0.7 or higher, re-checked within 45 days, with a stated day or time). Of the 41 venues with a stated happy hour window, 11 run 2 to 5&nbsp;PM and 11 run 3 to 6&nbsp;PM, while only 1, 10Fourteen, runs a literal 5 to 7&nbsp;PM window. The lowest drink price among the venues in this guide is $5, for beer or highballs at JOEY Rideau and JOEY Lansdowne. Eleven venues list a happy hour that starts at 9&nbsp;PM or later.</p>

<h2>ByWard Market and downtown</h2>
<p>The Market is the walkable core, with most bars within a few blocks of George, York and Murray Streets, and Rideau Street runs along its south edge.</p>
<p><strong><a href="/ottawa/venues/1021">Grey's Social Eatery (2 ByWard Market Square)</a></strong> runs happy hour daily from 4 to 6&nbsp;PM and again from 10&nbsp;PM until late, according to its own site, and it is open Tuesday to Sunday. Our records list $6 Landshark and Goose Island IPA draught, $6 highballs, $6 five-ounce wine, $5 fish tacos and $5 honey butter chicken sliders. Wednesdays add half-price bottles of wine.</p>
<p><strong><a href="/ottawa/venues/2085">Somewhere Dine Bar (110 Murray Street)</a></strong> serves $2 oysters and half-price appetizers daily from 4:30 to 6&nbsp;PM, according to its own site, which also lists $12 cocktails.</p>
<p><strong><a href="/ottawa/venues/2083">The Clarendon (11 George Street)</a></strong> lists a daily 3 to 5:30&nbsp;PM happy hour on its own site, without prices. According to TodaysTab's October check it has $7 draft beer, $7 house wine, $9 sangria, $5 fries and $15 pizzas. Call to confirm before you go.</p>
<p><strong><a href="/ottawa/venues/2086">The Grand Pizzeria &amp; Bar ByWard (74 George Street)</a></strong> runs Monday to Friday, 3 to 6&nbsp;PM and from 9&nbsp;PM to close, according to its own site: $6 beer pints, $6 wine, $9 Aperol Spritz, $9 Bellinis, $20 sangria pitchers and half-price pizzas with a drink. The site says there is no happy hour on civic holidays, school holidays or long weekends.</p>
<p><strong><a href="/ottawa/venues/4818">Luxe Bistro (47 York Street)</a></strong> lists a daily 2 to 6&nbsp;PM happy hour with $6 beer, according to TodaysTab's October check. Our records also show it running all day Thursday and late on Friday and Saturday from about 10&nbsp;PM. We could not match these windows to the venue's own site, which lists limited and inconsistent hours, so call first.</p>
<p><strong><a href="/ottawa/venues/4716">JOEY Rideau (50 Rideau Street)</a></strong> runs a daily 3 to 6&nbsp;PM happy hour and a late-night one from 9&nbsp;PM to close Sunday to Thursday, according to TodaysTab's October check: $5 vodka or gin highballs (1&nbsp;oz), $5 Muskoka lager (14&nbsp;oz), house wine by the glass and $5 fries.</p>

<h2>Centretown and Elgin Street</h2>
<p>Elgin Street is Centretown's bar strip.</p>
<p><strong><a href="/ottawa/venues/2111">Browns Socialhouse Centretown (160 Elgin Street)</a></strong> runs daily from 2 to 5&nbsp;PM and from 9&nbsp;PM to close, according to its own site. According to TodaysTab's October check it has Social Lager (385&nbsp;ml) $5.75, Social Ale $6.25, a six-ounce wine $7.50 and half-price bottles of wine.</p>
<p><strong><a href="/ottawa/venues/7551">Manor Lounge (292 Elgin Street)</a></strong> lists a daily 4 to 6&nbsp;PM happy hour, plus after 9&nbsp;PM and all day Sunday according to the venue's menu: $6 draft, $6 six-ounce wine, $10 two-ounce cocktails and $9 mocktails.</p>
<p><strong><a href="/ottawa/venues/2114">Prohibition Public House (337 Somerset Street West)</a></strong> posts "Happy hour weekdays 5-6 PM" on its own site. Our records add $6 Prohibition Pilsner, $10 house wine, $10 sangria, a $12 lime margarita and 40% off appetizers.</p>

<h2>Little Italy and Preston Street</h2>
<p>Preston Street is the old Italian strip just southwest of Centretown, now mostly restaurants.</p>
<p><strong><a href="/ottawa/venues/2122">Mati (428 Preston Street)</a></strong> holds its Aperitivo Hour Wednesday to Friday from 3 to 5&nbsp;PM, according to its own site. Our records list East Coast oysters at $3 each (minimum three), shrimp cocktail at $5 a piece, and Negronis, Aperol Spritz and wine by the glass at $12.</p>

<h2>The Glebe and Lansdowne</h2>
<p>Bank Street through the Glebe holds the neighbourhood's pubs, and Lansdowne sits at its southern edge by the canal.</p>
<p><strong><a href="/ottawa/venues/2099">Banditos (683 Bank Street)</a></strong> runs weekdays from 4 to 6&nbsp;PM, according to its own site. Our records list a $12 lime margarita, $7 Banditos Brew draft, $8 sangria, $6 El Jimador tequila and $6 fries.</p>
<p><strong><a href="/ottawa/venues/7646">Erling's Variety (225 Strathcona Avenue)</a></strong> runs Tuesday to Saturday from 4 to 5:30&nbsp;PM, according to TodaysTab's October check: $2 oysters, a $6 500&nbsp;ml Bavaria, an $8 house glass and a $6 focaccia with honey butter. Its own site lists no happy hour, so call first.</p>
<p><strong><a href="/ottawa/venues/7550">JOEY Lansdowne (825 Exhibition Way)</a></strong> (lounge, bar and patio only) runs daily from 3 to 6&nbsp;PM and Sunday to Thursday from 9&nbsp;PM to close, according to TodaysTab's October check: $5 highballs, $5 Muskoka lager, house wine by the glass and $5 fries.</p>

<h2>Westboro, Hintonburg and Wellington West</h2>
<p>Richmond Road through Westboro and Wellington Street West through Hintonburg are the west-end strips.</p>
<p><strong><a href="/ottawa/venues/7612">10Fourteen (1014 Wellington Street West)</a></strong> runs a daily 5 to 7&nbsp;PM happy hour, according to its own site: $6 draft, $8 wine and 20% off charcuterie. Our records also list $6 draft from 10&nbsp;PM on Thursdays.</p>
<p><strong><a href="/ottawa/venues/2123">The Hintonburg Public House (1020 Wellington Street West)</a></strong> lists a daily 4 to 6&nbsp;PM happy hour with $8 select draft, wine and bar rail drinks, according to TodaysTab's October check. Its own site does not mention it, so call ahead.</p>
<p><strong><a href="/ottawa/venues/7602">Pubblico Eatery (1331 Wellington Street West)</a></strong> runs daily from 3 to 6&nbsp;PM, according to its own site: $6 beer, wine and bar rail drinks, with $8 Guinness pints on Mondays.</p>
<p><strong><a href="/ottawa/venues/7639">The Barley Mow Westboro (399 Richmond Road)</a></strong> runs Monday to Friday from 2 to 5&nbsp;PM at all locations, according to the chain's site: $6 bar rail and five-ounce house wine, $6 large 1000 Islands beer and $15 select appetizers.</p>
<p><strong><a href="/ottawa/venues/7641">Clocktower Brew Pub Westboro (418 Richmond Road)</a></strong> runs Sunday to Thursday, 2 to 5&nbsp;PM and 9&nbsp;PM to close, dine-in only, according to the chain's site. According to TodaysTab's October check it has $7.50 craft pints, $6 house wine and $6 rail shots.</p>
<p><strong><a href="/ottawa/venues/7659">The Grand Pizzeria &amp; Bar Westboro Beach (745 Kichi Zībī Mīkan)</a></strong> runs Monday to Friday from 3 to 5&nbsp;PM and from 9&nbsp;PM to close, according to its own site, with $6 beer cans, $6 wine, $9 Aperol Spritz and $20 sangria pitchers.</p>

<h2>East end and Orleans</h2>
<p>East of the core, two pubs post weekday afternoon deals.</p>
<p><strong><a href="/ottawa/venues/7549">The Black Pug (1785 Kilborn Avenue)</a></strong> serves $6 Pug Lager, Pug Lite, Whiprsnpr IPA and Old Style Monday to Friday from 2 to 5&nbsp;PM, according to its own site, which also lists $6 house wine, bar rail and mozzarella sticks.</p>
<p><strong><a href="/ottawa/venues/1031">Corner Bar &amp; Grill (1779 Tenth Line Road)</a></strong> in Orleans runs daily from 3 to 6&nbsp;PM and from 9&nbsp;PM to close, dine-in only, according to its own site. According to TodaysTab's October check it has $6 for a 16&nbsp;oz Pub Lite, $7 for a 20&nbsp;oz Amsterdam Blonde, a $12 Old Fashioned and $9 wings after 9&nbsp;PM.</p>

<h2>What's not on this list</h2>
<p>Competing lists conflict with each other on prices and hours. 613today's happy hour page, dated April 14, 2026, names Sidedoor, The Gilmour, Montgomery Scotch Lounge and Aiāna Restaurant Collective, and we have no confirmed special for any of them. The apt613 "best 5 à 7" page was published November 1, 2016 and carries no update date, so we did not use its prices. CRAFT Beer Market on Bank Street is in our records, but only with low-confidence data, so we leave it out.</p>
<p>The Shore Club (11 Colonel By Drive) and Social Restaurant + Lounge (537 Sussex Drive) both advertise a happy hour, but the Shore Club's site gives no days or times and our price source is a bar menu dated February 2025, and Social's site did not show its Social Hour when we checked. Metropolitain Brasserie (700 Sussex Drive) lists $1 oysters on Thursdays but no happy hour on its site. Al's Steakhouse (327 Elgin Street) lists a Monday to Friday 3 to 6&nbsp;PM happy hour in our records, but the menu behind it is labelled Summer 2024. Ask the venue before you go. Gatineau, across the river in Quebec, is a separate TodaysTab region and is not covered here.</p>

<h2>Frequently asked questions</h2>
<h3>What time is happy hour in Ottawa?</h3>
<p>Most Ottawa happy hours run on weekdays in the afternoon. According to TodaysTab's checks on October 31, 2026, the two most common windows are 2 to 5&nbsp;PM and 3 to 6&nbsp;PM, tied at 11 venues each. Many places repeat the deal late at night, often from 9 or 10&nbsp;PM until close.</p>
<h3>What does 5 à 7 mean in Ottawa?</h3>
<p>"5 à 7" (5 to 7) is the French-Canadian name for the after-work drink, from 5 to 7&nbsp;PM. Ottawa uses it alongside "happy hour". In our records only 10Fourteen (1014 Wellington Street West) runs a literal daily 5 to 7&nbsp;PM window, with $6 draft and $8 wine. Most other venues start at 2, 3 or 4&nbsp;PM.</p>
<h3>Where is the cheapest happy hour in Ottawa?</h3>
<p>Among the venues in this guide, the lowest drink price is $5, for Muskoka lager (14&nbsp;oz) and vodka or gin highballs at JOEY Rideau (50 Rideau Street) and JOEY Lansdowne (825 Exhibition Way). Many others charge $6, including Grey's Social Eatery, Pubblico Eatery, The Black Pug and Prohibition Public House for a pilsner. Oysters are cheapest at $2 at Somewhere Dine Bar.</p>
<h3>Is there a late-night happy hour in Ottawa?</h3>
<p>Yes. According to TodaysTab's October check, 11 venues list a happy hour window starting at 9&nbsp;PM or later. Examples are JOEY Rideau and JOEY Lansdowne (Sunday to Thursday, 9&nbsp;PM to close), Clocktower Brew Pub Westboro (Sunday to Thursday), Corner Bar &amp; Grill and Browns Socialhouse (daily), and The Grand ByWard on weekdays from 9&nbsp;PM. Grey's Social Eatery restarts at 10&nbsp;PM.</p>
<h3>Is there a happy hour on weekends in Ottawa?</h3>
<p>Fewer venues run weekend deals. Grey's Social Eatery (Tuesday to Sunday), Somewhere Dine Bar, The Clarendon, Browns Socialhouse, Manor Lounge and both JOEY locations list happy hour on Saturdays and Sundays in our records. Banditos, Prohibition Public House, The Barley Mow and The Black Pug run Monday to Friday only, so check the day before you go.</p>
<h3>Is happy hour legal in Ontario?</h3>
<p>Yes. The AGCO lifted its ban on the terms "Happy Hour" and "Cheap Drinks" in the Liquor Advertising Guidelines effective May 6, 2019, according to its <a href="https://www.agco.ca/en/news/info-bulletin-no-56-regulatory-modernization-and-burden-reduction-changes-ontarios-beverage">Info Bulletin No. 56</a>. Licensees must still keep their pricing and promotions responsible in nature. Check the AGCO site for the current guidelines.</p>

<h2>More Ottawa deals and nearby guides</h2>
<p>This guide is a snapshot from October 31, 2026. The live <a href="/ottawa">Ottawa deals page</a> is always current, and you can <a href="/ottawa/submit">submit a deal or correction</a>. Browse by day: <a href="/ottawa/wednesday">Wednesday</a>, <a href="/ottawa/thursday">Thursday</a> and <a href="/ottawa/friday">Friday</a>. See all posts on the <a href="/ottawa/blog">Ottawa blog</a> and <a href="/ottawa/blog/how-we-verify-every-special">how we verify every special</a>. Compare with our guides to <a href="/kelowna/blog/happy-hours-kelowna-2026">Kelowna</a>, <a href="/edmonton/blog/happy-hours-edmonton-2026">Edmonton</a>, <a href="/calgary/blog/happy-hours-calgary">Calgary</a>, <a href="/halifax/blog/happy-hours-halifax">Halifax</a>, <a href="/hamilton/blog/happy-hours-hamilton">Hamilton</a> and <a href="/barrie-simcoe-county/blog/happy-hours-barrie">Barrie</a>.</p>
`,
  },
  {
    slug: "happy-hours-calgary",
    category: "Guide",
    regions: ["calgary"],
    title: "Calgary Happy Hours 2026: 25 Spots With Deals",
    metaDescription:
      "25 Calgary happy hour spots in our October 2026 checks, from a $3 craft beer at Tool Shed to a $4.50 lager at Bank and Baron. Call ahead to confirm.",
    publishedAt: "2026-10-31",
    excerpt:
      "Calgary happy hour most often runs 2 to 5 PM, used by 47 venues in TodaysTab's October 31, 2026 data, with a 5 oz beer from $3.",
    contentHtml: `
<p>Quick answer: Calgary happy hour most often runs 2 to 5&nbsp;PM, and 47 venues in our October 31, 2026 data use that window. The cheapest pour with a stated window is a 5&nbsp;oz beer at $3 at Tool Shed Beer &amp; BBQ, and The Bank and Baron lists a $4.50 lager. Start with Downtown and the Beltline, where this guide lists the most of its 25 spots.</p>
<p>Last verified October 31, 2026. Where a venue's own site and our records differ, or a venue publishes no times or prices, we say so, and you should call ahead. We re-check the list monthly.</p>

<h2>Calgary happy hours at a glance</h2>
<table>
<thead><tr><th>Venue</th><th>Deal</th><th>Days and times</th><th>Price</th><th>Neighbourhood</th></tr></thead>
<tbody>
<tr><td><a href="/calgary/venues/3235">Tool Shed Beer &amp; BBQ</a></td><td>Core beer, 5&nbsp;oz</td><td>Daily, 2 to 5&nbsp;PM</td><td>$3</td><td>30 St NE</td></tr>
<tr><td><a href="/calgary-sw/venues/3387">Comery Block Barbecue</a></td><td>South Block draught, half-price whiskey</td><td>Mon-Fri, 3 to 6&nbsp;PM</td><td>$2 off draught</td><td>17 Ave SW</td></tr>
<tr><td><a href="/calgary/venues/2076">The Bank and Baron P.U.B.</a></td><td>2515 lager draught</td><td>Daily, 3 to 6&nbsp;PM</td><td>$4.50</td><td>Downtown</td></tr>
<tr><td><a href="/calgary-ne/venues/668">The Workbench Bar &amp; Grill</a></td><td>Domestic beer</td><td>Daily, 4 to 7&nbsp;PM</td><td>$4.99</td><td>Memorial Dr E</td></tr>
<tr><td><a href="/calgary-se/venues/701">Original Joe's (Quarry Park)</a></td><td>OJ's draught, 14&nbsp;oz</td><td>Daily, 2 to 5&nbsp;PM</td><td>$5</td><td>Quarry Park</td></tr>
<tr><td><a href="/calgary/venues/2068">Brix + Barrel</a></td><td>House lager, 14&nbsp;oz</td><td>Mon-Fri, 2 to 5&nbsp;PM</td><td>$6.50</td><td>Downtown</td></tr>
<tr><td><a href="/calgary/venues/3135">Native Tongues Taqueria (Victoria Park)</a></td><td>Classic lime margarita</td><td>Mon-Fri, 2 to 4&nbsp;PM</td><td>$6.50</td><td>Beltline</td></tr>
<tr><td><a href="/calgary/venues/646">Blanco Cantina (Kensington)</a></td><td>Margaritas</td><td>Daily, 2 to 5&nbsp;PM</td><td>$7.50</td><td>Kensington</td></tr>
<tr><td><a href="/calgary/venues/3142">King Eddy</a></td><td>Food and drinks</td><td>Mon-Sat, 2 to 6&nbsp;PM</td><td>$10 and under</td><td>East Village</td></tr>
</tbody>
</table>

<p>Alberta removed its 8&nbsp;PM cutoff for drink specials in June 2016, <a href="https://globalnews.ca/news/2740056/alberta-gaming-and-liquor-commission-allows-all-day-happy-hours/">Global News reported</a>. Alberta still sets minimum drink prices, so specials are discounts rather than free drinks. The <a href="https://www.aglc.ca">AGLC</a> raised the minimums in June 2026 and the province ordered that reversed within two weeks, so check the AGLC for current figures. According to TodaysTab's checks on October 31, 2026, we track 520 active Calgary-area venues and 234 listings have a current special that meets our rules (confidence 0.7 or higher, checked within 45 days). Some venues are listed twice, so that is a count of listings. Among venues with a happy hour listing and a stated start and end, the most common window is 2 to 5&nbsp;PM at 47 venues, ahead of 3 to 6&nbsp;PM at 32. Another 32 have a window that starts at 9&nbsp;PM or later, many of them chain late-night menus. The cheapest pour with a stated window is a 5&nbsp;oz Tool Shed core beer at $3.</p>
<p>The other Calgary lists we found are dated: Daily Hive's roundup ran in March 2022 with eight venues, and Curiocity's is a map. This guide adds exact prices, days and windows, a check date, and a section on what we could not confirm.</p>

<h2>Downtown: Stephen Avenue and 4 Avenue SW</h2>
<p>The office core has the most weekday 2 to 6&nbsp;PM deals, mostly on 8 Avenue and 4 Avenue SW.</p>
<p><strong><a href="/calgary/venues/2076">The Bank and Baron P.U.B. (125 8th Ave SW)</a></strong> lists a daily 3 to 6&nbsp;PM happy hour, dine in only, in our records, so call to confirm: 2515 lager draught at $4.50, highballs at $5, 5&nbsp;oz house red or white at $6 and steak bites at $13.</p>
<p><strong><a href="/calgary/venues/2068">Brix + Barrel (351 4 Ave SW)</a></strong> lists a happy hour, but times differ by source: our October 23 check says Monday to Friday, 2 to 5&nbsp;PM, and Visit Calgary says 3 to 5&nbsp;PM. In our records the 14&nbsp;oz house lager and well highballs are $6.50, with $3 off shareables. Its site lists half-price wine bottles all day Thursday and Friday. Call to confirm.</p>
<p><strong><a href="/calgary-sw/venues/3292">The Imperial Tap (503 4 Ave SW)</a></strong> has Monday to Friday, 2 to 5&nbsp;PM deals in our records: 16&nbsp;oz drafts, 6&nbsp;oz house wine and 1&nbsp;oz highballs at $6. Pizza bombs and Chinatown dumplings are $2 each (two-piece minimum) on its menu. Call to confirm.</p>
<p><strong><a href="/calgary/venues/3305">The Wednesday Room (118 8 Ave SW #100)</a></strong> lists a 2 to 5&nbsp;PM Shining Hour on its own site without days. OpenTable says Tuesday to Friday and Visit Calgary says daily, so call. In our records: Get Lucky lager at $8, classic cocktails at $12.50 and 5&nbsp;oz house wine at $9.</p>
<p><strong><a href="/calgary-sw/venues/3386">Fonda Fora (630 4 Ave SW)</a></strong> lists a daily 2 to 5&nbsp;PM happy hour on its own site, dine in only. In our records: corn lager at $7, a 2&nbsp;oz margarita at $10 and three quesadillas at $10.</p>

<h2>Beltline: 10, 11 and 12 Avenue SW</h2>
<p>South of the CPR tracks, the Beltline packs bars and restaurants along 10 Avenue, 11 Avenue and 12 Avenue SW.</p>
<p><strong><a href="/calgary/venues/3135">Native Tongues Taqueria (Victoria Park) (235 12 Ave SW)</a></strong> runs Monday to Friday, 2 to 4&nbsp;PM, according to its own site, with a late happy hour from 9&nbsp;PM Sunday to Thursday. In our records: classic lime margarita at $6.50, 14&nbsp;oz Mexican lagers at $4.25 and a frijoles taco at $3.99.</p>
<p><strong><a href="/calgary-sw/venues/3287">Last Best Brewing &amp; Distilling (607 11 Ave SW)</a></strong> has Monday to Thursday, 3 to 6&nbsp;PM deals in our records, plus a later window from 9&nbsp;PM: 16&nbsp;oz draft at $5.50, a 2&nbsp;oz gin martini at $10 and pork potstickers at $8.</p>
<p><strong><a href="/calgary-sw/venues/3332">National (341 10 Ave SW)</a></strong> serves Tuesday to Friday, 2 to 5&nbsp;PM: 16&nbsp;oz draft at $6, 5&nbsp;oz house wine at $8, a 5&nbsp;oz signature cocktail at $10.</p>
<p><strong><a href="/calgary-sw/venues/3272">Fleetwood Lounge (524 10 Ave SW)</a></strong> runs Classic Hour daily until 6&nbsp;PM and all day Sunday, with no start time in our records: beer at $7, 6&nbsp;oz wine at $10 and cocktails at $10.</p>

<h2>17 Avenue SW: the bar strip</h2>
<p>17 Avenue SW is Calgary's main bar street, and it has the latest windows in this guide.</p>
<p><strong><a href="/calgary-sw/venues/3211">Lonely Mouth Bar (528 17 Ave SW)</a></strong> takes 50% off cocktails, beer and wine daily from 2 to 5&nbsp;PM. Sunday to Thursday after 9&nbsp;PM, cocktails start at $10, and Friday and Saturday 10&nbsp;PM to 1&nbsp;AM, Japanese highballs are $7.</p>
<p><strong><a href="/calgary-sw/venues/3033">Porch (730 17 Ave SW)</a></strong> has a daily 2 to 5&nbsp;PM happy hour on its own site, with prices in a menu PDF. Double cheeseburger and veggie sliders are $7. Our records show 16&nbsp;oz drafts at $6.50 and 1&nbsp;oz well highballs at $6.</p>
<p><strong><a href="/calgary-sw/venues/3387">Comery Block Barbecue (638 17 Ave SW)</a></strong> runs Monday to Friday, 3 to 6&nbsp;PM: South Block draught is $2 off, all whiskey is half price and whiskey cocktails are $4 off, according to its site. Half-pound meats are half off after 10&nbsp;PM while they last.</p>
<p><strong><a href="/calgary-sw/venues/3377">Watchman's Pub &amp; Eatery (1109 17 Ave SW #100)</a></strong> runs 3 to 6&nbsp;PM with well hi-balls at $5, domestic cans at $6 and dry ribs at $10. Its Midnight Madness, 12 to 2&nbsp;AM, has Jagermeister and well hi-balls at $5 and domestic cans at $6.</p>

<h2>Kensington and Hillhurst: Kensington Road and 10 Street NW</h2>
<p>Kensington is the business district inside Hillhurst and Sunnyside, and it holds a few of the better whisky and taco deals.</p>
<p><strong><a href="/calgary/venues/2047">Hayden Block Smoke &amp; Whiskey (1136 Kensington Rd NW)</a></strong> has all whiskey at half price, whiskey cocktails $4 off and South Block draught $2 off, Monday to Friday, 3 to 6&nbsp;PM. Meats are half off after 10&nbsp;PM, Monday to Friday.</p>
<p><strong><a href="/calgary/venues/646">Blanco Cantina (Kensington) (1140 Kensington Rd NW)</a></strong> runs 2 to 5&nbsp;PM daily: margaritas at $7.50, all tequila half price including top shelf, and classic tacos at $4.</p>
<p><strong><a href="/calgary-nw/venues/2894">Ikemen Ramen Bar (217 10 St NW)</a></strong> is in Hillhurst, a short walk from Kensington. Our records list a Friday and Saturday 3 to 6&nbsp;PM happy hour: 16&nbsp;oz Sapporo at $5, 16&nbsp;oz Two Pillars Saison at $6, gyoza at $6 and fries at $5. Call ahead.</p>

<h2>East Village and Inglewood: 9 Avenue SE</h2>
<p>East Village sits just east of downtown on the Bow River, and Inglewood runs along 9 Avenue SE past the Elbow River.</p>
<p><strong><a href="/calgary/venues/3142">King Eddy (438 9 Ave SE)</a></strong> runs happy hour food and drink specials from 2 to 6&nbsp;PM, according to its event pages, and our records say everything is $10 and under. Hours change on event days, so check its calendar.</p>
<p><strong><a href="/calgary/venues/3330">Charbar (618 Confluence Way SE)</a></strong> takes 50% off draft beer, wine by the glass and highballs, Monday, Tuesday, Thursday and Friday, 2 to 5&nbsp;PM, per its menu page.</p>
<p><strong><a href="/calgary/venues/3307">Magpie (535 8 Ave SE #107)</a></strong> opens at 5&nbsp;PM Sunday and Tuesday to Saturday and is closed Monday, per its site, so the 5 to 7&nbsp;PM happy hour in our records does not run Mondays. Prices in our records: 2&nbsp;oz cocktails at $12, 8&nbsp;oz house wine at $12 and three vegan wings at $7.</p>
<p><strong><a href="/calgary-se/venues/2140">Dirty Duck Pub (1336 9 Ave SE)</a></strong> lists a happy hour but publishes no current times or prices online, and its specials page dates from 2022. Our records say 4 to 7&nbsp;PM daily. Call first.</p>
<p><strong><a href="/calgary/venues/2061">Vegan Street (1413 9 Ave SE)</a></strong> runs a daily 3 to 5&nbsp;PM happy hour, according to its site: $6 draft, house wine and prosecco, $4 off sharing plates and fries, and $10 double margaritas. Thursday is an all-day happy hour. A directory lists Tuesday to Sunday hours, so call first.</p>

<h2>NW, SE and NE highlights</h2>
<p>Outside the centre, taprooms and pubs carry the cheapest prices.</p>
<p><strong><a href="/calgary-nw/venues/3425">Charcut University District (4150 University Ave NW)</a></strong> takes 50% off wine, beer, cocktails, zero-proof drinks and salumeria, Tuesday to Friday, 2 to 5&nbsp;PM.</p>
<p><strong><a href="/calgary-se/venues/701">Original Joe's Restaurant &amp; Bar (Quarry Park) (163 Quarry Park Blvd SE #1009)</a></strong> serves 14&nbsp;oz OJ's draught (blonde lager or red ale) and 5&nbsp;oz house wine at $5, daily, 2 to 5&nbsp;PM, in our records, with a late window from 9&nbsp;PM to close.</p>
<p><strong><a href="/calgary/venues/3235">Tool Shed Beer &amp; BBQ (801 30 St NE #9)</a></strong> has the cheapest craft pour: 5&nbsp;oz core beer at $3 and small batch at $3.25, daily, 2 to 5&nbsp;PM. The taproom closes for some private events, so check before you go.</p>
<p><strong><a href="/calgary-ne/venues/668">The Workbench Bar &amp; Grill (5269 Memorial Drive East)</a></strong> does not publish its happy hour online, so call 403-248-1330 to confirm. Our records say 4 to 7&nbsp;PM daily: domestic beer at $4.99, domestic pints at $5.99, shooters and highballs at $3.99 and appetizers at $5.99.</p>

<h2>What's not on this list</h2>
<p>Competitor lists name Calcutta Cricket Club and Home and Away (both from Daily Hive's 2022 roundup), Broken City and Catch, and we do not track any of them, so we cannot confirm a deal or whether they are open. We track Cleaver on 17th and Big Fish &amp; Open Range in Renfrew, with no current special for either. Venues that publish a happy hour without prices, such as Bizarre Gastro Pub and Lulu Bar, are omitted rather than guessed.</p>

<h2>Frequently asked questions</h2>
<h3>What time is happy hour in Calgary?</h3>
<p>The most common window is 2 to 5&nbsp;PM, which 47 venues in TodaysTab's October 31, 2026 data use. The next most common is 3 to 6&nbsp;PM at 32 venues. Some bars run a second window from 9&nbsp;PM to close, so check each venue's days.</p>
<h3>Where is the cheapest happy hour in Calgary?</h3>
<p>Tool Shed Beer &amp; BBQ (801 30 St NE) has 5&nbsp;oz core beer at $3, daily from 2 to 5&nbsp;PM. The Bank and Baron lists a $4.50 lager from 3 to 6&nbsp;PM, and Comery Block Barbecue takes $2 off South Block draught, Monday to Friday, 3 to 6&nbsp;PM.</p>
<h3>Is there a happy hour after 8 PM in Calgary?</h3>
<p>Yes. Alberta dropped its 8&nbsp;PM cutoff in June 2016, per Global News. Lonely Mouth Bar has cocktails from $10 after 9&nbsp;PM Sunday to Thursday, and Watchman's Pub &amp; Eatery runs Midnight Madness from 12 to 2&nbsp;AM with $5 well hi-balls.</p>
<h3>Are there minimum prices for drinks in Alberta?</h3>
<p>Yes. Alberta sets minimum drink prices, so specials are discounts rather than free drinks. Global News reported in 2016 that the 8&nbsp;PM cutoff was removed. The AGLC raised the minimums in June 2026 and the province ordered that reversed within two weeks, so check aglc.ca for current figures.</p>
<h3>Which Calgary bars have happy hour on weekends?</h3>
<p>King Eddy lists happy hour specials from 2 to 6&nbsp;PM, though hours change on event days. Lonely Mouth Bar, Porch, Blanco Cantina, Tool Shed Beer &amp; BBQ and Vegan Street list daily windows, and Ikemen Ramen Bar lists Friday and Saturday, 3 to 6&nbsp;PM, in our records.</p>
<h3>Where can I find happy hour on 17 Avenue SW?</h3>
<p>Lonely Mouth Bar (528 17 Ave SW) takes 50% off cocktails, beer and wine from 2 to 5&nbsp;PM daily. Porch (730 17 Ave SW) has a daily 2 to 5&nbsp;PM window, and Comery Block Barbecue (638 17 Ave SW) takes $2 off South Block draught on weekdays from 3 to 6&nbsp;PM.</p>
<h3>How do I know these Calgary deals are current?</h3>
<p>Each deal here had confidence of 0.7 or higher and was re-checked within 45 days of October 31, 2026. Where a venue's own site and our records differ, we say so above. Open the live region pages for today's specials, and call ahead when a venue publishes no times or prices.</p>

<h2>More Calgary specials and nearby guides</h2>
<p>This guide is a snapshot from October 31, 2026. The live pages are current: <a href="/calgary">Calgary</a>, <a href="/calgary-sw">Calgary SW</a>, <a href="/calgary-nw">Calgary NW</a>, <a href="/calgary-se">Calgary SE</a> and <a href="/calgary-ne">Calgary NE</a>. Browse by day: <a href="/calgary/thursday">Thursday</a>, <a href="/calgary/friday">Friday</a> and <a href="/calgary/saturday">Saturday</a>. Know a deal we missed? <a href="/calgary/submit">Submit it here</a>. See the <a href="/calgary/blog">Calgary blog</a> and <a href="/calgary/blog/how-we-verify-every-special">how we verify every special</a>. Compare with our guides to <a href="/edmonton/blog/happy-hours-edmonton-2026">Edmonton</a>, <a href="/kelowna/blog/happy-hours-kelowna-2026">Kelowna</a>, <a href="/ottawa/blog/happy-hours-ottawa">Ottawa</a>, <a href="/halifax/blog/happy-hours-halifax">Halifax</a>, <a href="/hamilton/blog/happy-hours-hamilton">Hamilton</a> and <a href="/barrie-simcoe-county/blog/happy-hours-barrie">Barrie</a>.</p>
`,
  },
  {
    slug: "happy-hours-hamilton",
    category: "Guide",
    regions: ["hamilton"],
    title: "Hamilton Happy Hours 2026: 24 Spots With Deals",
    metaDescription:
      "Hamilton happy hours 2026: 24 spots with deals, from $4.99 beer to $8 pints daily at The Judge. Days, times and prices, checked October 31, 2026.",
    publishedAt: "2026-10-31",
    excerpt:
      "As of October 31, 2026, TodaysTab tracks current specials at 44 Hamilton venues, and 2 to 5 PM is the most common happy hour window.",
    contentHtml: `
<p>Quick answer: The most common Hamilton happy hour window is 2 to 5&nbsp;PM, with pints from $5 to $9. The downtown Hess Village and Augusta Street area has the most choice, including $8 pints daily from 3 to 6&nbsp;PM at The Judge (eat in only). As of October 31, 2026, TodaysTab tracks current specials at 44 Hamilton venues and lists 24 here.</p><p>Last verified October 31, 2026. Where a venue's own site and our records differ, or a venue publishes no times or prices, we say so, and you should call ahead. We re-check the list monthly.</p><table><thead><tr><th>Venue</th><th>Deal</th><th>Days and times</th><th>Price</th><th>Neighbourhood</th></tr></thead><tbody><tr><td><a href="/hamilton/venues/6759">The Judge</a></td><td>Pints and 25% off shareables (eat in only)</td><td>Daily, 3-6&nbsp;PM</td><td>$8 pints</td><td>Hess Village / Augusta St</td></tr><tr><td><a href="/hamilton/venues/2261">Plank Restobar (Augusta)</a></td><td>Appy Hour: poke spoons and classic cocktails (dine in)</td><td>Mon-Fri, 2-5&nbsp;PM</td><td>$10 poke spoons and cocktails</td><td>Hess Village / Augusta St</td></tr><tr><td><a href="/hamilton/venues/6763">B-Side Social</a></td><td>Cocktails, 18&nbsp;oz draught, oysters</td><td>Daily, 4-6&nbsp;PM</td><td>$10 cocktails, $7 Budweiser, $2 oysters</td><td>Hess Village / Augusta St</td></tr><tr><td><a href="/hamilton/venues/6770">radius on Hess</a></td><td>Food items and cocktails</td><td>Daily, 3-5&nbsp;PM</td><td>$15 items and cocktails</td><td>Hess Village / Augusta St</td></tr><tr><td><a href="/hamilton/venues/2241">The James Public Eatery</a></td><td>18&nbsp;oz Social Lager draught</td><td>Sun-Thu, until 5&nbsp;PM</td><td>$5 lager</td><td>James Street North</td></tr><tr><td><a href="/hamilton/venues/6827">Malarkey</a></td><td>Lager, house wine, draft cocktails (call ahead)</td><td>5-7&nbsp;PM, Wed-Sat hours listed</td><td>$6 lager, $10 cocktails</td><td>Ottawa Street North</td></tr><tr><td><a href="/hamilton/venues/6778">Ottawa Street Local Pub and Venue</a></td><td>$2 off all pints</td><td>Mon-Fri, 3-6&nbsp;PM</td><td>$2 off</td><td>Ottawa Street North</td></tr><tr><td><a href="/hamilton/venues/6801">Déjà Vu Bar and Karaoke</a></td><td>Beer</td><td>Tue-Sun, 6-8&nbsp;PM</td><td>$4.99</td><td>Concession Street (Mountain)</td></tr><tr><td><a href="/hamilton/venues/2253">Brewer's Blackbird Brewery &amp; Kitchen</a></td><td>Barstool pints</td><td>Daily, 2-5&nbsp;PM</td><td>$5 pints</td><td>Ancaster</td></tr><tr><td><a href="/hamilton/venues/6773">Turtle Jack's Upper James</a></td><td>Draught, wine, margarita, shareables</td><td>Daily, 2-5&nbsp;PM and 8&nbsp;PM to close</td><td>$7 draught (October check)</td><td>Upper James (Mountain)</td></tr></tbody></table><p>Hamilton is bigger than its downtown. The City of Hamilton was incorporated on January 1, 2001 as the successor to six former municipalities: Ancaster, Dundas, Flamborough, Glanbrook, Hamilton and Stoney Creek (<a href="https://www.hamilton.ca/sites/default/files/2022-06/01-219-OfficeConsolidation06.15.2022.pdf">the City of Hamilton Act, 1999, as recited in the city's parks by-law 01-219</a>), so Ancaster, Dundas and Stoney Creek are covered below. According to TodaysTab's checks on October 31, 2026, 44 of the 139 active venues we track in Hamilton have a special with a stated day or time window, confidence of 0.7 or higher and a check within the last 45 days. The most common timed happy hour is 2 to 5&nbsp;PM, used by at least 6 venues. Five venues run a late-night window: The James Public Eatery, The Keg on Upper James, Turtle Jack's and both Ye Olde Squire pubs. The lowest confirmed beer price is $4.75 for domestic bottles on Fridays at Wingporium. Search results for Hamilton happy hour are mostly restaurant directory pages such as OpenTable's list; this guide adds days, times, prices and a check date for each venue.</p><h2>Hess Village and Augusta Street</h2><p>Downtown's pub strip: Hess Street South between Main Street West and King Street West is the city's best-known entertainment district, and Augusta Street, a short walk away, has a run of pubs.</p><p><strong><a href="/hamilton/venues/6759">The Judge (25 Augusta St)</a></strong> runs happy hour daily from 3 to 6&nbsp;PM with $8 pints and 25% off shareables, eat in only.</p><p><strong><a href="/hamilton/venues/2261">Plank Restobar (Augusta) (18 Augusta St)</a></strong> runs Appy Hour Monday to Friday, 2 to 5&nbsp;PM, with $10 poke spoons and $10 classic cocktails listed, dine in only. Check the Appy Hour menu for pint prices.</p><p><strong><a href="/hamilton/venues/6763">B-Side Social (17 Augusta St)</a></strong> has a daily 4 to 6&nbsp;PM menu: signature cocktails at $10, 18&nbsp;oz Budweiser or Bud Light draught at $7, Guinness at $9, half-price wine bottles and oysters of the day at $2 each.</p><p><strong><a href="/hamilton/venues/6770">radius on Hess (18 Hess St S)</a></strong> lists a daily 3 to 5&nbsp;PM happy hour menu of 10 food items at $15 each, with $15 cocktails and a 9&nbsp;oz pour of wine for the 6&nbsp;oz price. Tuesdays add $6 spritzes and craft beer, and Thursdays add $12 martinis.</p><h2>James Street North</h2><p>A restaurant and arts street running north from King Street toward the harbour, with taprooms and bars along it.</p><p><strong><a href="/hamilton/venues/2241">The James Public Eatery (229 James St N)</a></strong> runs a drink happy hour Sunday to Thursday until 5&nbsp;PM: 18&nbsp;oz Social Lager at $5, Budweiser or Bud Light at $6, a 20&nbsp;oz Guinness at $9 and 5&nbsp;oz Jackson-Triggs wine at $6. Shareables are 25% off after 9&nbsp;PM until the kitchen closes.</p><p><strong><a href="/hamilton/venues/6811">FARSIDE (288 James St N)</a></strong> has a daily 6 to 8&nbsp;PM drink special: $6 pints of lager, $6 pints of Purple seltzer and $9 Paper Planes.</p><h2>Downtown and Corktown: York Boulevard and Young Street</h2><p>Wing nights in the downtown core and in Corktown, the historic Irish neighbourhood east of James Street.</p><p><strong><a href="/hamilton/venues/6760">Iron Cow Public House (101 York Blvd)</a></strong> is inside the TD Coliseum complex and has Tuesday wing night from 5&nbsp;PM: 1&nbsp;lb of chicken wings for $10 with any beverage.</p><p><strong><a href="/hamilton/venues/6765">The Corktown Irish Pub (175 Young St)</a></strong> sells a 1&nbsp;lb wing special for $9.95 on Thursdays and a haddock fish and chips special for $15.49 on Fridays from 6:30 to 8:30&nbsp;PM.</p><h2>Locke Street</h2><p>A walkable stretch of restaurants and pubs on Locke Street South, west of downtown.</p><p><strong><a href="/hamilton/venues/6768">Ye Olde Squire, Downtown Hamilton (Locke St.) (225 Locke St S)</a></strong> runs happy hour daily from 2 to 5&nbsp;PM and again from 8&nbsp;PM to close, with pints, cocktails and shareables; the site lists no prices. Wednesdays are half-price bottles of wine, dine in only, and Sundays are buy one, get one 50% off one-piece fish and chips.</p><p><strong><a href="/hamilton/venues/6852">Bardō Locke St. (258 Locke St S)</a></strong> is better for wine than beer: half-price bottles of wine on Wednesdays from 11&nbsp;AM to close.</p><h2>Ottawa Street North</h2><p>A shopping street in the east end of the lower city, with a bar and a pub that run daily deals.</p><p><strong><a href="/hamilton/venues/6827">Malarkey (300 Ottawa Street North)</a></strong> lists a 5 to 7&nbsp;PM happy hour in TodaysTab's October check: Malarkey Lager and Light at $6, house red and white wine at $6 and draft cocktails at $10. The bar's site lists Wednesday to Saturday hours only, so call ahead.</p><p><strong><a href="/hamilton/venues/6778">Ottawa Street Local Pub and Venue (226 Ottawa Street North)</a></strong> takes $2 off all pints Monday to Friday from 3 to 6&nbsp;PM. Wing day is Monday and Thursday at $9.99 a pound, and Wednesdays are half off bottles of wine.</p><h2>East End: Barton, Cannon and Main Street East</h2><p>Neighbourhood taverns and bars with the lowest prices on this list.</p><p><strong><a href="/hamilton/venues/6766">Bernie's Tavern (1103 Cannon St E)</a></strong> sets a different deal each day: Sunday domestic beer buckets at $25 and $6 Caesars and mimosas, Monday 1&nbsp;lb of wings at $10, Tuesday $5 tacos, $5 Sol and $5 tequila, Friday fish fry at $18 with a $6 Fairweather High Grade draft, Saturday tavern cocktails at $10.95.</p><p><strong><a href="/hamilton/venues/6821">East End Social Bar &amp; Grill (1342 Main St E)</a></strong> runs happy hour daily from 11&nbsp;AM to 6&nbsp;PM: Molson bottles at $5, select tall boys at $5.75, domestic mini jugs at $9 and bar shots at $4.50.</p><p><strong><a href="/hamilton/venues/6819">Wingporium at the Prince Eddy (737 Barton St E)</a></strong> has domestic bottles at $4.75 on Fridays, a pound of wings with a beverage for $12 on Tuesdays and Killbeggan shots at $4.25 all day Saturday.</p><h2>North End: Burlington Street East</h2><p>The industrial strip near the harbour, north of downtown.</p><p><strong><a href="/hamilton/venues/6793">Collective Arts Hamilton (207 Burlington St E)</a></strong> lists happy hour Monday to Thursday from 4 to 6&nbsp;PM at its Burlington Street East taproom. It does not publish items or prices, so call to confirm.</p><h2>Hamilton Mountain</h2><p>Chain restaurants along Upper James Street and neighbourhood bars on Concession Street, above the escarpment.</p><p><strong><a href="/hamilton/venues/6773">Turtle Jack's Upper James (1180 Upper James St)</a></strong> runs happy hour daily from 2 to 5&nbsp;PM and again from 8&nbsp;PM to close. TodaysTab's October check lists Canadian or Coors Light draught at $7, Heineken at $8, house wine at $6, a Perfect Margarita at $6 and a classic burger at $15; see the venue's menu for current prices.</p><p><strong><a href="/hamilton/venues/6857">The Keg Steakhouse + Bar - Hamilton Mountain (1170 Upper James Street)</a></strong> lists happy hour in the bar and lounge (dine in) Monday to Friday from 4 to 5:30&nbsp;PM, Saturday and Sunday from 3 to 5&nbsp;PM, and every night from 9&nbsp;PM to close. Prices are on the location's page at thekeg.com.</p><p><strong><a href="/hamilton/venues/6780">Ye Olde Squire - Hamilton Mountain (Upper James) (1508 Upper James St)</a></strong> runs happy hour daily from 2 to 5&nbsp;PM and from 8&nbsp;PM to close with pints, cocktails and shareables. The venue site lists no prices; TodaysTab's October check recorded $2 off wine, prosecco, domestic beer, house rail and beer cocktails. Mondays are $10 for 1&nbsp;lb of wings.</p><p><strong><a href="/hamilton/venues/6801">Déjà Vu Bar and Karaoke (445 Concession St)</a></strong> sells beer for $4.99 from 6 to 8&nbsp;PM, Tuesday to Sunday (closed Mondays). Tuesday trivia cocktails are $9.99 and Thursday shots are $3.99.</p><h2>Ancaster</h2><p>A former town now part of the City of Hamilton, with pubs along Wilson Street.</p><p><strong><a href="/hamilton/venues/2253">Brewer's Blackbird Brewery &amp; Kitchen (375 Wilson Street E)</a></strong> has a barstool happy hour every day from 2 to 5&nbsp;PM: $5 pints and $1 an ounce for Chateau des Charmes wine. On Sundays a margherita pizza and a litre of beer is $25.</p><p><strong><a href="/hamilton/venues/1016">Brassie Pub (73 Wilson St W)</a></strong> lists a different deal most days: Monday $6 well drinks, Tuesday $6 Corona, Wednesday $7 domestic pints and half-price wings (dine in only), Thursday half-price appetizers (dine in only).</p><h2>Dundas and Stoney Creek</h2><p>Two more former towns, now parts of the city: Dundas west of downtown, and Stoney Creek on the east side.</p><p><strong><a href="/hamilton/venues/6795">Barrel Heart Brewing (104 King St W Unit 1, Dundas)</a></strong> lists half-priced wine by the glass on Wednesdays from 4 to 7&nbsp;PM, per TodaysTab's October check; call to confirm.</p><p><strong><a href="/hamilton/venues/6860">The Innsville Restaurant (1143 Hamilton Regional Road 8, Stoney Creek)</a></strong> takes bar rail shots and domestic pints down to $6 Monday to Friday from 2 to 5&nbsp;PM. Tuesday tall boys are $6.75 in the pub and Wednesday wines are $5.50 a glass in the pub, per TodaysTab's October check.</p><h2>What's not on this list</h2><p>We track The Ship (23 Augusta Street), The Grand Hamilton (69 Augusta Street), Doors Pub (56 Hess Street South) and 11:11 (150 James Street South) with no confirmed deal, so they are not listed. Handsome Dave's Neighbourhood Bar (61 Young Street) advertised half-price wings on Thursdays in a September 3 post, and we could not re-confirm it. Prime Steak + Raw Bar has a happy hour in our data, but it is in Burlington, outside the city, so we left it out.</p><h2>Frequently asked questions</h2><h3>What time is happy hour in Hamilton?</h3><p>The most common window is 2 to 5&nbsp;PM, used by at least 6 venues in TodaysTab's records as of October 31, 2026, including Plank Restobar, Turtle Jack's and Brewer's Blackbird. Others run 3 to 6&nbsp;PM (The Judge), 4 to 6&nbsp;PM (B-Side Social), 5 to 7&nbsp;PM (Malarkey, call ahead) and 6 to 8&nbsp;PM (Farside).</p><h3>Where is the cheapest beer in Hamilton?</h3><p>Wingporium at 737 Barton Street East lists domestic bottles at $4.75 on Fridays, and Déjà Vu at 445 Concession Street sells beer for $4.99 from 6 to 8&nbsp;PM, Tuesday to Sunday. For a pint, Brewer's Blackbird in Ancaster charges $5 daily from 2 to 5&nbsp;PM at the barstools.</p><h3>Which Hamilton bars have late-night happy hour?</h3><p>Five venues run a late window: The James Public Eatery (25% off shareables after 9&nbsp;PM, Sunday to Thursday), The Keg on Upper James (9&nbsp;PM to close daily), Turtle Jack's and both Ye Olde Squire pubs, on Locke Street and Upper James (8&nbsp;PM to close daily).</p><h3>Is there a happy hour in Hamilton on Sunday?</h3><p>Yes. The Judge runs $8 pints from 3 to 6&nbsp;PM on Sundays (eat in only), The James Public Eatery sells $5 Social Lager until 5&nbsp;PM, and Bernie's Tavern has $25 domestic beer buckets. Plank Restobar's happy hour is Monday to Friday only, so it does not run on Sundays.</p><h3>Is happy hour legal in Ontario?</h3><p>Yes. The AGCO removed its ban on the terms "Happy Hour" and "Cheap Drinks" in 2019. Its guidelines still prohibit "2 for 1 drinks" and "every 3rd drink is $2" promotions, and require that <a href="https://www.agco.ca/en/alcohol/appendix-2-registrars-guidelines-advertising-and-promotion/pricing-and-promotion-liquor">drink prices and promotions be responsible in nature</a>. Bars therefore discount by price or time.</p><h3>Are Ancaster, Dundas and Stoney Creek part of Hamilton?</h3><p>Yes. Ancaster, Dundas, Flamborough, Glanbrook and Stoney Creek merged with the old City of Hamilton on January 1, 2001. This guide includes Brewer's Blackbird and Brassie Pub in Ancaster, Barrel Heart in Dundas and The Innsville in Stoney Creek. Burlington is a separate city and is not included.</p><h2>More Hamilton deals and nearby guides</h2><p>This guide is a snapshot from October 31, 2026; the live <a href="/hamilton">Hamilton page</a> is always current. See what is on tonight with the <a href="/hamilton/wednesday">Wednesday</a>, <a href="/hamilton/thursday">Thursday</a> and <a href="/hamilton/friday">Friday</a> pages, read <a href="/hamilton/blog/how-we-verify-every-special">how we verify every special</a>, browse the <a href="/hamilton/blog">Hamilton blog</a>, or tell us about a missing deal on the <a href="/hamilton/submit">submit page</a>. Other TodaysTab happy hour guides: <a href="/kelowna/blog/happy-hours-kelowna-2026">Kelowna</a>, <a href="/edmonton/blog/happy-hours-edmonton-2026">Edmonton</a>, <a href="/calgary/blog/happy-hours-calgary">Calgary</a>, <a href="/ottawa/blog/happy-hours-ottawa">Ottawa</a>, <a href="/halifax/blog/happy-hours-halifax">Halifax</a> and <a href="/barrie-simcoe-county/blog/happy-hours-barrie">Barrie</a>.</p>
`,
  },
  {
    slug: "happy-hours-halifax",
    category: "Guide",
    regions: ["halifax"],
    title: "Halifax Happy Hours 2026: 27 Spots With Deals",
    metaDescription:
      "Halifax happy hour 2026: 27 spots with deals by neighbourhood, from $1.25 beers to $12 cocktails. Days, times and prices checked October 31.",
    publishedAt: "2026-10-31",
    excerpt:
      "Halifax happy hour most often runs 4-6 PM, and Little Fish Wine Bar lists oysters at $1.50 each daily from 4 to 5 PM.",
    contentHtml: `
<p>Quick answer: Halifax happy hour most often runs 4-6&nbsp;PM, a window that 7 of the 31 venues with a happy-hour deal in TodaysTab's data use as of October 31, 2026. Listed prices start at $1.25 beers on one student night and $1.50 oysters, and reach $12 cocktails. Downtown, around Argyle, Grafton and Barrington streets, has the most deals. This guide covers 27 venues.</p>
<p>Last verified October 31, 2026. Where a venue's own site and our records differ, or a venue publishes no times or prices, we say so, and you should call ahead. We re-check the list monthly.</p>
<table><thead><tr><th>Venue</th><th>Deal</th><th>Days and times</th><th>Price</th><th>Neighbourhood</th></tr></thead><tbody>
<tr><td><a href="/halifax/venues/7991">Highwayman</a></td><td>Oysters, minimum order of six</td><td>Mon-Sat, 4-5&nbsp;PM</td><td>$3 each</td><td>Downtown (Barrington Street)</td></tr>
<tr><td><a href="/halifax/venues/7981">HUX Bar &amp; Bistro</a></td><td>Classic cocktails and draught beer</td><td>Tue-Sun, 4-6&nbsp;PM</td><td>$10 and $6</td><td>Downtown (Barrington Street)</td></tr>
<tr><td><a href="/halifax/venues/7993">Bar Sofia</a></td><td>Regular or spicy margaritas</td><td>Daily, 4-6&nbsp;PM</td><td>$8</td><td>Waterfront (Queen's Marque)</td></tr>
<tr><td><a href="/halifax/venues/7989">Seaport Social</a></td><td>Draught beer and house wine, dine-in only</td><td>Daily, 4-6&nbsp;PM</td><td>$5 and $6</td><td>Downtown South (Hollis Street)</td></tr>
<tr><td><a href="/halifax/venues/7977">The Duke's Public House</a></td><td>Cocktails and appetizers</td><td>Daily, 4-6&nbsp;PM</td><td>$2 off, 20% off</td><td>North End (Gottingen Street)</td></tr>
<tr><td><a href="/halifax/venues/7978">The Loose Cannon</a></td><td>Domestic bottles and highballs</td><td>Daily, 4-7&nbsp;PM</td><td>$4.50</td><td>Downtown (Argyle Street)</td></tr>
<tr><td><a href="/halifax/venues/8029">Little Fish Wine Bar</a></td><td>Oysters, drink purchase required</td><td>Daily, 4-5&nbsp;PM</td><td>$1.50 each</td><td>Downtown (Argyle Street)</td></tr>
<tr><td><a href="/halifax/venues/8065">Café Lunette</a></td><td>Wine, cocktails and bar bites</td><td>Daily, 3-6&nbsp;PM</td><td>$10 each</td><td>Waterfront (Lower Water Street)</td></tr>
</tbody></table>
<p>Halifax Regional Municipality counted 439,819 residents in the 2021 census, up 9.1% from 2016, according to <a href="https://www12.statcan.gc.ca/census-recensement/2021/as-sa/fogs-spg/page.cfm?lang=E&amp;topic=1&amp;dguid=2021A00051209034">Statistics Canada</a>. According to TodaysTab's checks on October 31, 2026, we track 153 active venues in the Halifax area. 41 have at least one verified special with a stated day or time window, and 31 of those carry a happy-hour deal. The most common stated window is 4-6&nbsp;PM (7 venues). Five venues run drink specials from 9&nbsp;PM or later. Friday has happy-hour deals at 29 of those 31 venues, Monday at 22.</p>
<h2>Downtown: Argyle, Grafton and Granville</h2><p>The densest strip of pubs on the peninsula, close to the waterfront and the Grand Parade.</p>
<p><strong><a href="/halifax/venues/8048">Bitter End Martini Bar &amp; Restaurant (1572 Argyle Street)</a></strong> runs Monday and Friday to Sunday, 4-7&nbsp;PM (the bar is closed Tuesday to Thursday), with domestic draught at $5.99 and craft draught at $6.99, per its site.</p>
<p><strong><a href="/halifax/venues/7978">The Loose Cannon (1566 Argyle Street)</a></strong> runs daily 4-7&nbsp;PM: domestic bottles and highballs $4.50, imported bottles $5.50, 1&nbsp;oz cocktails $5, 20&nbsp;oz domestic draught $6.50, imported $7.50. Wine is $2 off a glass and $10 off a bottle. The bar's site does not list these, so call ahead at 902-407-8797.</p>
<p><strong><a href="/halifax/venues/7994">The Stubborn Goat Gastropub (1580 Argyle Street)</a></strong> has a Sunday to Thursday 2-5&nbsp;PM happy hour: well shots $5, house wine $6, local draught $7 and 20% off appetizers. On Wednesdays in that window, a 20&nbsp;oz Killick lager with 1&nbsp;lb of wings is $20. Later brewery nights are $7 pints: Nine Locks Thursday from 7&nbsp;PM, Propeller Friday and Garrison Saturday from 8&nbsp;PM. The venue's site lists no happy hour, so treat this as TodaysTab's October data.</p>
<p><strong><a href="/halifax/venues/8029">Little Fish Wine Bar (1740 Argyle Street)</a></strong> has oysters at $1.50 each daily 4-5&nbsp;PM with a drink purchase, per TodaysTab's October 24 check. Its site links an Oyster Happy Hour page, but we could not read a price or time there, so confirm by phone at 902-422-4421.</p>
<p><strong><a href="/halifax/venues/7984">Bearly's House of Blues &amp; Ribs (1579 Grafton Street)</a></strong> rotates by night, per TodaysTab's October 24 check: Monday 6-8&nbsp;PM Bear Brew $5.75, then Oland draught $6.50 until close; Tuesday from 7&nbsp;PM Oland Export draught $6.50; Wednesday and Thursday from 7&nbsp;PM $6 for draught or well shots; Friday 4-7&nbsp;PM $5 off wine bottles; weekends until 5&nbsp;PM Caesars or mimosas $7; Sunday from 7&nbsp;PM $2 off wine and whiskey.</p>
<p><strong><a href="/halifax/venues/8037">Niche Lounge (1645 Granville Street)</a></strong> lists, Tuesday to Saturday from 4&nbsp;PM and Sunday from 1&nbsp;PM (closed Mondays), well shots $5.50, 8&nbsp;oz house wine $8, 20&nbsp;oz draught $6.25 and select 2&nbsp;oz cocktails $12, plus half-price select appetizers 4-6:30&nbsp;PM. Its own site shows only $7 Good Robot 473&nbsp;ml cans, so call to confirm the rest.</p>
<p><strong><a href="/halifax/venues/7979">Roxbury Urban Dive Bar (1743 Grafton Street)</a></strong> advertises Thursday student nights and late-night drink specials. The prices come from TodaysTab's October 24 check of its banners: Thursday $3.50 drinks, $1.25 beers and a $1 pizza slice, and Friday and Saturday from 10&nbsp;PM $2.50 drinks with a $5 cover before 11&nbsp;PM. Its site shows no prices, so confirm before you go.</p>
<p><strong><a href="/halifax/venues/5524">The Dome (1739 Grafton Street)</a></strong> runs Friday and Saturday 10&nbsp;PM to 3:30&nbsp;AM with $2.50 singles, $5 doubles and $11 mini pitchers, per TodaysTab's October check.</p>
<p><strong><a href="/halifax/venues/5527">Pacifico (5171 George Street)</a></strong> lists happy hour Friday and Saturday 4-8&nbsp;PM and 11&nbsp;PM to 2&nbsp;AM. Its site also mentions Thursday, but its posted hours show only Friday and Saturday, so call ahead. It publishes no prices we could read.</p>
<h2>Downtown: Barrington Street, Market Street and Hollis Street</h2><p>Barrington is the cocktail and oyster street, with several kitchens that open at 4&nbsp;PM.</p>
<p><strong><a href="/halifax/venues/7991">Highwayman (1673 Barrington Street)</a></strong> runs 4-5&nbsp;PM Monday to Saturday in our data (its site says daily): oysters $3 each with a minimum of six, Americano or Aperol Spritz $10, Tom Collins or Mojito $12, cava $12 a glass or $50 a bottle, and $35 snack or seafood platters. The site lists the hour but not these prices.</p>
<p><strong><a href="/halifax/venues/7981">HUX Bar &amp; Bistro (1533 Barrington Street)</a></strong> serves $10 classic cocktails and $6 draught beer 4-6&nbsp;PM, Tuesday to Sunday by its posted hours (its header says every day, so confirm on Mondays). Its site lists late-night hours of 11&nbsp;PM to 2&nbsp;AM on Friday and Saturday.</p>
<p><strong><a href="/halifax/venues/8081">Barrington Steakhouse &amp; Oyster Bar (1662 Barrington Street)</a></strong> has "Tip and Sip" Monday to Saturday 4-6&nbsp;PM: six oysters and a glass of bubbly for $25, according to TodaysTab's October 27 check. The site mentions the promo without times or price, so call 902-407-5001.</p>
<p><strong><a href="/halifax/venues/5563">LevelBar (1725 Market Street)</a></strong>, in the Prince George Hotel, lists daily 4:30-6:30&nbsp;PM: 16&nbsp;oz local tap $6.50, sangria $8, 6&nbsp;oz wines $8, mussels and fries $12, nachos $14, wings $13, per TodaysTab's October 28 check. The hotel's page does not show the menu, so call ahead.</p>
<p><strong><a href="/halifax/venues/7989">Seaport Social (1181 Hollis Street)</a></strong>, in the Westin Nova Scotian, lists a daily 4-6&nbsp;PM happy hour, dine-in only, with $5 draught and $6 house wine, per its OpenTable listing and TodaysTab's October 24 check.</p>
<h2>Waterfront: Lower Water Street</h2><p>Queen's Marque and the boardwalk sit at the foot of the downtown grid, with patios when the weather allows.</p>
<p><strong><a href="/halifax/venues/7993">Bar Sofia (1709 Lower Water Street)</a></strong> runs $8 regular or spicy margaritas daily 4-6&nbsp;PM, and its site shows the same. On Tuesdays margaritas are $8 all day and tacos are $12 for three or $4.50 each, per TodaysTab's October 28 check.</p>
<p><strong><a href="/halifax/venues/8065">Café Lunette (1741 Lower Water Street)</a></strong> lists daily 3-6&nbsp;PM: $10 wine, $10 cocktails, $10 bar bites and a $10 flute with frites, plus $6 frites until 5&nbsp;PM, per TodaysTab's October 27 check. Wednesdays are 50% off bottles from the wine list.</p>
<p><strong><a href="/halifax/venues/8025">Peacock Wine Bar (1715 Lower Water Street)</a></strong> runs happy hour Tuesday to Saturday, from opening at 4&nbsp;PM until 6&nbsp;PM (closed Sunday and Monday), with local wines and cocktail specials. Burnside Toller Lite is $6 and Stillwell Stilly Pils is $7, per TodaysTab's October 25 check.</p>
<p><strong><a href="/halifax/venues/2292">Salt + Ash Beach House (1741 Lower Water Street)</a></strong> lists $12 signature cocktails, $7 glasses of wine, $1 off Nova Scotia craft beer and $6 bar rail drinks on its site. The site gives different times in different places (2-5&nbsp;PM and from 9&nbsp;PM to close daily; 2-6&nbsp;PM with $5 beers; or Tuesday to Friday from 9&nbsp;PM and Saturday and Sunday 2-5&nbsp;PM), so call 902-334-5999 to confirm.</p>
<h2>Spring Garden Road</h2><p>The shopping street near Victoria Park, with two pubs that mix late nights and weekday discounts.</p>
<p><strong><a href="/halifax/venues/8022">Kai Brady's | Fancy Dive Bar (5679 Spring Garden Road)</a></strong> sells $6 pints of Pabst from 9&nbsp;PM to close daily, per TodaysTab's October 29 check; its site lists no specials.</p>
<p><strong><a href="/halifax/venues/1472">Your Father's Moustache (5686 Spring Garden Road)</a></strong> runs Monday to Friday 4-6&nbsp;PM discounts on domestic bottles, shots and Nine Locks, with no amounts posted, and Nine Locks pints are $7 all day Sunday, per TodaysTab's October 23 check. Call ahead.</p>
<h2>North End: Gottingen Street and Agricola Street</h2><p>North of Citadel Hill, Gottingen and Agricola are the independent-bar streets, with a distillery and a taproom among them.</p>
<p><strong><a href="/halifax/venues/7977">The Duke's Public House (2057 Gottingen Street)</a></strong> runs $2 off cocktails and 20% off appetizers daily 4-6&nbsp;PM, and its site shows the deal.</p>
<p><strong><a href="/halifax/venues/7980">Backlot HFX (2103 Gottingen Street)</a></strong> has happy hour daily 6-9&nbsp;PM with two free pool tables. It posts no prices.</p>
<p><strong><a href="/halifax/venues/8003">Propeller Brewing Company Gottingen Tap Room (2015 Gottingen Street)</a></strong> takes $1 off pints Monday to Friday 3-5&nbsp;PM, and $1 off growlers on Wednesdays, per TodaysTab's October 29 check.</p>
<p><strong><a href="/halifax/venues/8079">Compass Distillers (2533 Agricola Street)</a></strong> lists $10 cocktails 5-7&nbsp;PM Sunday and Tuesday to Saturday, including an Old Fashioned, Gin &amp; Tonic, Moscow Mule and Daiquiri. We last checked on October 9 and the site does not show the deal, so call 902-446-0234.</p>
<p><strong><a href="/halifax/venues/8026">Eliot &amp; Vine (2305 Clifton Street)</a></strong> (at Cunard) runs happy hour Tuesday to Sunday, 4-5:30&nbsp;PM, with buck-a-shuck oysters (limit eight, with a menu item) per its site. TodaysTab's October check also lists $7 wine and $7 beer. It is closed Mondays.</p>
<h2>Bedford and Dartmouth</h2><p>Our data is thin across the harbour: one Dartmouth pub and one Bedford taproom have verified weekly deals.</p>
<p><strong><a href="/halifax/venues/8012">Propeller Brewing Company Bedford Tap Room (1225 Bedford Highway, Bedford)</a></strong> takes $1 off pints Monday to Friday 3-5&nbsp;PM, and sells $6 pints of cerveza and black stout all day Sunday, per TodaysTab's October 27 check. Call ahead.</p>
<p><strong><a href="/halifax/venues/1484">Battery Park Beer Bar &amp; Eatery (62 Ochterloney Street, Dartmouth)</a></strong> sells $10 wings every Sunday from open to close with any beverage. We last checked on September 29 and the pub's site does not list it, so confirm before you go.</p>
<h2>What's not on this list</h2>
<p>The <a href="https://tasteofnovascotia.com/?p=27275">Taste of Nova Scotia happy hour guide</a> was published October 22, 2026 and lists 16 venues by weekly schedule, but does not say when each deal was last checked. The venues from it that we cannot confirm this month include Agricola Street Brasserie, Bramoso Pizzeria and Beer Bar, Harbour City Bar &amp; Grill, Morris East, Obladee Wine Bar, Primal Kitchen, SHUCK Seafood + Raw Bar, Tempo Food + Drink and The Press Gang. We track Lot Six Bar &amp; Restaurant, The Split Crow Pub and Durty Nelly's Irish Pub, but none has a current verified happy-hour window in our data. Brooklyn Warehouse, which that guide also lists, closed on March 29, 2025, per Global News. We add the checked date, the day-by-day window and the posted price.</p>
<h2>Frequently asked questions</h2>
<h3>What time is happy hour in Halifax?</h3><p>Most Halifax happy hours run 4-6&nbsp;PM, the stated window at 7 venues in TodaysTab's October 31, 2026 data. Others differ: Highwayman runs 4-5&nbsp;PM, Propeller takes $1 off pints 3-5&nbsp;PM on weekdays, Salt + Ash starts at 2&nbsp;PM, and The Loose Cannon runs until 7&nbsp;PM.</p>
<h3>Where is the cheapest happy hour in Halifax?</h3><p>On price per drink, Roxbury lists $1.25 beers on Thursdays, and Roxbury and The Dome list $2.50 drinks on Friday and Saturday nights from 10&nbsp;PM. For an early evening, The Loose Cannon sells $4.50 domestic bottles and highballs daily 4-7&nbsp;PM. Roxbury's deal is in our October data only, so call ahead.</p>
<h3>Which Halifax bars have late-night happy hour?</h3><p>Five venues run specials from 9&nbsp;PM or later: Kai Brady's with $6 Pabst pints from 9&nbsp;PM, Salt + Ash (its site lists a window from 9&nbsp;PM), Roxbury on Friday and Saturday from 10&nbsp;PM, The Dome 10&nbsp;PM to 3:30&nbsp;AM on those nights, and Pacifico 11&nbsp;PM to 2&nbsp;AM on Friday and Saturday.</p>
<h3>Where can I get cheap oysters at happy hour in Halifax?</h3><p>Little Fish Wine Bar lists $1.50 oysters daily 4-5&nbsp;PM with a drink purchase, so call to confirm. Highwayman charges $3 each with a minimum of six, 4-5&nbsp;PM Monday to Saturday. Barrington Steakhouse offers six oysters and a glass of bubbly for $25, Monday to Saturday 4-6&nbsp;PM. All three oyster prices come from our October checks, and only Barrington Steakhouse's site mentions its promo.</p>
<h3>Is there a happy hour on Sunday in Halifax?</h3><p>Yes. 25 of the 31 happy-hour venues in our data have a deal on Sundays. Examples: Bar Sofia margaritas $8 and Duke's cocktails $2 off, both 4-6&nbsp;PM, Bearly's $7 Caesars and mimosas until 5&nbsp;PM, and Compass Distillers $10 cocktails 5-7&nbsp;PM. Our data lists no Sunday deal at Highwayman or Barrington Steakhouse.</p>
<h3>How do I know these Halifax deals are current?</h3><p>TodaysTab lists a special only if it has a stated day or time window, a confidence score of 0.7 or higher and a check within 45 days of October 31, 2026. Competing lists rarely show when each deal was last checked. Where a venue's own site disagrees with our record, this page says so, and you should call ahead.</p>
<h2>More Halifax deals and other city guides</h2>
<p>This post is a snapshot, and the live <a href="/halifax">Halifax page</a> is current. See <a href="/halifax/friday">Friday</a>, <a href="/halifax/thursday">Thursday</a> and <a href="/halifax/sunday">Sunday</a> deals, browse the <a href="/halifax/blog">Halifax blog</a>, read <a href="/halifax/blog/how-we-verify-every-special">how we verify every special</a>, or <a href="/halifax/submit">submit a venue or correction</a>. Other guides: <a href="/kelowna/blog/happy-hours-kelowna-2026">Kelowna</a>, <a href="/edmonton/blog/happy-hours-edmonton-2026">Edmonton</a>, <a href="/calgary/blog/happy-hours-calgary">Calgary</a>, <a href="/ottawa/blog/happy-hours-ottawa">Ottawa</a>, <a href="/hamilton/blog/happy-hours-hamilton">Hamilton</a> and <a href="/barrie-simcoe-county/blog/happy-hours-barrie">Barrie</a>.</p>
`,
  },
  {
    slug: "happy-hours-barrie",
    category: "Guide",
    regions: ["barrie-simcoe-county"],
    title: "Barrie Happy Hours 2026: 21 Spots With Deals",
    metaDescription:
      "Barrie happy hours 2026: 21 Barrie and Simcoe County spots with deals by area, from a $3.50 beer to 70 cent wings, with days, times and prices.",
    publishedAt: "2026-10-31",
    updatedAt: "2026-10-31",
    excerpt:
      "TodaysTab checked 21 Barrie and Simcoe County venues on October 31, 2026, and the lowest confirmed drink is a $3.50 Pabst Blue Ribbon on Saturdays at Lockeroom.",
    contentHtml: `
<p>Quick answer: Barrie happy hours mostly run 2 to 5&nbsp;PM, with drinks from $3.50 to $7 and tacos, wings and apps at $3.99 to $12. The south end around Park Place has the most chain restaurants, downtown Dunlop Street has the pubs. As of October 31, 2026, TodaysTab lists 21 Barrie and Simcoe County spots with a checked deal.</p>
<p>Last verified October 31, 2026. Where a venue's own site and our records differ, or a venue publishes no times or prices, we say so, and you should call ahead. We re-check the list monthly.</p>
<table>
<thead><tr><th>Venue</th><th>Deal</th><th>Days and times</th><th>Price</th><th>Neighbourhood</th></tr></thead>
<tbody>
<tr><td><a href="/barrie-simcoe-county/venues/4517">The Canadian Brewhouse</a></td><td>Stein of Bud Light, tacos, chips and queso</td><td>Mon-Sat 2-6&nbsp;PM, plus 9&nbsp;PM to close</td><td>$3.99</td><td>Park Place</td></tr>
<tr><td><a href="/barrie-simcoe-county/venues/1573">McReilly's Public House</a></td><td>1&nbsp;oz bar rail or 16&nbsp;oz beer</td><td>Mon-Thu 3-7&nbsp;PM</td><td>$5</td><td>Downtown</td></tr>
<tr><td><a href="/barrie-simcoe-county/venues/4524">Tequilazzo</a></td><td>Tacos, tequila shots, domestic beer</td><td>Daily 12-4&nbsp;PM</td><td>$5</td><td>North end</td></tr>
<tr><td><a href="/barrie-simcoe-county/venues/4535">Perfect SZN</a></td><td>Wings and boneless (beverage required)</td><td>Mon and Thu</td><td>$0.99</td><td>Anne Street North</td></tr>
<tr><td><a href="/barrie-simcoe-county/venues/4510">Lockeroom</a></td><td>Pabst Blue Ribbon</td><td>Saturday</td><td>$3.50</td><td>North end</td></tr>
<tr><td><a href="/barrie-simcoe-county/venues/4533">British Arms Pub</a></td><td>10 wings (beverage required)</td><td>Tue and Thu 11&nbsp;AM-1&nbsp;AM</td><td>$12</td><td>Downtown</td></tr>
<tr><td><a href="/barrie-simcoe-county/venues/1086">The Social Bar &amp; Lounge</a></td><td>Coors Light 20&nbsp;oz, house drink 16&nbsp;oz</td><td>Mon-Fri 2-5&nbsp;PM</td><td>$5 to $6.50</td><td>Orillia</td></tr>
<tr><td><a href="/barrie-simcoe-county/venues/4608">ATLAS Steak + Fish</a></td><td>Cocktails and house wine</td><td>Wed-Sun 4-5&nbsp;PM and 9-10&nbsp;PM</td><td>$9.50</td><td>Rama</td></tr>
</tbody>
</table>
<p>Ontario lets bars change drink prices by time of day, within <a href="https://www.agco.ca/en/alcohol/appendix-2-registrars-guidelines-advertising-and-promotion/pricing-and-promotion-liquor">Alcohol and Gaming Commission of Ontario limits</a>. According to TodaysTab's checks on October 31, 2026, we track 116 active venues across Barrie and Simcoe County and 31 have a recent, confident special with a stated day or time. The most common happy hour window is 2 to 5&nbsp;PM, at four venues. Among the venues listed here, four run a window from 9&nbsp;PM: The Canadian Brewhouse, Moxies, The Keg and ATLAS. The lowest drink price we have confirmed is a $3.50 Pabst Blue Ribbon on Saturdays at Lockeroom. What is running today is on the <a href="/barrie-simcoe-county">Barrie and Simcoe County specials page</a>.</p>

<h2>Downtown Barrie</h2>
<p>Dunlop Street East is Barrie's downtown pub strip, near Kempenfelt Bay. <a href="https://www.tourismbarrie.com/eat/downtown-barrie">Tourism Barrie's downtown dining list</a> lists the pubs below.</p>
<p><strong><a href="/barrie-simcoe-county/venues/4533">British Arms Pub (29 Dunlop St E)</a></strong> lists Tuesday and Thursday wing day on its own site, so call to confirm the price. According to TodaysTab's October check, 10 wings are $12 from 11&nbsp;AM to 1&nbsp;AM, Friday brings two haddock and fish dinners for $28, and Saturday bottomless mimosas are $24 from 11&nbsp;AM to 2&nbsp;PM. Wings and dinners need a drink purchase and no takeout.</p>
<p><strong><a href="/barrie-simcoe-county/venues/1573">McReilly's Public House (82 Dunlop St E)</a></strong> runs the "Steal of the Deal" Monday to Thursday, 3 to 7&nbsp;PM, according to TodaysTab's October check: $5 for a 1&nbsp;oz bar rail pour, $5 for a 16&nbsp;oz McReilly's Lager or Sleeman, and $10 for food such as fried pickles or a cheeseburger. The pub's own site does not show this deal, so call before you go.</p>
<p><strong><a href="/barrie-simcoe-county/venues/1570">Donaleigh's Irish Public House (28 Dunlop St E)</a></strong> has $30 bottles of wine every Thursday, according to TodaysTab's October check. The pub's site lists menus but not this deal, so call (705) 252-7733 to confirm.</p>

<h2>North end and west side: Anne Street, Cundles Road, Bayfield Street and Cedar Pointe</h2>
<p>Tourism Barrie files Lockeroom, One Eyed Jack and Tequilazzo under its North End dining list.</p>
<p><strong><a href="/barrie-simcoe-county/venues/4535">Perfect SZN (353 Anne St N)</a></strong> lists $0.99 wings and boneless in orders of 10 with a beverage on its site. According to TodaysTab's October check that runs Monday and Thursday, with $7 domestic pints those days, $6 tall cans on Tuesday, $7 Keith's pints and $6.50 house wine on Wednesday, $6 Corona and Modelo on Friday, a $9 Stella Artois chalice on Saturday, and happy hour all day Sunday with $6.50 Caesars and $7 craft pints. Call to confirm.</p>
<p><strong><a href="/barrie-simcoe-county/venues/4510">Lockeroom (201 Cundles Rd E)</a></strong> posts a weekly list that matches our records. Friday: $25 buckets of four cans. Saturday: $4.50 Old Style Pilsner, $3.50 Pabst Blue Ribbon and a $13 rib dinner. Sunday: $4 Caesars and the $13 rib dinner. Thursday: a $6 burger with featured tall cans. The site shows a Wednesday hot dog at $5 in its list and $4 in its banner, so check.</p>
<p><strong><a href="/barrie-simcoe-county/venues/4513">One Eyed Jack Restaurant &amp; Bar (165 Wellington St W)</a></strong> pours $5.50 20&nbsp;oz pints (local craft and selected domestic) daily from 11&nbsp;AM to 5&nbsp;PM, with half-price wings on Monday, $12 wings and fries on Thursday and a $20 rib and wing combo on Friday. The chain's specials page does not name a location, and another page on the site lists a daily 2 to 4&nbsp;PM happy hour, so ask the Barrie staff which applies.</p>
<p><strong><a href="/barrie-simcoe-county/venues/4524">Tequilazzo (15 Cedar Pointe Dr, Unit 18)</a></strong> runs a daily happy hour from 12 to 4&nbsp;PM, according to TodaysTab's October check: $5 meat tacos, $5 tequila shots, $5 domestic beer, $6 margaritas, $9.90 wings and a $25 bucket of five beers. Its specials page is an image we could not read, so call (705) 558-4065.</p>
<p><strong><a href="/barrie-simcoe-county/venues/4529">The Iron Skillet (534 Bayfield St, Unit C)</a></strong> offers half-price apps with a beverage on weekdays from 2:30 to 5&nbsp;PM, plus $6 margaritas on Monday, according to TodaysTab's October check. Its site shows no prices for these, so treat them as unconfirmed.</p>
<p><strong><a href="/barrie-simcoe-county/venues/4583">Symposium Cafe Restaurant (307 Cundles Rd E)</a></strong> lists $7 martinis and mules on Wednesday and 50 per cent off select pitchers on Saturday on its company-wide specials page. TodaysTab's October check also records half-off pitchers on Monday. Most specials need a beverage purchase.</p>

<h2>Yonge Street, Anne Street South and Bayview Drive</h2>
<p>Tourism Barrie describes its <a href="https://www.tourismbarrie.com/eat/south-end">South End dining area</a> as just south of Essa Road, with casual and family-friendly restaurants. It lists Barnstormer and Tiff's there. Cheer's is on Bayview Drive.</p>
<p><strong><a href="/barrie-simcoe-county/venues/1575">Barnstormer Brewing &amp; Distilling (384 Yonge St)</a></strong> runs Hoppy Hour daily from 3 to 5&nbsp;PM with half-price appetizers, $7 pints and $6 wine, according to TodaysTab's October check. Sunday adds half-price wings and $5 Caesars. The brewery's site lists hours but not these deals.</p>
<p><strong><a href="/barrie-simcoe-county/venues/4536">Cheer's Bar &amp; Grill (220 Bayview Dr)</a></strong> has $6 signature Caesars all day Sunday and a $8 9&nbsp;oz glass of wine on Wednesday. Both match the bar's own site, which also lists wings at 70 cents each on Monday and Thursday, dine-in only.</p>
<p><strong><a href="/barrie-simcoe-county/venues/4522">Tiff's Restaurant &amp; Sports Bar (29 Anne St S)</a></strong> lists a Sunday Caesar or screwdriver at $5.75, Tuesday wings and fries for $14.95 (in house only) and a Wednesday domestic bottle and burger for $19.95, according to TodaysTab's October check. The bar's site shows no prices for these, so call (705) 727-9060.</p>

<h2>Park Place and Mapleview: the chain restaurant cluster</h2>
<p>Park Place Boulevard and Mapleview Drive hold the biggest group of chains. All six below are listed on Tourism Barrie's South End dining page, Moxies in the main list and the rest under More Dining.</p>
<p><strong><a href="/barrie-simcoe-county/venues/4517">The Canadian Brewhouse (125 Park Pl Blvd)</a></strong> runs happy hour Monday to Saturday 2 to 6&nbsp;PM and again from 9&nbsp;PM to close, with prices starting at $3.99. That is according to the chain's company-wide happy hour page and TodaysTab's October check, whose Barrie records match it: a 315&nbsp;mL stein of Bud Light $3.99, a 530&nbsp;mL tankard $7.99, 6&nbsp;oz house wine $5.99, highballs $4.99 and tacos $3.99.</p>
<p><strong><a href="/barrie-simcoe-county/venues/4609">The Keg Steakhouse + Bar (110 Concert Way, Unit 1)</a></strong> lists happy hour Monday to Friday, 4 to 6&nbsp;PM and from 9&nbsp;PM to close, in the bar and lounge. We found no prices on the site, so we quote none.</p>
<p><strong><a href="/barrie-simcoe-county/venues/4527">Milestones (150 Park Place Blvd)</a></strong> lists happy hour on its Barrie page as daily 3 to 6&nbsp;PM and 9&nbsp;PM to close (to 10&nbsp;PM Monday to Thursday, 11&nbsp;PM Friday and Saturday, none Sunday). The page shows no prices.</p>
<p><strong><a href="/barrie-simcoe-county/venues/4525">Moxies Barrie Park Place (139 Park Place Blvd)</a></strong> runs happy hour daily from 2 to 5&nbsp;PM and from 9&nbsp;PM to close, dine-in only, according to TodaysTab's October check. Moxies lists this location as newly opened in 2026, and we found no prices.</p>
<p><strong><a href="/barrie-simcoe-county/venues/4523">Scaddabush Italian Kitchen &amp; Bar (129 Park Pl Blvd)</a></strong> runs weekday happy hour from 2 to 5&nbsp;PM, according to TodaysTab's October check: $6 glasses of sangria and spritz cocktails, $2 off 18&nbsp;oz import draught and $5 rosemary fries. The company site did not show the happy hour menu.</p>
<p><strong><a href="/barrie-simcoe-county/venues/4518">Jack Astor's + Freida's Beverage Kitchen (70 Mapleview Dr W)</a></strong> advertises select beer, wine and cocktails for $6. TodaysTab's October record puts that at 2 to 5&nbsp;PM daily. The site gives no times, so confirm them.</p>

<h2>Beyond Barrie: Orillia, Rama and Alliston</h2>
<p>Our data covers three spots outside Barrie.</p>
<p><strong><a href="/barrie-simcoe-county/venues/1086">The Social Bar &amp; Lounge (2 Front St N, Orillia)</a></strong> took over the former Fionn MacCool's waterfront space. Its menu lists happy hour Monday to Friday 2 to 5&nbsp;PM and daily from 9:30&nbsp;PM, dine-in only: Coors Light 20&nbsp;oz $6.50, Heineken $9, house drink 16&nbsp;oz $5, house wine $7 and a four-bottle bucket $24. The menu is company-wide and does not name Orillia, so confirm.</p>
<p><strong><a href="/barrie-simcoe-county/venues/4608">ATLAS Steak + Fish (5899 Rama Rd, Casino Rama)</a></strong> runs happy hour Wednesday to Sunday, 4 to 5&nbsp;PM and 9 to 10&nbsp;PM: $9.50 cocktails according to TodaysTab's October check. Older listings also mention discounted draft, bites and half-price oysters, which we could not confirm, so call ahead. Casino Rama's pages list the 4 to 5&nbsp;PM window, and an older OpenTable listing shows other times.</p>
<p><strong><a href="/barrie-simcoe-county/venues/4549">Barnstormer Brew Pub &amp; Bottle Shop (265 King St N, Alliston)</a></strong> runs Hoppy Hour Wednesday to Saturday, 3 to 5&nbsp;PM, dine-in only, with no prices in our record. Wednesday adds buck-a-shuck oysters and half-price wings.</p>

<h2>What's not on this list</h2>
<p>Competing pages list State &amp; Main (467 Cundles Rd E), Kelseys (458 Bayfield St), Montana's (66 Barrie View Dr and 407 Cundles Rd E) and CW Coop's (3 Mulcaster St). They are not in our tracked data, so we have not checked them and do not list them.</p>
<p>We track these but could not confirm a deal: <a href="/barrie-simcoe-county/venues/4511">Last Level Lounge (72 Dunlop St E)</a> has one record of a $2 deal on Tuesday and Wednesday after 8&nbsp;PM and no second source. <a href="/barrie-simcoe-county/venues/1568">Bull and Barrel Pub (75 Cedar Pointe Dr)</a> has only a Sunday half-price wine record. <a href="/barrie-simcoe-county/venues/4534">Wickie's Pub (274 Burton Ave)</a> has a $13 wings record we could not find elsewhere. Alliance Billiards (33 Alliance Blvd) shows conflicting open and closed status online, so we left it out. Our data does not cover Collingwood or Midland.</p>

<h2>Frequently asked questions</h2>
<h3>What time is happy hour in Barrie?</h3>
<p>The most common window we track is 2 to 5&nbsp;PM, at four venues including Moxies and Scaddabush. The Canadian Brewhouse runs 2 to 6&nbsp;PM Monday to Saturday, McReilly's runs 3 to 7&nbsp;PM Monday to Thursday, and Tequilazzo runs 12 to 4&nbsp;PM daily.</p>
<h3>Where is the cheapest happy hour in Barrie?</h3>
<p>As of October 31, 2026, the lowest drink we have confirmed is a $3.50 Pabst Blue Ribbon on Saturdays at Lockeroom, 201 Cundles Road East. At a posted happy hour, The Canadian Brewhouse has a 315&nbsp;mL stein of Bud Light for $3.99. Cheer's Bar &amp; Grill lists wings at 70 cents each on Monday and Thursday, dine-in only, and Perfect SZN lists $0.99 wings with a beverage.</p>
<h3>Which Barrie bars have late-night happy hour?</h3>
<p>Among the venues listed here, four run a window from 9&nbsp;PM: The Canadian Brewhouse (Monday to Saturday, to close), Moxies (daily, to close), The Keg (Monday to Friday, to close) and ATLAS at Casino Rama (Wednesday to Sunday, 9 to 10&nbsp;PM). Milestones also lists 9&nbsp;PM to close on its own page.</p>
<h3>Is there a happy hour in Barrie on Sundays?</h3>
<p>Yes. Perfect SZN, 353 Anne Street North, runs happy hour all day Sunday with $6.50 Caesars and $7 craft pints. Cheer's Bar &amp; Grill has $6 Caesars all day, and Lockeroom has $4 Caesars and a $13 rib dinner. The Social in Orillia has an $8 Caesar. Barnstormer in Barrie does half-price wings on Sundays.</p>
<h3>Are there happy hours near Orillia and Casino Rama?</h3>
<p>Yes. The Social Bar &amp; Lounge at 2 Front Street North in Orillia lists happy hour Monday to Friday from 2 to 5&nbsp;PM, with Coors Light at $6.50 and a 16&nbsp;oz house drink at $5. ATLAS Steak + Fish at Casino Rama runs 4 to 5&nbsp;PM Wednesday to Sunday with $9.50 cocktails.</p>
<h3>What are Ontario's rules for happy hour pricing?</h3>
<p>The Alcohol and Gaming Commission of Ontario allows bars to vary drink prices at set times, such as domestic beer or house wine during part of the day. The price cannot fall below $2.00 per standard drink, or $1.34 for spirits over 14.8 per cent alcohol, taxes included. "2 for 1" promotions are prohibited.</p>
<h3>How do I know these Barrie deals are current?</h3>
<p>TodaysTab checks each venue's own site or listing, records the date, and only publishes specials with a stated day or time and recent confirmation. Call ahead if a venue publishes no price. This guide uses checks from October 18 to 31, 2026. Read how we <a href="/barrie-simcoe-county/blog/how-we-verify-every-special">verify every special</a>.</p>

<h2>Keep exploring Barrie and Simcoe County deals</h2>
<p>This guide is a snapshot from October 31, 2026. The live <a href="/barrie-simcoe-county">Barrie and Simcoe County specials page</a> is always current, and you can <a href="/barrie-simcoe-county/submit">submit a deal or a correction</a>. Browse by day: <a href="/barrie-simcoe-county/sunday">Sunday</a>, <a href="/barrie-simcoe-county/tuesday">Tuesday</a> and <a href="/barrie-simcoe-county/friday">Friday</a>. See the <a href="/barrie-simcoe-county/blog">region blog</a> for more guides. Heading elsewhere? Compare with our happy hour guides for <a href="/kelowna/blog/happy-hours-kelowna-2026">Kelowna</a>, <a href="/edmonton/blog/happy-hours-edmonton-2026">Edmonton</a>, <a href="/calgary/blog/happy-hours-calgary">Calgary</a>, <a href="/ottawa/blog/happy-hours-ottawa">Ottawa</a>, <a href="/halifax/blog/happy-hours-halifax">Halifax</a> and <a href="/hamilton/blog/happy-hours-hamilton">Hamilton</a>.</p>
`,
  },
  {
    slug: "happy-hours-vancouver",
    category: "Guide",
    regions: ["vancouver"],
    title: "Vancouver Happy Hours 2026: 19 Spots With Deals",
    metaDescription:
      "19 Vancouver spots with happy hour deals in our October 2026 checks, from $5 beers at Steamworks to $1 off tap beer at Luppolo. Call ahead to confirm.",
    publishedAt: "2026-10-31",
    excerpt:
      "Vancouver has 19 spots with happy hour deals in our October 2026 checks, and the most common window is 3 to 6 PM at 34 venues.",
    contentHtml: `
<p>Quick answer: Vancouver happy hour most often runs 3 to 6&nbsp;PM, and this guide covers 19 venues with a deal in our October checks. Beer starts at $5 a sleeve at Steamworks, Malone's Taphouse and Bimini's, and Gastown has the most spots. Another 38 venues in our records run a late window starting 8&nbsp;PM or later.</p>
<p>Last verified October 31, 2026. Where a venue's own site and our records differ, or a venue publishes no times or prices, we say so, and you should call ahead. We re-check the list monthly.</p>

<h2>Vancouver happy hours at a glance</h2>
<table>
<thead><tr><th>Venue</th><th>Deal</th><th>Days and times</th><th>Price</th><th>Neighbourhood</th></tr></thead>
<tbody>
<tr><td><a href="/vancouver/venues/384">Steamworks Brewing Co.</a></td><td>Lions Gate Lager sleeves</td><td>Daily, 3 to 6&nbsp;PM</td><td>$5</td><td>Gastown</td></tr>
<tr><td><a href="/vancouver/venues/386">Bimini's Since 1975</a></td><td>16&nbsp;oz house lager</td><td>Daily, 2 to 6&nbsp;PM</td><td>$5</td><td>Kitsilano</td></tr>
<tr><td><a href="/vancouver/venues/3492">Malone's Taphouse</a></td><td>14&nbsp;oz Parallel 49 Craft Lager</td><td>Daily, 3 to 6&nbsp;PM and from 9&nbsp;PM</td><td>$5</td><td>Downtown</td></tr>
<tr><td><a href="/vancouver/venues/3753">Hapa Izakaya Yaletown</a></td><td>14&nbsp;oz draft beer</td><td>Daily, 5 to 6&nbsp;PM; Sun-Thu also from 9&nbsp;PM</td><td>$5</td><td>Yaletown</td></tr>
<tr><td><a href="/vancouver/venues/3686">The Pleasant</a></td><td>1&nbsp;oz highballs</td><td>Wed-Sun, 3 to 6&nbsp;PM</td><td>$5</td><td>Mount Pleasant</td></tr>
<tr><td><a href="/vancouver/venues/389">Brassneck Brewery</a></td><td>Beers</td><td>Sun-Fri, 2 to 5&nbsp;PM; Sat, 12 to 2&nbsp;PM</td><td>$6</td><td>Mount Pleasant</td></tr>
<tr><td><a href="/vancouver/venues/3556">The Park Pub</a></td><td>Domestic pints</td><td>Daily, 3 to 6&nbsp;PM</td><td>$6</td><td>West End</td></tr>
<tr><td><a href="/vancouver/venues/3559">Hero's Welcome</a></td><td>16&nbsp;oz draught</td><td>Sun-Thu, 4 to 6&nbsp;PM; Fri-Sat, 3 to 6&nbsp;PM</td><td>$6</td><td>Riley Park</td></tr>
<tr><td><a href="/vancouver/venues/3506">Luppolo Brewing Co.</a></td><td>Tap beer</td><td>Tue-Thu, 2 to 5&nbsp;PM and from 9&nbsp;PM; Mon all day</td><td>$1 off</td><td>Strathcona</td></tr>
</tbody>
</table>

<p>Vancouver had 662,248 residents in the 2021 Census, according to <a href="https://www150.statcan.gc.ca/n1/daily-quotidien/220209/t004a-eng.htm">Statistics Canada</a>. According to TodaysTab's checks on October 31, 2026, we track 338 active Vancouver venues and 163 of them have a current special that meets our rules (confidence of 0.7 or higher, re-checked within 45 days, with a stated day or time). The most common happy hour window is 3 to 6&nbsp;PM, which 34 venues run, ahead of 2 to 5&nbsp;PM at 26 venues. In our records 38 venues have a window starting at 8&nbsp;PM or later. Among the 19 venues listed below, $5 is the lowest stated beer price, at Steamworks, Bimini's and Malone's Taphouse.</p>

<h2>Gastown: Water Street, Carrall Street and Powell Street</h2>
<p>Gastown is the oldest part of the city, with most bars within a few blocks of Water Street.</p>
<p><strong><a href="/vancouver/venues/384">Steamworks Brewing Co. (375 Water St)</a></strong> runs happy hour daily from 3 to 6&nbsp;PM, according to TodaysTab's October 11 check: $5 sleeves of Lions Gate Lager, plus discounted beer pitchers, classic cocktails, wine by the glass and cocktail pitchers (the amounts are not in our record). The brewpub's website lists hours but no happy hour, so call to confirm.</p>
<p><strong><a href="/vancouver/venues/2196">Pourhouse (162 Water St)</a></strong> lists its happy hour on its own site as daily 3 to 6&nbsp;PM, with a late window Sunday to Thursday from 10&nbsp;PM to close and Friday and Saturday from 11&nbsp;PM to close. Prices are from TodaysTab's October 11 check, not the site: select white and rose wine $10, a 10&nbsp;oz draught $6, a 16&nbsp;oz draught $9, $2 off Classics Volume 1 cocktails, a smash burger $10 and truffle tots $12.</p>
<p><strong><a href="/vancouver/venues/2222">The Blarney Stone (216 Carrall St)</a></strong> runs 3 to 6&nbsp;PM Monday to Friday, according to TodaysTab's October 11 check: Red Truck Lager $6, Kilkenny and Magners $6.50, Guinness $7, Jameson $6. A late-night happy hour runs 10&nbsp;PM to 2&nbsp;AM Sunday to Wednesday. The website lists hours but no happy hour times, so call ahead.</p>
<p><strong><a href="/vancouver/venues/478">Six Acres (203 Carrall St)</a></strong> lists happy hour Monday to Saturday, 3 to 6&nbsp;PM, on its own site. According to TodaysTab's October 11 check, a 16&nbsp;oz BC lager or pale ale is $6, a 5&nbsp;oz house wine is $6, a 1&nbsp;oz highball is $6, and a beer and shot combo is $20.</p>
<p><strong><a href="/vancouver/venues/479">L'Abattoir (217 Carrall St)</a></strong> limits its happy hour to the bar, and TodaysTab's October 23 check shows it from 5 to 6&nbsp;PM Tuesday, Thursday, Friday and Saturday, and from 5&nbsp;PM through the evening on Wednesday. A martini is $10, a Negroni or Sidecar $11, house cocktails are $2 off and champagne bottles are half price. The website shows no happy hour details, so call 604-568-1701.</p>
<p><strong><a href="/vancouver/venues/3736">Amber Gastown (99 Powell St)</a></strong> serves happy hour 4 to 6&nbsp;PM, according to TodaysTab's October 24 check, which assumed it runs on the days Amber is open (Wednesday to Sunday). Cocktails (Negroni, Old Fashioned, Aperol Spritz) are $12, beer is $7, wine is $10 and oysters are $1.75 or $2.75 each. Amber's site does not mention happy hour, so the days are unconfirmed: call 778-819-8809.</p>

<h2>Downtown and Yaletown: Pender Street and Hamilton Street</h2>
<p>Downtown covers the Financial District around West Pender, and Yaletown, the converted warehouse district, sits along Hamilton and Mainland Streets.</p>
<p><strong><a href="/vancouver/venues/3492">Malone's Taphouse (608 W Pender St)</a></strong> has a daily 3 to 6&nbsp;PM and 9&nbsp;PM to close "Hoppy Hour," according to TodaysTab's October 23 check. A 14&nbsp;oz Parallel 49 Craft Lager is $5, other craft beers are $5.50, a four-beer flight is $8, and house wine is $6 for 6&nbsp;oz or $9 for 9&nbsp;oz. The site links a Hoppy Hour menu but its page text shows no prices.</p>
<p><strong><a href="/vancouver/venues/3753">Hapa Izakaya Yaletown (1193 Hamilton St)</a></strong> calls it Hapa Hour: 5 to 6&nbsp;PM daily, plus 9&nbsp;PM to close Sunday to Thursday, according to TodaysTab's October 24 check. A 14&nbsp;oz draft beer is $5, 6&nbsp;oz wine is $6, a shochu sour highball is $5 single or $8 double. The Yaletown page lists opening at 5&nbsp;PM but not Hapa Hour, so call ahead.</p>

<h2>West End: Davie Street</h2>
<p>The West End, around Davie Street and Denman Street, is a dense residential area with pubs on most blocks.</p>
<p><strong><a href="/vancouver/venues/3556">The Park Pub (1755 Davie St)</a></strong> runs happy hour daily, 3 to 6&nbsp;PM, according to TodaysTab's October 23 check: domestic pints $6, craft pints $7, a 1&nbsp;oz highball $6, and a list of appetizers at $13 each, including garlic butter ribs and coconut prawns. On Monday, 12 to 10&nbsp;PM, wings are under a dollar each (about 85 to 89 cents; minimum 10 per flavour, with a drink, dine in). Call to confirm.</p>

<h2>Mount Pleasant: Main Street and East 7th Avenue</h2>
<p>Mount Pleasant is the brewery district, with taprooms along Main Street.</p>
<p><strong><a href="/vancouver/venues/389">Brassneck Brewery (2148 Main St)</a></strong> pours $6 beers Sunday to Friday from 2 to 5&nbsp;PM and Saturday from noon to 2&nbsp;PM, according to TodaysTab's October 22 check. Brassneck's site shows hours but no happy hour, so confirm before you go.</p>
<p><strong><a href="/vancouver/venues/390">Main Street Brewing Company (261 E 7th Ave)</a></strong> lists happy hour on its own site as all day Monday and 2 to 6&nbsp;PM Tuesday to Sunday. TodaysTab's October 9 check shows a 16&nbsp;oz Main Street Premium Pilsner at $6; the site shows no prices.</p>
<p><strong><a href="/vancouver/venues/481">The Cascade Room (2616 Main St)</a></strong> lists happy hour on its site as Monday from 4&nbsp;PM to close, Tuesday to Saturday 4 to 6&nbsp;PM, and Sunday food 4 to 6&nbsp;PM with drinks from 4&nbsp;PM to close. We have no confirmed prices, so check the menu or call.</p>
<p><strong><a href="/vancouver/venues/3686">The Pleasant (2434 Main St)</a></strong> runs happy hour Wednesday to Sunday, 3 to 6&nbsp;PM, according to TodaysTab's October 24 and 29 checks: 1&nbsp;oz highballs $5, selected 16&nbsp;oz draught $7, a rotating 5&nbsp;oz house red or white $7.50. Wing Wednesday is a pound of wings for $12 with a drink. The venue is closed Mondays.</p>

<h2>Strathcona: Venables Street</h2>
<p>Strathcona is the city's oldest residential neighbourhood, now home to small breweries on its edges.</p>
<p><strong><a href="/vancouver/venues/3506">Luppolo Brewing Co. (1123 Venables St)</a></strong> gives $1 off all beers on tap, Tuesday to Thursday from 2 to 5&nbsp;PM and again from 9&nbsp;PM, and all day Monday, according to TodaysTab's October 23 check. Prosecco is $9 and a marinara pizza is $12. The site links a happy hour section but its page text shows no times.</p>

<h2>Kitsilano: West 4th Avenue and Yew Street</h2>
<p>Kitsilano is the beach-side neighbourhood west of Burrard Street.</p>
<p><strong><a href="/vancouver/venues/386">Bimini's Since 1975 (2010 W 4th Ave)</a></strong> runs happy hour daily from 2 to 6&nbsp;PM, according to TodaysTab's October 9 check: a 16&nbsp;oz house lager is $5, Guinness is $6.50, 6&nbsp;oz house wine is $6, 9&nbsp;oz is $8.50. The site links a happy hour menu but does not show times or prices.</p>
<p><strong><a href="/vancouver/venues/2205">The King's Head Public House (1618 Yew St)</a></strong> lists "3PM - 6PM and 9PM to Close Everyday" on its own site. TodaysTab's October 23 check puts the late window Sunday to Thursday only, so confirm Friday and Saturday. King's Head Lager is $6, house wine is $6 for 6&nbsp;oz or $9 for 9&nbsp;oz.</p>

<h2>Granville Island: Duranleau Street</h2>
<p>Granville Island sits under the Granville Street Bridge on False Creek.</p>
<p><strong><a href="/vancouver/venues/2215">Tap &amp; Barrel Bridges (1696 Duranleau St)</a></strong> lists happy hour on its site as daily 2 to 5:30&nbsp;PM, daily from 9&nbsp;PM to close, and all day Monday. Prices come from TodaysTab's October 11 check: well highballs $5, tots or fries $5, truffle waffle fries $8 and mac and cheese $15.</p>

<h2>Commercial Drive: Grandview-Woodland</h2>
<p>Commercial Drive runs through Grandview-Woodland and Little Italy.</p>
<p><strong><a href="/vancouver/venues/483">La Mezcaleria (1622 Commercial Dr)</a></strong> runs happy hour Monday to Friday, 4 to 6&nbsp;PM, according to TodaysTab's October 11 check: a 1&nbsp;oz house shot $8, a draft michelada $8, 6&nbsp;oz wine $7, draft lager $8 and a tequila margarita $11. The site links a happy hour menu but its page text shows no prices.</p>

<h2>Riley Park: South Main</h2>
<p>Riley Park lies south of 16th Avenue along Main Street, a quieter stretch of local pubs.</p>
<p><strong><a href="/vancouver/venues/3559">Hero's Welcome (3917 Main St)</a></strong> runs Sunday to Thursday 4 to 6&nbsp;PM and Friday and Saturday 3 to 6&nbsp;PM, according to TodaysTab's October 24 check: a 16&nbsp;oz draught is $6, a pitcher is $21, cocktails and wine are $2 off and chips and dip are $6. The site shows no happy hour details. TodaysTab's record notes no happy hour during live music or special events, so ask before you go.</p>

<h2>What's not on this list</h2>
<p>Competitor guides list venues we could not confirm. The Vancouver tourism guide updated October 14, 2026 lists <a href="/vancouver/venues/3491">Coast (1054 Alberni St)</a>, <a href="/vancouver/venues/3605">Reflections The Garden Terrace (801 W Georgia St)</a>, <a href="/vancouver/venues/3485">Tap &amp; Barrel Convention Centre (1055 Canada Pl)</a>, <a href="/vancouver/venues/2219">Grapes &amp; Soda (1541 W 6th Ave)</a> and <a href="/vancouver/venues/2221">The Botanist (1038 Canada Pl)</a> with no prices. Our records show windows for Reflections and Grapes &amp; Soda but no prices, so we left them out. Hawksworth and Boulevard Kitchen are not in our database yet.</p>

<h2>Frequently asked questions</h2>
<h3>What time is happy hour in Vancouver?</h3>
<p>The most common Vancouver happy hour is 3 to 6&nbsp;PM, which 34 venues in TodaysTab's October 31, 2026 records run. The next most common is 2 to 5&nbsp;PM at 26 venues, and 38 venues add a late window starting at 8&nbsp;PM or later, such as Malone's Taphouse daily from 9&nbsp;PM.</p>
<h3>Where is the cheapest beer happy hour in Vancouver?</h3>
<p>Among the venues in this guide, $5 is the lowest stated beer price. Steamworks Brewing Co. in Gastown pours $5 sleeves of Lions Gate Lager from 3 to 6&nbsp;PM daily, Bimini's in Kitsilano has a $5 house lager from 2 to 6&nbsp;PM, and Malone's Taphouse charges $5 for a 14&nbsp;oz Parallel 49 lager, according to our October checks.</p>
<h3>Which Vancouver neighbourhood has the most happy hours?</h3>
<p>Gastown has the most spots in this guide, with six venues within a few blocks of Water Street and Carrall Street, from Steamworks to L'Abattoir. Mount Pleasant follows with four along Main Street, including Brassneck and The Cascade Room, and Kitsilano has two.</p>
<h3>Which Vancouver bars have a late-night happy hour?</h3>
<p>Malone's Taphouse runs its Hoppy Hour daily from 9&nbsp;PM to close, Hapa Izakaya Yaletown runs Hapa Hour from 9&nbsp;PM Sunday to Thursday, and Luppolo Brewing Co. repeats its $1 off tap beer from 9&nbsp;PM Tuesday to Thursday. The Blarney Stone lists 10&nbsp;PM to 2&nbsp;AM Sunday to Wednesday, according to our October 11 check.</p>
<h3>Is there a happy hour on Mondays in Vancouver?</h3>
<p>Yes. Main Street Brewing Company and Luppolo Brewing Co. run happy hour all day Monday, and The Cascade Room runs it from 4&nbsp;PM to close, according to their own sites and our records. The Park Pub has under-a-dollar wings on Monday from 12 to 10&nbsp;PM with a drink, though The Pleasant is closed Mondays.</p>
<h3>How do I know these Vancouver happy hour deals are current?</h3>
<p>Every deal here was re-checked in October 2026, and we only list specials with confidence of 0.7 or higher that were verified within 45 days of October 31. Where a venue's site shows no happy hour, we say so and suggest calling.</p>

<h2>See the live Vancouver list</h2>
<p>This post is a snapshot from October 31, 2026. The <a href="/vancouver">Vancouver page</a> is always current, and you can <a href="/vancouver/submit">submit a missing venue or correction</a>. Browse deals by day on <a href="/vancouver/friday">Friday</a>, <a href="/vancouver/monday">Monday</a> or <a href="/vancouver/wednesday">Wednesday</a>, read the <a href="/vancouver/blog">TodaysTab Vancouver blog</a>, or see <a href="/vancouver/blog/how-we-verify-every-special">how we verify every special</a>. Other city guides: <a href="/kelowna/blog/happy-hours-kelowna-2026">Kelowna</a>, <a href="/edmonton/blog/happy-hours-edmonton-2026">Edmonton</a>, <a href="/calgary/blog/happy-hours-calgary">Calgary</a> and <a href="/ottawa/blog/happy-hours-ottawa">Ottawa</a>.</p>
`,
  },
  {
    slug: "happy-hours-toronto",
    category: "Guide",
    regions: ["toronto-core"],
    title: "Toronto Happy Hours 2026: 19 Spots With Deals",
    metaDescription:
      "19 Toronto happy hours with days, times and prices as of Oct 31, 2026: $3 bar rail on Church St, $7 Steam Whistle in the Beaches, $13 cocktails on King West.",
    publishedAt: "2026-10-31",
    excerpt:
      "Boutique Bar at 553 Church St lists a $3 bar-rail drink from 2 to 5 PM daily, the lowest full-drink price among the Toronto specials TodaysTab verified in October 2026.",
    contentHtml: `
<p>Quick answer: Toronto happy hours most often run 2 to 5&nbsp;PM, 4 to 6&nbsp;PM or 5 to 7&nbsp;PM. Listed prices start at $3 for a bar-rail drink at Boutique Bar (per our records; call first) and $5 for many beers. King West and the Entertainment District hold the most deals. This guide covers 19 Toronto spots with a stated day or time window.</p>
<p>Last verified October 31, 2026. Where a venue's own site and our records differ, or a venue publishes no times or prices, we say so, and you should call ahead. We re-check the list monthly.</p>
<table>
<thead><tr><th>Venue</th><th>Deal</th><th>Days and times</th><th>Price</th><th>Neighbourhood</th></tr></thead>
<tbody>
<tr><td><a href="/toronto-core/venues/1820">Luma</a></td><td>Cocktails, house beer, house wine</td><td>Tue-Sat, 4-5:30&nbsp;PM and 8&nbsp;PM to close</td><td>$6 to $11</td><td>King West</td></tr>
<tr><td><a href="/toronto-core/venues/3788">The Rabbit Hole</a></td><td>Cocktails, wine, draught</td><td>Mon-Fri 3-6&nbsp;PM, Sat 4-6&nbsp;PM</td><td>$6.95 to $12</td><td>Financial District</td></tr>
<tr><td><a href="/toronto-core/venues/3783">The Carbon Bar</a></td><td>Feature cocktails, wine, sliders, oysters</td><td>Daily, 3-5&nbsp;PM</td><td>$7 to $16</td><td>Old Town</td></tr>
<tr><td><a href="/toronto-core/venues/3107">Boutique Bar</a></td><td>Bar rail, wine and beer</td><td>Daily, 2-5&nbsp;PM, 5-7&nbsp;PM and midnight-1:30&nbsp;AM</td><td>$3 to $6</td><td>Church-Wellesley</td></tr>
<tr><td><a href="/toronto-core/venues/3956">The Comrade</a></td><td>Classic cocktails</td><td>Mon-Sat, 5-7&nbsp;PM</td><td>$13</td><td>Riverside</td></tr>
<tr><td><a href="/toronto-core/venues/3854">Chez Nous</a></td><td>Beer, wine, cocktails</td><td>Daily, 5-7&nbsp;PM</td><td>$6 to $12</td><td>Riverside</td></tr>
<tr><td><a href="/toronto-core/venues/3920">The Broadview Hotel Rooftop</a></td><td>Margaritas, sangria, draught</td><td>Mon-Fri, 3:30-5:30&nbsp;PM</td><td>$7 to $12</td><td>Riverside</td></tr>
<tr><td><a href="/toronto-east/venues/1856">The Druid Bar</a></td><td>20&nbsp;oz Steam Whistle, house wine</td><td>Tue-Sun, 3-6&nbsp;PM</td><td>$7 to $12</td><td>The Beaches</td></tr>
<tr><td><a href="/toronto-north/venues/3924">The Drake Hotel</a></td><td>Cocktails, 30% off Drake plates</td><td>Daily, 4-6&nbsp;PM, through Dec 31</td><td>$13</td><td>West Queen West</td></tr>
</tbody>
</table>
<p>Ontario once banned the terms "Happy Hour" and "Cheap Drinks" from licensee advertising. In <a href="https://www.agco.ca/en/news/info-bulletin-no-56-regulatory-modernization-and-burden-reduction-changes-ontarios-beverage">Info Bulletin No. 56, dated May 6, 2019</a>, the Alcohol and Gaming Commission of Ontario said it removed that restriction from its Liquor Advertising Guidelines. According to TodaysTab's checks on October 31, 2026, we track 432 active venues across four Toronto regions, 173 list specials, and 138 passed our rules (confidence 0.7 or higher, verified within 45 days, a stated day or time). Of 71 venues with a timed happy hour, 15 run 2 to 5&nbsp;PM, the most common window, ahead of 4 to 6&nbsp;PM (12) and 5 to 7&nbsp;PM (11). Four venues run a window starting at 9&nbsp;PM or later.</p>

<h2>King West and the Entertainment District</h2>
<p>King West runs along King Street from Bathurst east toward University Avenue, with restaurants and bars packed on the blocks around TIFF Lightbox and the Well.</p>
<p><strong><a href="/toronto-core/venues/1820">Luma (350 King St W)</a></strong> serves happy hour on the second floor of the TIFF Lightbox, Tuesday to Saturday, 4 to 5:30&nbsp;PM and from 8&nbsp;PM to close, according to its website. Cocktails run $7 to $11, house select beer is $6 (16&nbsp;oz) and 5&nbsp;oz house wine is $9. The Doctor Vodka and Golden Premier are $7, the Paper Plane is $11.</p>
<p><strong><a href="/toronto-core/venues/1823">Minami Toronto (225 King St W)</a></strong> lists a Monday to Friday happy hour from 2 to 5&nbsp;PM, according to TodaysTab's October check. Cocktails are $13 and Asahi draft is $8. On Saturday and Sunday it runs 4 to 5&nbsp;PM. Minami's own site shows no happy hour, and OpenTable describes a daily 2 to 5&nbsp;PM window with $12 cocktails, so call to confirm.</p>
<p><strong><a href="/toronto-core/venues/1826">Añejo Toronto (600 King St W)</a></strong> takes half off all tequila and mezcal (1&nbsp;oz) from 3 to 5&nbsp;PM, according to TodaysTab's October check. A bucket of four Modelo Especial or Negra Modelo (355&nbsp;ml) is $28 in the same window. The venue site confirms this and also lists a second window from 10&nbsp;PM to close, dine-in only.</p>
<p><strong><a href="/toronto-north/venues/3793">Lulu Bar (427 Wellington St W)</a></strong> runs its Honolulu Happy Hour daily, 3 to 6&nbsp;PM, according to its contact page and happy hour menu (its home page lists Sunday from 11&nbsp;AM, so call to confirm). According to TodaysTab's October check, select beer is $6, select cocktails are $12, and wine is $10 (5&nbsp;oz) or $15 (8&nbsp;oz). The bar sits near Spadina Avenue.</p>

<h2>Financial District and downtown Yonge</h2>
<p>The towers around King and Bay empty into bars at 4&nbsp;PM, so afternoon windows dominate this area.</p>
<p><strong><a href="/toronto-core/venues/3095">The Frederick (10 Temperance St)</a></strong> lists a Monday to Friday window from 2 to 5:30&nbsp;PM in the TodaysTab record (the restaurant opens at 4&nbsp;PM on weekends). Rail spirit with mixer is $8, Pinot Grigio and Montepulciano are $9, and a Verde Spritz is $8. The Frederick's site does not show these, and guides list weekdays to 5:30 or 6&nbsp;PM, so call ahead.</p>
<p><strong><a href="/toronto-core/venues/3788">The Rabbit Hole (21 Adelaide St W)</a></strong> posts Monday to Friday 3 to 6&nbsp;PM and Saturday 4 to 6&nbsp;PM on its happy hour page. Favourite cocktails are $12, select 5&nbsp;oz wine is $10 and select 16&nbsp;oz draught beer is $6.95.</p>
<p><strong><a href="/toronto-core/venues/1841">Alobar Downtown (150 York St)</a></strong> pours $6 draft beer (Burdock Deluxe Lager, Estrella Damm) Monday to Friday, 2:30 to 5:30&nbsp;PM, according to TodaysTab's October check. The restaurant's own October happy hour menu confirms this window and lists select cocktails and wines by the glass at $12. It is closed Sundays.</p>
<p><strong><a href="/toronto-north/venues/3796">The Queen &amp; Beaver Public House (35 Elm St)</a></strong> runs a Royal Happy Hour Tuesday to Friday, 3 to 5&nbsp;PM, according to TodaysTab's October check. Beer and cider are $9.50, wine and cocktails $10. Its site shows no happy hour, so call to confirm.</p>

<h2>Waterfront</h2>
<p>The area around Scotiabank Arena and Bremner Boulevard fills with game-night crowds.</p>
<p><strong><a href="/toronto-core/venues/3870">Hoops Sports Bar &amp; Grill (125 Bremner Blvd)</a></strong> runs a late happy hour every day from 7:30 to 9:30&nbsp;PM, according to TodaysTab's October check. A 16&nbsp;oz Steam Whistle Pilsner, Beau's Lug Tread or Lost Craft lager or IPA is $6, and listed appetizers are $10. The bar's site does not show happy hour, so call before you go.</p>

<h2>Old Town and Church-Wellesley</h2>
<p>This stretch covers King and Queen near Church Street and the Village strip of Church Street north of Alexander Street.</p>
<p><strong><a href="/toronto-core/venues/3792">Score on King (107 King St E)</a></strong> runs Monday to Friday, 2 to 5&nbsp;PM, according to TodaysTab's October check of its happy hour image. Bar rail is $6.50, Steam Whistle and Beau's pints are $7.50, Peller wine (6&nbsp;oz) is $8.50 and a Jagermeister shot is $5. The Score burger with fries is $18. The pub's own happy hour menu matches these prices.</p>
<p><strong><a href="/toronto-core/venues/3783">The Carbon Bar (99 Queen St E)</a></strong> at Queen and Church posts "Happy hour Daily 3-5pm" on its site. According to TodaysTab's October check and the bar's menu, feature cocktails are $11, 5&nbsp;oz wine is $10, a half dozen oysters is $16, sliders are $8 and a brisket empanada is $7. Its site also lists half-price oysters all night on Tuesdays.</p>
<p><strong><a href="/toronto-core/venues/3107">Boutique Bar (553 Church St)</a></strong> lists three daily windows, according to TodaysTab's October check. From 2 to 5&nbsp;PM a bar-rail drink is $3 and wine or beer $4.50. From 5 to 7&nbsp;PM beer, wine and spirits are $6, and the same $6 applies from midnight to 1:30&nbsp;AM. The bar's site confirms daily 2&nbsp;PM to 2&nbsp;AM hours but shows no happy hour, so call first.</p>

<h2>Riverside and South Riverdale</h2>
<p>Queen Street East near the Don River and the Broadview Hotel has a run of cocktail bars and brewers.</p>
<p><strong><a href="/toronto-core/venues/3956">The Comrade (758 Queen St E)</a></strong> holds Cocktail Hour 5 to 7&nbsp;PM Monday to Saturday, according to its website. Negroni, Tom Collins and Manhattan are $13 each.</p>
<p><strong><a href="/toronto-core/venues/3854">Chez Nous (798 Queen St E)</a></strong> posts happy hour daily from 5 to 7&nbsp;PM: $9 house wines, $6 select beers and $12 select cocktails, according to its website.</p>
<p><strong><a href="/toronto-core/venues/3822">Eastbound Brewing Company (700 Queen St E)</a></strong> pours $7 draft Tuesday to Friday, 4 to 6&nbsp;PM, according to TodaysTab's October check. The same record lists $6 tacos on Tuesdays and $11 pounds of wings on Thursdays. The brewery's site also lists $13 margaritas and $10 wine in the same window; call to confirm the food specials.</p>
<p><strong><a href="/toronto-core/venues/3920">The Broadview Hotel Rooftop (106 Broadview Ave)</a></strong> lists happy hour Monday to Friday, 3:30 to 5:30&nbsp;PM. A 2&nbsp;oz margarita and 4&nbsp;oz sangria are $12, 5&nbsp;oz house wine is $10, Steam Whistle and Beau's draught are $7, Asahi is $8 and a single house spirit is $7. The site showed a temporary closure notice for November 2 to 6, so check dates.</p>

<h2>The Beaches</h2>
<p>Queen Street East east of Woodbine Avenue forms the Beaches strip, a short walk from the lake.</p>
<p><strong><a href="/toronto-east/venues/1856">The Druid Bar (2192 Queen St E)</a></strong> shows "daily happy hour 3PM-6PM" on its happy hour menu, though it is closed Mondays. A 20&nbsp;oz Steam Whistle and a 5&nbsp;oz house red or white are $7. The Celtic Fire Margarita and Life's A Beach are $12.</p>
<p><strong><a href="/toronto-east/venues/1851">The Stone Lion Pub (1958 Queen St E)</a></strong> offers half-price appetizers Monday to Friday, 3 to 5&nbsp;PM, except holidays, according to its website. Its weekly specials, per TodaysTab's October check, run half-price wings Monday, half-price tacos Tuesday, half-price wine Wednesday, a $7 Amsterdam Blonde Thursday, a $9 Steam Whistle Friday, $12 margaritas Saturday and an $8 Side Launch Sunday.</p>

<h2>West Queen West</h2>
<p>West Queen West runs between Bathurst Street and Gladstone Avenue and is known as the Art and Design District.</p>
<p><strong><a href="/toronto-north/venues/3924">The Drake Hotel (1150 Queen St W)</a></strong> lists "every day 4-6PM: $13 cocktails + 30% off our favourite Drake plates," running October 1 to December 31, according to its website.</p>

<h2>What's not on this list</h2>
<p>We left out venues whose details conflict or sit below our confidence rules. Bar Hop (391 King St W) appears in aggregator listings with weekday specials until 6&nbsp;PM, but a 2024 review says that location has no happy hour. Belfast Love Public House (548 King St W) has three different happy hour schedules online. Ruby Soho (587 King St W) shows 3 to 7&nbsp;PM in our record but 5 to 7&nbsp;PM in a guide. Fox on John, Aera, Bar Neon, Rodney's Oyster House and Gusto 101 appear in outside roundups, and we have no confirmed specials for them.</p>

<h2>Frequently asked questions</h2>
<h3>What time is happy hour in Toronto?</h3>
<p>Most Toronto happy hours run in the afternoon or early evening. In TodaysTab's October 31, 2026 data, 15 of 71 venues with a timed window run 2 to 5&nbsp;PM, 12 run 4 to 6&nbsp;PM and 11 run 5 to 7&nbsp;PM. A few also run a late window after 9&nbsp;PM.</p>
<h3>Where is the cheapest happy hour in Toronto?</h3>
<p>Boutique Bar (553 Church St) lists the lowest full-drink price in our data: a $3 bar-rail drink and $4.50 wine and beer from 2 to 5&nbsp;PM daily, per TodaysTab's October check. Several other venues in our data list $5 beers or shots, so compare windows before choosing.</p>
<h3>Is happy hour legal in Ontario?</h3>
<p>Yes. Ontario's liquor regulator, the AGCO, said in Info Bulletin No. 56 on May 6, 2019 that it removed the restriction on terms such as "Happy Hour" and "Cheap Drinks" from its Liquor Advertising Guidelines. The same bulletin says licensees must still keep price and promotion advertising responsible and must not promote immoderate consumption.</p>
<h3>Which Toronto bars have a late-night happy hour?</h3>
<p>Boutique Bar (553 Church St) lists a $6 beer, wine and spirits window from midnight to 1:30&nbsp;AM daily. Luma (350 King St W) lists 8&nbsp;PM to close Tuesday to Saturday, and Hoops (125 Bremner Blvd) runs 7:30 to 9:30&nbsp;PM daily. Four venues in our data start a window at 9&nbsp;PM or later.</p>
<h3>Where can I find a happy hour on King West?</h3>
<p>Luma (350 King St W) runs Tuesday to Saturday from 4 to 5:30&nbsp;PM with $7 to $11 cocktails. Minami (225 King St W), Añejo (600 King St W) and Lulu Bar (427 Wellington St W) also list afternoon windows. Lulu Bar's runs 3 to 6&nbsp;PM daily.</p>
<h3>Is there a happy hour in Toronto on Sundays?</h3>
<p>Yes. Lulu Bar (427 Wellington St W) lists happy hour every day from 3 to 6&nbsp;PM, according to its contact page and menu. The Carbon Bar (99 Queen St E) lists daily 3 to 5&nbsp;PM, The Druid Bar (2192 Queen St E) runs daily except Monday, and The Drake Hotel (1150 Queen St W) lists every day 4 to 6&nbsp;PM.</p>
<h3>How do I know these Toronto deals are current?</h3>
<p>Each deal here was verified within 45 days of October 31, 2026, and we flag where a venue's own site differs from our record. Posts are snapshots, and specials change without notice. Check the live <a href="/toronto-core">Toronto Core page</a> for current listings, and call a venue before you go.</p>

<h2>Find more Toronto deals</h2>
<p>Browse live specials on the <a href="/toronto-core">Toronto Core</a>, <a href="/toronto-north">Toronto North</a>, <a href="/toronto-east">Toronto East</a> and <a href="/toronto-west">Toronto West</a> pages, or see what runs tonight with <a href="/toronto-core/friday">Friday</a>, <a href="/toronto-core/thursday">Thursday</a> and <a href="/toronto-core/saturday">Saturday</a> deals. Know a spot we missed? <a href="/toronto-core/submit">Submit a special</a>. Read how <a href="/toronto-core/blog/how-we-verify-every-special">we verify every special</a> or browse the <a href="/toronto-core/blog">blog index</a>. Other city guides: <a href="/kelowna/blog/happy-hours-kelowna-2026">Kelowna</a>, <a href="/ottawa/blog/happy-hours-ottawa">Ottawa</a>, <a href="/hamilton/blog/happy-hours-hamilton">Hamilton</a> and <a href="/halifax/blog/happy-hours-halifax">Halifax</a>.</p>
`,
  },
  {
    slug: "happy-hours-winnipeg",
    category: "Guide",
    regions: ["winnipeg"],
    title: "Winnipeg Happy Hours 2026: 22 Spots With Deals",
    metaDescription:
      "Winnipeg happy hours 2026: 22 spots with deals, from $3 draught at Tavern United Transcona to $4.25 lager at 1928 Eatery. Checked October 31, 2026.",
    publishedAt: "2026-10-31",
    excerpt:
      "Of 193 Winnipeg venues TodaysTab tracks, 45 have a dated special with a time window, and the most common happy hour runs 2 to 5 PM.",
    contentHtml: `
<p>Quick answer: Most Winnipeg happy hours run 2 to 5&nbsp;PM or 3 to 6&nbsp;PM, and many repeat from 9&nbsp;PM to close. Listed drink prices start at $3 for a 10&nbsp;oz house draught at Tavern United Transcona, and TodaysTab records $4.25 house lager at 1928 Eatery and Pub. The Osborne Street corridor, from Osborne Village to South Osborne, has five of the spots. TodaysTab lists 22 spots with deals.</p><p>Last verified October 31, 2026. Where a venue's own site and our records differ, or a venue publishes no times or prices, we say so, and you should call ahead. We re-check the list monthly.</p><table><thead><tr><th>Venue</th><th>Deal</th><th>Days and times</th><th>Price</th><th>Neighbourhood</th></tr></thead><tbody><tr><td><a href="/winnipeg/venues/8768">Tavern United Transcona</a></td><td>10&nbsp;oz house draught, appies from $5</td><td>Daily 3-6&nbsp;PM and 9&nbsp;PM to close; all day Tuesday</td><td>From $3</td><td>Regent Avenue</td></tr><tr><td><a href="/winnipeg/venues/2968">Good Neighbour Brewing Co.</a></td><td>Mugs of beer; $2 beer pours on Tuesdays</td><td>Wed-Sat 4-6&nbsp;PM; Tuesday all night</td><td>$5 mugs, $2 pours</td><td>West Broadway</td></tr><tr><td><a href="/winnipeg/venues/2236">1928 Eatery and Pub</a></td><td>House lager (per TodaysTab)</td><td>Mon-Fri 2-6&nbsp;PM</td><td>$4.25</td><td>Portage Avenue West</td></tr><tr><td><a href="/winnipeg/venues/8697">The Osborne Taphouse</a></td><td>Beer and shots</td><td>Daily 11&nbsp;AM-6&nbsp;PM</td><td>$4</td><td>Osborne Village</td></tr><tr><td><a href="/winnipeg/venues/2235">Elephant &amp; Castle</a></td><td>Well highballs, house wine, draught</td><td>Mon-Fri 3-6&nbsp;PM</td><td>$6 each</td><td>Downtown</td></tr><tr><td><a href="/winnipeg/venues/8700">Leopold's Tavern Osborne Village</a></td><td>Leo's Lager 20&nbsp;oz, highballs, snacks</td><td>Daily 2-5&nbsp;PM; all day Monday</td><td>$7 lager, $6 highball</td><td>Osborne Village</td></tr><tr><td><a href="/winnipeg/venues/8716">Confusion Corner Drinks + Food</a></td><td>Highballs and 16&nbsp;oz beer</td><td>Tue-Sun 2-5&nbsp;PM and 9&nbsp;PM to close</td><td>$6 to $7</td><td>Corydon and South Osborne</td></tr><tr><td><a href="/winnipeg/venues/2952">Peasant Cookery</a></td><td>Beers, cocktails and wine</td><td>Mon-Sat 3-6&nbsp;PM</td><td>$2 off</td><td>Exchange District</td></tr></tbody></table><p>Winnipeg's Exchange District, where two of these bars sit, was <a href="https://www.winnipeg.ca/people-culture/winnipegs-history/heritage-conservation/exchange-district-national-historic-site">designated a National Historic Site of Canada in 1997</a>, according to the City of Winnipeg. According to TodaysTab's checks on October 31, 2026, 45 of the 193 Winnipeg venues we track have a current, dated special with a stated day or time window. The most common happy hour window is 2 to 5&nbsp;PM, used by 11 venues, ahead of 3 to 6&nbsp;PM at 7. Fourteen venues run a deal that starts at 9&nbsp;PM or later. The lowest drink price in our records is a $2 beer pour on Tuesdays at Good Neighbour Brewing Co.; the lowest listed pint is $4.25 (The Osborne Taphouse lists $4 beer, size not given).</p><h2>Exchange District</h2><p>Brick warehouses and restaurant rows around Bannatyne Avenue and Main Street.</p><p><strong><a href="/winnipeg/venues/2952">Peasant Cookery (283 Bannatyne Ave)</a></strong> runs happy hour Monday to Saturday from 3 to 6&nbsp;PM, with $2 off beers and cocktails, $2 off 6&nbsp;oz wines and $3 off 9&nbsp;oz wines, on the patio and in the lounge only. The site also lists 9&nbsp;PM to close, but Sunday is brunch only.</p><p><strong><a href="/winnipeg/venues/8715">Commonwealth Kitchen &amp; Bar (456 Main St)</a></strong> posts a different deal each evening from 5 to 9:30&nbsp;PM, according to TodaysTab's October check: Wednesday half-price bottles of wine, Thursday $6 draught beer, Friday $12 rail doubles, Saturday $10 margaritas and Sunday $2 oysters. The venue's own homepage does not list them, so call (204) 306-8011 to confirm.</p><h2>Downtown</h2><p>Office towers and Portage Avenue, with weekday after-work crowds.</p><p><strong><a href="/winnipeg/venues/2235">Elephant &amp; Castle (350 Saint Mary Ave)</a></strong> serves happy hour Monday to Friday, 3 to 6&nbsp;PM, and its site adds 9&nbsp;PM to close. TodaysTab's records show $6 well highballs, $6 house wine and $6 draught beer (16&nbsp;oz) in that window. The site lists no prices.</p><p><strong><a href="/winnipeg/venues/2237">Browns Socialhouse Portage (311 Portage Ave)</a></strong> calls it Social Hour, daily from 2 to 5&nbsp;PM and from 9&nbsp;PM to close. TodaysTab lists $6 cocktails, $5.75 social lager (385&nbsp;ml), $7.50 for a 6&nbsp;oz glass of social wine and half-price bottles of wine, excluding social wine.</p><p><strong><a href="/winnipeg/venues/8822">Shannon's Irish Pub and Eatery (175 Carlton St)</a></strong> advertises happy hour from 4 to 9&nbsp;PM daily and opens 4&nbsp;PM to 2&nbsp;AM Tuesday to Saturday, "until further notice." According to TodaysTab's October check, wings are on happy hour pricing Tuesday, Thursday, Friday and Saturday from 4 to 9&nbsp;PM with a drink purchase, and all day Wednesday. No wing price is published.</p><h2>Osborne Village</h2><p>The Osborne Street strip south of the Assiniboine River, packed with pubs and patios.</p><p><strong><a href="/winnipeg/venues/8700">Leopold's Tavern Osborne Village (93 Osborne St)</a></strong> has dine-in happy hour daily from 2 to 5&nbsp;PM, per TodaysTab: Leo's Lager 20&nbsp;oz $7, house wine 6&nbsp;oz $7, highballs and Jameson 1&nbsp;oz $6, snacks from $5. Monday pricing runs all day. Tuesday adds $4.50 tacos from 2&nbsp;PM, and Wednesday is half-price wings.</p><p><strong><a href="/winnipeg/venues/8697">The Osborne Taphouse (112 Osborne St)</a></strong> runs happy hour daily from 11&nbsp;AM to 6&nbsp;PM, which its site confirms. TodaysTab records $4 beer and shots. Wing night is $12.99 a pound on Tuesday and Thursday from 4&nbsp;PM, and shooters are 2 for $9.99 on Wednesday, Friday, Saturday and Sunday.</p><h2>West Broadway</h2><p>Sherbrook Street, a short walk west of Osborne Village, with a brewery and a neighbourhood bar side by side.</p><p><strong><a href="/winnipeg/venues/2968">Good Neighbour Brewing Co. (110 Sherbrook St)</a></strong> is listed on its own site as a West Broadway brewery and tasting room. According to TodaysTab's October check, it pours $5 mugs of beer Wednesday to Saturday from 4 to 6&nbsp;PM, $2 beer pours all night on Tuesdays and $1.50 hot dogs on Wednesdays. The site does not show these, so call ahead.</p><p><strong><a href="/winnipeg/venues/8698">Next Door (116 Sherbrook St)</a></strong> posts happy hour daily from 4 to 6&nbsp;PM, which its site confirms, and again after 9&nbsp;PM according to TodaysTab: $2 off select tap beer and any glass of wine, an $11 cocktail, $5 off wings and $13 smashburgers. Monday runs happy hour all night, and Wednesday takes $5 off wings all night.</p><h2>Corydon and South Osborne</h2><p>Confusion Corner at the Osborne, Corydon and Pembina junction, then the quieter stretch of Osborne Street south of it.</p><p><strong><a href="/winnipeg/venues/8716">Confusion Corner Drinks + Food (500 Corydon Ave)</a></strong> lists $6 highballs, $6 CC Lager and PBR (16&nbsp;oz), $7 Sapporo (16&nbsp;oz) and $7 house wine (6&nbsp;oz) Tuesday to Sunday from 2 to 5&nbsp;PM and 9&nbsp;PM to close, per TodaysTab, because its site shows it closed Mondays. On Saturdays the restaurant opens at 3&nbsp;PM. Wine Wednesdays are $6 a glass from 5 to 11&nbsp;PM.</p><p><strong><a href="/winnipeg/venues/8694">Leopold's Tavern South Osborne (696 Osborne St)</a></strong> has a late-night menu from 11&nbsp;PM to close: a 20&nbsp;oz pint of Leo's Lager, a Smash Burger Jr. or a Leo's Island Iced Tea, each $5.</p><p><strong><a href="/winnipeg/venues/2957">Oxbow (557 Osborne St)</a></strong> offers half-price wine on Sundays, a natural wine bar deal verified by TodaysTab on October 31. No hours or bottle prices were published, so call before you go.</p><h2>St. Boniface</h2><p>The French Quarter along Provencher Boulevard, east of The Forks across the Red River.</p><p><strong><a href="/winnipeg/venues/8763">Pregame Sports Bar &amp; Lounge (166 Provencher Blvd)</a></strong> posts daily drink features on its site: Margarita Monday $10, $2 off wine and well whisky on Wednesday, $12 triple well pours on Thursday, $4 Fireball on Friday, $9 sangria on Saturday and $7 Caesars on Sunday. Wing night is $9.99 on Monday and Thursday. It lists no separate happy hour.</p><p><strong><a href="/winnipeg/venues/8811">Promenade Brasserie (130 Provencher Blvd)</a></strong> has happy hour Wednesday to Saturday from 2 to 5&nbsp;PM and from 8&nbsp;PM to close, and from 2&nbsp;PM to close on Sundays, according to TodaysTab's October check. The happy hour menu is a download, so we have no prices.</p><h2>Portage Avenue West</h2><p>The long Portage Avenue corridor west toward Polo Park and the airport.</p><p><strong><a href="/winnipeg/venues/8692">Underdogs (2609 Portage Ave)</a></strong> serves happy hour daily from 2 to 5&nbsp;PM, and 9&nbsp;PM to close Sunday to Thursday, per TodaysTab: perogies $4, small mac n cheese $6, garlic parm fries $7, a pint of 88 cassette lager $6 and 6&nbsp;oz house wine $7. Sundays add a $6 house lager pint and a $6 cheeseburger.</p><p><strong><a href="/winnipeg/venues/2236">1928 Eatery and Pub (1719 Portage Ave)</a></strong> has a daily happy hour on its site without times or prices. TodaysTab records 1928 House Lager at $4.25, a $4.75 pour of Original 16 Copper &amp; Pale Ale and two tacos for $15, Monday to Friday from 2 to 6&nbsp;PM. Call (204) 888-2341 to confirm.</p><p><strong><a href="/winnipeg/venues/8717">The Saint Supper Club (1825 Portage Ave)</a></strong> lists, per TodaysTab, buy one, get one half price on all drinks daily from 3 to 5&nbsp;PM. Mondays and Tuesdays bring wings at $11 a pound with a purchase. The site mentions no happy hour and notes that promotions can change, so call (204) 837-3474.</p><p><strong><a href="/winnipeg/venues/8724">One Great City Brewing Company (1596 Ness Ave)</a></strong> takes, per TodaysTab, $1 off pints and $2 off snacks daily from 3 to 6&nbsp;PM; its site does not list them.</p><h2>Regent Avenue and Transcona</h2><p>East Winnipeg chain taverns and roadhouses along Regent Avenue.</p><p><strong><a href="/winnipeg/venues/8768">Tavern United Transcona (826 Regent Ave W)</a></strong> calls it Happier Hours: daily 3 to 6&nbsp;PM and 9&nbsp;PM to close, plus all day Tuesday. A 10&nbsp;oz house draught is $3, a 10&nbsp;oz domestic draught $4, a 6&nbsp;oz house wine $6, and shaker chips $5. It is dine-in only and not on event nights.</p><p><strong><a href="/winnipeg/venues/8813">Junction 59 Roadhouse (1615 Regent Ave W)</a></strong> lists happy hour daily from 2 to 5&nbsp;PM and 9&nbsp;PM to close on its site. Prices are in a menu we could not read, so none are quoted here.</p><h2>South Winnipeg</h2><p>Pembina Highway and the southeast, where most places are larger sports-style rooms.</p><p><strong><a href="/winnipeg/venues/8711">Grizzly Goose (845 Dakota St)</a></strong> runs a dine-in happy hour daily from 2 to 5&nbsp;PM and 9&nbsp;PM to close, per TodaysTab: pub fries $5, a pint of beer $6.50, 6&nbsp;oz wine $6, bar rail singles $6 and one pound of wings $14. Sunday happy hour runs from 3&nbsp;PM to close.</p><p><strong><a href="/winnipeg/venues/1372">Tavern United Fort Garry (1824 Pembina Hwy)</a></strong> has Wings n' Things on Wednesday and Thursday from 4&nbsp;PM, per TodaysTab: wings $10 or shrimp $9, dine-in with a drink purchase.</p><h2>What's not on this list</h2><p>Search results name several other bars, including Hy's Steakhouse at Lombard Place (daily 4 to 6&nbsp;PM on its own site). We have no current dated special for them, so we do not list them. Fionn MacCool's Grant Park is in our database, but the chain's website lists only its Regent Avenue location, so we dropped it. Several large chains, including The Canadian Brewhouse, JOEY Polo Park and LOCAL Public Eatery, have current records that we left out of this edition for length. Amsterdam Tea Room and Bailey's have only low-confidence records.</p><h2>Frequently asked questions</h2><h3>What time is happy hour in Winnipeg?</h3><p>Most Winnipeg happy hours run 2 to 5&nbsp;PM or 3 to 6&nbsp;PM. According to TodaysTab's checks on October 31, 2026, 2 to 5&nbsp;PM is the most common window, used by 11 venues, and 7 more use 3 to 6&nbsp;PM. Many also repeat from 9&nbsp;PM to close, so check the venue.</p><h3>Where is the cheapest happy hour beer in Winnipeg?</h3><p>Tavern United Transcona lists a 10&nbsp;oz house draught for $3 during Happier Hours, and The Osborne Taphouse lists $4 beer and shots from 11&nbsp;AM to 6&nbsp;PM. TodaysTab records house lager at $4.25 at 1928 Eatery and Pub Monday to Friday. Good Neighbour Brewing has $2 beer pours on Tuesdays.</p><h3>Which Winnipeg bars have a late-night happy hour?</h3><p>According to TodaysTab, 14 venues have a deal starting at 9&nbsp;PM or later. Confusion Corner, Browns Socialhouse Portage, Grizzly Goose, Underdogs and Tavern United Transcona restart happy hour at 9&nbsp;PM. Leopold's Tavern South Osborne has $5 pints from 11&nbsp;PM to close.</p><h3>Is there a happy hour in Winnipeg on Sundays?</h3><p>Yes. Next Door runs happy hour daily from 4 to 6&nbsp;PM, and Promenade Brasserie in St. Boniface runs it from 2&nbsp;PM to close on Sundays. Grizzly Goose lists Sunday happy hour from 3&nbsp;PM to close, and Oxbow lists half-price wine on Sundays.</p><h3>Where can I find happy hour in the Exchange District?</h3><p>Peasant Cookery at 283 Bannatyne Ave has $2 off beers and cocktails from 3 to 6&nbsp;PM Monday to Saturday, per its own site. Commonwealth Kitchen &amp; Bar at 456 Main St is open Wednesday to Sunday from 5&nbsp;PM and, per TodaysTab, posts a different drink deal each evening.</p><h3>How do I know these Winnipeg deals are current?</h3><p>Each special on this page was last verified by TodaysTab between October 11 and October 31, 2026, and carries a confidence score of at least 0.7. We re-check monthly. Where a venue's own site shows no deal, we attribute it to our October check and suggest calling ahead.</p><h2>More Winnipeg deals</h2><p>See every current special on the <a href="/winnipeg">Winnipeg page</a> or browse <a href="/winnipeg/thursday">Thursday</a>, <a href="/winnipeg/friday">Friday</a> and <a href="/winnipeg/saturday">Saturday</a> deals. Run a bar and see a gap? <a href="/winnipeg/submit">Submit a special</a>. Read how we check deals in <a href="/winnipeg/blog/how-we-verify-every-special">how we verify every special</a>, or see the <a href="/winnipeg/blog">Winnipeg blog</a>. This post is a snapshot; the live page is current. Comparing cities: <a href="/kelowna/blog/happy-hours-kelowna-2026">Kelowna</a>, <a href="/edmonton/blog/happy-hours-edmonton-2026">Edmonton</a>, <a href="/calgary/blog/happy-hours-calgary">Calgary</a>, <a href="/ottawa/blog/happy-hours-ottawa">Ottawa</a>.</p>
`,
  },
  {
    slug: "happy-hours-saskatoon",
    category: "Guide",
    regions: ["saskatoon"],
    title: "Saskatoon Happy Hours 2026: 20 Spots With Deals",
    metaDescription:
      "20 Saskatoon spots with happy hour deals in our October 2026 checks, from a $3.99 Bud Light stein at The Canadian Brewhouse to $5 drafts. Call ahead to confirm.",
    publishedAt: "2026-10-31",
    excerpt:
      "Saskatoon has 20 spots with happy hour deals in our October 2026 checks, and the most common window is 2 to 5 PM at 5 venues, with beer from $3.99.",
    contentHtml: `
<p>Quick answer: Saskatoon happy hour most often runs 2 to 5&nbsp;PM, and 20 venues with deals are listed below from TodaysTab's October 2026 records. Beer starts at $3.99 (a 315&nbsp;mL Bud Light stein at The Canadian Brewhouse) and a 20&nbsp;oz draft is $4.99 at Birmingham's.</p>
<p>Last verified October 31, 2026. Where a venue's own site and our records differ, or a venue publishes no times or prices, we say so, and you should call ahead. We re-check the list monthly.</p>

<h2>Saskatoon happy hours at a glance</h2>
<table>
<thead><tr><th>Venue</th><th>Deal</th><th>Days and times</th><th>Price</th><th>Neighbourhood</th></tr></thead>
<tbody>
<tr><td><a href="/saskatoon/venues/5102">The Canadian Brewhouse (West)</a></td><td>Stein of Bud Light (315&nbsp;mL)</td><td>Mon-Sat, 2 to 6&nbsp;PM and from 9&nbsp;PM</td><td>$3.99</td><td>McClocklin Road, west side</td></tr>
<tr><td><a href="/saskatoon/venues/5090">Birmingham's Vodka and Ale House</a></td><td>20&nbsp;oz house draft, single highball</td><td>Daily, 2 to 5&nbsp;PM and from 9&nbsp;PM</td><td>$4.99</td><td>Circle Drive</td></tr>
<tr><td><a href="/saskatoon/venues/5085">Moxies</a></td><td>16&nbsp;oz Big Life lager, 1&nbsp;oz highball</td><td>Daily, 2 to 5&nbsp;PM and from 8&nbsp;PM</td><td>$5</td><td>8th Street East</td></tr>
<tr><td><a href="/saskatoon/venues/5072">The Hideout Lounge</a></td><td>16&nbsp;oz domestic draft, house liquor, slider</td><td>Daily, 3 to 6&nbsp;PM and from 9&nbsp;PM</td><td>$5</td><td>Central Avenue</td></tr>
<tr><td><a href="/saskatoon/venues/1414">POP Wine Bar</a></td><td>Draft pint, 6&nbsp;oz wine</td><td>Wed-Sat, 5 to 6&nbsp;PM</td><td>$6</td><td>Riversdale</td></tr>
<tr><td><a href="/saskatoon/venues/1411">Shelter Brewing Company</a></td><td>Rotational 16&nbsp;oz pints</td><td>Tue-Thu and Sun, 3 to 5&nbsp;PM</td><td>$7.50</td><td>Downtown</td></tr>
<tr><td><a href="/saskatoon/venues/5157">Las Palapas Resort Grill</a></td><td>Margaritas</td><td>Daily, 2 to 4&nbsp;PM</td><td>$8</td><td>Nutana</td></tr>
<tr><td><a href="/saskatoon/venues/5095">Better Brother Brewing Co.</a></td><td>18&nbsp;oz beer</td><td>Tue-Sat, 3 to 5&nbsp;PM</td><td>$7</td><td>City Park</td></tr>
<tr><td><a href="/saskatoon/venues/5083">Leopold's Tavern (Rosewood)</a></td><td>20&nbsp;oz Leo's Lager, late night</td><td>Daily, from 11&nbsp;PM</td><td>$5</td><td>Rosewood</td></tr>
</tbody>
</table>

<p>Saskatoon is Saskatchewan's largest city, with <a href="https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/details/page.cfm?Lang=E&amp;Geo1=CSD&amp;Code1=4711066">266,141 residents in the 2021 Census</a>, according to Statistics Canada. According to TodaysTab's checks on October 31, 2026, we track 131 active venues in Saskatoon and 39 have a current special that meets our rules (confidence of 0.7 or higher, re-checked within 45 days, with a stated day or time). Of those, 19 have a stated happy hour window, and the most common is 2 to 5&nbsp;PM at 5 venues. The lowest beer price is $3.99 at The Canadian Brewhouse. Eight venues have a happy hour window that starts at 8&nbsp;PM or later.</p>

<h2>Broadway and Nutana</h2>
<p>Broadway Avenue is a shopping and dining district in the Nutana neighbourhood, east of the South Saskatchewan River.</p>
<p><strong><a href="/saskatoon/venues/5073">Yard &amp; Flagon (718 Broadway Ave)</a></strong> lists happy hour Monday to Friday from 2 to 5&nbsp;PM, late-night happy hour Monday to Friday from 11&nbsp;PM to 2&nbsp;AM, and all day Sunday, according to its website. Weekly specials start at 4&nbsp;PM: Monday pub burger, fries and a half pint at $15, Tuesday half-price wings with 20&nbsp;oz pints at $8.50, Wednesday 6&nbsp;oz house wine at $6, and Thursday local craft beer $1 off.</p>
<p><strong><a href="/saskatoon/venues/5071">Leopold's Tavern (616 10th St E)</a></strong> runs happy hour daily from 2 to 5&nbsp;PM and all day Monday, dine-in only, according to TodaysTab's October check (call to confirm). Leo's Lager 20&nbsp;oz is $7, a highball is $5.50, house wine 6&nbsp;oz is $7, and snacks start at $5.</p>
<p><strong><a href="/saskatoon/venues/5157">Las Palapas Resort Grill (910 Victoria Ave)</a></strong> serves $8 margaritas and a $5 basket of chips and salsa daily from 2 to 4&nbsp;PM, plus $8 margaritas from 8&nbsp;PM to close Sunday to Thursday, according to TodaysTab's October check. Tuesday is $27 sangria pitchers and $4.50 tacos, and Friday is $11 mezcalaritas. The restaurant's website lists 11&nbsp;AM to 11&nbsp;PM daily, with fall and winter closing times that may vary.</p>

<h2>Downtown</h2>
<p>Downtown Saskatoon, the city's Central Business District, sits on the river's west bank, and most of these bars are within a few blocks of 2nd Avenue South.</p>
<p><strong><a href="/saskatoon/venues/1411">Shelter Brewing Company (255 2nd Ave S)</a></strong> pours rotational 16&nbsp;oz pints at $7.50 from 3 to 5&nbsp;PM Sunday to Thursday, with pool nachos at $10 in the same window. Wednesday adds two fish tacos at $12, and Tuesday has four tacos for $10.50. The brewery's website shows it closed Mondays, so we show no Monday happy hour.</p>
<p><strong><a href="/saskatoon/venues/1413">St. Tropez Bistro (238 2nd Ave S)</a></strong> has burgers $2 off from 5 to 7&nbsp;PM on Thursdays in the Parlor bar, according to TodaysTab's October check. On Sundays, classic cocktails and house wine by the glass are $10, small plates are $2 off and wine bottles are 25% off. Call to confirm.</p>
<p><strong><a href="/saskatoon/venues/5118">Flint (259 2nd Ave S)</a></strong> lists a 4 to 7&nbsp;PM daily happy hour in its Instagram bio, according to TodaysTab's October check. It publishes no prices, so call ahead. Its website shows Sunday to Thursday hours from 4&nbsp;PM to midnight and Friday and Saturday to 1&nbsp;AM.</p>

<h2>City Park</h2>
<p>City Park is the residential neighbourhood just north of downtown.</p>
<p><strong><a href="/saskatoon/venues/5095">Better Brother Brewing Co. (536 2nd Ave N, #150)</a></strong> is in the City Park neighbourhood just north of downtown and has two happy hours Tuesday to Saturday: 3 to 5&nbsp;PM with an 18&nbsp;oz beer at $7, a 20&nbsp;oz flight at $9 and tater tots at $5, then 7 to 9&nbsp;PM with 54&nbsp;oz pitchers at $21. Prices exclude tax, and the brewery's site did not show them, so call ahead.</p>

<h2>Riversdale</h2>
<p>Riversdale is the west-side neighbourhood around 20th Street West.</p>
<p><strong><a href="/saskatoon/venues/1414">POP Wine Bar (334 20th St W)</a></strong> runs happy hour Wednesday to Saturday from 5 to 6&nbsp;PM, the hour it opens. Draft pints are $6, 6&nbsp;oz wine is $6, rotating Jameson shots are $5, Azimut by-the-glass wines are $12, and a half dozen oysters is $15. POP's website lists "Happy Hour 5-6PM" and 5&nbsp;PM to late, Wednesday to Saturday; the prices are from TodaysTab's October check.</p>

<h2>Circle Drive and the north industrial area</h2>
<p>North of downtown, Circle Drive and Quebec Avenue hold chain restaurants and a distillery.</p>
<p><strong><a href="/saskatoon/venues/5090">Birmingham's Vodka and Ale House (#109-810 Circle Dr E)</a></strong> serves a 20&nbsp;oz house draft at $4.99, a single highball at $4.99, 6&nbsp;oz wine at $5.99 and 25% off appetizers daily from 2 to 5&nbsp;PM. The same drink prices return nightly from 9&nbsp;PM to close, according to TodaysTab's October check. Wednesday wings are $9.99 a pound.</p>
<p><strong><a href="/saskatoon/venues/5122">Wendel Clark's Classic Grill &amp; Bar (125 Circle Dr E)</a></strong> lists $5 pints of Molson Canadian and Coors Light, $3 one-ounce shots and half-price appetizers from 3 to 6&nbsp;PM daily, according to TodaysTab's October check. Its website shows no happy hour and lists closing at 9&nbsp;PM Sunday, 10&nbsp;PM Monday to Thursday and 11&nbsp;PM Friday and Saturday, so call to confirm.</p>
<p><strong><a href="/saskatoon/venues/1419">Stumbletown Distilling (20-1905 Quebec Ave)</a></strong> lists a Gin o'clock happy hour from 4 to 7&nbsp;PM: a Cosmic Cowboy gin and tonic at $5, a feature cocktail at $9, three-ounce whisky or cocktail flights at $17, and beer and wings at $25. Its website lists open hours of Thursday and Friday 4-8&nbsp;PM and Saturday 2-9&nbsp;PM, so the happy hour applies only when it is open.</p>

<h2>Preston Avenue, Stonebridge and 8th Street East</h2>
<p>South and east of the river, Preston Avenue South and 8th Street East hold a busy group of family restaurants and sports bars.</p>
<p><strong><a href="/saskatoon/venues/2349">The Flats Eatery + Drink (3020 Preston Ave S, #210)</a></strong> lists happy hour daily from 2 to 5&nbsp;PM and again from 9&nbsp;PM, according to its website, with no prices. Monday brings a $4.95 domestic mug and a $5.95 premium mug, according to TodaysTab's October check, and Tuesday has discounts on margaritas, tequila and Corona.</p>
<p><strong><a href="/saskatoon/venues/5105">The Canadian Brewhouse (Stonebridge) (3150 Preston Ave S)</a></strong> shows the same happy hour menu as the west location, Monday to Saturday from 2 to 6&nbsp;PM and from 9&nbsp;PM: a 315&nbsp;mL Bud Light stein at $3.99, highballs at $4.99, 6&nbsp;oz house wine at $5.99, tacos at $3.99 and poutine at $7.99. Sunday brings 8-inch two-topping pizzas at $9.99.</p>
<p><strong><a href="/saskatoon/venues/5085">Moxies (3134 8 St E)</a></strong> has two daily windows, 2 to 5&nbsp;PM and from 8&nbsp;PM, according to Moxies' website (weeknights end at 10&nbsp;PM, Friday and Saturday at midnight). In our records, dine-in only: a 16&nbsp;oz Big Life lager or amber ale at $5, 1&nbsp;oz highballs at $5, Jackson Triggs 6&nbsp;oz wine at $5, handcrafted cocktails at $10, and blackened shrimp or black bean tacos at $5.</p>

<h2>West side, suburbs and the rest of the city</h2>
<p>Several chains run their happy hours in the newer suburbs, and a few local bars sit along the major roads.</p>
<p><strong><a href="/saskatoon/venues/5102">The Canadian Brewhouse (West) (2120 McClocklin Rd)</a></strong> runs Monday to Saturday from 2 to 6&nbsp;PM and again from 9&nbsp;PM, according to TodaysTab's October check. A Bud Light stein is $3.99, a Stella Artois stein is $5.49, an 8-inch two-topping pizza is $9.99 and chips and queso are $3.99.</p>
<p><strong><a href="/saskatoon/venues/5072">The Hideout Lounge (3-821 Central Ave)</a></strong> runs daily from 3 to 6&nbsp;PM and from 9&nbsp;PM to close, dine-in only. Domestic 16&nbsp;oz drafts are $5, house wine and Caesars are $6, one-ounce house liquor is $5, a slider is $5 and six wings are $7, according to TodaysTab's October check.</p>
<p><strong><a href="/saskatoon/venues/5172">The Keg Steakhouse + Bar (Brighton) (143 Gibson Bend)</a></strong> lists happy hour in the bar and lounge Monday to Saturday from 4 to 6&nbsp;PM and from 9&nbsp;PM, and all day Sunday (the restaurant opens at 4&nbsp;PM), according to its location page. It publishes no prices in our records, so call to confirm.</p>
<p><strong><a href="/saskatoon/venues/5083">Leopold's Tavern (Rosewood) (120 Tweed Lane)</a></strong> runs a late-night menu from 11&nbsp;PM: a Smash Burger Jr., a 20&nbsp;oz Leo's Lager and a Leo's Island Iced Tea, each $5, dine-in only. <strong><a href="/saskatoon/venues/5091">Leopold's Tavern (Kensington) (149 Kensington Blvd, Unit 10)</a></strong> is a sister location, but we could not confirm its happy hour, so call to confirm.</p>
<p><strong><a href="/saskatoon/venues/1417">Sports On Tap (2606 Lorne Ave)</a></strong> rotates daily specials, according to TodaysTab's October check: Sunday Caesars at $5.99, Tuesday 6&nbsp;oz house wine at $5.99 and half-price wine bottles, Wednesday Home Run Lager pints at $6.99, and Friday Michelob sleeves at $5.99.</p>

<h2>What's not on this list</h2>
<p>Online listings for Saskatoon happy hour also name Blanco Cantina on Cumberland Avenue, Cactus Club Cafe on Idylwyld Drive, State &amp; Main, Earls Kitchen + Bar and CHOP Steakhouse &amp; Bar. We have no confirmed happy hour window for them, so they are left out. 3 Hall Public House at 612 11th Street East posts a $6 happy hour from 2 to 5&nbsp;PM on Facebook, but with no days stated, so we did not list it. Blackrose Whiskey Club has half-price whiskey on Wednesdays, but its events calendar gives no time window.</p>

<h2>Frequently asked questions</h2>
<h3>What time is happy hour in Saskatoon?</h3><p>The most common window in TodaysTab's October 31, 2026 records is 2 to 5&nbsp;PM, which five venues run, including Birmingham's Vodka and Ale House at 810 Circle Drive East and Leopold's Tavern on Broadway. Others run 3 to 6&nbsp;PM, 4 to 7&nbsp;PM or 3 to 5&nbsp;PM, and 9 venues add a second window from 8&nbsp;PM or later.</p>
<h3>Where is the cheapest beer during a Saskatoon happy hour?</h3><p>The lowest beer price in our records is $3.99 for a 315&nbsp;mL stein of Bud Light at The Canadian Brewhouse on McClocklin Road, Monday to Saturday from 2 to 6&nbsp;PM and again from 9&nbsp;PM. Birmingham's pours a 20&nbsp;oz house draft at $4.99 from 2 to 5&nbsp;PM daily, and Moxies has a 16&nbsp;oz Big Life lager at $5.</p>
<h3>Which Saskatoon bars have late-night happy hour?</h3><p>Eight venues in our records have a happy hour window starting at 8&nbsp;PM or later: Moxies (8&nbsp;PM), Birmingham's (9&nbsp;PM to close), both Canadian Brewhouse locations (9&nbsp;PM), Las Palapas (8&nbsp;PM Sunday to Thursday), The Keg Brighton (9&nbsp;PM) and the Leopold's Tavern locations in Rosewood and Evergreen (11&nbsp;PM, with $5 pints of Leo's Lager).</p>
<h3>Is there a happy hour on Sundays in Saskatoon?</h3><p>Yes. Birmingham's, Leopold's Tavern, Moxies, Las Palapas and The Canadian Brewhouse list Sunday deals in our records. St. Tropez Bistro at 238 2nd Avenue South has $10 classic cocktails and $10 house wine on Sundays, and Shelter Brewing pours $7.50 rotational pints from 3 to 5&nbsp;PM on Sundays.</p>
<h3>Where can I find happy hour on Broadway Avenue?</h3><p>Broadway Avenue sits in the Nutana neighbourhood. Yard &amp; Flagon at 718 Broadway Avenue runs happy hour Monday to Friday from 2 to 5&nbsp;PM, according to its website, with weekly specials from 4&nbsp;PM. Leopold's Tavern at 616 10th Street East is a block off Broadway and runs 2 to 5&nbsp;PM daily, all day Monday.</p>
<h3>How do I know these Saskatoon deals are current?</h3><p>Every special on this page had a confidence score of 0.7 or higher and was re-checked within 45 days of October 31, 2026. Where a venue's own site does not show a deal, we say so and suggest calling. We re-check the list monthly, and the live venue pages on TodaysTab are always newer than this snapshot.</p>

<h2>More Saskatoon deals and nearby guides</h2>
<p>This guide is a snapshot from October 31, 2026; the live <a href="/saskatoon">Saskatoon page</a> is always current. Browse deals by day for <a href="/saskatoon/wednesday">Wednesday</a>, <a href="/saskatoon/thursday">Thursday</a> and <a href="/saskatoon/friday">Friday</a>, <a href="/saskatoon/submit">submit a missing deal</a>, read <a href="/saskatoon/blog/how-we-verify-every-special">how we verify every special</a>, or see the <a href="/saskatoon/blog">Saskatoon blog</a>. More guides: <a href="/edmonton/blog/happy-hours-edmonton-2026">Edmonton</a>, <a href="/calgary/blog/happy-hours-calgary">Calgary</a> and <a href="/kelowna/blog/happy-hours-kelowna-2026">Kelowna</a>.</p>
`,
  },
  {
    slug: "happy-hours-london-ontario",
    category: "Guide",
    regions: ["london"],
    title: "London, Ontario Happy Hours 2026: 22 Spots With Deals",
    metaDescription:
      "22 London, Ontario spots with happy hour deals in our October 2026 checks, from a $3.99 Bud Light stein to $5 highballs. Call ahead to confirm.",
    publishedAt: "2026-10-31",
    excerpt:
      "London, Ontario has 22 spots with happy hour deals in our October 2026 checks, and the most common window is 2 to 5 PM at four of the ten venues with a stated window.",
    contentHtml: `
<p>Quick answer: London, Ontario happy hour most often runs 2 to 5&nbsp;PM, and this guide covers 22 venues with a deal in our October checks. Draft beer starts at $3.99 (Canadian Brewhouse) and many weekday pints sit at $5 to $7. Downtown and Richmond Row together hold 11 of them.</p>
<p>Last verified October 31, 2026. Where a venue's own site and our records differ, or a venue publishes no times or prices, we say so, and you should call ahead. We re-check the list monthly.</p>

<h2>London, Ontario happy hours at a glance</h2>
<table>
<thead><tr><th>Venue</th><th>Deal</th><th>Days and times</th><th>Price</th><th>Neighbourhood</th></tr></thead>
<tbody>
<tr><td><a href="/london/venues/1803">The Canadian Brewhouse</a></td><td>Bud Light stein (315&nbsp;mL), tacos</td><td>Mon-Sat, 2 to 6&nbsp;PM</td><td>$3.99</td><td>Masonville</td></tr>
<tr><td><a href="/london/venues/1813">Joe Kool's</a></td><td>PBR drafts (Tuesday)</td><td>Tuesday, all day</td><td>$4</td><td>Richmond Row</td></tr>
<tr><td><a href="/london/venues/6959">Moxies</a></td><td>House highballs (1&nbsp;oz), 16&nbsp;oz lager</td><td>Daily, 2 to 5&nbsp;PM and 9&nbsp;PM to close</td><td>$5</td><td>Richmond Row</td></tr>
<tr><td><a href="/london/venues/1806">Taverna 1331</a></td><td>16&nbsp;oz draught</td><td>Mon-Sat, 2 to 5&nbsp;PM; Sunday all day</td><td>$6</td><td>Hyde Park</td></tr>
<tr><td><a href="/london/venues/1064">El Furniture Warehouse</a></td><td>Food items normally under $12</td><td>Tue-Sun, 3 to 5&nbsp;PM</td><td>$6.95</td><td>Richmond Row</td></tr>
<tr><td><a href="/london/venues/6951">Lucy's Lounge</a></td><td>Truffle fries, wings, dumplings</td><td>Tue-Thu, 5 to 6:30&nbsp;PM</td><td>$9 to $10</td><td>Richmond Row</td></tr>
<tr><td><a href="/london/venues/1062">Winks Eatery</a></td><td>Big Winks 32&nbsp;oz domestic</td><td>Mon and Wed, all day</td><td>$8</td><td>Richmond Row</td></tr>
<tr><td><a href="/london/venues/1797">The Morrissey House</a></td><td>Caesars (Sat), mimosas (Sun)</td><td>Sat and Sun, until 3&nbsp;PM</td><td>$6</td><td>Downtown</td></tr>
<tr><td><a href="/london/venues/6982">Beer Kitchen</a></td><td>Mimosas and Caesars</td><td>Sunday</td><td>$8</td><td>Old East Village</td></tr>
</tbody>
</table>

<p>Statistics Canada counted <a href="https://www150.statcan.gc.ca/n1/daily-quotidien/220209/dq220209a-eng.htm">543,551 people in the London census metropolitan area in 2021, up 10.0 per cent from 2016</a>. According to TodaysTab's checks on October 31, 2026, we track 140 active venues in London and 35 of them have a current special that meets our rules (confidence of 0.7 or higher, re-checked within 45 days, with a stated day or time). Of the 10 venues with a stated happy hour window, 4 run 2 to 5&nbsp;PM, the most common window (Taverna 1331, Moxies, Turtle Jack's and Rebel Layne). Tuesday and Wednesday have the most deals, with 30 of the 35 venues on each day (counting daily specials).</p>

<h2>Richmond Row: Richmond Street north of Dundas</h2>
<p>Richmond Row is the main bar strip, with most venues in one walkable run of Richmond Street between Dundas Street and Oxford Street.</p>
<p><strong><a href="/london/venues/6951">Lucy's Lounge (583 Richmond St)</a></strong> opens at 5&nbsp;PM and is closed Sunday and Monday. Its happy hour runs Tuesday to Thursday, 5 to 6:30&nbsp;PM, according to its website: truffle fries $9, wings $10, beef dumplings $10, bang bang shrimp $12, a half dozen oysters $19 and margherita pizza $14. Wednesday is $2 oysters, according to TodaysTab's October 14 check.</p>
<p><strong><a href="/london/venues/1062">Winks Eatery (551 Richmond St)</a></strong> posts a special every day, dine in only, according to its website. Monday has $1.25 wings with a beverage and $8 Big Winks 32&nbsp;oz domestic. Wednesday is happy hour from open to close with $8 Big Winks.</p>
<p><strong><a href="/london/venues/1813">Joe Kool's (595 Richmond St)</a></strong> publishes its weekly specials as a PDF, so these come from TodaysTab's October 24 and 30 checks; call to confirm. Monday: 99-cent wings and $5 Miller Lite drafts. Tuesday: $4 PBR drafts. Wednesday: $4 Bud Light. Friday: High Life buckets of four bottles for $15 until 7&nbsp;PM.</p>
<p><strong><a href="/london/venues/1064">El Furniture Warehouse (645 Richmond St)</a></strong> runs happy hour Tuesday to Sunday, 3 to 5&nbsp;PM. Food items normally under $12 are $6.95, according to the Warehouse Group website. The site lists no drink prices.</p>
<p><strong><a href="/london/venues/6959">Moxies (441 Richmond St)</a></strong> has happy hour twice daily, dine in only: 2 to 5&nbsp;PM and 9&nbsp;PM to midnight (to 1&nbsp;AM Friday and Saturday), according to its website. The site shows no prices. TodaysTab's October 25 check lists 1&nbsp;oz house highballs, a 16&nbsp;oz lager, espresso martinis and 6&nbsp;oz house wine at $5 each.</p>

<h2>Downtown: Dundas Street and Talbot Street</h2>
<p>Downtown sits around Dundas Street, with Canada Life Place at the west end and bars along Talbot Street just south and north of Dundas.</p>
<p><strong><a href="/london/venues/1795">The Squire Pub &amp; Grill (109 Dundas St)</a></strong> has half-price feature appetizers daily from 4&nbsp;PM to close (it is closed most Mondays), according to its website. They do not apply on event nights at Canada Life Place. Call to confirm.</p>
<p><strong><a href="/london/venues/1808">FitzRay's Restaurant &amp; Lounge (110 Dundas St)</a></strong> lists Steak Tuesday at $20 for a 6&nbsp;oz bacon-wrapped tenderloin and $19 for an 8&nbsp;oz New York striploin, nachos from $15 on Thursday and $5 rye, rum, gin or vodka, according to TodaysTab's October check. Call (519) 646-1112 to confirm.</p>
<p><strong><a href="/london/venues/1797">The Morrissey House (361 Dundas St)</a></strong> is at Dundas and Waterloo and closed Mondays. Per its website, specials are dine in only: half-price jumbo wings Tuesday, $1.50 off glasses of wine Wednesday and a $15 halibut and chips Friday. Saturday has $6 Caesars and Sunday $6 mimosas, both until 3&nbsp;PM.</p>
<p><strong><a href="/london/venues/1800">Holy Diver (353 Talbot St)</a></strong> shows Monday $10 smash burgers, Tuesday $20 pitchers and Wednesday half-price wings on its website. TodaysTab's October 11 check adds $6 pints Thursday and $4 shots Friday and Saturday; call to confirm.</p>
<p><strong><a href="/london/venues/6965">Hunter &amp; Co. (349 Talbot St)</a></strong> opens at 5&nbsp;PM. According to TodaysTab's October 24 check, oysters are half price Sunday from 5 to 8&nbsp;PM, and a Late Bite menu runs 10&nbsp;PM to midnight Friday and Saturday. Its website does not list these, so call before you go.</p>
<p><strong><a href="/london/venues/7046">Los Lobos (580 Talbot St)</a></strong> has a $13 weekday lunch margarita, Monday to Friday from noon to 5&nbsp;PM, dine in, according to TodaysTab's October 24 check. Monday is three tacos for $15 with a beverage. The website shows no specials, so call 519-601-8226.</p>

<h2>Old East Village: Dundas Street East and Kellogg Lane</h2>
<p>Old East Village is the arts and brewery district just east of downtown, and Kellogg Lane is a converted factory complex there.</p>
<p><strong><a href="/london/venues/6982">Beer Kitchen (100 Kellogg Lane)</a></strong> posts a different deal each day on its website. Monday is Industry Night with $3.50 pints from 4&nbsp;PM (the site does not say who qualifies), Tuesday is 50% off beer flights, Friday is a pitcher and a pizza for $40, and Sunday has $8 mimosas and Caesars.</p>

<h2>Wortley Village</h2>
<p>Wortley Village is the small main street just south of downtown, centred on Wortley Road.</p>
<p><strong><a href="/london/venues/7056">Rebel Layne (145 Wortley Rd)</a></strong> has half-price snacks for happy hour every day from 2 to 5&nbsp;PM, according to TodaysTab's October 26 check. Its website does not show the window, so call (226) 663-4567.</p>

<h2>Masonville and north London</h2>
<p>Masonville is the retail area around Masonville Place at Richmond Street and Fanshawe Park Road, with chain restaurants along Richmond Street North.</p>
<p><strong><a href="/london/venues/1803">The Canadian Brewhouse (1701 Richmond St)</a></strong> has the lowest beer price we track. Its website advertises happy hour from $3.99, Monday to Saturday, 2 to 6&nbsp;PM. TodaysTab's October 11 check lists a 315&nbsp;mL Bud Light stein at $3.99, highballs at $4.99, tacos at $3.99 and poutine at $7.99. The site's chain-wide page does not confirm these for London, so call 226-330-0456.</p>
<p><strong><a href="/london/venues/7053">The Keg Steakhouse + Bar (1680 Richmond St N, Suite 100)</a></strong> at Masonville Place runs happy hour in the bar, lounge and patio, dine in only, Monday to Friday from opening until 6&nbsp;PM, according to its website. TodaysTab records 4 to 6&nbsp;PM Monday to Thursday and 3 to 6&nbsp;PM Friday. We have no prices.</p>
<p><strong><a href="/london/venues/993">The Waltzing Weasel (1324 Adelaide St N)</a></strong> rotates a daily special, according to its website, with prices before HST. Monday is wings at $12 a pound and a 20&nbsp;oz Coors Light at $8.50. Thursday is shepherd's pie at $18 with Irish pints at $9.50, and Sunday is fish and chips at $15.50 with Caesars at $6.75.</p>
<p><strong><a href="/london/venues/6960">Turtle Jack's (655 Fanshawe Park Rd W)</a></strong> lists Canadian and Coors Light 18&nbsp;oz drafts at $7, 5&nbsp;oz house wine at $6 and fried calamari at $14 on its chain-wide happy hour page, which shows no London hours. TodaysTab's October 19 check records 2 to 5&nbsp;PM daily and half-price wine bottles Wednesday. Call to confirm.</p>

<h2>Hyde Park</h2>
<p><strong><a href="/london/venues/1806">Taverna 1331 (1331 Hyde Park Rd)</a></strong> runs happy hour Monday to Saturday, 2 to 5&nbsp;PM, and all day Sunday, according to its website. In TodaysTab's October 23 records, 16&nbsp;oz draught is $6 (1331 Lite, Steam Whistle), a barbacoa taco is $6, oysters are $16 and a single burger is $12. Call to confirm prices.</p>

<h2>East and south London</h2>
<p><strong><a href="/london/venues/6958">Craft Farmacy (449 Wharncliffe Rd S, Suite 1)</a></strong>, on Wharncliffe Road South in south London, runs happy hour Tuesday to Friday, 3 to 5&nbsp;PM, with half-priced oysters and select drink and appetizer features, according to its website. The site lists no prices and no street address; the address comes from our records. Call 519-914-2699.</p>
<p><strong><a href="/london/venues/1798">Carey's Bar and Grill (1569 Oxford St E)</a></strong> has $5.50 pints (16&nbsp;oz, rotating draft) and a $15 wrap or sandwich with a side on Mondays, according to its website. Wednesday trivia, 8 to 10&nbsp;PM, brings $5 mixed drinks and 99-cent wings, dine in only.</p>
<p><strong><a href="/london/venues/1796">Dawghouse Pub and Eatery (699 Wilkins St)</a></strong> lists, on its website, a $7.99 burger and fries Tuesday, 88-cent wings and $5 glasses (6&nbsp;oz) of house wine Wednesday, and $9.99 tacos Thursday. Sunday has $8.88 mini pitchers and $5 Caesars until 5&nbsp;PM.</p>
<p><strong><a href="/london/venues/1811">Crabby Joe's Wellington South (557 Wellington Rd S)</a></strong> runs a $5 17&nbsp;oz domestic draught daily from 11&nbsp;AM to 5&nbsp;PM and half-price appetizers after 9&nbsp;PM, according to TodaysTab's October 31 check. Wednesday is $6 wine and Thursday is a $17 rack of ribs. The chain site has no London page, so call to confirm.</p>

<h2>What's not on this list</h2>
<p>These venues came up in our research or records, and we cannot confirm a current deal. <strong>Molly Bloom's Irish Pub (700 Richmond St)</strong> lists a wing special Monday and Tuesday and half-price nachos after 5&nbsp;PM Wednesday, with no prices published. <strong>Toboggan Brewing (585 Richmond St)</strong> runs Monday trivia with $20 lager pitchers in our October check, but its website shows no prices. <strong>The Church Key (476 Richmond St)</strong> lists 3 appetizers for $33 on Tuesday and Thursday evenings, but its page looks out of date. <strong>Crabby Joe's Downtown (276 Dundas St)</strong> was last checked October 13, and we have no confirmation it still runs the offers. Piper Arms (3090 Wonderland Rd S) has a deal in our records, but its website shows no London address.</p>

<h2>Frequently asked questions</h2>
<h3>What time is happy hour in London, Ontario?</h3>
<p>The most common window is 2 to 5&nbsp;PM, used by Taverna 1331, Moxies, Turtle Jack's and Rebel Layne. El Furniture Warehouse and Craft Farmacy run 3 to 5&nbsp;PM, The Canadian Brewhouse 2 to 6&nbsp;PM, The Keg until 6&nbsp;PM, and Lucy's Lounge 5 to 6:30&nbsp;PM, according to TodaysTab's October 2026 checks.</p>
<h3>Where is the cheapest beer in London, Ontario?</h3>
<p>The lowest price in our records is a 315&nbsp;mL Bud Light stein at $3.99 at The Canadian Brewhouse (1701 Richmond St), Monday to Saturday, 2 to 6&nbsp;PM, per TodaysTab's October 11 check. Joe Kool's lists $4 PBR drafts on Tuesday. Call to confirm.</p>
<h3>Which London, Ontario bars have late-night happy hour?</h3>
<p>Moxies (441 Richmond St) runs happy hour from 9&nbsp;PM to midnight, and to 1&nbsp;AM Friday and Saturday, according to its website. The Canadian Brewhouse advertises a late-night happy hour from 9&nbsp;PM to close. Our records also show half-price appetizers after 9&nbsp;PM at Crabby Joe's Wellington South and a Late Bite menu at Hunter &amp; Co. from 10&nbsp;PM.</p>
<h3>Is there a happy hour on Sunday in London, Ontario?</h3>
<p>Yes. Taverna 1331 (1331 Hyde Park Rd) runs happy hour all day Sunday, per its website. Beer Kitchen (100 Kellogg Lane) has $8 mimosas and Caesars, The Morrissey House (361 Dundas St) has $6 mimosas until 3&nbsp;PM, and Dawghouse (699 Wilkins St) has $5 Caesars until 5&nbsp;PM.</p>
<h3>Is there a minimum price for drinks in Ontario?</h3>
<p>Yes. The <a href="https://www.agco.ca/en/alcohol/appendix-2-registrars-guidelines-advertising-and-promotion/pricing-and-promotion-liquor">AGCO's pricing and promotion guidelines</a> say a standard drink may not be sold for less than $2.00, or $1.34 for spirits above 14.8% alcohol by volume. They also require revised prices to be posted and prohibit "2 for 1 drinks" in all circumstances.</p>
<h3>Which London neighbourhood has the most happy hours?</h3>
<p>Downtown, around Dundas and Talbot Streets, has the most in this guide with 6 of the 22 venues, including The Morrissey House and Holy Diver. Richmond Row has 5 more between 441 and 645 Richmond Street, including Moxies, Winks Eatery and Lucy's Lounge, so the two areas together hold half the list.</p>
<h3>How do I know these London deals are current?</h3>
<p>Each venue's entry says whether the deal comes from its own website or from TodaysTab's check, and the dates run from October 11 to October 31, 2026. We re-check the list monthly, and deals change, so call before you go. See <a href="/london/blog/how-we-verify-every-special">how we verify every special</a>.</p>

<h2>More London deals and nearby guides</h2>
<p>This guide is a snapshot from October 31, 2026. The live <a href="/london">London specials page</a> is always current, and you can browse by day: <a href="/london/tuesday">Tuesday</a>, <a href="/london/wednesday">Wednesday</a> and <a href="/london/friday">Friday</a>. Know a deal we missed or one that has changed? <a href="/london/submit">Submit it here</a>. See the <a href="/london/blog">London blog</a> for other guides. Ontario neighbours: <a href="/hamilton/blog/happy-hours-hamilton">Hamilton</a> and <a href="/ottawa/blog/happy-hours-ottawa">Ottawa</a>. More cities: <a href="/kelowna/blog/happy-hours-kelowna-2026">Kelowna</a>, <a href="/edmonton/blog/happy-hours-edmonton-2026">Edmonton</a> and <a href="/halifax/blog/happy-hours-halifax">Halifax</a>.</p>
`,
  },
  {
    slug: "happy-hours-niagara",
    category: "Guide",
    regions: ["niagara-region"],
    title: "Niagara Happy Hours 2026: 22 Spots With Deals",
    metaDescription:
      "22 Niagara happy hour spots in our November 2026 checks, from $2 oysters at Tide and Vine to $5 Tuesday pours at Silversmith. Call ahead to confirm.",
    publishedAt: "2026-11-01",
    excerpt:
      "Niagara has 22 spots with happy hour deals in our November 2026 checks, and the most common window is 3 to 5 PM at 6 venues.",
    contentHtml: `
<p>Quick answer: Niagara happy hour most often runs 3 to 5&nbsp;PM, and this guide covers 22 venues from Niagara Falls to Niagara-on-the-Lake, St. Catharines and Welland. Pints start at $6 (Legends on the Niagara, Sala 61, Taps Brewhouse), Silversmith Brewing pours $5 on Tuesdays and Tide and Vine sells $2 oysters. Niagara Falls has the most spots.</p>
<p>Last verified November 1, 2026. Where a venue's own site and our records differ, or a venue publishes no times or prices, we say so, and you should call ahead. We re-check the list monthly.</p>

<h2>Niagara happy hours at a glance</h2>
<table>
<thead><tr><th>Venue</th><th>Deal</th><th>Days and times</th><th>Price</th><th>Neighbourhood</th></tr></thead>
<tbody>
<tr><td><a href="/niagara-region/venues/6312">Tide and Vine Oyster House</a></td><td>Shucker's Choice oysters</td><td>Mon all day; Tue-Fri, 3 to 5&nbsp;PM</td><td>$2 each</td><td>Portage Road, Niagara Falls</td></tr>
<tr><td><a href="/niagara-region/venues/6324">Silversmith Brewing Co.</a></td><td>Tuesday pours; Silver Hours</td><td>Tue all day; Mon-Fri, 3 to 5&nbsp;PM</td><td>$5 pours; $2 off 16&nbsp;oz draught</td><td>Virgil (Niagara-on-the-Lake)</td></tr>
<tr><td><a href="/niagara-region/venues/6321">Legends on The Niagara Restaurant</a></td><td>Draft pints</td><td>Mon-Thu, 3 to 5&nbsp;PM</td><td>$6</td><td>Niagara Parkway</td></tr>
<tr><td><a href="/niagara-region/venues/6304">Sala Sixty One (61) Bar + Social</a></td><td>Domestic pints</td><td>Tue-Sun, 3 to 5&nbsp;PM</td><td>$6</td><td>St. Catharines</td></tr>
<tr><td><a href="/niagara-region/venues/6318">Table Rock Bistro + Wine Bar</a></td><td>Draft pints</td><td>4 to 6&nbsp;PM</td><td>$7</td><td>Niagara Parkway</td></tr>
<tr><td><a href="/niagara-region/venues/6299">Doc Magilligan's Restaurant &amp; Irish Pub</a></td><td>Pints, house wine, snacks</td><td>Mon-Fri, 2 to 5&nbsp;PM</td><td>$7 pints</td><td>Lundy's Lane</td></tr>
<tr><td><a href="/niagara-region/venues/6309">NOTL Bar &amp; Restaurant</a></td><td>Pints, select wines</td><td>Sat-Sun, 2 to 4&nbsp;PM</td><td>$8 pints, $11 wine</td><td>Old Town, Niagara-on-the-Lake</td></tr>
<tr><td><a href="/niagara-region/venues/1041">Weinkeller Restaurant</a></td><td>Signature cocktails, bottles</td><td>Fri-Sat, 4 to 6&nbsp;PM</td><td>$7 cocktails</td><td>Victoria Avenue</td></tr>
<tr><td><a href="/niagara-region/venues/6363">Twenty Kitchen &amp; Bar</a></td><td>Cocktails, wine, cans</td><td>Daily, 4:30 to 6:30&nbsp;PM</td><td>$12 cocktails, $6.50 cans</td><td>Downtown St. Catharines</td></tr>
</tbody>
</table>

<p>The Niagara Region had 477,941 residents in the 2021 Census, up 6.7 per cent from 2016, according to <a href="https://www12.statcan.gc.ca/census-recensement/2021/as-sa/fogs-spg/Page.cfm?lang=e&amp;topic=1&amp;dguid=2021A00033526">Statistics Canada</a>. Ontario's alcohol regulator has allowed the words "happy hour" in advertising since May 6, 2019, according to <a href="https://www.agco.ca/en/news/info-bulletin-no-56-regulatory-modernization-and-burden-reduction-changes-ontarios-beverage">AGCO Info Bulletin No. 56</a>. According to TodaysTab's checks on November 1, 2026, we track 179 active venues in the Niagara region and 51 of them have a current special that meets our rules (confidence of 0.7 or higher, re-checked within 45 days). Of those, 26 have a happy hour deal with a stated day or time. The most common window is 3 to 5&nbsp;PM, at 6 venues. In our records only 3 venues have a window starting at 8:30&nbsp;PM or later: the two Niagara Falls Keg locations and NITRO in St. Catharines. The lowest regular drink price in our records is $5, at Silversmith Brewing on Tuesdays, tied with Newark Brewing's member pints.</p>

<h2>Fallsview: hotel and casino bars above the Falls</h2>
<p>Fallsview Boulevard is the high-rise strip of hotels, casino floors and rooftop bars.</p>
<p><strong><a href="/niagara-region/venues/6298">Wildflower Social (6361 Fallsview Blvd)</a></strong> sits inside the Hilton. Its Flower Hour runs Sunday to Thursday, 3 to 6&nbsp;PM, and takes $5 off feature cocktails, mocktails and shareable appetizers, according to its website.</p>
<p><strong><a href="/niagara-region/venues/6311">La Favella (6671 Fallsview Blvd)</a></strong> is a rooftop bar and patio in Fallsview. According to TodaysTab's October check, happy hour runs Thursday and Friday, 5 to 6&nbsp;PM, and Saturday and Sunday, 4 to 6&nbsp;PM, with the full food menu and signature cocktails at $10, and Friday is Ladies Night. The venue's website did not show these details, so call 905-354-8775 to confirm.</p>
<p><strong><a href="/niagara-region/venues/6319">The Keg Steakhouse + Bar, Fallsview (6455 Fallsview Blvd)</a></strong> lists happy hour Sunday to Friday from noon to 5&nbsp;PM and again from 9&nbsp;PM to close, in the bar, lounge and patio. Its page does not publish prices.</p>
<p><strong><a href="/niagara-region/venues/6349">Infinity Bar (6380 Fallsview Blvd)</a></strong> is on the Fallsview Casino floor. Sunday to Thursday, 3 to 5&nbsp;PM, it takes $2 off well liquor, draft domestic beer and house wine, according to the casino's website.</p>

<h2>Clifton Hill and Victoria Avenue: casino and tourist strip</h2>
<p>The streets between Clifton Hill and Casino Niagara hold the older tourist core, with steakhouses and sports bars close together.</p>
<p><strong><a href="/niagara-region/venues/1041">Weinkeller Restaurant (5633 Victoria Ave)</a></strong> runs a Friday and Saturday happy hour, 4 to 6&nbsp;PM, according to TodaysTab's October check (the restaurant posts its happy hour menu as images, so call 289-296-4667 to confirm). Signature cocktails are $7, domestic and imported bottles $8, a 6&nbsp;oz house wine $11, oysters $2 and BBQ riblets $3.</p>
<p><strong><a href="/niagara-region/venues/6439">The Keg Steakhouse + Bar, Courtyard Marriott (5950 Victoria Ave)</a></strong> shows happy hour Monday to Friday, 4 to 6&nbsp;PM, weekends noon to 5&nbsp;PM, and late night from 8:30&nbsp;PM Sunday to Thursday and 9&nbsp;PM Friday and Saturday, according to TodaysTab's October check. The Keg's website did not load for us and lists no prices, so call before you go.</p>
<p><strong><a href="/niagara-region/venues/6373">LEV2L Sports Bar (5705 Falls Ave)</a></strong> is inside Casino Niagara. Our records show happy hour Monday to Friday, 3 to 5&nbsp;PM, at $6; call to confirm.</p>

<h2>Lundy's Lane, Queen Street and Portage Road</h2>
<p>Lundy's Lane is the historic district, Queen Street is in downtown Niagara Falls, and Tide and Vine sits on Portage Road.</p>
<p><strong><a href="/niagara-region/venues/6299">Doc Magilligan's Restaurant &amp; Irish Pub (6400 Lundy's Lane)</a></strong> has happy hour Monday to Friday, 2 to 5&nbsp;PM, in our October check (its homepage does not list times, so call 905-374-0021 to confirm). A pint of the Niagara College rotation tap or Amsterdam 3 Speed Lager is $7, a 6&nbsp;oz house white or red is $7, Irish nachos are $10.50, Doc's poutine and feta bruschetta are $8, and curry fries are $6.</p>
<p><strong><a href="/niagara-region/venues/2379">Taps Brewhouse (4680 Queen St)</a></strong> pours one $6 beer per day, all day, according to its website: Art Attack IPA Monday, Flying Colours Lager Tuesday, Elegant Effect Amber Ale Wednesday, Black Moon Porter Thursday and Belgian Wit Friday. No beer special is listed for Saturday or Sunday.</p>
<p><strong><a href="/niagara-region/venues/6312">Tide and Vine Oyster House (3491 Portage Rd)</a></strong> runs happy hour all day Monday and 3 to 5&nbsp;PM Tuesday to Friday, according to its website. Shucker's Choice oysters are $2, mussels are half price and Counterpart Pur Pilsner pints are $6.</p>

<h2>Niagara Parkway: Niagara Parks restaurants</h2>
<p>These two restaurants are run by Niagara Parks along the river and are listed as seasonal, so confirm they are open before a November visit.</p>
<p><strong><a href="/niagara-region/venues/6318">Table Rock Bistro + Wine Bar (6650 Niagara Pkwy)</a></strong> lists happy hour from 4 to 6&nbsp;PM with draft pints at $7 and 9&nbsp;oz wine priced as 6&nbsp;oz. The page does not name the days, and our records do not specify days, so call to confirm.</p>
<p><strong><a href="/niagara-region/venues/6321">Legends on The Niagara Restaurant (9561 Niagara Pkwy)</a></strong> pours $6 pints (on tap only) and 9&nbsp;oz wine for the price of 6&nbsp;oz Monday to Thursday, 3 to 5&nbsp;PM. Sundays have $6 Caesars all day. Niagara Parks lists these as restaurant promotions rather than a happy hour and the restaurant as seasonal, April to November, so call 905-295-9595 before a November visit.</p>

<h2>Niagara-on-the-Lake: Old Town and wine country</h2>
<p>Old Town centres on Queen Street.</p>
<p><strong><a href="/niagara-region/venues/2371">11th POST on Queen (135 Queen St)</a></strong> lists happy hour cocktails and bites at 3 to 5&nbsp;PM on weekdays, but its site shows Tuesday as closed on one page and publishes no happy hour times on its homepage, so call 289-646-7678 to confirm days. Its prices are in a PDF we could not read.</p>
<p><strong><a href="/niagara-region/venues/6309">NOTL Bar &amp; Restaurant (126 Queen St)</a></strong> has a weekend happy hour, Saturday and Sunday, 2 to 4&nbsp;PM, with $11 glasses of select wine and $8 pints, indoors or on the covered patio, according to its July 2026 happy hour menu.</p>
<p><strong><a href="/niagara-region/venues/1042">Peller Estates Winery Restaurant (290 John St E)</a></strong> has a daily 12 to 1&nbsp;PM social hour, listed at its Terrace Wine Bar, in TodaysTab's October check: a Peller Bloody Caesar, a Wake Up in Wine Country Martini and classic poutine, each $12. The winery's page did not show it, so call to confirm.</p>
<p><strong><a href="/niagara-region/venues/6324">Silversmith Brewing Co. (1523 Niagara Stone Rd, Virgil)</a></strong> has the clearest weekly schedule in the region, according to its website. Silver Hours are Monday to Friday, 3 to 5&nbsp;PM, with $2 off 16&nbsp;oz Silversmith draught. Tuesday is $5 pours and $3 oysters (minimum 6), Wednesday is $3 off 16&nbsp;oz pours.</p>

<h2>St. Catharines: St. Paul Street and the west end</h2>
<p>St. Paul Street is the downtown strip, and Sala 61 sits on Vansickle Road in the west end.</p>
<p><strong><a href="/niagara-region/venues/6363">Twenty Kitchen &amp; Bar (259 St. Paul St)</a></strong> runs happy hour daily, 4:30 to 6:30&nbsp;PM, according to its website: cocktails $12, a 5&nbsp;oz glass of any wine $12, canned craft beer or seltzer $6.50, and whipped ricotta, a small charcuterie board or beef tartare at $13.</p>
<p><strong><a href="/niagara-region/venues/6304">Sala Sixty One (61) Bar + Social (125 Vansickle Rd)</a></strong> lists happy hour 3 to 5&nbsp;PM with $6 domestic pints, 6&nbsp;oz wine and 1&nbsp;oz well drinks, according to its website. It is closed Mondays.</p>
<p><strong><a href="/niagara-region/venues/6336">Cold Break Brewing (193 St. Paul St W)</a></strong> lists $6 beers on Wednesdays in TodaysTab's October check, with other weekly food specials; its site did not load for us, so call to confirm.</p>

<h2>Welland, Thorold and Beamsville</h2>
<p>These three towns each have a local pub or brewery with one standing weekly deal.</p>
<p><strong><a href="/niagara-region/venues/1038">Cheers - Yia Mas Greek Restaurant (292 E Main St, Welland)</a></strong> runs a Thursday wing and pint: a pound of jumbo wings from $15.99 with a 20&nbsp;oz Cheers Premium Lager draft at $7.20, according to its website. It is closed Mondays.</p>
<p><strong><a href="/niagara-region/venues/6328">Donnelly's Pub (54 Front St S, Thorold)</a></strong> has a $1 wing special on Thursdays, according to TodaysTab's October check. A 10-wing minimum applies per order, according to its specials page; call 905-227-1947 to confirm. The pub is closed Monday and Tuesday.</p>
<p><strong><a href="/niagara-region/venues/6335">Newark Brewing: Bar &amp; Restaurant (4766 Christie Dr, Beamsville)</a></strong> offers $5 pints (16&nbsp;oz) to Stein Club members, according to its website. Ask the taproom for the current Stein Club price. It has no happy hour window and is closed Tuesdays.</p>

<h2>What's not on this list</h2>
<p>Niagara Brewing Company Taproom is left out because its own site gives 4915-A Clifton Hill as its address while our records show a $4 beer from 3 to 4&nbsp;PM at 6380 Fallsview Blvd, and we could not reconcile the two. Bar Barista at Fallsview Casino has no happy hour on the casino's site. NITRO in St. Catharines shows a $5 domestic beer on Fridays, 10 to 11&nbsp;PM, in our records, but we could not confirm it. Kelseys lists a daily happy hour at its St. Catharines locations, but TodaysTab does not track its current prices. Trust Beer Bar, the Olde Angel Inn and Hob Nob Restaurant appear on other roundups, and we have no confirmed window for them.</p>

<h2>Frequently asked questions</h2>
<h3>What time is happy hour in Niagara Falls?</h3>
<p>Most Niagara Falls happy hours run 2 to 6&nbsp;PM. Doc Magilligan's is 2 to 5&nbsp;PM on weekdays, Infinity Bar is 3 to 5&nbsp;PM Sunday to Thursday, Wildflower Social is 3 to 6&nbsp;PM, and Table Rock Bistro is 4 to 6&nbsp;PM. The Keg on Fallsview Boulevard adds a second window from 9&nbsp;PM to close.</p>
<h3>Where is the cheapest beer in Niagara?</h3>
<p>In our records the lowest regular drink price is $5, at Silversmith Brewing in Virgil on Tuesdays, tied with Newark Brewing's member pints. Pints at $6 are the usual floor elsewhere: Legends on the Niagara and Tide and Vine on weekday afternoons, Sala 61 from 3 to 5&nbsp;PM, and Taps Brewhouse with one $6 beer each weekday. Newark Brewing charges $5 pints to Stein Club members.</p>
<h3>Is there a happy hour in Niagara-on-the-Lake?</h3>
<p>Yes. Silversmith Brewing in Virgil takes $2 off 16&nbsp;oz draught Monday to Friday from 3 to 5&nbsp;PM, 11th POST on Queen lists a weekday happy hour from 3 to 5&nbsp;PM, and NOTL Bar &amp; Restaurant on Queen Street runs $8 pints and $11 wine on Saturday and Sunday from 2 to 4&nbsp;PM.</p>
<h3>Which Niagara bars have late-night happy hour?</h3>
<p>The Keg Steakhouse on Fallsview Boulevard lists happy hour from 9&nbsp;PM to close Sunday to Friday, according to its website. Our records show the Keg at 5950 Victoria Avenue starting late night at 8:30&nbsp;PM Sunday to Thursday and 9&nbsp;PM on weekends, but its site did not load, so call first.</p>
<h3>Is there a weekend happy hour in Niagara?</h3>
<p>Yes. NOTL Bar &amp; Restaurant is Saturday and Sunday, 2 to 4&nbsp;PM, and Weinkeller on Victoria Avenue runs Friday and Saturday, 4 to 6&nbsp;PM, according to TodaysTab's October check. La Favella lists Thursday to Sunday (5 to 6&nbsp;PM Thursday and Friday, 4 to 6&nbsp;PM weekends), and Legends on the Niagara has $6 Caesars all day Sunday.</p>
<h3>Is happy hour allowed in Ontario?</h3>
<p>Yes. The Alcohol and Gaming Commission of Ontario removed its ban on the words "Happy Hour" and "Cheap Drinks" from its advertising guidelines effective May 6, 2019. Licensees must still keep price promotions responsible and must not promote immoderate consumption, so deals are priced discounts and not unlimited offers.</p>

<h2>More Niagara and Ontario guides</h2>
<p>This post is a snapshot of November 1, 2026; the live <a href="/niagara-region">Niagara region page</a> is always current. Plan by day with <a href="/niagara-region/thursday">Thursday</a>, <a href="/niagara-region/friday">Friday</a> and <a href="/niagara-region/saturday">Saturday</a> specials, read <a href="/niagara-region/blog/how-we-verify-every-special">how we verify every special</a> or browse the <a href="/niagara-region/blog">Niagara blog</a>. If your bar is missing or a price has changed, <a href="/niagara-region/submit">submit it here</a>. Other Ontario and Canadian guides: <a href="/hamilton/blog/happy-hours-hamilton">Hamilton</a>, <a href="/toronto-core/blog/happy-hours-toronto">Toronto</a>, <a href="/london/blog/happy-hours-london-ontario">London</a>, <a href="/ottawa/blog/happy-hours-ottawa">Ottawa</a>, <a href="/kelowna/blog/happy-hours-kelowna-2026">Kelowna</a> and <a href="/edmonton/blog/happy-hours-edmonton-2026">Edmonton</a>.</p>
`,
  },
  {
    slug: "happy-hours-halton",
    category: "Guide",
    regions: ["halton-region"],
    title: "Halton Happy Hours 2026: 19 Spots With Deals",
    metaDescription:
      "Halton Region happy hours 2026: 19 spots in Oakville, Burlington, Milton and Halton Hills, with $5 pints, $7 drinks and 9 PM deals. Checked Nov 1, 2026.",
    publishedAt: "2026-11-01",
    excerpt:
      "As of November 1, 2026, TodaysTab tracks 174 Halton venues and 41 have a current dated special, with 3 to 5 PM the most common window.",
    contentHtml: `
<p>Quick answer: Halton Region happy hours usually run 3 to 5&nbsp;PM or 3 to 6&nbsp;PM, and several places repeat the deal from 9&nbsp;PM to close. As of November 1, 2026, domestic beer starts at $5 to $6, and wine and cocktails mostly run $7 to $10. Burlington has the most spots, and this guide lists 19 venues across Oakville, Burlington, Milton, Georgetown and Acton.</p>
<p>Last verified November 1, 2026. Where a venue's own site and our records differ, or a venue publishes no times or prices, we say so, and you should call ahead. We re-check the list monthly.</p>
<table>
<thead><tr><th>Venue</th><th>Deal</th><th>Days and times</th><th>Price</th><th>Neighbourhood</th></tr></thead>
<tbody>
<tr><td><a href="/halton-region/venues/4249">Harpers Landing</a></td><td>Wine, premium draught, cocktails, pizzas</td><td>Daily, 3-5&nbsp;PM and 9&nbsp;PM to close</td><td>$8 wine, $7 draught, $9 cocktails</td><td>Oakville, Cornwall Road</td></tr>
<tr><td><a href="/halton-region/venues/4465">Jacksons Landing</a></td><td>Wine, premium draught, cocktails</td><td>Daily, 3-5&nbsp;PM and 9&nbsp;PM to close</td><td>$8 wine, $7 draught, $9 cocktails</td><td>Burlington, New Street</td></tr>
<tr><td><a href="/halton-region/venues/4445">Isabelle Restaurant &amp; Lounge</a></td><td>Wine, beer, cocktails, oysters</td><td>Mon-Fri, 4-6&nbsp;PM</td><td>$10 wine, $8 beer, $10 cocktails</td><td>Burlington, Elizabeth Street</td></tr>
<tr><td><a href="/halton-region/venues/1005">Spencer's at the Waterfront</a></td><td>Cocktail hour highballs, wine, draught</td><td>Mon-Fri, 3:30-5:30&nbsp;PM</td><td>$7.50 highball, $10 cocktails and wine</td><td>Burlington, Lakeshore Road</td></tr>
<tr><td><a href="/halton-region/venues/4243">The Lone Wolf - Resto Bar</a></td><td>Pints, bar rail, food under $10</td><td>Sun-Thu 2-6&nbsp;PM, Fri-Sat 2-5&nbsp;PM</td><td>$5 pints, $5 bar rail</td><td>Burlington, Dillon Road</td></tr>
<tr><td><a href="/halton-region/venues/4379">Halton Crown Pub and Grill</a></td><td>Half-price appetizer, bar rail, domestic pint</td><td>Daily, 9&nbsp;PM to close</td><td>$5 bar rail, $6 domestic pint</td><td>Burlington, New Street</td></tr>
<tr><td><a href="/halton-region/venues/4430">Shoeless Joe's Sports Grill</a></td><td>16&nbsp;oz Budweiser or Bud Light</td><td>Sun-Thu, all day</td><td>$5</td><td>Georgetown, Guelph Street</td></tr>
<tr><td><a href="/halton-region/venues/4478">Chuck's Roadhouse Bar &amp; Grill</a></td><td>Half-price appetizers</td><td>Daily, after 9&nbsp;PM</td><td>Half price</td><td>Milton, Main Street East</td></tr>
</tbody>
</table>
<p>Halton Region had 596,637 residents in the 2021 Census, including 213,759 in Oakville, 186,948 in Burlington, 132,979 in Milton and 62,951 in Halton Hills, according to <a href="https://www.halton.ca/getmedia/fd8d756a-2713-4ce5-ad67-d9060ef9fc78/HE-census-infographic-population-and-dwellings-2021.aspx">Halton Region's 2021 Census infographic</a>. According to TodaysTab's checks on November 1, 2026, 41 of the 174 Halton venues we track (24%) have at least one current dated special. Eight venues named here list a 9&nbsp;PM-to-close window: Harpers Landing, Jacksons Landing, The Oakville Pump &amp; Patio, Browns Socialhouse Erin Mills, Bo.Vine, Halton Crown Pub and Grill, Milestones and Chuck's Roadhouse (appetizers only). Among venues with a stated start and end, 3 to 5&nbsp;PM is the most common window (4 venues), then 3 to 6&nbsp;PM (3), across the venues we track. The lowest beer price among venues named here is $5, for a 16&nbsp;oz Budweiser at Shoeless Joe's, a 16&nbsp;oz draught at Bo.Vine and pints at The Lone Wolf.</p>

<h2>Oakville: Cornwall Road, Winston Park Drive and Upper Middle Road</h2>
<p>Oakville's deals sit along Cornwall Road, Winston Park Drive and Upper Middle Road.</p>
<p><strong><a href="/halton-region/venues/4249">Harpers Landing (481 Cornwall Road, Oakville)</a></strong> posts a happy hour menu on its own site: daily 3 to 5&nbsp;PM and 9&nbsp;PM to close, with $8 glasses of wine, $7 premium draught, $9 cocktails, $6 and $12 starters and $15 pizzas and burgers.</p>
<p><strong><a href="/halton-region/venues/4394">The Oakville Pump &amp; Patio (1011 Upper Middle Road East, Oakville)</a></strong> runs $7 drinks and $9 happy-hour-only dishes daily, 3 to 6&nbsp;PM and again from 9&nbsp;PM to close, according to its site. Mondays take $5 off each pound of wings, and Wednesdays take $15 off wine bottles.</p>
<p><strong><a href="/halton-region/venues/4393">Browns Socialhouse Erin Mills (2525 Hampshire Gate, Oakville)</a></strong> lists its Social Hour as daily 2 to 5&nbsp;PM and 9&nbsp;PM to close. The site shows no prices, so the following is according to TodaysTab's October check: 1&nbsp;oz social cocktails $6, a 6&nbsp;oz glass of social wine $7.50, a 385&nbsp;ml Social Lager $5.75 and half-price bottles of wine. Call to confirm.</p>
<p><strong><a href="/halton-region/venues/4250">Bo.Vine Burgers &amp; Bar (2051 Winston Park Drive, Oakville)</a></strong> serves a 9&nbsp;PM happy hour according to TodaysTab's October check: 16&nbsp;oz draught $5, premium draught $6, rail drinks $5, house wine $5. Its site shows no happy hour page, so call to confirm.</p>
<p><strong><a href="/halton-region/venues/1002">Symposium Cafe Restaurant &amp; Lounge Oakville (1500 Upper Middle Road West)</a></strong> lists on its site half-price beer pitchers Monday and Tuesday, $7 martinis and mules Wednesday and half-price pitchers Saturday. TodaysTab's October check also lists $7 premium draught Tuesday and $10 off wine bottles Thursday, which the site does not show, so call to confirm.</p>

<h2>Burlington: Lakeshore Road and Elizabeth Street</h2>
<p><strong><a href="/halton-region/venues/1005">Spencer's at the Waterfront (1340 Lakeshore Road, Burlington)</a></strong> lists cocktail hour Monday to Friday, 3:30 to 5:30&nbsp;PM, on its site. According to TodaysTab's October check, the house-pour highball is $7.50, and the sangria, margarita, Moscow mule, Cave Spring Pearle wines and a 16&nbsp;oz Beau's Lug Tread draught are $10 each. Select bottles are half price Tuesdays from 5&nbsp;PM.</p>
<p><strong><a href="/halton-region/venues/4445">Isabelle Restaurant &amp; Lounge (3 Elizabeth Street, Burlington)</a></strong> sits inside The Pearle Hotel. Its own site lists happy hour Monday to Friday, 4 to 6&nbsp;PM, with $10 glasses of Villa Folini sparkling, Cave Spring riesling or cabernet franc, $8 beers, $10 cocktails and $2.50 oysters.</p>
<p><strong><a href="/halton-region/venues/4395">radius on Brant (455 Brant Street, Burlington)</a></strong> lists a daily 3 to 5&nbsp;PM happy hour of $15 items, plus $6 spritzes and craft beers on Tuesdays, 50% off select wine with live jazz on Wednesdays and $12 martinis with live music on Thursdays. The site also covers a Hamilton location, so call to confirm which deals apply.</p>

<h2>Burlington: Brant Street, Walker's Line and Dillon Road</h2>
<p><strong><a href="/halton-region/venues/1006">Milestones Grill + Bar (1200 Brant Street, Unit 30, Burlington)</a></strong> lists happy hour on its site as 3 to 6&nbsp;PM daily, plus 9 to 11&nbsp;PM Monday to Thursday, 9&nbsp;PM to midnight Friday and Saturday and 9 to 10&nbsp;PM Sunday. According to TodaysTab's October check, the 3 to 6&nbsp;PM menu has $5 Bellinis, highballs and 14&nbsp;oz Budweiser or Bud Light, $5 garlic parmesan fries and $6 snack tacos. Per TodaysTab's October check, Tuesday wine bottles are half price.</p>
<p><strong><a href="/halton-region/venues/4390">Uptown Social House (1900 Walker's Line, Burlington)</a></strong> posts its happy hour on its own site: Monday to Friday, 12 to 5&nbsp;PM beer buckets at $25 for five bottles or $20 for four tallboys, and half-price wine from 4 to 7&nbsp;PM. Thursday is $5 tacos, $5 tequila shots, $5 Sol and $6 margaritas. Tuesday wings are $0.89 each and Sunday adds $6 Caesars or mimosas.</p>
<p><strong><a href="/halton-region/venues/4243">The Lone Wolf - Resto Bar (1233 Dillon Road, Burlington)</a></strong> sits in the BATTS Athletic building and is open 2&nbsp;PM to 2&nbsp;AM daily, per its site. According to TodaysTab's October check, happy hour is Sunday to Thursday 2 to 6&nbsp;PM and Friday and Saturday 2 to 5&nbsp;PM, with $5 pints, $5 bar rail, $5 mocktails and food under $10 (three beef sliders $9, a pound of wings $9). Sundays 3 to 10&nbsp;PM carry half-price drinks. The site lists no times or prices; call to confirm.</p>

<h2>Burlington: New Street</h2>
<p><strong><a href="/halton-region/venues/4465">Jacksons Landing (5000 New Street, Burlington)</a></strong> posts the same happy hour as Harpers Landing, since both belong to The Landing Group: daily 3 to 5&nbsp;PM and 9&nbsp;PM to close, with $8 wine, $7 premium draught, $9 cocktails and $6 and $12 starters. Wednesdays are half-price wine bottles all day.</p>
<p><strong><a href="/halton-region/venues/4379">Halton Crown Pub and Grill (4057 New Street, Burlington)</a></strong> lists a daily happy hour from 9&nbsp;PM to close on its site: half-price appetizers, $5 bar rail, $6 domestic pints and $5 desserts. According to TodaysTab's October check, Monday adds 1&nbsp;lb wings for $12 with a $6 pint.</p>

<h2>Milton: Main Street, Holly Avenue and Ontario Street South</h2>
<p>Milton is the fastest-growing municipality in the Region, up 20.7% between 2016 and 2021 per Halton's census figures, with mostly pub-style weekly features.</p>
<p><strong><a href="/halton-region/venues/1008">Symposium Cafe Restaurant &amp; Lounge Milton (611 Holly Avenue)</a></strong> lists on its site a weekly rotation: half-price beer pitchers Monday, $7 martinis and mules Wednesday, half-price sangria, margarita and draft pitchers Saturday, and two-for-one desserts Sunday. Thursday has $10 off bottles of wine and prosecco on its specials calendar. Tuesday lists half-price pitchers, and the calendar also shows $5 wine and beer, so call to confirm.</p>
<p><strong><a href="/halton-region/venues/4433">Ned Devine's Emerald Lounge (575 Ontario Street South, Milton)</a></strong> runs a themed week. According to TodaysTab's October check: Wing It Monday is 1&nbsp;lb of wings for $9.95 or $15.95 with a pint, Irish Wednesday is $7 Irish pints and whiskey, Thirsty Thursday is $7.25 domestic pints and Sundays have $6.50 Caesars, mimosas and prosecco until 3&nbsp;PM.</p>
<p><strong><a href="/halton-region/venues/4253">Keenan's Irish Pub (51 James Snow Parkway, Milton)</a></strong> shows weekly specials on a chain page with $5 domestic pints Monday to Wednesday and $5 bar rail, pints and house wine Thursday, but that page is for the Brampton location, so call the Milton pub to confirm.</p>
<p><strong><a href="/halton-region/venues/4478">Chuck's Roadhouse Bar &amp; Grill (270 Main Street East, Milton)</a></strong> lists half-price appetizers after 9&nbsp;PM every day, dine-in only with a beverage purchase, on its offers page. According to TodaysTab's October check it also runs $8 30&nbsp;oz domestics on Tuesdays and $6 glasses of wine on Fridays; confirm with the restaurant.</p>

<h2>Georgetown and Acton (Halton Hills)</h2>
<p>Halton Hills deals are weekday pub features in Georgetown and Acton.</p>
<p><strong><a href="/halton-region/venues/4430">Shoeless Joe's Sports Grill (367 Guelph Street, Georgetown)</a></strong> sells a 16&nbsp;oz Budweiser or Bud Light for $5 Sunday to Thursday, all day, with a beverage purchase and dine-in only, according to TodaysTab's October check. Tuesdays add 1&nbsp;lb of wings for $10.</p>
<p><strong><a href="/halton-region/venues/4405">Tanners Restaurant and Catering (40 Eastern Avenue, Acton)</a></strong> lists on its own site $1 off any pint on Tuesdays, $1 off a glass of wine and $4 off a bottle on Wednesdays, and 8 wings for $15 on Thursdays. It is closed Sundays, Mondays and statutory holidays. It also lists $1 off a glass and $4 off a pitcher of sangria on Saturdays, and serves Tuesday to Saturday, 11:30&nbsp;AM to 9&nbsp;PM.</p>

<h2>What's not on this list</h2>
<p>These places appear on competitor lists or in our database, but we left them out because we could not confirm a current, dated deal. Blk Swan Kitchen Hub in Oakville has a Facebook page and no street address we could check. The Tipsy Fox in Oakville (478 Dundas Street West) and Burlington (1250 Brant Street) appear in our data, but we could not confirm either address or a location-specific deal. Turtle Jack's in Oakville and Milton, Scaddabush and Montana's in Oakville have only game-day, wine-night or food deals in our data. The Keg in Burlington and Oakville and State &amp; Main in Oakville publish happy hours, but TodaysTab has not verified them.</p>

<h2>Frequently asked questions</h2>
<h3>What time is happy hour in Halton Region?</h3>
<p>The most common window in TodaysTab's data is 3 to 5&nbsp;PM, followed by 3 to 6&nbsp;PM. Harpers Landing and Jacksons Landing both run 3 to 5&nbsp;PM, Milestones in Burlington runs 3 to 6&nbsp;PM, and Isabelle runs 4 to 6&nbsp;PM weekdays. Many add a 9&nbsp;PM-to-close window.</p>
<h3>Which Halton bars have late-night happy hour?</h3>
<p>As of November 1, 2026, eight venues named here list a 9&nbsp;PM-to-close window: Harpers Landing, Jacksons Landing, The Oakville Pump &amp; Patio, Browns Socialhouse Erin Mills, Bo.Vine, Halton Crown Pub and Grill, Milestones and Chuck's Roadhouse (appetizers only). Halton Crown posts $5 bar rail and $6 domestic pints.</p>
<h3>Where is the cheapest beer in Halton?</h3>
<p>The lowest beer price among venues named here is $5: a 16&nbsp;oz Budweiser or Bud Light at Shoeless Joe's in Georgetown, Sunday to Thursday, a 16&nbsp;oz draught at Bo.Vine after 9&nbsp;PM, and pints at The Lone Wolf. All three come from TodaysTab's October check, so call to confirm.</p>
<h3>Is there a happy hour on Sundays in Burlington?</h3>
<p>Yes, a few. Uptown Social House sells $6 Caesars or mimosas on Sundays, per TodaysTab's October check Milestones lists $7 one-ounce Caesars, and The Lone Wolf has half-price drinks from 3 to 10&nbsp;PM. Halton Crown posts its 9&nbsp;PM happy hour daily. Call ahead.</p>
<h3>Where can I find half-price wine in Halton?</h3>
<p>Wednesday is the main night. Harpers Landing and Jacksons Landing list half-price bottles all day and radius on Brant lists 50% off select wine with live jazz. Spencer's does select half-price bottles Tuesdays from 5&nbsp;PM, and Milestones lists 50% off bottles on Tuesdays per TodaysTab's October check.</p>
<h3>Are there happy hour deals in Milton, Georgetown and Acton?</h3>
<p>Yes. Milton has Symposium, Ned Devine's, Keenan's and Chuck's Roadhouse, which lists half-price appetizers after 9&nbsp;PM. Georgetown has Shoeless Joe's with $5 Budweiser. Acton has Tanners, with $1 off pints on Tuesdays and $1 off wine glasses on Wednesdays, closed Sundays and Mondays.</p>
<h3>How do I know these Halton deals are current?</h3>
<p>TodaysTab re-checks each venue and dates every special. Every deal here was verified within 45 days of November 1, 2026. Where the venue's own website does not show a deal that only our records have, we say so and suggest calling.</p>

<h2>More Halton deals and nearby guides</h2>
<p>This post is a snapshot, and the live <a href="/halton-region">Halton Region page</a> is always current. Browse by day: <a href="/halton-region/wednesday">Wednesday</a>, <a href="/halton-region/thursday">Thursday</a> and <a href="/halton-region/friday">Friday</a>. Know a deal we missed? <a href="/halton-region/submit">Submit it here</a>. Read how we check in <a href="/halton-region/blog/how-we-verify-every-special">how we verify every special</a>, or see the <a href="/halton-region/blog">Halton blog index</a>. Nearby and sibling guides: <a href="/hamilton/blog/happy-hours-hamilton">Hamilton</a>, <a href="/toronto-core/blog/happy-hours-toronto">Toronto</a>, <a href="/london/blog/happy-hours-london-ontario">London, Ontario</a>, <a href="/barrie-simcoe-county/blog/happy-hours-barrie">Barrie</a>, <a href="/ottawa/blog/happy-hours-ottawa">Ottawa</a> and <a href="/vancouver/blog/happy-hours-vancouver">Vancouver</a>.</p>
`,
  },
  {
    slug: "happy-hours-surrey",
    category: "Guide",
    regions: ["surrey"],
    title: "Surrey Happy Hours 2026: 22 Spots With Deals",
    metaDescription:
      "Surrey and White Rock happy hours 2026: 22 venues with dated deals, from a $4.99 confirmed 16 oz lager in Cloverdale to $5 highballs. Times, days and prices.",
    publishedAt: "2026-11-01",
    excerpt:
      "TodaysTab found 22 Surrey and White Rock venues with a dated happy hour deal as of November 1, 2026, and the lowest confirmed in-window beer price is $4.99 for a 16 oz lager in Cloverdale.",
    contentHtml: `
<p>Quick answer: Surrey and White Rock happy hours usually run 2 to 6&nbsp;PM, and 3 to 6&nbsp;PM is the most common window. TodaysTab has 22 venues with a dated deal, White Rock has the most (6), and prices start near $5 for a 16&nbsp;oz beer or a well highball. Five venues run late-night windows in our structured data, and two more list a 9&nbsp;PM window.</p>
<p>Last verified November 1, 2026. Where a venue's own site and our records differ, or a venue publishes no times or prices, we say so, and you should call ahead. We re-check the list monthly.</p>
<table><thead><tr><th>Venue</th><th>Deal</th><th>Days and times</th><th>Price</th><th>Neighbourhood</th></tr></thead><tbody>
<tr><td><a href="/surrey/venues/6875">Zapoteca (15495 Marine Drive)</a></td><td>Margarita, 6&nbsp;oz house wine, draft beer</td><td>Mon-Fri, 2-5&nbsp;PM</td><td>$11 margarita, $9 wine, $6 beer</td><td>White Rock</td></tr>
<tr><td><a href="/surrey/venues/6905">Par4 Kitchen &amp; Bar (5580 152 Street)</a></td><td>Tacos and tequila shots</td><td>Thursday</td><td>$4 each (tacos: minimum 3)</td><td>Sullivan Station</td></tr>
<tr><td><a href="/surrey/venues/2319">Hawthorne Beer Market &amp; Bistro (5633 176th Street)</a></td><td>16&nbsp;oz Phillips lager or hazy pale ale</td><td>Daily, 3-5&nbsp;PM</td><td>$4.99</td><td>Cloverdale</td></tr>
<tr><td><a href="/surrey/venues/2323">WINGS Surrey (7124 King George Blvd)</a></td><td>Wings, all day</td><td>Wednesday and Sunday</td><td>$12 (one flavour, with a drink)</td><td>Newton</td></tr>
<tr><td><a href="/surrey/venues/505">Browns Socialhouse (A1 - 9666 King George Blvd)</a></td><td>385&nbsp;ml Social Lager</td><td>Daily, 2-5&nbsp;PM and 9&nbsp;PM to close</td><td>$5.75</td><td>City Centre</td></tr>
<tr><td><a href="/surrey/venues/6882">Baselines Pub (#100 - 8233 166 Street)</a></td><td>341&nbsp;mL Molson Canadian or Coors Light</td><td>Mon-Fri, 2-5&nbsp;PM; daily from 10&nbsp;PM</td><td>$5 plus tax</td><td>Fleetwood</td></tr>
<tr><td><a href="/surrey/venues/2317">The Barn Country Bar (15330 102A Avenue)</a></td><td>1&nbsp;oz well highballs or shooters</td><td>Thu-Sun, 3-6&nbsp;PM</td><td>$5</td><td>Guildford</td></tr>
<tr><td><a href="/surrey/venues/6866">Rusty's Neighbourhood Pub (17770 56 Avenue)</a></td><td>$1 off 16&nbsp;oz beer</td><td>Daily, 2-5&nbsp;PM; Sun-Wed from 8&nbsp;PM</td><td>$1 off</td><td>Cloverdale</td></tr>
</tbody></table>
<p>Surrey's own website names six communities: <a href="https://www.surrey.ca/about-surrey/our-communities">Cloverdale, Fleetwood, Guildford, Newton, South Surrey and Whalley (City Centre)</a>, and this guide uses those names plus White Rock, which is a separate city. Since June 20, 2014, <a href="https://news.gov.bc.ca/releases/2014JAG0162-000857">BC has let licensed venues discount drinks at set times</a>, as long as they stay above the province's minimum drink prices. According to TodaysTab's checks on November 1, 2026, 22 Surrey and White Rock venues have a dated deal with a stated day or time window. The most common window is 3 to 6&nbsp;PM (six venues). The lowest beer price we have confirmed inside a set happy hour window is $4.99 for a 16&nbsp;oz Phillips lager at Hawthorne in Cloverdale; lower prices appear in unconfirmed records. Five venues have a structured window that starts at 8&nbsp;PM or later: Browns, Social Tavern, Night Owl, Rusty's and Baselines. Tap &amp; Barrel and Sammy J's also list a 9&nbsp;PM window, which makes seven.</p>
<h2>White Rock: Marine Drive waterfront</h2>
<p><strong><a href="/surrey/venues/6875">Zapoteca (15495 Marine Drive)</a></strong> lists its happy hour on its own site: Monday to Friday, 2 to 5&nbsp;PM, with a $12 feature cocktail, $11 margarita, $39 margarita pitcher (8&nbsp;oz), $9 for 6&nbsp;oz of house red or white and $6 beer. All-day Monday margaritas are $11, and Wednesday is 50% off bottles of wine.</p>
<p><strong><a href="/surrey/venues/6865">Night Owl Kitchen + Bar (15595 Marine Dr)</a></strong> says on its site that happy hour runs daily 3 to 5&nbsp;PM and Monday to Thursday from 9&nbsp;PM. TodaysTab's October 23 record lists a $5 Night Owl lager and $5 highballs, but the venue's own page shows no prices, and our record also lists an earlier 12&nbsp;PM start and an all-day Tuesday that the page does not. Call first.</p>
<p><strong><a href="/surrey/venues/406">Washington Avenue Grill (5-15782 Marine Dr)</a></strong> lists happy hour Monday to Friday, 3 to 5&nbsp;PM, without prices. According to TodaysTab's October 28 check, Monday is $2 off all beer, Wednesday is 30% off wine and Thursday is $2 off house martinis and cocktails.</p>
<p><strong><a href="/surrey/venues/2328">Uli's Restaurant (15023 Marine Dr)</a></strong> does not show happy hour times on its main page. A local guide lists Monday to Friday, 3 to 5:30&nbsp;PM. According to TodaysTab's October 28 check, it offers 20% off BC wines by the glass, a 14&nbsp;oz Hoyne Pilsner sleeve for $5 and lemonades for $12 in that window. The window is not on Uli's own page, so call to confirm.</p>
<h2>White Rock: Johnston Road and Elm Street</h2>
<p><strong><a href="/surrey/venues/6940">ONYX Steakhouse (1225 Johnston Rd)</a></strong> opens at 4&nbsp;PM, Wednesday to Sunday, per its site. According to TodaysTab's October check, happy hour runs 4 to 6&nbsp;PM with 5&nbsp;oz wine at $9, steak fries at $9, arancini at $9 and flamed prawns at $17. Our record also shows an all-day Wednesday happy hour, which the site does not state.</p>
<p><strong><a href="/surrey/venues/404">West Beach Bar &amp; Grill (1101 Elm St)</a></strong> posts a 3 to 6&nbsp;PM happy hour on its site, daily, with no prices given.</p>
<h2>City Centre (Whalley): King George and Central</h2>
<p><strong><a href="/surrey/venues/505">Browns Socialhouse (A1 - 9666 King George Blvd)</a></strong> runs "Social Hour" daily 2 to 5&nbsp;PM and 9&nbsp;PM to close, per its site. According to TodaysTab's October 23 check: $5.75 for a 385&nbsp;ml lager, $6 for an ale, $7.50 for 6&nbsp;oz of wine and half-price wine bottles.</p>
<p><strong><a href="/surrey/venues/2325">Dominion Bar + Kitchen (13475 Central Avenue, Unit D1)</a></strong> is in the Civic Hotel lobby. According to TodaysTab's October 27 check, a 16&nbsp;oz Dominion lager is $5.50 from 3 to 6&nbsp;PM daily. The site lists no happy hour, so call to confirm.</p>
<h2>Guildford</h2>
<p><strong><a href="/surrey/venues/2317">The Barn Country Bar (15330 102A Avenue)</a></strong> has no happy hour on its website. According to TodaysTab's October 27 check, it runs Thursday to Sunday, 3 to 6&nbsp;PM: $5 for 1&nbsp;oz well highballs or shooters, $6 Swifty Fries and $7 parmesan tater tots. Call to confirm.</p>
<h2>Fleetwood</h2>
<p><strong><a href="/surrey/venues/2322">Social Tavern (8410 160 Street)</a></strong> lists no happy hour on its site. According to TodaysTab's October 23 check, food runs 3 to 6&nbsp;PM and 9&nbsp;PM to close daily (yam fries $8, parmesan fries $8, chips and guacamole $8), all day Monday, with $2 off house cocktails every hour.</p>
<p><strong><a href="/surrey/venues/6882">Baselines Pub (#100 - 8233 166 Street)</a></strong> lists "weekly food and beer specials" on its site. According to TodaysTab's October 23 check, Monday to Friday, 2 to 5&nbsp;PM has half-price appetizers (steak bites $9, wings $9) and $5 bottles, and a late-night version runs daily from 10&nbsp;PM to close.</p>
<h2>Newton and Sullivan Station</h2><p>Newton is the most populous town centre in Surrey, according to the city's website. WINGS is in Newton, and Par4 sits on the Newton side of Sullivan Station.</p>
<p><strong><a href="/surrey/venues/6905">Par4 Kitchen &amp; Bar (5580 152 Street)</a></strong> posts its week on its site: Monday all-day happy hour with drinks from $5; Tuesday flatbreads at $15 or two for $28; Wednesday 89-cent wings with a drink; Thursday $4 tacos (minimum 3), $4 tequila shots, $8 Corona and 20% off tequila; Sunday 50% off wine bottles.</p>
<p><strong><a href="/surrey/venues/2323">WINGS Surrey (7124 King George Blvd)</a></strong> lists on its site $12 wings all day Wednesday and Sunday (dine-in, one flavour, drink purchase), 14&nbsp;oz Fiji Blond Lager at $4.75 those same days, and $1 off 1&nbsp;oz cocktails on Thursday. According to TodaysTab's October 26 check, Monday to Saturday, 2 to 6&nbsp;PM has 1&nbsp;oz highballs at $6 and wings with fries at $12.</p>
<h2>Cloverdale and Clayton</h2><p>Cloverdale's older core on 176 Street has the lowest confirmed in-window beer price in our records.</p>
<p><strong><a href="/surrey/venues/2319">Hawthorne Beer Market &amp; Bistro (5633 176th Street)</a></strong> states on its site that happy hour runs daily 3 to 5&nbsp;PM. According to TodaysTab's October 22 check: 16&nbsp;oz Phillips lager and hazy pale ale at $4.99, IPA at $5.99, 6&nbsp;oz house wine at $5.99 and garlic parmesan fries at $8.99.</p>
<p><strong><a href="/surrey/venues/2318">Vault Restaurant (5764 176th Street)</a></strong> lists happy hour daily 3 to 5&nbsp;PM. According to TodaysTab's October 28 check: Monday $3 off draft sleeves and Tuesday 30% off wine by the glass or bottle (3 to 5&nbsp;PM, dine-in), plus Thursday $3 off signature cocktails.</p>
<p><strong><a href="/surrey/venues/6866">Rusty's Neighbourhood Pub (17770 56 Avenue)</a></strong> lists happy hour sections on its site without times. According to TodaysTab's October 23 check, 2 to 5&nbsp;PM daily is $1 off 16&nbsp;oz beer and $3 off wings, nachos and burgers, and Sunday to Wednesday from 8&nbsp;PM repeats the beer deal. Friday appetizers are half price from 2 to 5&nbsp;PM.</p>
<p><strong><a href="/surrey/venues/6880">The Clayton Public House (5640 188 St)</a></strong> advertises an all-day Monday happy hour on its site. According to TodaysTab's October 23 check, 2 to 6&nbsp;PM daily has a 12&nbsp;oz house lager at $5, highballs at $5, 6&nbsp;oz house wine at $6, street tacos at $6 and wings at $12.</p>
<h2>South Surrey and Crescent Beach</h2>
<p><strong><a href="/surrey/venues/2326">Tap &amp; Barrel South Surrey (207-3211 152nd Street)</a></strong> lists on its site daily happy hour 2 to 5:30&nbsp;PM and 9&nbsp;PM to close, with Monday all day. According to TodaysTab's October 28 check, wings are $15 and Wednesday is half-price 750&nbsp;ml wine.</p>
<p><strong><a href="/surrey/venues/6872">Sammy J's Grill &amp; Bar South Surrey (15770 Croydon Drive)</a></strong> runs 3 to 6&nbsp;PM and 9&nbsp;PM to close daily, with a $5 Sammy's Lager sleeve, according to TodaysTab's October 23 check. The same check lists $5 off wings Wednesday. The site does not show these, so call.</p>
<p><strong><a href="/surrey/venues/6877">Palms Beach House (12233 Beecher Street)</a></strong> sits in Crescent Beach. According to TodaysTab's October 26 check, 2 to 5&nbsp;PM daily has an $8 glass of wine, $12 Aperol Spritz, $14 Snowbird Margarita and $11 fries. Its site does not list times, so call to confirm hours.</p>
<p><strong><a href="/surrey/venues/2327">NOBLE at the Hills (16900 4 Avenue)</a></strong> lists happy hour at 3 to 5&nbsp;PM, and 12 to 5&nbsp;PM on Sundays, with no prices posted.</p>
<p><strong><a href="/surrey/venues/6906">The Derby Bar and Grill (#115 - 17637 1st Ave)</a></strong> lists a "Split the Bits" happy hour daily 3 to 6&nbsp;PM. According to TodaysTab's October 26 check: 6&nbsp;oz house wine $6, Budweiser sleeve $7, pitcher $20.50 and ten wings $17.29.</p>
<h2>What's not on this list</h2><p>The Beer Shack on Johnston Road shows a happy hour in our records but no items or prices, and a local guide lists different days, so it is left out. Bandra Cafe in White Rock appears in our records as a Monday to Friday, 3 to 5&nbsp;PM happy hour, but its site shows Tuesday to Sunday hours, so we could not reconcile them. A local guide also names Charlie Don't Surf, Jan's On The Beach, The Ocean Beach, Cilantro Indian Cuisine and Allora Pasta + Wine; we have no confirmed deal for them. Charlie Don't Surf has a low-confidence record (3 to 6&nbsp;PM, $3.50 lager) that we could not confirm.</p>
<h2>Frequently asked questions</h2>
<h3>What time is happy hour in Surrey?</h3><p>Most Surrey happy hours run between 2 and 6&nbsp;PM. According to TodaysTab's November 1, 2026 count, 3 to 6&nbsp;PM is the most common window, followed by 2 to 5&nbsp;PM. Hawthorne in Cloverdale runs 3 to 5&nbsp;PM daily, and Browns in City Centre adds a second window from 9&nbsp;PM.</p>
<h3>Where is the best happy hour in White Rock?</h3><p>Zapoteca at 15495 Marine Drive publishes its own prices: an $11 margarita, $9 for 6&nbsp;oz of wine and $6 beer, Monday to Friday, 2 to 5&nbsp;PM. Uli's and Washington Avenue Grill are nearby on Marine Drive.</p>
<h3>Which Surrey bars have late-night happy hour?</h3><p>At least seven venues have a late window. Five in our structured data start at 8&nbsp;PM or later: Browns Socialhouse and Social Tavern from 9&nbsp;PM, Night Owl in White Rock from 9&nbsp;PM Monday to Thursday, Rusty's from 8&nbsp;PM Sunday to Wednesday, and Baselines Pub from 10&nbsp;PM daily. Tap &amp; Barrel and Sammy J's list 9&nbsp;PM windows too.</p>
<h3>Is there an all-day happy hour in Surrey?</h3><p>Yes, on certain days. Par4 in Newton runs an all-day Monday happy hour with drinks from $5, Clayton Public House advertises an all-day Monday, Tap &amp; Barrel lists Monday all day, and Zapoteca sells $11 margaritas all day Monday. Night Owl's all-day Tuesday is only in our October record, so call first.</p>
<h3>How cheap are happy hour drinks in Surrey?</h3><p>The lowest beer price we have confirmed inside a set happy hour window, as of November 1, 2026, is $4.99 for a 16&nbsp;oz Phillips lager at Hawthorne in Cloverdale; lower prices appear in unconfirmed records. WINGS Surrey lists a 14&nbsp;oz Fiji Blond Lager at $4.75 all day Wednesday and Sunday on its own site. Well highballs start at $5 at several venues.</p>
<h3>Is happy hour legal in British Columbia?</h3><p>Yes. The BC government announced on June 20, 2014 that licensed venues may discount drinks at certain times, provided they keep to minimum drink prices set by the province.</p>
<h3>How do I know these deals are current?</h3><p>Each deal above carries a verification date in TodaysTab's records, all between September 29 and October 31, 2026, and we only used records with confidence of 0.7 or higher.</p>
<h2>More Surrey and White Rock deals</h2><p>This guide is a snapshot; the live page is always current. See every special on the <a href="/surrey">Surrey region page</a>, browse <a href="/surrey/monday">Monday</a>, <a href="/surrey/thursday">Thursday</a> or <a href="/surrey/friday">Friday</a> deals, or <a href="/surrey/submit">submit a special</a> we missed. Read <a href="/surrey/blog/how-we-verify-every-special">how we verify every special</a>, the <a href="/surrey/blog">Surrey blog index</a>, or compare with the guides for <a href="/vancouver/blog/happy-hours-vancouver">Vancouver</a>, <a href="/kelowna/blog/happy-hours-kelowna-2026">Kelowna</a>, <a href="/edmonton/blog/happy-hours-edmonton-2026">Edmonton</a>, <a href="/calgary/blog/happy-hours-calgary">Calgary</a> and <a href="/halifax/blog/happy-hours-halifax">Halifax</a>.</p>
`,
  },
  {
    slug: "happy-hours-durham",
    category: "Guide",
    regions: ["durham-region"],
    title: "Durham Region Happy Hours 2026: 21 Spots With Deals",
    metaDescription:
      "Durham Region happy hours for 2026: 21 spots in Oshawa, Whitby, Ajax and Pickering, with pints from $5 and 11 AM to 5 PM windows. Updated Nov 1, 2026.",
    publishedAt: "2026-11-01",
    excerpt:
      "Six Durham Region venues list an 11 AM to 5 PM happy hour window in our data, with $5 pints at Chasers in Oshawa.",
    contentHtml: `
<p>Quick answer: The most common happy hour window in Durham Region is 11&nbsp;AM to 5&nbsp;PM, with several 2 to 5&nbsp;PM weekday windows too, and several Oshawa, Whitby and Ajax pubs sell $5 to $6 pints in that daytime window. As of November 1, 2026, TodaysTab tracks 23 Durham spots with a timed happy hour window, with the most in Oshawa.</p><p>Last verified November 1, 2026. Where a venue's own site and our records differ, or a venue publishes no times or prices, we say so, and you should call ahead. We re-check the list monthly.</p><table><thead><tr><th>Venue</th><th>Deal</th><th>Days and times</th><th>Price</th><th>Neighbourhood</th></tr></thead><tbody><tr><td><strong><a href="/durham-region/venues/7517">Berry Hill Bistro (82 King St W, Oshawa)</a></strong></td><td>Craft draft, hi-balls, martinis</td><td>Tue-Sat, 3-5&nbsp;PM</td><td>$6 each</td><td>Downtown Oshawa</td></tr><tr><td><strong><a href="/durham-region/venues/7474">Cork &amp; Bean (8 Simcoe St N, Oshawa)</a></strong></td><td>Drafts and house wine</td><td>Mon-Sat, 3-6&nbsp;PM</td><td>$6</td><td>Downtown Oshawa</td></tr><tr><td><strong><a href="/durham-region/venues/7441">Portly Piper Pub Oshawa (557 King St E, Oshawa)</a></strong></td><td>20&nbsp;oz domestic and craft pints</td><td>Daily, 11&nbsp;AM-5&nbsp;PM</td><td>$5.50</td><td>King Street East, Oshawa</td></tr><tr><td><strong><a href="/durham-region/venues/7471">Chasers Bar &amp; Grill (1300 King St E, Oshawa)</a></strong></td><td>Domestic pints</td><td>Daily, until 5&nbsp;PM</td><td>$5</td><td>King Street East, Oshawa</td></tr><tr><td><strong><a href="/durham-region/venues/9004">The Canadian Brewhouse (Oshawa) (2710 Simcoe St N, Oshawa)</a></strong></td><td>House wine (6&nbsp;oz), tacos, poutine</td><td>Mon-Sat, 2-6&nbsp;PM</td><td>$5.99 wine, $3.99 taco</td><td>North Oshawa</td></tr><tr><td><strong><a href="/durham-region/venues/7427">The Tap &amp; Tankard (224 Brock Street S, Whitby)</a></strong></td><td>Mill Street pints</td><td>Wed, 4&nbsp;PM-midnight</td><td>$6</td><td>Downtown Whitby</td></tr><tr><td><strong><a href="/durham-region/venues/7426">Bollocks Pub &amp; Kitchen (Whitby) (30 Taunton Road E, Whitby)</a></strong></td><td>Domestic pints</td><td>Daily, 11&nbsp;AM-5&nbsp;PM</td><td>$5.50</td><td>North Whitby (Taunton Road East)</td></tr><tr><td><strong><a href="/durham-region/venues/7446">Portly Piper Pub Ajax (235 Bayly St W, Ajax)</a></strong></td><td>Domestic pints</td><td>Daily, 11&nbsp;AM-4&nbsp;PM</td><td>$5.50</td><td>Ajax (Bayly Street)</td></tr></tbody></table><p>Durham Region had 696,992 residents in the 2021 Census and Oshawa is its largest municipality at 175,383, according to a <a href="https://www.durham.ca/media/xf1hsipe/2022-info-31.pdf">Region of Durham report on the 2021 Census</a>. According to TodaysTab's checks on November 1, 2026, we track 139 active Durham venues and 45 have a special with a stated day or time window checked in the last 45 days. Of those, 23 list a timed happy hour. The most common window is 11&nbsp;AM to 5&nbsp;PM, listed by six venues, ahead of 2 to 5&nbsp;PM at five. Five venues in our data, including Kings Tavern in Whitby, list a happy hour starting at 9&nbsp;PM or later. The lowest drink price in our data is a $3.99 stein of Bud Light at The Canadian Brewhouse in Oshawa (from the chain's happy hour page); the lowest pint price we could read on a pub's own site is $5 at Chasers.</p><h2>Downtown Oshawa</h2><p><strong><a href="/durham-region/venues/7517">Berry Hill Bistro (82 King St W, Oshawa)</a></strong> runs Tuesday to Saturday, 3 to 5&nbsp;PM: craft draft $6, a 1&nbsp;oz hi-ball (vodka, gin, rye or rum) $6, a martini $6, classic cocktails $9, pulled pork sliders $4 and sweet potato fries $6. The venue's site lists it as closed Mondays.</p><p><strong><a href="/durham-region/venues/7474">Cork &amp; Bean (8 Simcoe St N, Oshawa)</a></strong> has happy hour Monday to Saturday, 3 to 6&nbsp;PM: drafts and house wine $6, and any can $2 off, according to its own site. TodaysTab's records show $5, so the site's $6 is what we quote.</p><h2>King Street East and south Oshawa</h2><p>The two King Street East pubs run the same pattern: cheap pints until 5&nbsp;PM, then a different wing or combo deal each night. The Keg is on Stevenson Road South.</p><p><strong><a href="/durham-region/venues/7441">Portly Piper Pub Oshawa (557 King St E, Oshawa)</a></strong> sells 20&nbsp;oz selected domestic and local craft pints for $5.50 daily from 11&nbsp;AM to 5&nbsp;PM. The site also lists half-price wings Monday and a $16 pint and pound on Sundays.</p><p><strong><a href="/durham-region/venues/7471">Chasers Bar &amp; Grill (1300 King St E, Oshawa)</a></strong> sells domestic pints for $5 every day until 5&nbsp;PM (its site lists 11&nbsp;AM to 5&nbsp;PM but shows the pub opening at noon), and its site lists a $10 deluxe burger and fries on Mondays and 90 cent wings on Tuesdays.</p><p><strong><a href="/durham-region/venues/7527">The Keg Steakhouse + Bar - Oshawa (255 Stevenson Road S, Oshawa)</a></strong> runs happy hour in the bar and lounge, dine-in: weekdays until 6&nbsp;PM (it opens at 4&nbsp;PM, so the weekday window is 4 to 6&nbsp;PM), weekends until 5&nbsp;PM, and daily from 9&nbsp;PM to close, according to the Keg's site. The location page shows no prices.</p><h2>West Oshawa (King Street West, Vanier)</h2><p><strong><a href="/durham-region/venues/7465">Whisky John's Oshawa (843 King St W, Oshawa)</a></strong> lists an everyday 11&nbsp;AM to 5&nbsp;PM deal in our October check: a domestic pint and pound of wings for $14.99, plus $4.99 tallboys and $4.99 selected drafts. Its daily specials page is images only, so call ahead to confirm.</p><h2>North Oshawa (Taunton Road and Simcoe Street North)</h2><p>North Oshawa has a chain happy hour and a pub with a daily pint window.</p><p><strong><a href="/durham-region/venues/9004">The Canadian Brewhouse (Oshawa) (2710 Simcoe St N, Oshawa)</a></strong> lists happy hour Monday to Saturday from 2 to 6&nbsp;PM plus a late-night window from 9&nbsp;PM to close: 6&nbsp;oz house wine $5.99, a 591&nbsp;mL chalice of Stella Artois $9.49, birria, beef or chicken tacos $3.99 and classic poutine $7.99. The prices come from the chain's happy hour page, not an Oshawa-specific one, so call 905-432-6966 to confirm.</p><p><strong><a href="/durham-region/venues/7437">One Eyed Jack Pub &amp; Grill (33 Taunton Rd W, Oshawa)</a></strong> lists $5.50 20&nbsp;oz pints (local craft and selected domestic) daily from 11&nbsp;AM to 5&nbsp;PM, plus 50% off wine bottles on Wednesdays, according to TodaysTab's October check. The pub's site did not show the pint price, so call to confirm.</p><h2>Downtown Whitby and Brock Street</h2><p><strong><a href="/durham-region/venues/7427">The Tap &amp; Tankard (224 Brock Street S, Whitby)</a></strong> opens Wednesday and Thursday from 4&nbsp;PM to midnight and Friday and Saturday from noon to 2&nbsp;AM, and is closed Sunday to Tuesday, according to its site. TodaysTab's October check lists Mill Street pints at $6 on Wednesdays, craft pints at $7 and half-price wine bottles on Thursdays, and Irish pints (Guinness, Smithwick's, Kilkenny, Harp) at $6 on Fridays from noon to 10&nbsp;PM. Call to confirm.</p><h2>North Whitby (Taunton Road East)</h2><p>One pub with a daily pint window, about 5 km north of the Consumers Drive chain below.</p><p><strong><a href="/durham-region/venues/7426">Bollocks Pub &amp; Kitchen (Whitby) (30 Taunton Road E, Whitby)</a></strong> lists a daily 11&nbsp;AM to 5&nbsp;PM happy hour with domestic pints at $5.50 (Canadian, Coors Light, Bud Light, Budweiser), according to its site. TodaysTab's October check also lists a $7.50 Guinness on Tuesdays and 6&nbsp;oz house wine for $6 on Wednesdays.</p><h2>Whitby: Consumers Drive</h2><p>Consumers Drive sits beside Highway 401 and has one chain with a weekday window.</p><p><strong><a href="/durham-region/venues/7432">Scaddabush Italian Kitchen &amp; Bar Whitby (75 Consumers Dr, Whitby)</a></strong> runs happy hour Monday to Friday, 2 to 5&nbsp;PM and from 9&nbsp;PM to close, according to its site, which shows no prices. TodaysTab's October check lists $6 sangria and spritz cocktails and $2 off 18&nbsp;oz import draught, so call to confirm.</p><h2>Brooklin</h2><p>Brooklin is the northern community of Whitby, on Baldwin Street North.</p><p><strong><a href="/durham-region/venues/7475">Lowlands Kitchen &amp; Bar (67 Baldwin St N, Brooklin)</a></strong> lists happy hour Monday to Thursday, 2 to 5&nbsp;PM, dine-in only, in our October check: $6 tall boys and half-price appetizers. The restaurant has a happy hour page we could not read, so call ahead.</p><p><strong><a href="/durham-region/venues/7445">Brooklin Pub (15 Baldwin Street N, Brooklin)</a></strong> lists $5 20&nbsp;oz pints and $5.50 tall boys daily from 11&nbsp;AM to 3:30&nbsp;PM, half-price wings on Mondays and a late-night bar rail from 9&nbsp;PM, according to TodaysTab's October check. A third-party listing shows a different 2 to 5&nbsp;PM window and we could not read the pub's site, so call to confirm.</p><h2>Ajax: Bayly Street West</h2><p>Three pubs sit on Bayly Street West, so you can compare them on one trip.</p><p><strong><a href="/durham-region/venues/7485">Cloud Nine Bar &amp; Grill (368 Bayly St W, Ajax)</a></strong> lists happy hour Sunday to Thursday from noon to 4&nbsp;PM: $5.95 for a 20&nbsp;oz draught and $4.95 for bottles of Canadian, Coors Light or Miller Lite, according to TodaysTab's October check. The venue's site did not show it and we could not confirm its current hours, so call ahead.</p><p><strong><a href="/durham-region/venues/7446">Portly Piper Pub Ajax (235 Bayly St W, Ajax)</a></strong> sells domestic pints for $5.50 daily from 11&nbsp;AM to 4&nbsp;PM on its own site, with a buck-a-wing Tuesday and an $18 pint and pound on Thursdays and Sundays.</p><p><strong><a href="/durham-region/venues/7443">Mackenzie Pub (250 Bayly St W, Ajax)</a></strong> lists pints at $6 daily from 11&nbsp;AM to 5&nbsp;PM and domestic tall boys at $5.50 on Wednesdays and Sundays on its site, plus $1 wings (minimum 10) on Tuesdays and Thursdays.</p><h2>Ajax: Kingston Road East</h2><p><strong><a href="/durham-region/venues/7528">The Keg Steakhouse + Bar - Ajax (190 Kingston Road E, Ajax)</a></strong> runs happy hour in the bar and lounge, dine-in: weekdays until 6&nbsp;PM (it opens at 4&nbsp;PM, so the weekday window is 4 to 6&nbsp;PM), weekends until 5&nbsp;PM and daily from 9&nbsp;PM to close, according to the Keg's site, with no prices posted on the location page.</p><p><strong><a href="/durham-region/venues/2409">Il Fornello Ajax (95 Kingston Road E, Ajax)</a></strong> lists Friday to Sunday 2 to 5&nbsp;PM and daily from 8&nbsp;PM to close on its site: Aperol Spritz and margarita $10, sangria $9, draught beer $5 and select 6&nbsp;oz wines $6 to $9. We could not confirm the Tuesday pizza deal.</p><h2>Pickering and Uxbridge</h2><p><strong><a href="/durham-region/venues/2412">Watr Taverna &amp; Ristorante (590 Liverpool Rd, Pickering)</a></strong> sits on the Frenchman's Bay waterfront on Liverpool Road, next to the marina, and opened in January 2026. TodaysTab's October check lists happy hour Monday to Friday 2 to 5&nbsp;PM and daily from 9:30&nbsp;PM to close, with a $6 bar rail and 6&nbsp;oz house wine at $8. The restaurant links a happy hour menu PDF that we could not read, so call 905-303-2560 to confirm.</p><p><strong><a href="/durham-region/venues/1000">The Fox Goes Free (339 Kingston Road, Pickering)</a></strong> lists a Tuesday wing night on its site, which shows no prices, so call 905-509-6464 for the deal.</p><p><strong><a href="/durham-region/venues/2402">Urban Pantry (4 Toronto Street N, Uxbridge)</a></strong> lists Wednesday happy hour from 4:30 to 9&nbsp;PM: $12 cocktails, $7 draft beer, wine by the glass $10, $15 off wine bottles and 20% off starters, according to its site.</p><h2>What's not on this list</h2><p>We left these out because we could not confirm a current deal. Gabby's Kitchen and Bar at 214 Ritson Rd N in Oshawa is in our records with a $5 bar rail from 2 to 5&nbsp;PM, but we could not find a current menu or happy hour page for it. Kelsey's and East Side Mario's in Bowmanville and The Old Newcastle House in Newcastle have specials in our data that we did not confirm. OpenTable's Durham lists also name Baxters Landing, Jack Astor's, State &amp; Main and The Pickle Barrel, none of which we can confirm. Port Perry, Courtice and Bowmanville have almost no timed happy hours in our data.</p><h2>Frequently asked questions</h2><h3>What time is happy hour in Durham Region?</h3><p>The most common window in TodaysTab's data is 11&nbsp;AM to 5&nbsp;PM, listed by six venues as of November 1, 2026. Five more run 2 to 5&nbsp;PM, such as Scaddabush in Whitby. Cork &amp; Bean in Oshawa runs 3 to 6&nbsp;PM and The Keg runs until 6&nbsp;PM on weekdays.</p><h3>Where are the cheapest pints in Oshawa?</h3><p>Chasers Bar &amp; Grill at 1300 King St E sells domestic pints for $5 daily from 11&nbsp;AM to 5&nbsp;PM, according to its site. Portly Piper Pub Oshawa on King St E charges $5.50 for a 20&nbsp;oz pint in the same window, and Cork &amp; Bean downtown charges $6 for drafts from 3 to 6&nbsp;PM.</p><h3>Which Durham bars have late-night happy hour?</h3><p>The Keg in Oshawa and Ajax lists a happy hour daily from 9&nbsp;PM to close, and the Canadian Brewhouse in Oshawa and Scaddabush in Whitby list the same window on their sites. Watr in Pickering and Brooklin Pub in Whitby show late windows in our October check.</p><h3>Is there a Sunday happy hour in Durham Region?</h3><p>Yes. Portly Piper in Oshawa lists its $5.50 pint window daily, including Sunday. Cloud Nine Bar &amp; Grill in Ajax runs noon to 4&nbsp;PM Sunday to Thursday, according to TodaysTab's October check, and the Keg runs until 5&nbsp;PM on weekends. Canadian Brewhouse lists Monday to Saturday only.</p><h3>Is happy hour legal in Ontario?</h3><p>Yes. The Alcohol and Gaming Commission of Ontario dropped its ban on advertising the term "happy hour" in May 2019, according to the <a href="https://www.agco.ca/en/general/responsibilities-and-resources/annual-report-2019-2020/2-modernizing-regulations-concerning">AGCO's 2019-2020 annual report</a>. Licensees must still follow the AGCO's rules on responsible service and promotion.</p><h3>How do I know these Durham deals are current?</h3><p>Each venue entry says where the deal came from. Prices marked as coming from the venue's own site were read there, and the rest come from TodaysTab's October check and need a phone call. The list was last verified on November 1, 2026 and is re-checked monthly.</p><h2>More Durham Region deals and guides</h2><p>This guide is a snapshot; the live pages are always current. See every deal on the <a href="/durham-region">Durham Region page</a>, browse <a href="/durham-region/friday">Friday</a>, <a href="/durham-region/thursday">Thursday</a> and <a href="/durham-region/monday">Monday</a> specials, or <a href="/durham-region/submit">submit a deal</a> we missed. Read the <a href="/durham-region/blog">Durham Region blog</a> and <a href="/durham-region/blog/how-we-verify-every-special">how we verify every special</a>. Nearby guides: <a href="/toronto-core/blog/happy-hours-toronto">Toronto</a>, <a href="/hamilton/blog/happy-hours-hamilton">Hamilton</a>, <a href="/london/blog/happy-hours-london-ontario">London</a>, <a href="/ottawa/blog/happy-hours-ottawa">Ottawa</a> and <a href="/barrie-simcoe-county/blog/happy-hours-barrie">Barrie</a>. Further afield: <a href="/kelowna/blog/happy-hours-kelowna-2026">Kelowna</a>, <a href="/edmonton/blog/happy-hours-edmonton-2026">Edmonton</a>, <a href="/calgary/blog/happy-hours-calgary">Calgary</a> and <a href="/vancouver/blog/happy-hours-vancouver">Vancouver</a>.</p>
`,
  },
  {
    slug: "happy-hours-regina",
    category: "Guide",
    regions: ["regina"],
    title: "Regina Happy Hours 2026: 19 Spots With Deals",
    metaDescription:
      "19 Regina spots with happy hour deals in our October 2026 checks, from $3.99 steins to $5 highballs at Fireside Bistro. Call ahead to confirm.",
    publishedAt: "2026-11-01",
    excerpt:
      "Regina has 19 spots with happy hour deals in our October 2026 checks, and the most common window opens at 2 PM, with highballs from $5.",
    contentHtml: `
<p>Quick answer: Regina happy hour often runs 2 to 5 or 6&nbsp;PM, and this list covers 19 venues with a deal in our October checks. Drinks start around $5 (highballs at Fireside Bistro and Knotted Thistle Pub), with a $3.99 Bud Light stein at The Canadian Brewhouse. The Warehouse District and Downtown have the densest cluster.</p>
<p>Last verified November 1, 2026. Where a venue's own site and our records differ, or a venue publishes no times or prices, we say so, and you should call ahead. We re-check the list monthly.</p>

<h2>Regina happy hours at a glance</h2>
<table>
<thead><tr><th>Venue</th><th>Deal</th><th>Days and times</th><th>Price</th><th>Neighbourhood</th></tr></thead>
<tbody>
<tr><td><a href="/regina/venues/7880">The Cure Kitchen + Bar</a></td><td>Pitcher of draft; negroni; highballs</td><td>Mon-Sat, 2 to 5&nbsp;PM</td><td>$20 pitcher, $11 negroni, $6 highball</td><td>Downtown</td></tr>
<tr><td><a href="/regina/venues/2340">Fireside Bistro</a></td><td>Highballs, draft, house wine</td><td>Daily, 3 to 5&nbsp;PM (our records; call)</td><td>$5 highball, $6 pint, $7 wine</td><td>Centre Square</td></tr>
<tr><td><a href="/regina/venues/7893">Tommy's Speakeatery</a></td><td>Highballs and house wine; pints</td><td>Daily, 2 to 6&nbsp;PM</td><td>$5.50; pints $1.25 off</td><td>Cathedral</td></tr>
<tr><td><a href="/regina/venues/1426">The Lancaster Taphouse</a></td><td>Shots, wine, house lager, highballs</td><td>Mon-Fri, 2 to 6&nbsp;PM (our records; call)</td><td>$5 shots, $6 wine or highball, $8 negroni</td><td>Warehouse District</td></tr>
<tr><td><a href="/regina/venues/7909">The Canadian Brewhouse (Eastgate)</a></td><td>Appetizers, pizza, beer</td><td>Mon-Sat, 2 to 6&nbsp;PM</td><td>$3.99 tacos, $9.99 pizza</td><td>East Regina</td></tr>
<tr><td><a href="/regina/venues/1428">Knotted Thistle Pub</a></td><td>Highballs, cocktails, pints</td><td>Daily, 4 to 6&nbsp;PM</td><td>$7 pint, $5 highball (our records)</td><td>South Albert</td></tr>
<tr><td><a href="/regina/venues/7933">Broken Rack Billiards</a></td><td>Domestic beer and bar shots</td><td>Until 6&nbsp;PM (days not stated)</td><td>$6.50</td><td>South Albert</td></tr>
<tr><td><a href="/regina/venues/1424">Leopold's Tavern</a></td><td>Late-night pint, iced tea, burger</td><td>Daily, from 11&nbsp;PM</td><td>$5</td><td>Centre Square</td></tr>
<tr><td><a href="/regina/venues/7888">The Lobby Kitchen &amp; Bar</a></td><td>Caesar, lager pint</td><td>Daily, 2 to 5&nbsp;PM</td><td>$4.99</td><td>North Regina</td></tr>
</tbody>
</table>

<p>Regina had 226,404 residents in the <a href="https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=9810000201">2021 census, according to Statistics Canada (Table 98-10-0002-01)</a>, and its bars cluster in a few places: Downtown, the Warehouse District along Dewdney Avenue and Hamilton Street, and the Albert Street corridor. According to TodaysTab's checks on November 1, 2026, 29 of the 118 Regina venues we track have a happy hour or recurring drink special on record, and 20 of them list a start time. Nine of those 20 open at 2&nbsp;PM, the most common start. Twelve listings run a late-night window starting at 9&nbsp;PM or later, four of them at Leopold's Tavern locations. The lowest listed drink is the $3.99 Bud Light stein (315&nbsp;ml) at both Regina Canadian Brewhouse locations, and the lowest 20&nbsp;oz pint is $4.99 at Birmingham's Vodka and Ale House.</p>

<h2>Downtown Regina</h2>
<p>Downtown is the office and hotel core around Scarth Street and Victoria Avenue, with a handful of after-work bars around Scarth Street.</p>
<p><strong><a href="/regina/venues/7880">The Cure Kitchen + Bar (2323 11th Ave)</a></strong> runs happy hour Monday to Saturday, 2 to 5&nbsp;PM: a pitcher of draft for $20, a 1.5&nbsp;oz classic negroni for $11 and highballs for $6, which matches the venue's own site.</p>
<p><strong><a href="/regina/venues/1425">O'Hanlon's Irish Pub (1947 Scarth St)</a></strong> rotates a daily pint special. According to TodaysTab's October check, Monday is $7 Guinness or Granville Island, Tuesday $7 Harp or Pile O' Bones Scarth St. Ale with wings at $9.99 per pound, Wednesday $7 Rebellion, and Sunday $7 Blue Moon. The pub's site does not show these prices, so call to confirm.</p>

<h2>Warehouse District</h2>
<p>The Warehouse District, north of downtown along Dewdney Avenue and Hamilton Street, is a former freight area now holding restaurants, brewpubs and nightclubs.</p>
<p><strong><a href="/regina/venues/1426">The Lancaster Taphouse (1843 Hamilton St)</a></strong> lists the longest weekday window in the district, 2 to 6&nbsp;PM Monday to Friday. According to TodaysTab's October check, shots of Jameson, Fireball and Jagermeister are $5, a 5&nbsp;oz house wine, 14&nbsp;oz house lager or well highball is $6, and a negroni, boulevardier or 20&nbsp;oz house lager is $8. Friday after 9&nbsp;PM adds $5 house beer and wine and half-price whiskey. The Lancaster's site did not show times or prices when we checked, so call to confirm.</p>
<p><strong><a href="/regina/venues/1421">Bushwakker Brewpub (2206 Dewdney Ave)</a></strong> pairs food with a pint on set nights. According to TodaysTab's October check, Wings &amp; a Pint (a dozen wings and any Bushwakker pint) is $22.95 on Monday and Wednesday and Pizza &amp; a Pint is $24.95 on Tuesday, both from 4:30 to 9&nbsp;PM per the pub's site, which lists no prices, so call.</p>

<h2>Cathedral and Centre Square</h2>
<p>The streets around Albert Street and 13th Avenue, the Cathedral area, hold a mix of neighbourhood pubs and late-night spots.</p>
<p><strong><a href="/regina/venues/2340">Fireside Bistro (2305 Smith St)</a></strong> is listed in our records with happy hour daily from 3 to 5&nbsp;PM and a Tuesday all-day deal: highballs $5, pints of draft $6 and 5&nbsp;oz house wine $7. We could not find these on the bistro's website, so call ahead.</p>
<p><strong><a href="/regina/venues/7893">Tommy's Speakeatery (2710 Montague St)</a></strong> lists happy hour daily from 2 to 6&nbsp;PM on its own site: $5.50 highballs and house wine, and $1.25 off all pints.</p>
<p><strong><a href="/regina/venues/7897">Pumpjacks Cathedral (2062 Albert St)</a></strong> lists weekday drink themes on its specials page; per TodaysTab's October check they start at 6&nbsp;PM: Monday 20&nbsp;oz craft pints at $7.25, Tuesday Great Western 20&nbsp;oz pints at $8 with appetizers 25 percent off, Wednesday 32&nbsp;oz schooners at $12, and Thursday $4 highballs and $5 cocktails. Sunday is all day, with 20&nbsp;oz pints at $6 and Caesars at $5. The site shows no times or prices, so call.</p>
<p><strong><a href="/regina/venues/1424">Leopold's Tavern (2330 Albert St)</a></strong> lists a late-night menu from 11&nbsp;PM daily: a 20&nbsp;oz Leo's Lager pint, a Leo's Island Iced Tea and a Smash Burger Jr. at $5 each, according to TodaysTab's October check. We could not load the chain's site on November 1, so call to confirm.</p>

<h2>Harbour Landing</h2>
<p>Harbour Landing is a newer southwest Regina neighbourhood with its own shopping and restaurant strip along Gordon Road and James Hill Road.</p>
<p><strong><a href="/regina/venues/2336">Roots Kitchen &amp; Bar (4000 James Hill Rd)</a></strong> is in our October records with weekday drinks at $5.99 and half-price appetizers with a drink. The restaurant's own page no longer lists them, only dated October promotions, so call before you go.</p>
<p><strong><a href="/regina/venues/7895">The Canadian Brewhouse (Grasslands) (4820 Gordon Rd)</a></strong> runs happy hour Monday to Saturday, 2 to 6&nbsp;PM and again from 9&nbsp;PM to close, according to TodaysTab's October check: a 315&nbsp;ml Bud Light stein at $3.99, a 530&nbsp;ml tankard at $7.99, poutine at $7.99 and an 8-inch two-topping pizza at $9.99. The chain's happy hour page shows the same $3.99 stein.</p>

<h2>East Regina</h2>
<p>The east side, around Prince of Wales Drive, Victoria Avenue East, Star Lite Street and Dewdney Avenue East, is chain-restaurant territory with the longest daily windows.</p>
<p><strong><a href="/regina/venues/7894">Moxies Regina (1800 Victoria Ave East)</a></strong> posts happy hour at 2 to 5&nbsp;PM daily plus a late window: 9 to 11&nbsp;PM Sunday and Monday, 9&nbsp;PM to midnight Tuesday to Thursday, and 9&nbsp;PM to 1&nbsp;AM Friday and Saturday. According to TodaysTab's October check, dine-in prices are $5 for a 1&nbsp;oz house highball, a 16&nbsp;oz Big Life lager, a 6&nbsp;oz house wine or an espresso martini, and $10 for a 2&nbsp;oz Moxies Mule or Mojito. The site shows the times but not the prices.</p>
<p><strong><a href="/regina/venues/7909">The Canadian Brewhouse (Eastgate) (2005 Prince of Wales Dr)</a></strong> runs happy hour Monday to Saturday, 2 to 6&nbsp;PM, which matches the chain's site. According to TodaysTab's October check, tacos and chips with queso are $3.99, poutine is $7.99, an 8-inch two-topping pizza is $9.99 and a 591&nbsp;ml Stella Artois chalice is $9.49.</p>
<p><strong><a href="/regina/venues/7912">Birmingham's Vodka and Ale House Star Lite (2635 Star Lite St)</a></strong> is the brand's Regina East location. According to TodaysTab's October check it lists happy hour daily from 2 to 5&nbsp;PM and again from 9&nbsp;PM to close: a 20&nbsp;oz house draft at $4.99, a single highball at $4.99, a 6&nbsp;oz house wine at $5.99, and 25 percent off appetizers in the afternoon. The brand's site links a happy hour menu that we could not read, so call first.</p>
<p><strong><a href="/regina/venues/7966">The Keg Steakhouse + Bar Centre Crossing (2515 Dewdney Ave East)</a></strong> offers "Keg favourites for less" in the bar and lounge, Monday to Friday 2 to 6&nbsp;PM and Monday to Saturday from 9&nbsp;PM, per the Keg's site. The site says Sunday is all day, while TodaysTab records a 4&nbsp;PM start, so call. We hold no prices for it.</p>

<h2>South Albert Street</h2>
<p>Albert Street south of downtown, including the Golden Mile area, has pubs with long weekly special calendars.</p>
<p><strong><a href="/regina/venues/1428">Knotted Thistle Pub (4177 Albert St)</a></strong> runs happy hour daily, 4 to 6&nbsp;PM, inside the Atlas Hotel. According to TodaysTab's October check, highballs and Caesars, paralyzers or long island iced teas are $5, 20&nbsp;oz pints are $7 and house wine is $6. The pub's site shows daily 4 to 6&nbsp;PM and $7 pints, and says Sunday is all-day happy hour with half-price appetizers.</p>
<p><strong><a href="/regina/venues/7969">The Keg Steakhouse + Bar Regina South (4265 Albert St South)</a></strong> posts happy hour Monday to Friday, 4 to 6&nbsp;PM, and Monday to Saturday from 9&nbsp;PM. We hold no prices for it.</p>
<p><strong><a href="/regina/venues/7933">Broken Rack Billiards (3806 Albert St)</a></strong> posts $6.50 domestic beer and bar shots until 6&nbsp;PM on its site without naming days. Its weekly specials include $8 domestic pints on Monday and $18 domestic pitchers on Sunday.</p>

<h2>North Regina</h2>
<p>Broad Street and Rochdale Boulevard in the north hold neighbourhood restaurants rather than a nightlife strip.</p>
<p><strong><a href="/regina/venues/7888">The Lobby Kitchen &amp; Bar (2545 Broad St)</a></strong> lists happy hour daily from 2 to 5&nbsp;PM, according to TodaysTab's October check: a Lobby Caesar or lager pint at $4.99, a margarita at $6.99 and house wine at $6.50. Its site shows no happy hour times, so call.</p>
<p><strong><a href="/regina/venues/7937">The Tap Brewhouse (4245 Rochdale Blvd)</a></strong> runs a different beer deal each day (the site lists no times), per its own site: Bud or Bud Light pints $8.25 on Monday, local craft $8 on Tuesday, O16 or Great Western pitchers $16.99 on Wednesday, and Coors Light pints $8.25 on Saturday.</p>

<h2>What's not on this list</h2>
<p>Cathedral Social Hall at 2062 Albert Street closed in 2024 after a lease dispute, according to a repost of local news, and the address now operates as Pumpjacks Cathedral, so we dropped the old listing. Copperhead Brewing Co (1377 Hamilton Street) lists happy hour specials, including a $5 Saturday draft in our records, but we could not confirm times. A Leopold's Tavern South at 4529 Gordon Road is in our records, but that address is also listed as a closed Lancaster Taphouse location, so we left it out. Earl's on Albert Street (2606 Albert Street) is listed with a happy hour and a late-night happy hour on third-party sites, but we hold no confirmed deal. Rebellion Brewing, Pile O' Bones Brewing and District Brewing are tracked with no confirmed special.</p>

<h2>Frequently asked questions</h2>
<h3>What time is happy hour in Regina?</h3>
<p>The most common Regina happy hour start time is 2&nbsp;PM, with windows ending at 5 or 6&nbsp;PM. According to TodaysTab's checks on November 1, 2026, nine of the 20 venues that list a start time open at 2&nbsp;PM, including The Cure Kitchen + Bar (2 to 5&nbsp;PM) and The Lancaster Taphouse (2 to 6&nbsp;PM). Knotted Thistle Pub starts later, at 4&nbsp;PM.</p>
<h3>Where is the cheapest happy hour drink in Regina?</h3>
<p>In our data the lowest price is a $3.99 Bud Light stein (315&nbsp;ml) at both Regina Canadian Brewhouse locations, Eastgate and Grasslands. Among 20&nbsp;oz pints, Birmingham's Vodka and Ale House lists $4.99, and Fireside Bistro and Knotted Thistle Pub both list $5 highballs. Confirm prices by phone, because several come from our October check only.</p>
<h3>Which Regina bars have a late-night happy hour?</h3>
<p>Twelve listings in our data run a window from 9&nbsp;PM or later. Leopold's Tavern lists a late-night $5 menu from 11&nbsp;PM at several Regina locations in our records (call the one near you), Moxies runs 9&nbsp;PM to close, and The Keg posts Monday to Saturday from 9&nbsp;PM at Centre Crossing and Regina South.</p>
<h3>Is there a happy hour on Sundays in Regina?</h3>
<p>Yes, at several places. Pumpjacks Cathedral lists 20&nbsp;oz pints at $6 and Caesars at $5 all day Sunday, and Knotted Thistle Pub advertises all-day happy hour and half-price appetizers. Broken Rack Billiards has $18 domestic pitchers on Sunday, and Moxies runs 2 to 5&nbsp;PM daily. Check each venue's site first.</p>
<h3>How do I know these Regina deals are current?</h3>
<p>TodaysTab re-checks each special against venue sites and menus monthly and dates the check. This guide was last verified on November 1, 2026, and uses only specials checked within 45 days. Where a venue's own site does not show a deal, we say so and recommend calling, because happy hours change without notice.</p>

<h2>More Regina deals on TodaysTab</h2>
<p>This guide is a snapshot; the live <a href="/regina">Regina page</a> is always current. See deals by day on <a href="/regina/monday">Monday</a>, <a href="/regina/wednesday">Wednesday</a> and <a href="/regina/friday">Friday</a>, read <a href="/regina/blog/how-we-verify-every-special">how we verify every special</a>, browse the <a href="/regina/blog">Regina blog</a>, or <a href="/regina/submit">submit a deal we missed</a>. Other city guides: <a href="/saskatoon/blog/happy-hours-saskatoon">Saskatoon</a>, <a href="/winnipeg/blog/happy-hours-winnipeg">Winnipeg</a>, <a href="/calgary/blog/happy-hours-calgary">Calgary</a>, <a href="/edmonton/blog/happy-hours-edmonton-2026">Edmonton</a> and <a href="/kelowna/blog/happy-hours-kelowna-2026">Kelowna</a>.</p>
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

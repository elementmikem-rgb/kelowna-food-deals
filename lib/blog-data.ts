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
<p><strong><a href="/penticton/venues/232">BNA Brewing (218 Martin St)</a></strong> runs its Super Save Happy Hour daily from 4 to 6&nbsp;PM, according to BNA's menu as of October 30 (BNA opens at 4&nbsp;PM, so this is its first two hours): BNA beer at $5.49, other BNA beer at $5.99, white wine at $6.99, and Moscow Mules, Old Fashioneds and Long Island Iced Teas at $9.99. Mocktails are $4.99 to $5.99. Bowling lanes reserve from 5&nbsp;PM, and our records list 50% off bowling on Mondays and on Thursdays from 9&nbsp;PM.</p>
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
<p><strong><a href="/penticton/venues/315">Bar One (939 Burnaby Ave W)</a></strong> has a deal every day, dine in only. Sunday Caesars are $5 all day, Tuesday tacos are $4 each and Coronas are $5.25 from 4&nbsp;PM, and Wednesday takes $1 off 8&nbsp;oz glasses of wine and $5 off bottles. Thursday, Friday and Saturday house draft is $6, with wings on Thursday and Saturday from 4&nbsp;PM and $7.50 double highballs on Friday.</p>
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

<p>The numbers behind that, as of October 31, 2026: the lowest confirmed price on a drink is $6, at Rockford Bar | Grill (craft pints, vodka soda and feature cocktails). The lowest confirmed price on any item is $5, for original edamame at SEOUL STREET. One venue of the 3, Raven + Pine Mountain Eatery, runs a late-night window (9&nbsp;PM to close). The three afternoon happy hours start between 2 and 4&nbsp;PM and finish by 6&nbsp;PM; Raven + Pine adds its late round from 9&nbsp;PM to close.</p>

<h2>Revelstoke Mountain Resort</h2>

<p>The resort village on Camozzi Road and Coursier Avenue sits at the base of the ski hill, a short drive from downtown. It is the busiest spot for specials in this region, and the most seasonal: it is lively in ski season and quieter in the shoulder months.</p>

<p><strong><a href="/revelstoke-golden/venues/3158">Rockford Bar | Grill (2950 Camozzi Rd)</a></strong> has the longest list of confirmed deals in the region. Happy hour runs 3-6&nbsp;PM every day, dine in only. Craft pints are $6, a vodka soda (1&nbsp;oz) is $6 and feature cocktails (1&nbsp;oz) are $6. Vegetable dumplings and Governor Tso's chicken are $7 each.</p>

<p>Rockford also runs a different drink feature each day, confirmed on October 29, 2026. Sunday is Caesars and mimosas (1&nbsp;oz) at $6. Monday is Double Happiness (16&nbsp;oz) at $6, house wine at $6 for 6&nbsp;oz or $9 for 9&nbsp;oz. Tuesday takes $2 off all local draft. Wednesday is half-price bottles of wine. Thursday is a Peach Mango Bellini (1&nbsp;oz) at $7. Friday takes $2 off a 2&nbsp;oz Moscow Mule. Saturday has white sangria (1&nbsp;oz) at $7.50 and a 40&nbsp;cl Stella at $8. Our data does not state a time window for the daily features, so ask your server whether they overlap with the 3-6&nbsp;PM happy hour.</p>

<h2>Downtown Revelstoke</h2>

<p>Downtown Revelstoke is a walkable grid around First Street and MacKenzie Avenue, with the old-town pubs and most of the independent restaurants. Distances between venues are a few minutes on foot.</p>

<p><strong><a href="/revelstoke-golden/venues/3151">SEOUL STREET (314 1 St W)</a></strong> is a Korean-themed pub and restaurant. According to the venue's menu as of October 28, 2026, happy hour runs 4-6&nbsp;PM daily, and every confirmed item is food: original edamame $5, street edamame $7, original fries $6, street fries $10 and crispy chicken wontons $10. We have not confirmed any drink prices. Check <a href="https://seoul-street.ca">seoul-street.ca</a> or their Instagram for the current menu. This is the cheapest snack we have confirmed in the region.</p>

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
<p>SEOUL STREET (314 1 St W) has the lowest confirmed food prices we track in the region: original edamame is $5 and original fries are $6, both during its 4 to 6&nbsp;PM daily happy hour. At Rockford, vegetable dumplings and Governor Tso's chicken are $7 each from 3 to 6&nbsp;PM.</p>

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

<p><strong><a href="/edmonton/venues/7199">Flame &amp; Barrel (1237 Windermere Way SW)</a></strong> runs a midweek happy hour, 3-5&nbsp;PM according to our data, with $5.50 domestic draft, $6 house wine, $5 highballs and a $9 small cheese pizza; check the venue's happy hour menu for days and any evening window.</p>

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
<p><strong><a href="/barrie-simcoe-county/venues/4608">ATLAS Steak + Fish (5899 Rama Rd, Casino Rama)</a></strong> runs happy hour Wednesday to Sunday, 4 to 5&nbsp;PM and 9 to 10&nbsp;PM: $9.50 cocktails and house wine, $2 off draft, $8 to $12 bites and half-price oysters. Casino Rama's pages list the 4 to 5&nbsp;PM window, and an older OpenTable listing shows other times.</p>
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

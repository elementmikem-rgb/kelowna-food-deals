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
<p>Quick answer: most Kelowna happy hours run 2 to 5&nbsp;PM or 3 to 6&nbsp;PM, and 14 venues add a second window after 8&nbsp;PM. Confirmed prices start at $3.50 for a highball or a draft beer. The North End brewery district and downtown (Water Street and Bernard Avenue) hold the most spots. This guide covers 22 venues TodaysTab re-checked in the last 45 days.</p>
<p>Last verified October 31, 2026. We re-check every special on this list monthly.</p>

<table>
<thead>
<tr><th>Venue</th><th>Deal</th><th>Days and times</th><th>Price</th><th>Neighbourhood</th></tr>
</thead>
<tbody>
<tr><td><a href="/kelowna/venues/22">Kelly O'Bryan's &amp; Carlos O'Bryan's</a></td><td>Power Hour single highballs and select shots</td><td>Daily, 8 to 9&nbsp;PM</td><td>$3.50</td><td>Downtown (Bernard Ave)</td></tr>
<tr><td><a href="/kelowna/venues/280">Packing House Pub</a></td><td>12&nbsp;oz draft beer and shots</td><td>Daily, 9&nbsp;PM to close</td><td>$3.50</td><td>Northeast Kelowna</td></tr>
<tr><td><a href="/kelowna/venues/132">Original Joe's Kelowna</a></td><td>Blonde lager, house wine, well highballs</td><td>Daily, 4 to 5&nbsp;PM</td><td>From $3.75</td><td>Pandosy</td></tr>
<tr><td><a href="/kelowna/venues/150">Pretty Not Bad</a></td><td>House wine, house beer, single highball</td><td>Daily, 4 to 5&nbsp;PM</td><td>$3.88</td><td>North End</td></tr>
<tr><td><a href="/kelowna/venues/135">The Canadian Brewhouse</a></td><td>315&nbsp;ml Bud Light stein, appetizers</td><td>Mon to Sat, 2 to 6&nbsp;PM and from 9&nbsp;PM</td><td>$3.99</td><td>Pandosy</td></tr>
<tr><td><a href="/kelowna/venues/31">BNA Brewing Co. &amp; Eatery</a></td><td>BNA Lite and XPA</td><td>Daily, 4 to 6&nbsp;PM</td><td>$5.49</td><td>North End</td></tr>
<tr><td><a href="/kelowna/venues/155">The Office Brewery</a></td><td>16&nbsp;oz draught beer</td><td>Mon to Fri, 2 to 5&nbsp;PM</td><td>$5.00</td><td>North End</td></tr>
<tr><td><a href="/kelowna/venues/17">Freddy's Brewpub</a></td><td>14&nbsp;oz No Pants Pilsner</td><td>Sun and Tue to Sat, 3 to 6&nbsp;PM</td><td>$5.00</td><td>Rutland</td></tr>
<tr><td><a href="/kelowna/venues/158">Rustic Reel Brewing Company</a></td><td>5&nbsp;oz house wine, single highball</td><td>Sun and Wed to Sat, 3 to 5&nbsp;PM</td><td>$5.00</td><td>North End</td></tr>
<tr><td><a href="/kelowna/venues/3">Earls Kelowna</a></td><td>Oysters on the half shell</td><td>Daily, 3 to 6&nbsp;PM</td><td>$3.50 each</td><td>Downtown (Bernard Ave)</td></tr>
</tbody>
</table>

<p>Kelowna became Canada's first UNESCO Creative City of Gastronomy in 2025, according to <a href="https://www.tourismkelowna.com/explore/city-of-gastronomy/">Tourism Kelowna</a> and the <a href="https://www.kelowna.ca/node/571888">City of Kelowna</a>. According to TodaysTab's checks on October 31, 2026, 76 of the 119 active venues in our Kelowna database have at least one special with a stated day or time window, confidence of 0.7 or higher, and a verification date within 45 days. Of those, 59 run a happy hour. Of the 50 with a stated afternoon window, 17 use 2 to 5&nbsp;PM as their main window and 11 use 3 to 6&nbsp;PM. As of October 31, 2026, 14 venues run a happy hour that starts at 8&nbsp;PM or later, and the lowest confirmed drink price is $3.50 at two of them.</p>

<h2>North End brewery district</h2>
<p>Ellis Street, Clement Avenue and Vaughan Avenue north of downtown form the city's densest cluster of breweries and brewpubs, all within a few blocks of each other.</p>
<p><strong><a href="/kelowna/venues/31">BNA Brewing Co. &amp; Eatery (1250 Ellis St)</a></strong> runs the longest daily menu on this list. From 4 to 6&nbsp;PM every day: $5.49 BNA Lite and XPA, $5.99 other BNA beer, $6.99 for a 5&nbsp;oz glass of wine, $9.99 for an Old Fashioned, Negroni or Moscow Mule, $13 buffalo wings and $6 bang bang shrimp tacos. A Super Save Hour from 5 to 6&nbsp;PM adds $5 beers and $10 small plates. On Fridays from 9&nbsp;PM, single highballs and rotating shots are $4.99 and double highballs are $8.99.</p>
<p><strong><a href="/kelowna/venues/150">Pretty Not Bad (740 Clement Ave)</a></strong> keeps a one-hour window, 4 to 5&nbsp;PM daily, with a flat $3.88 on a 5&nbsp;oz house red or white, a 12&nbsp;oz house lager, hazy or sour, and a 1&nbsp;oz single highball. A $12 smash burger is on the same hour.</p>
<p><strong><a href="/kelowna/venues/155">The Office Brewery (890 Clement Ave)</a></strong> runs 2 to 5&nbsp;PM Monday to Friday: $5 for a 16&nbsp;oz draught beer, $7 for a 20&nbsp;oz, $7 for a 6&nbsp;oz glass of rotating VQA wine and $10 for a Spicy Pineapple Margarita. Mondays and Tuesdays also have half-price bottles of wine, with no time window stated.</p>
<p><strong><a href="/kelowna/venues/158">Rustic Reel Brewing Company (760 Vaughan Ave)</a></strong> is a taproom with a 3 to 5&nbsp;PM happy hour on Sunday and Wednesday to Saturday. A 16&nbsp;oz craft beer is $7, a 5&nbsp;oz house wine and a 1&nbsp;oz single highball are $5 each, a pitcher is $15 and a basket of potatoes, cauliflower or chips is $4.</p>

<h2>Downtown: Water Street, Bernard Avenue and the waterfront</h2>
<p>The walkable core between Okanagan Lake and Bernard Avenue has the most variety, from chain restaurants to late-night taverns.</p>
<p><strong><a href="/kelowna/venues/338">Kelowna Beer Institute (1346 Water St)</a></strong> takes $2 off cocktails, craft beer and glasses of wine from 3 to 6&nbsp;PM Monday to Friday. Cask Thursday pours a 16&nbsp;oz cask beer for $6 from 4 to 9&nbsp;PM. Sundays and Mondays have a $20 pitcher of beer and half-price bottles of wine, with no time window stated.</p>
<p><strong><a href="/kelowna/venues/26">OAK + CRU Social Kitchen &amp; Wine Bar (1310 Water St)</a></strong> runs 3 to 5&nbsp;PM daily: $12 for an Aperol spritz, Old Fashioned, margarita or Negroni, $9 for a 5&nbsp;oz barrel-to-tap wine and $1 off every beer tap.</p>
<p><strong><a href="/kelowna/venues/139">Match Eatery &amp; Public House (1300 Water St)</a></strong> runs 3 to 5:30&nbsp;PM daily with $2 off a 16&nbsp;oz craft beer, $1 off well highballs and a $6.95 car hop slider. Wednesday is half-price wine in any size, excluding bubbles.</p>
<p><strong><a href="/kelowna/venues/37">Skinny Duke's Glorious Emporium (1481 Water St)</a></strong> has a 5 to 6&nbsp;PM window daily: $5.99 for Coors Original on tap or a Miller High Life, $9.99 for an Aperol Spritz, Old Fashioned, Negroni or Moscow Mule, and $7.99 for a 5&nbsp;oz Hester Creek Pinot Gris.</p>
<p><strong><a href="/kelowna/venues/3">Earls Kelowna (211 Bernard Ave)</a></strong> runs 3 to 6&nbsp;PM daily. Oysters on the half shell are $3.50 each, fries are $5, and Rascal wine, sangria and the nitro espresso martini are half price.</p>
<p><strong><a href="/kelowna/venues/22">Kelly O'Bryan's &amp; Carlos O'Bryan's (262 Bernard Ave)</a></strong> has two daily windows. From 2 to 5&nbsp;PM: $6.25 single highballs and 16&nbsp;oz domestic draft, $7.75 for a 9&nbsp;oz house wine, $8.75 for a 20&nbsp;oz Irish pint and $9.25 for double highballs. From 8 to 9&nbsp;PM the Power Hour drops single highballs and select shots to $3.50 and domestic sleeves to $4.</p>
<p><strong><a href="/kelowna/venues/35">Leopold's Tavern (279 Bernard Ave)</a></strong> owns the latest window on the list. From 11&nbsp;PM daily, a 20&nbsp;oz pint of Leo's Lager and a Leo's Island Iced Tea are $5 each, and a Smash Burger Jr. is $5.</p>
<p><strong><a href="/kelowna/venues/433">Room 272 (Bernard Ave)</a></strong> runs happy hour all day on Sundays. On Mondays, 3 to 5&nbsp;PM brings a $10 Aperol Spritz, Old Fashioned or classic margarita, $15 fish and chips and $5 mixed fries, and a second window runs 10 to 11&nbsp;PM.</p>
<p><strong><a href="/kelowna/venues/33">Erica Jane (1187 Sunset Dr)</a></strong> lists a 2 to 5&nbsp;PM happy hour every day, plus 9 to 11&nbsp;PM Monday to Wednesday and 11&nbsp;AM to 11&nbsp;PM on Mondays. Thursday from 6 to 9&nbsp;PM, oysters are $2. We have no confirmed prices for its regular happy hour.</p>

<h2>Pandosy Village and Lakeshore</h2>
<p>South of downtown, Pandosy Street and Lakeshore Road lead toward the Mission, with a mix of neighbourhood restaurants and lake-side pubs.</p>
<p><strong><a href="/kelowna/venues/135">The Canadian Brewhouse (3030 Pandosy St)</a></strong> runs Monday to Saturday, 2 to 6&nbsp;PM and again from 9&nbsp;PM. A 315&nbsp;ml Bud Light stein is $3.99, highballs and Fireball are $4.99, a 6&nbsp;oz house wine is $5.99 and an espresso martini is $9.99. Tuesday tacos are $3.99 each.</p>
<p><strong><a href="/kelowna/venues/132">Original Joe's Kelowna (2728 Pandosy St)</a></strong> runs a Power Hour from 4 to 5&nbsp;PM daily with blonde lager, house wine and well highballs from $3.75. Tuesday adds half-price wings after 2&nbsp;PM.</p>
<p><strong><a href="/kelowna/venues/19">Hotel Eldorado Kelowna (500 Cook Rd)</a></strong> runs 3 to 5&nbsp;PM daily. A 12&nbsp;oz Miller High Life is $6, White Claw is $5, Heirloom red or white wine is $6, a Le Cinq Sink Rose is $9 and a sangria pitcher is $25.</p>
<p><strong><a href="/kelowna/venues/36">Creekside Pub &amp; Grill (3929 Lakeshore Rd)</a></strong> rotates a different deal each day, with no times stated. Sunday has $9.50 double Caesars and $6 house wine. Monday and Tuesday have $5 domestic bottles and $5.50 craft sleeves. Wednesday has $5 bottles and $5 off a pound of wings. Saturday has $5 off bottles of wine and double Long Islands for about $9.</p>

<h2>Rutland and northeast Kelowna</h2>
<p>Inland and east of Highway 97, these pubs serve neighbourhoods that rarely appear on downtown lists.</p>
<p><strong><a href="/kelowna/venues/17">Freddy's Brewpub (948 McCurdy Rd)</a></strong> runs 3 to 6&nbsp;PM Sunday and Tuesday to Saturday: $5 for a 14&nbsp;oz No Pants Pilsner, $6 for a 5&nbsp;oz house wine, $5.50 for a 1&nbsp;oz highball, $7.50 for a Caesar and $8 for a single smashburger. Wings are $10 on Sundays and Thursdays after 3&nbsp;PM.</p>
<p><strong><a href="/kelowna/venues/280">Packing House Pub (663 Finns Rd)</a></strong> has a late-night happy hour from 9&nbsp;PM to close every day: $3.50 for a 12&nbsp;oz draft beer, $3.50 for lemon drop and Burt Reynolds shots, $1 off house wine and 25% off snacks and shares. Wednesdays bring half-price wings from 4&nbsp;PM.</p>

<h2>West Kelowna</h2>
<p>Across the William R. Bennett Bridge, the Highway 97 and Main Street corridors hold several pubs with steady afternoon windows.</p>
<p><strong><a href="/kelowna/venues/82">Whiski-Jack's Pins &amp; Pints (525 BC-97 #620)</a></strong> runs 2 to 5&nbsp;PM daily: $1 off 16&nbsp;oz draft, $2 off double highballs, a $5 flat top beef taco, a $9 hot honey pizza and $7 garlic parm fries.</p>
<p><strong><a href="/kelowna/venues/40">Sammy J's Grill &amp; Bar (190-525 Hwy 97)</a></strong> runs 3 to 6&nbsp;PM daily with a 14&nbsp;oz Sammy's Lager for $5 and an 18&nbsp;oz pint for $6. Wednesdays take $5 off wings.</p>
<p><strong><a href="/kelowna/venues/222">WINGS West Kelowna (#1-2484 Main St)</a></strong> runs its Happiest Hours from 2 to 6&nbsp;PM Monday to Saturday: a $9 Mule, $12 wings and fries and $7 country-style perogies. Sundays have a $12 wings special.</p>

<h2>What's not on this list</h2>
<p>Competitor guides name several places we cannot confirm. Table Nineteen and Shore Line Brewing appear on other lists but are not in our database, so we have no verified data on them. Red Bird Brewing is in our database with no confirmed special. Baxter's Bar &amp; Grill, The Landing Kitchen + Bar and Wildling are tracked, but their specials were last verified more than 45 days ago, so we left them out. Social 242 Lounge and Grill and Mickie's Pub have closed permanently, and some older guides still list them.</p>

<h2>Frequently asked questions</h2>
<h3>What time is happy hour in Kelowna?</h3>
<p>Most Kelowna happy hours run 2 to 5&nbsp;PM or 3 to 6&nbsp;PM. According to TodaysTab's checks on October 31, 2026, 2 to 5&nbsp;PM is the most common main window, used by 17 of the 50 venues with a stated afternoon window. Fourteen venues also run a second window starting at 8&nbsp;PM or later.</p>
<h3>Where is the cheapest happy hour in Kelowna?</h3>
<p>The lowest confirmed drink price is $3.50. Kelly O'Bryan's at 262 Bernard Ave charges it for single highballs and select shots from 8 to 9&nbsp;PM, and Packing House Pub at 663 Finns Rd charges it for a 12&nbsp;oz draft beer from 9&nbsp;PM to close. Original Joe's follows at $3.75 from 4 to 5&nbsp;PM.</p>
<h3>Which Kelowna bars have a late-night happy hour?</h3>
<p>Fourteen venues start a happy hour at 8&nbsp;PM or later, including BNA Brewing on Fridays from 9&nbsp;PM, The Canadian Brewhouse from 9&nbsp;PM Monday to Saturday, Packing House Pub from 9&nbsp;PM daily and Leopold's Tavern from 11&nbsp;PM daily, where a pint of Leo's Lager is $5.</p>
<h3>Is there a happy hour in Kelowna on Sundays?</h3>
<p>Yes. On Sundays, BNA Brewing runs 4 to 6&nbsp;PM, Hotel Eldorado runs 3 to 5&nbsp;PM, Rustic Reel runs 3 to 5&nbsp;PM, Freddy's Brewpub runs 3 to 6&nbsp;PM, Erica Jane runs 2 to 5&nbsp;PM, and Room 272 runs happy hour all day. Creekside Pub has $9.50 double Caesars on Sundays.</p>
<h3>Which Kelowna happy hour has the best food deals?</h3>
<p>Earls Kelowna at 211 Bernard Ave sells oysters on the half shell for $3.50 each from 3 to 6&nbsp;PM daily. BNA Brewing has $6 bang bang shrimp tacos and $9 truffle fries from 4 to 6&nbsp;PM daily, and Whiski-Jack's Pins &amp; Pints has a $5 beef taco from 2 to 5&nbsp;PM.</p>
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
    title: "Penticton Happy Hours 2026: Every Confirmed Spot",
    metaDescription:
      "21 confirmed Penticton happy hours for 2026, from $5 beers at Highway 97 Brewery to $2 oysters at Orolo. Last verified October 31 with days, times and prices.",
    publishedAt: "2026-10-29",
    updatedAt: "2026-10-31",
    excerpt:
      "Penticton has 21 happy hour spots confirmed as of October 31, 2026, and the most common window is 2 to 5 PM with $5 beer at three of them.",
    contentHtml: `
<p>Quick answer: Penticton happy hour most often runs 2 to 5&nbsp;PM, and 21 venues on this list have a confirmed special. Beer starts at $5 (Highway 97 Brewery, Yellow Dog Brewing, Local Public Eatery) and a single highball at The Black Antler is $4. Downtown, around Martin Street, has the most spots.</p>
<p>Last verified October 31, 2026. We re-check every special on this list monthly.</p>

<h2>Penticton happy hours at a glance</h2>
<table>
<thead><tr><th>Venue</th><th>Deal</th><th>Days and times</th><th>Price</th><th>Neighbourhood</th></tr></thead>
<tbody>
<tr><td><a href="/penticton/venues/235">Highway 97 Brewery</a></td><td>Sleeves</td><td>Mon-Fri, 2 to 5&nbsp;PM</td><td>$5</td><td>Downtown</td></tr>
<tr><td><a href="/penticton/venues/228">Yellow Dog Brewing</a></td><td>El Perro pints</td><td>Daily, 2 to 5&nbsp;PM</td><td>$5</td><td>Downtown</td></tr>
<tr><td><a href="/penticton/venues/223">The Black Antler</a></td><td>Single highball</td><td>Mon-Fri, 2 to 5&nbsp;PM</td><td>$4</td><td>Downtown</td></tr>
<tr><td><a href="/penticton/venues/234">Orolo Restaurant at Time Winery</a></td><td>Oysters</td><td>Daily, 4 to 5&nbsp;PM</td><td>$2 each</td><td>Downtown</td></tr>
<tr><td><a href="/penticton/venues/227">Local Public Eatery</a></td><td>House lager (0.35&nbsp;L)</td><td>Daily, 2 to 5&nbsp;PM; also from 8 or 9&nbsp;PM</td><td>$5</td><td>Eckhardt Avenue and Uptown</td></tr>
<tr><td><a href="/penticton/venues/231">Palmer Kitchen + Spirits</a></td><td>Local craft beer, vodka Caesar</td><td>Daily, 4:30 to 7:30&nbsp;PM</td><td>$6.50</td><td>Eckhardt Avenue and Uptown</td></tr>
<tr><td><a href="/penticton/venues/232">BNA Brewing</a></td><td>Super Save Happy Hour beer</td><td>Daily, 4 to 6&nbsp;PM</td><td>$5.49</td><td>Downtown</td></tr>
<tr><td><a href="/penticton/venues/236">Salty's Beach House</a></td><td>Well highballs</td><td>Daily, 2 to 5&nbsp;PM</td><td>$6</td><td>Lakeshore</td></tr>
<tr><td><a href="/penticton/venues/314">Barley Mill Brew Pub &amp; Bistro</a></td><td>Double highballs</td><td>Tuesday</td><td>$9</td><td>Skaha Lake</td></tr>
</tbody>
</table>

<p>Penticton sits between Okanagan Lake and Skaha Lake, and Statistics Canada's 2021 Census counted <a href="https://www.penticton.ca/node/33998">36,885 residents, up 9.3 per cent in five years</a>, according to the City of Penticton. According to TodaysTab's checks on October 31, 2026, we track 56 active venues in the Penticton region and 30 of them have a current special that meets our rules (confidence of 0.7 or higher, re-checked within 45 days, with a stated day or time). Of the 12 venues in the city with a stated happy hour window, 5 run 2 to 5&nbsp;PM, the most common window (Kin &amp; Folk is left out of that count because its own website and our records disagree). The lowest confirmed drink price is $4, at Local Public Eatery (a cold tea shot) and at The Black Antler (a single highball and a Sunday mimosa or Caesar). Only 1 of those 12, Local Public Eatery, has a confirmed window that starts at 8&nbsp;PM or later.</p>

<h2>Downtown: Martin Street, Winnipeg Street and Main Street</h2>
<p>Downtown is the walkable core, with most bars within a few blocks of Martin Street and Winnipeg Street.</p>
<p><strong><a href="/penticton/venues/232">BNA Brewing (218 Martin St)</a></strong> runs its Super Save Happy Hour daily from 4 to 6&nbsp;PM: BNA beer at $5.49, other BNA beer at $5.99, white wine at $6.99, and Moscow Mules, Old Fashioneds and Long Island Iced Teas at $9.99. Mocktails start at $4.99. Bowling is 50% off on Mondays and again on Thursdays from 9&nbsp;PM.</p>
<p><strong><a href="/penticton/venues/234">Orolo Restaurant at Time Winery (361 Martin St)</a></strong> has a one-hour happy hour daily from 4 to 5&nbsp;PM. Oysters are $2 each, local draft is $6, wine is $9 (including the Evolve Chardonnay) and the Chronos Merlot is $13. Food includes tallow fries at $8, a burger at $18 and steak bites at $23. Tuesday is Steak Date Night and Thursday is Bone-in Steak.</p>
<p><strong><a href="/penticton/venues/233">The Hub on Martin (260 Martin St)</a></strong> rotates deals by day. Sunday: Molson Canadian or Coors Light at $6. Monday: a double Paralyzer at $9. Tuesday: jugs at $18 and sleeves at $6. Wednesday: pilsner jugs at $18, double highballs at $8 and wing night at $6.95. Thursday to Saturday: Long Islands at $9.</p>
<p><strong><a href="/penticton/venues/238">The Pasta Factory (236 Martin St)</a></strong> runs a daily 3 to 5&nbsp;PM happy hour with draft pints at $7, sangria jugs at $15 and a 6&nbsp;oz NY steak sandwich at $15. Wednesday (4 to 8&nbsp;PM) adds an 8&nbsp;oz flatiron steak dinner at $25.</p>
<p><strong><a href="/penticton/venues/223">The Black Antler (215 Winnipeg St)</a></strong> has the most unusual offer in town: free wings with any drink purchase, Monday to Friday, 2 to 5&nbsp;PM. The same window has house red or white at $6, a single highball at $4, a martini at $7 and a Buck N' Beer at $16. Tuesday brings a 20&nbsp;oz Antler Lager at $6, Thursday is $2 off cocktails, and Sunday mimosas and Caesars are $4.</p>
<p><strong><a href="/penticton/venues/354">The Forest (#104-215 Winnipeg St)</a></strong> gives a free Forest Margherita flatbread with a drink purchase on Thursdays and Fridays from 4 to 6&nbsp;PM.</p>
<p><strong><a href="/penticton/venues/320">Pizzeria Tratto (256 Westminster Ave)</a></strong> opens for dinner at 5&nbsp;PM. On Mondays and Tuesdays, Bottleshock gives you a free pizza when you buy a bottle of wine. On Wednesdays, Full Sleeve Wednesday is a 2-for-1 on beers with any pizza.</p>
<p><strong><a href="/penticton/venues/224">Kin &amp; Folk (557 Main St)</a></strong> lists a daily happy hour in our records from 2 to 5&nbsp;PM. Its own website lists 3 to 5&nbsp;PM and again from 9&nbsp;PM to close, so call (778-531-6170) before you go. Prices in our records: Low Life at $5, Folk Lager at $6, Dan Dan fries at $12 and beef potstickers at $16. Wednesdays are half-price wine bottles.</p>
<p><strong><a href="/penticton/venues/235">Highway 97 Brewery (200 Ellis St)</a></strong> pours $5 sleeves Monday to Friday from 2 to 5&nbsp;PM. Thirsty Thursday has $6 pints from 5&nbsp;PM. Wing Wednesday is wings at $9.97 and pitchers at $19.97, and Friday is a beef dip at $19.97.</p>
<p><strong><a href="/penticton/venues/228">Yellow Dog Brewing (169 Estabrook Ave)</a></strong> sits at the corner of Winnipeg Street and Estabrook Avenue. From 2 to 5&nbsp;PM daily: El Perro pints at $5, general pints at $6, cocktails at $7, a pound of wings at $10, hot dogs and fries at $5 each, and a small pizza or the Chase burger and beer at $15.</p>

<h2>Lakeshore: the Okanagan Lake beachfront</h2>
<p>Lakeshore Drive West runs along the north beach, with patios facing the water.</p>
<p><strong><a href="/penticton/venues/236">Salty's Beach House (1000 Lakeshore Dr W)</a></strong> has a daily 2 to 5&nbsp;PM happy hour with Parallel 49 beer at $8, Neighbourhood Passion Fruit Wheat Ale at $8.50, well highballs at $6 and The Captain's Wife at $12.</p>
<p><strong><a href="/penticton/venues/230">Sociale on Lakeshore (950 Lakeshore Dr W)</a></strong> calls its offer Tappy Hour: tapas and drinks daily from 3 to 5&nbsp;PM. Its website also lists 9&nbsp;PM to close, and it is closed Mondays. We have no confirmed prices.</p>
<p><strong><a href="/penticton/venues/312">The Barking Parrot (21 Lakeshore Dr W)</a></strong> sells $2 burgers with the purchase of any drink of $5 or more on Fridays from 4:30 to 6:30&nbsp;PM. Confirm hours before a winter visit.</p>

<h2>Eckhardt Avenue and Uptown</h2>
<p>South of downtown, the bars along Eckhardt Avenue, Burnaby Avenue and Vernon Avenue sit between the city centre and the Uptown retail strip near Cherry Lane at 2111 Main Street.</p>
<p><strong><a href="/penticton/venues/227">Local Public Eatery (1070 Eckhardt Ave W)</a></strong> has the biggest food menu of any happy hour here. From 2 to 5&nbsp;PM daily: house lager (0.35&nbsp;L) at $5, draft at $6, wine $2 off, a cold tea shot at $4, rail highballs at $5.25 and an Old Fashioned at $10. Food: a fish taco at $5, hot wings at $12 and the LOCAL burger with fries at $14. A second window starts at 8&nbsp;PM Sunday to Thursday and 9&nbsp;PM Friday and Saturday, with the same prices.</p>
<p><strong><a href="/penticton/venues/315">Bar One (939 Burnaby Ave W)</a></strong> has a deal every day. Sunday Caesars are $5, Tuesday tacos and cervezas are $4 from 4&nbsp;PM, and Wednesday is wine by the glass or bottle. Thursday, Friday and Saturday house draft is $6, with wings on Thursday and Saturday from 4&nbsp;PM.</p>
<p><strong><a href="/penticton/venues/231">Palmer Kitchen + Spirits (903 Vernon Ave)</a></strong> in the Four Points by Sheraton lists a daily 4:30 to 7:30&nbsp;PM window: local craft beer and vodka Caesars at $6.50, house red or white at $9.50, crispy calamari at $12.80, fried chicken wings at $14 and truffle parmesan fries at $10.40. The restaurant's website shows a happy hour menu without times, so call 778-476-9202 to confirm.</p>
<p><strong><a href="/penticton/venues/225">Match Eatery &amp; Public House (553 Vees Dr #201)</a></strong> at Cascades Casino runs the longest daily window on this list: 3 to 9&nbsp;PM daily on craft beer, wine, highballs and Free Spirited cocktails, plus a Car Hop slider at $6.95. Monday is fish and chips at $15, and Friday is chicken parmigiana at $19.99. We do not have confirmed drink prices.</p>

<h2>Skaha Lake and South Penticton</h2>
<p><strong><a href="/penticton/venues/314">Barley Mill Brew Pub &amp; Bistro (2460 Skaha Lake Rd)</a></strong> has a different deal almost every day. Monday: a buck off 9&nbsp;oz wine. Tuesday: double highballs at $9. Wednesday: tequila shooters at $5.50 and half-price wings from 3&nbsp;PM. Thursday: $5 off bottles and jugs of Barley Brew beer and $12.99 flatbreads. Friday: $5 off bottles and jugs plus $5.50 shooters. Sunday: $5 off jugs and a buck off Caesars.</p>

<h2>Just outside Penticton</h2>
<p><strong><a href="/penticton/venues/246">Naramata Pub &amp; Grill (985 Robinson Avenue, Naramata)</a></strong> serves a salmon burger special on Mondays at $25, a family-style pasta night on Thursdays at $18, and 2 Can Dine with a bottle of wine on Fridays and Saturdays at $85.99.</p>
<p><strong><a href="/penticton/venues/316">Giant's Head Brewing (13224 Victoria Rd N, Summerland)</a></strong> has Wing Wednesday at $8.99 from 4&nbsp;PM, a Thursday burger and beer at $25, and Senior Sunday with a 12&nbsp;oz beer at $6.</p>
<p><strong><a href="/penticton/venues/339">Okanagan Falls Hotel Bar &amp; Grill (1045 Main St, Okanagan Falls)</a></strong> runs burger and beer at $24 on Sundays and Thursdays, fish and chips at $13 on Mondays, wing night at $12 from 5&nbsp;PM on Wednesdays.</p>

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
<p>The Black Antler gives free wings with any drink purchase, Monday to Friday, 2 to 5&nbsp;PM. The Forest gives a free Margherita flatbread with a drink on Thursdays and Fridays, 4 to 6&nbsp;PM. Pizzeria Tratto gives a free pizza with a bottle of wine on Mondays and Tuesdays.</p>
<h3>How do I know these Penticton happy hour deals are current?</h3>
<p>Every special on this list has a confidence score of 0.7 or higher and was re-checked within 45 days of October 31, 2026. We re-check the list monthly, and every venue page shows a last-verified date. Our method is written up in <a href="/penticton/blog/how-we-verify-every-special">how we verify every special</a>.</p>

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
      "Happy hours in Revelstoke and Golden BC: 4 confirmed venues, drinks from $6, daily 2-6 PM windows plus a 9-11 PM round in Golden. Verified Oct 31, 2026.",
    publishedAt: "2026-10-29",
    updatedAt: "2026-10-31",
    excerpt:
      "TodaysTab confirmed current happy hour specials at 4 of 14 tracked venues in Revelstoke and Golden, with drinks from $6 at Rockford Bar | Grill.",
    contentHtml: `
<p>Quick answer: Happy hour in Revelstoke and Golden runs between 2 and 6&nbsp;PM daily at the three spots TodaysTab has confirmed, with drinks from $6, and one Golden restaurant adds a second round from 9 to 11&nbsp;PM. Revelstoke Mountain Resort has the most deals. Only 4 of the 14 venues we track have a current confirmed special.</p>

<p>Last verified October 31, 2026. We re-check every special on this list monthly.</p>

<table>
<thead>
<tr><th>Venue</th><th>Deal</th><th>Days and times</th><th>Price</th><th>Neighbourhood</th></tr>
</thead>
<tbody>
<tr><td><a href="/revelstoke-golden/venues/3158">Rockford Bar | Grill</a></td><td>Craft pints, vodka soda (1&nbsp;oz), feature cocktails (1&nbsp;oz); dine in only</td><td>Daily, 3-6&nbsp;PM</td><td>$6 each</td><td>Revelstoke Mountain Resort</td></tr>
<tr><td><a href="/revelstoke-golden/venues/3158">Rockford Bar | Grill</a></td><td>Vegetable dumplings, Governor Tso's chicken; dine in only</td><td>Daily, 3-6&nbsp;PM</td><td>$7 each</td><td>Revelstoke Mountain Resort</td></tr>
<tr><td><a href="/revelstoke-golden/venues/3164">Raven + Pine Mountain Eatery</a></td><td>Draft beer (16&nbsp;oz) and house wine (6&nbsp;oz)</td><td>Daily, 2-5&nbsp;PM and 9-11&nbsp;PM</td><td>$7 each</td><td>Golden, Trans-Canada Highway</td></tr>
<tr><td><a href="/revelstoke-golden/venues/3164">Raven + Pine Mountain Eatery</a></td><td>Wagyu beef gyoza, tempura prawn roll, Southern Heat chicken bites</td><td>Daily, 2-5&nbsp;PM and 9-11&nbsp;PM</td><td>$12 each</td><td>Golden, Trans-Canada Highway</td></tr>
<tr><td><a href="/revelstoke-golden/venues/3164">Raven + Pine Mountain Eatery</a></td><td>The Raven Burger</td><td>Daily, 2-5&nbsp;PM and 9-11&nbsp;PM</td><td>$19</td><td>Golden, Trans-Canada Highway</td></tr>
<tr><td><a href="/revelstoke-golden/venues/3151">SEOUL STREET</a></td><td>Original edamame</td><td>Daily, 4-6&nbsp;PM</td><td>$5</td><td>Downtown Revelstoke</td></tr>
<tr><td><a href="/revelstoke-golden/venues/3151">SEOUL STREET</a></td><td>Original fries</td><td>Daily, 4-6&nbsp;PM</td><td>$6</td><td>Downtown Revelstoke</td></tr>
<tr><td><a href="/revelstoke-golden/venues/3156">The Den (Revelstoke)</a></td><td>50% off burgers, October promotion</td><td>October 2026 only</td><td>Half price</td><td>Revelstoke Mountain Resort</td></tr>
</tbody>
</table>

<p>Revelstoke and Golden are about 150&nbsp;km apart on Highway 1, and they have very different drinking scenes. Statistics Canada's <a href="https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/index.cfm?Lang=E">2021 Census</a> counted 8,275 people in Revelstoke and 3,986 in Golden, so both are small towns where a bar's specials often live on a chalkboard or an Instagram story rather than a website. That is why this guide is short. According to TodaysTab's checks on October 31, 2026, we track 14 venues across the two towns and 4 of them have a current, confirmed special with a stated day or time window.</p>

<p>The numbers behind that, as of October 31, 2026: the lowest confirmed price on a drink is $6, at Rockford Bar | Grill (craft pints, vodka soda and feature cocktails). The lowest confirmed price on any item is $5, for original edamame at SEOUL STREET. One venue of the 4, Raven + Pine Mountain Eatery, runs a late-night window (9 to 11&nbsp;PM). All 3 venues with a daily happy hour start between 2 and 4&nbsp;PM and finish by 6&nbsp;PM.</p>

<h2>Revelstoke Mountain Resort</h2>

<p>The resort village on Camozzi Road and Coursier Avenue sits at the base of the ski hill, a short drive from downtown. It is the busiest spot for specials in this region, and the most seasonal: it is lively in ski season and quieter in the shoulder months.</p>

<p><strong><a href="/revelstoke-golden/venues/3158">Rockford Bar | Grill (2950 Camozzi Rd)</a></strong> has the longest list of confirmed deals in the region. Happy hour runs 3-6&nbsp;PM every day, dine in only. Craft pints are $6, a vodka soda (1&nbsp;oz) is $6 and feature cocktails (1&nbsp;oz) are $6. Vegetable dumplings and Governor Tso's chicken are $7 each.</p>

<p>Rockford also runs a different drink feature each day, confirmed on October 29, 2026. Sunday is Caesars and mimosas (1&nbsp;oz) at $6. Monday is Double Happiness (16&nbsp;oz) at $6, house wine at $6 for 6&nbsp;oz or $9 for 9&nbsp;oz. Tuesday takes $2 off all local draft. Wednesday is half-price bottles of wine. Thursday is a Peach Mango Bellini (1&nbsp;oz) at $7. Friday takes $2 off a 2&nbsp;oz Moscow Mule. Saturday has white sangria (1&nbsp;oz) at $7.50 and a 40&nbsp;cl Stella at $8. Our data does not state a time window for the daily features, so ask your server whether they overlap with the 3-6&nbsp;PM happy hour.</p>

<p><strong><a href="/revelstoke-golden/venues/3156">The Den (Revelstoke) (1701 Coursier Ave #4104)</a></strong> ran 50% off burgers for the month of October. That promotion ends today, October 31, so check thedenrevelstoke.ca or ask at the counter for November. We have no confirmed daily happy hour for The Den, and no price for the burger discount beyond the half-price rate.</p>

<h2>Downtown Revelstoke</h2>

<p>Downtown Revelstoke is a walkable grid around First Street and MacKenzie Avenue, with the old-town pubs and most of the independent restaurants. Distances between venues are a few minutes on foot.</p>

<p><strong><a href="/revelstoke-golden/venues/3151">SEOUL STREET (314 1 St W)</a></strong> is a Korean street food bar. Happy hour runs 4-6&nbsp;PM daily, and every confirmed item is food: original edamame $5, street edamame $7, original fries $6, street fries $10 and crispy chicken wontons $10. We have not confirmed any drink prices. Menu and hours are at <a href="https://seoul-street.ca">seoul-street.ca</a>. This is the cheapest confirmed snack in the region.</p>

<h2>Golden: Trans-Canada Highway</h2>

<p>Golden's bars cluster downtown along 8th and 9th Avenue North, but the one venue with confirmed, priced specials sits on the highway. According to <a href="https://www.tourismgolden.com/dining/pubs-bars">Tourism Golden</a>, daily specials and happy hours are common at local pubs, though most do not publish times.</p>

<p><strong><a href="/revelstoke-golden/venues/3164">Raven + Pine Mountain Eatery (1049 Trans-Canada Hwy)</a></strong> is inside the Prestige Golden Hotel and runs two windows every day, 2-5&nbsp;PM and 9-11&nbsp;PM, with the same menu in both. The hotel's own <a href="https://www.prestigehotelsandresorts.com/locations/golden/dining">dining page</a> lists the same afternoon window. Drinks: draft beer (16&nbsp;oz, Steamworks and Whitetooth Brewing) $7, house Stone Road wine (6&nbsp;oz) $7, a 2&nbsp;oz cocktail (Canadian Caesar, mojito or mule) $10, and a 1.5&nbsp;oz warmer (B52, Monte Cristo or blueberry tea) $9.</p>

<p>Food in both windows: wagyu beef gyoza $12, tempura prawn roll $12, Southern Heat chicken bites $12, The Raven Burger $19, rigatoni bolognese $20, teriyaki ember bowl $20 and Fireside Frites (6&nbsp;oz sirloin with fries) $29. It is the only place in either town where we have confirmed a late-night happy hour.</p>

<h2>What's not on this list</h2>

<p>These venues are in our database, but we do not have a current confirmed special with a day or time window, so we do not list a deal for them. <a href="/revelstoke-golden/venues/3160">Riverhouse Tavern (506 8 Ave N)</a> in Golden is the closest call: reviews mention Taco Tuesday and wood-fired pizza on Sundays and Mondays, but we hold that at low confidence with no times or prices, so we have left it out of the deals above.</p>

<p>Also tracked without a confirmed special: <a href="/revelstoke-golden/venues/3153">Craft Bierhaus (107 2 St E)</a>, <a href="/revelstoke-golden/venues/3154">River City Pub &amp; Patio (112 1 St E)</a>, <a href="/revelstoke-golden/venues/3157">The Last Drop Pub (200 3 St W)</a> and <a href="/revelstoke-golden/venues/3152">The Village Idiot Bar and Grill (306 MacKenzie Ave)</a> in Revelstoke, plus <a href="/revelstoke-golden/venues/3159">Rockwater Grill and Bar (429 9 Ave N)</a>, <a href="/revelstoke-golden/venues/3163">Stolen Bell Distillery (616 8 Ave N)</a>, <a href="/revelstoke-golden/venues/3161">The Bar &amp; Grill (505 9 Ave N)</a>, <a href="/revelstoke-golden/venues/3162">The Wolf's Den (1105 9 St S)</a> and <a href="/revelstoke-golden/venues/3165">Whitetooth Brewing Company (623 8 Ave N)</a> in Golden.</p>

<p>Other guides name Big Eddy Pub, Bar One, Mackenzie Common Tavern and the Island Restaurant in Golden. None of those are in our database, so we cannot vouch for their specials and we leave them off. If you know a current deal at any of these, the submit link below takes a minute.</p>

<h2>Frequently asked questions</h2>

<h3>What time is happy hour in Revelstoke?</h3>
<p>Among the Revelstoke venues TodaysTab has confirmed, Rockford Bar | Grill at the resort runs happy hour from 3 to 6&nbsp;PM daily, dine in only, and SEOUL STREET downtown runs 4 to 6&nbsp;PM daily for snacks. Both were checked in late October 2026. Windows can change with the season, so confirm before a ski-day detour.</p>

<h3>Where is the cheapest drink in Revelstoke and Golden?</h3>
<p>The lowest confirmed drink price in either town is $6, at Rockford Bar | Grill (2950 Camozzi Rd): craft pints, a 1&nbsp;oz vodka soda and 1&nbsp;oz feature cocktails, 3 to 6&nbsp;PM daily, dine in only. In Golden, Raven + Pine Mountain Eatery charges $7 for a 16&nbsp;oz draft beer or a 6&nbsp;oz glass of house wine during happy hour.</p>

<h3>Is there a late-night happy hour in Golden?</h3>
<p>Yes, at one place we have confirmed. Raven + Pine Mountain Eatery (1049 Trans-Canada Hwy) repeats its happy hour from 9 to 11&nbsp;PM daily, with $7 draft beer, $7 house wine, a $10 cocktail and the same food specials as the afternoon window. No other venue in either town has a confirmed late window.</p>

<h3>Does Rockford have a happy hour on weekends?</h3>
<p>Yes. Rockford Bar | Grill's 3 to 6&nbsp;PM happy hour runs every day, dine in only, so it includes Saturday and Sunday. It also lists a daily feature: Caesars and mimosas (1&nbsp;oz) for $6 on Sunday, and white sangria (1&nbsp;oz) at $7.50 or a 40&nbsp;cl Stella at $8 on Saturday.</p>

<h3>What is the cheapest food special in Revelstoke?</h3>
<p>SEOUL STREET (314 1 St W) has the lowest confirmed food prices we track in the region: original edamame is $5 and original fries are $6, both during its 4 to 6&nbsp;PM daily happy hour. At Rockford, vegetable dumplings and Governor Tso's chicken are $7 each from 3 to 6&nbsp;PM.</p>

<h3>How do I know these deals are current?</h3>
<p>Each special on this page was checked against a venue source, and the newest check was October 29, 2026, and the oldest was October 6, 2026 for The Den's October promotion. We only list specials with a stated day or time window and high confidence, and we re-check monthly. Prices change, so the live page for the region is always the current version.</p>

<h2>Check what is on today</h2>

<p>This guide is a snapshot as of October 31, 2026. The live <a href="/revelstoke-golden">Revelstoke and Golden specials page</a> shows what is running right now, and you can browse by day: <a href="/revelstoke-golden/friday">Friday</a>, <a href="/revelstoke-golden/saturday">Saturday</a> and <a href="/revelstoke-golden/tuesday">Tuesday</a>. Know a deal we missed or one that has changed? <a href="/revelstoke-golden/submit">Submit it here</a>. See the <a href="/revelstoke-golden/blog">region blog</a> for other guides and <a href="/revelstoke-golden/blog/how-we-verify-every-special">how we verify every special</a>. If you are driving through the Okanagan, compare with our <a href="/penticton/blog/happy-hours-penticton-2026">Penticton happy hour guide</a> or <a href="/kelowna/blog/happy-hours-kelowna-2026">Kelowna happy hour guide</a>.</p>
`,
  },
  {
    slug: "happy-hours-kitchener-waterloo-cambridge-2026",
    category: "Guide",
    regions: ["kitchener-waterloo-cambridge"],
    title: "Kitchener-Waterloo Happy Hours 2026: 30 Confirmed Spots",
    metaDescription:
      "Every confirmed happy hour in Kitchener, Waterloo and Cambridge: 30 venues, beers from $1.25, cocktails at $12, and 2-5 PM windows. Checked October 31, 2026.",
    publishedAt: "2026-10-29",
    updatedAt: "2026-10-31",
    excerpt:
      "Of 132 venues TodaysTab tracks in Kitchener-Waterloo-Cambridge, 30 have a confirmed special, and the lowest confirmed beer price is $1.25.",
    contentHtml: `
<p>Quick answer: Kitchener-Waterloo-Cambridge happy hours mostly run 2 to 5&nbsp;PM or 4 to 6&nbsp;PM, with many pubs adding a second window from 9&nbsp;PM. Confirmed prices run from $1.25 beers to $12 cocktails. Uptown Waterloo's King Street is the densest strip. TodaysTab has 30 venues with a confirmed special.</p>

<p>Last verified October 31, 2026. We re-check every special on this list monthly.</p>

<table>
<thead><tr><th>Venue</th><th>Deal</th><th>Days and times</th><th>Price</th><th>Neighbourhood</th></tr></thead>
<tbody>
<tr><td><a href="/kitchener-waterloo-cambridge/venues/6589">Dallas Night Club</a></td><td>Dollar Beer Fridays</td><td>Fridays, all night</td><td>$1.25</td><td>Downtown Kitchener</td></tr>
<tr><td><a href="/kitchener-waterloo-cambridge/venues/6571">The Pub On King</a></td><td>6&nbsp;oz beers</td><td>Tuesdays</td><td>$1.25</td><td>Uptown Waterloo</td></tr>
<tr><td><a href="/kitchener-waterloo-cambridge/venues/6605">The Canadian Brewhouse</a></td><td>Stein of Bud Light</td><td>Mon-Sat 2-6&nbsp;PM and from 9&nbsp;PM</td><td>$3.99</td><td>Kingsway Drive, Kitchener</td></tr>
<tr><td><a href="/kitchener-waterloo-cambridge/venues/6542">The Three Idiots</a></td><td>341&nbsp;ml domestic bottle</td><td>Daily after 9&nbsp;PM</td><td>$4.49</td><td>King Street East, Kitchener</td></tr>
<tr><td><a href="/kitchener-waterloo-cambridge/venues/6552">The Duke of Wellington</a></td><td>Duke's Lager pints</td><td>Sunday to Thursday</td><td>$5</td><td>Uptown Waterloo</td></tr>
<tr><td><a href="/kitchener-waterloo-cambridge/venues/6558">Piper Arms</a></td><td>20&nbsp;oz domestic pint</td><td>Daily 11&nbsp;AM-4&nbsp;PM and after 9&nbsp;PM</td><td>$5</td><td>King Street East, Kitchener</td></tr>
<tr><td><a href="/kitchener-waterloo-cambridge/venues/6569">Bobby O'Brien's</a></td><td>Canadian, Coors Light and Coors Original pints</td><td>Daily 2-5&nbsp;PM</td><td>$5.25</td><td>Downtown Kitchener</td></tr>
<tr><td><a href="/kitchener-waterloo-cambridge/venues/6561">Browns Socialhouse Cambridge</a></td><td>Social Lager, 385&nbsp;ml</td><td>Daily 2-5&nbsp;PM and from 9&nbsp;PM</td><td>$5.75</td><td>Hespeler Road, Cambridge</td></tr>
<tr><td><a href="/kitchener-waterloo-cambridge/venues/2353">Malt &amp; Barley Public House</a></td><td>All pints and glasses of wine</td><td>Daily 2-5&nbsp;PM and 9-10&nbsp;PM</td><td>$6</td><td>Fischer-Hallman Road, Kitchener</td></tr>
</tbody>
</table>

<p>Statistics Canada counted <a href="https://www12.statcan.gc.ca/census-recensement/2021/as-sa/fogs-spg/page.cfm?lang=E&amp;topic=1&amp;dguid=2021S0503541">575,847 people in the Kitchener-Cambridge-Waterloo census metropolitan area</a> in the 2021 Census, spread across three cities with three different bar scenes. According to TodaysTab's checks on October 31, 2026, we track 132 active venues and 30 of them have a confirmed special with a stated day or time window. The most common window is 2 to 5&nbsp;PM, at 8 venues, followed by 4 to 6&nbsp;PM at 6. Ten venues run a deal that starts at 8&nbsp;PM or later. The lowest confirmed beer price is $1.25, shared by Dallas Night Club on Fridays and The Pub On King on Tuesdays.</p>

<h2>Uptown Waterloo</h2>

<p>Uptown is the King Street core of Waterloo, where pubs and cocktail rooms sit within a few blocks of each other. Most weekday deals here are daily rotations, so check the day before you go.</p>

<p><strong><a href="/kitchener-waterloo-cambridge/venues/6571">The Pub On King (77 King St N)</a></strong> rotates a deal each night. Mondays have $5 domestic pints and $15.50 pitchers. Tuesdays have $15.50 domestic pitchers, 6&nbsp;oz beers at $1.25 and 6&nbsp;oz Cottage Springs at $2.25, plus $9 Don Julio and Hennessy shots after 8&nbsp;PM. Wednesdays have $8.50 schooners and half-price wine bottles. Thursdays after 8&nbsp;PM have 12&nbsp;oz beers at $2.25 and Cottage Springs at $4.50. Saturdays before 11&nbsp;PM have sangria mini pitchers at $9.50.</p>

<p><strong><a href="/kitchener-waterloo-cambridge/venues/6552">The Duke of Wellington (100 King St S)</a></strong> pours Duke's Lager pints at $5 from Sunday to Thursday. Sunday adds a $10 Caesar, Monday has $5 Moosehead pints, Tuesday has $6.50 Irish pints, Wednesday has $10 wings and $5 6&nbsp;oz Two Oceans wine, and Thursday has $5.50 Cowbell pints.</p>

<p><strong><a href="/kitchener-waterloo-cambridge/venues/1048">LaLa Social House (181 King St S)</a></strong> runs a social hour Tuesday to Saturday, 4 to 6&nbsp;PM: Peroni draft at $9 and Peroni 0.0% at $7. <strong><a href="/kitchener-waterloo-cambridge/venues/6618">Lower Lounge at Lala (181 King St S Lower Level)</a></strong> has the same hours with draft Peroni at $9, Peroni 0.0% at $7 and Collective Arts Ransack the Universe at $9.</p>

<p><strong><a href="/kitchener-waterloo-cambridge/venues/2358">Proof Kitchen + Lounge (110 Erb St W)</a></strong> prices all signature cocktails at $12 from Monday to Friday, 4 to 6&nbsp;PM. Tuesday margaritas are $12, and Wednesday has half-price bottles of select wines.</p>

<p><strong><a href="/kitchener-waterloo-cambridge/venues/2362">Ethel's Lounge (114 King St N)</a></strong> serves Wing Ding Wednesday: BBQ wings in your choice of sauce for $11 after 4&nbsp;PM with a drink.</p>

<h2>Northfield Drive, Waterloo</h2>

<p>Northfield Drive East is the chain-restaurant stretch in north Waterloo, with two venues that keep the same hours daily.</p>

<p><strong><a href="/kitchener-waterloo-cambridge/venues/6646">The Keg Steakhouse + Bar (42 Northfield Dr E)</a></strong> runs happy hour in the bar and lounge, dine-in only: Monday to Friday 4 to 6&nbsp;PM, Saturday and Sunday 3 to 5&nbsp;PM, and nightly from 9&nbsp;PM. We have no confirmed prices for it.</p>

<p><strong><a href="/kitchener-waterloo-cambridge/venues/6556">Browns Socialhouse Waterloo (255 Northfield Dr E)</a></strong> offers Social Lager (385&nbsp;ml) at $5.75, Social Ale at $6.25, 1&nbsp;oz social cocktails at $6, 6&nbsp;oz wine at $7.50 and half-price wine bottles, daily 2 to 5&nbsp;PM and from 9&nbsp;PM.</p>

<h2>Downtown Kitchener</h2>

<p>Downtown Kitchener centres on King Street West and the streets around Victoria Street North. Deals here lean toward day-specific pub specials and a few late-night options.</p>

<p><strong><a href="/kitchener-waterloo-cambridge/venues/6569">Bobby O'Brien's (125 King St W)</a></strong> pours Canadian, Coors Light and Coors Original pints at $5.25 daily from 2 to 5&nbsp;PM. Mondays add $5.25 Molson pints, Wednesdays have $9.29 Molson schooners, Thursdays have $5 off bottles of wine and 10 wings for $10 after 5&nbsp;PM, and Sundays have $2 off domestic pitchers.</p>

<p><strong><a href="/kitchener-waterloo-cambridge/venues/2352">Don Julio Tacos &amp; Tequila Bar (147A King St W)</a></strong> starts its deals at 4:30&nbsp;PM: $2 off Dos Equis and Madri on tap on Sundays, $10.25 margaritas on Wednesdays, and $2 off tequila and mezcal shots on Thursdays.</p>

<p><strong><a href="/kitchener-waterloo-cambridge/venues/2351">TWH Social Bar &amp; Bistro (1 King St W)</a></strong> runs Wine Wednesday: 50% off selected bottles and half-price 9&nbsp;oz glasses.</p>

<p><strong><a href="/kitchener-waterloo-cambridge/venues/1045">PUBLIC Kitchen &amp; Bar (300 Victoria St N)</a></strong> serves a tapas and beverage happy hour Tuesday to Saturday, 4 to 6&nbsp;PM, with selections from $8, dine-in only.</p>

<p><strong><a href="/kitchener-waterloo-cambridge/venues/6589">Dallas Night Club (312 King St W)</a></strong> sells beers for $1.25 all night on Fridays, the lowest confirmed beer price on this list.</p>

<h2>Kitchener Beyond the Core</h2>

<p>These venues sit along King Street East, Victoria Street North, Fairway Road and Kingsway Drive, and most are easier to reach by car.</p>

<p><strong><a href="/kitchener-waterloo-cambridge/venues/2353">Malt &amp; Barley Public House (1187 Fischer-Hallman Rd)</a></strong> prices all pints and glasses of wine at $6, daily from 2 to 5&nbsp;PM and again 9 to 10&nbsp;PM. Wednesday is half-price wings, dine-in only.</p>

<p><strong><a href="/kitchener-waterloo-cambridge/venues/6562">Borealis Grille &amp; Bar (4336 King St E)</a></strong> pours $6 taps, covering cocktails, draft beer, wine and kombucha, Monday to Friday 2 to 5&nbsp;PM.</p>

<p><strong><a href="/kitchener-waterloo-cambridge/venues/6558">Piper Arms (4391 King St E)</a></strong> sells a 20&nbsp;oz domestic pint for $5 daily from 11&nbsp;AM to 4&nbsp;PM. After 9&nbsp;PM it offers $5 domestic pints, $5 bar rails, 99-cent wings, half-price appetizers and $6 house wine.</p>

<p><strong><a href="/kitchener-waterloo-cambridge/venues/6542">The Three Idiots (2979 King St E)</a></strong> has $5.99 happy hour drinks from 1 to 5&nbsp;PM and, after 9&nbsp;PM, 341&nbsp;ml domestic bottles at $4.49 and imported or premium bottles at $6.49. Daily rotations: $14.99 domestic pitchers on Sunday, $9.99 growlers on Monday, $5.99 tall cans on Wednesday, half-price wine bottles on Thursday and $3.99 tequila shots on Friday.</p>

<p><strong><a href="/kitchener-waterloo-cambridge/venues/6605">The Canadian Brewhouse (2960 Kingsway Dr, Unit P004)</a></strong> runs Monday to Saturday 2 to 6&nbsp;PM and again from 9&nbsp;PM: Bud Light steins at $3.99, Stella Artois steins at $5.49, 6&nbsp;oz house wine at $5.99, highballs and Fireball shots at $4.99, and tacos at $3.99.</p>

<p><strong><a href="/kitchener-waterloo-cambridge/venues/6559">Moxies Kitchener (385 Fairway Rd S)</a></strong> runs dine-in happy hour daily 2 to 5&nbsp;PM and 9&nbsp;PM to close: 6&nbsp;oz wine from $5, 16&nbsp;oz Big Life beer at $5, house highballs at $5 and half-price wine bottles.</p>

<p><strong><a href="/kitchener-waterloo-cambridge/venues/6549">Jack Astor's Bar &amp; Grill (2960 Kingsway Dr, Unit 15A)</a></strong> starts select beers, wines and cocktails at $6 daily from 2 to 5&nbsp;PM, with half-price 750&nbsp;ml wine bottles all day Monday and Tuesday.</p>

<p><strong><a href="/kitchener-waterloo-cambridge/venues/2355">Chicago Pub &amp; Billiards (725 Ottawa St S)</a></strong> posts a drink for every day: $5 Caesars and $6 20&nbsp;oz Kronenbourg on Sunday, $6 Heineken pints Monday, $4.50 tequila shots Tuesday, $5 Corona Wednesday, $6 Guinness Thursday, $9.99 espresso martinis Friday and $6 20&nbsp;oz Hazy Days Saturday.</p>

<p><strong><a href="/kitchener-waterloo-cambridge/venues/6567">Whale &amp; Ale British Pub (1120 Victoria St N, Unit 2)</a></strong> has $6 Caesars on Sundays and half-price wings with a beverage on Tuesdays.</p>

<h2>Cambridge</h2>

<p>Our confirmed Cambridge deals cluster along Hespeler Road, the main commercial strip, so a stop at one is a short drive from the next.</p>

<p><strong><a href="/kitchener-waterloo-cambridge/venues/6561">Browns Socialhouse Cambridge (355 Hespeler Rd)</a></strong> offers Social Lager (385&nbsp;ml) at $5.75, Social Ale at $6.25, 6&nbsp;oz wine at $7.50, 1&nbsp;oz social cocktails at $6 and half-price wine bottles, daily 2 to 5&nbsp;PM and from 9&nbsp;PM.</p>

<p><strong><a href="/kitchener-waterloo-cambridge/venues/871">State &amp; Main Kitchen and Bar (375 Hespeler Rd, Unit 2)</a></strong> runs dine-in happy hour daily 2 to 5&nbsp;PM and 9&nbsp;PM to close, with snacks and drinks from $5. Mondays take $2 off margaritas, Wednesdays have half-price wings after 2&nbsp;PM, Thursdays have half-price wine bottles, and Saturdays take $2 off sangria.</p>

<p><strong><a href="/kitchener-waterloo-cambridge/venues/6645">The Keg Steakhouse + Bar (44 Pinebush Rd)</a></strong> uses the same schedule as its Waterloo location: weekdays 4 to 6&nbsp;PM, weekends 3 to 5&nbsp;PM and nightly from 9&nbsp;PM, in the bar and lounge, dine-in only. We have no confirmed prices.</p>

<p><strong><a href="/kitchener-waterloo-cambridge/venues/2369">Blackshop Restaurant &amp; Wine Bar (595 Hespeler Rd)</a></strong> serves Sunday endless brunch from 10&nbsp;AM to 3&nbsp;PM at $48 per adult and $27 under 10, with one mimosa or Caesar included per adult.</p>

<h2>What's not on this list</h2>

<p>The Hop House and White Rabbit entries at 47 and 49 King St N in Uptown Waterloo disagree across listings, including whether they open on Mondays and Tuesdays, so we left them out until we can re-confirm. Our records for The Black Badger (55 Water St N, Cambridge), The Aging Oak (3 Queen St E, Cambridge), Gator's Tail (970 Franklin Blvd, Cambridge), The Rabbid Fox (123 Pioneer Dr, Kitchener), Graffiti Market (137 Glasgow St, Kitchener) and Howl At The Moon (1271 Victoria St N, Kitchener) hold deals, but we could not confirm independently that each is currently operating, so they are held back.</p>

<p>The Fiddle and Firkin (707 King St E, Cambridge) is also out: its listed specials name the Swan, the Frog and Firkin on Yonge, which are other pubs, so we do not treat them as Cambridge deals. Competitor lists also name Abe Erb, Morty's Pub, Grand Trunk Saloon and Loloan Lobby Bar. We have no current confirmed schedule for any of them, and Beertown in Waterloo and Cambridge has no confirmed special either.</p>

<h2>Frequently asked questions</h2>

<h3>What time is happy hour in Kitchener-Waterloo?</h3>
<p>The most common window in TodaysTab's October 31, 2026 data is 2 to 5&nbsp;PM, used by 8 venues including Bobby O'Brien's and Malt &amp; Barley. Six more run 4 to 6&nbsp;PM, such as Proof Kitchen + Lounge and LaLa Social House. Several chains add a second window from 9&nbsp;PM.</p>

<h3>Where is the cheapest beer in Kitchener-Waterloo?</h3>
<p>The lowest confirmed beer price is $1.25. Dallas Night Club (312 King St W, Kitchener) sells $1.25 beers all night on Fridays, and The Pub On King (77 King St N, Waterloo) sells 6&nbsp;oz beers at $1.25 on Tuesdays. For a larger pour, The Canadian Brewhouse has Bud Light steins at $3.99.</p>

<h3>Which bars have late-night happy hour in Waterloo Region?</h3>
<p>Ten venues have a deal starting at 8&nbsp;PM or later. Piper Arms (4391 King St E) offers $5 domestic pints and 99-cent wings after 9&nbsp;PM, Browns Socialhouse runs its menu from 9&nbsp;PM, and The Pub On King starts Tuesday and Thursday deals after 8&nbsp;PM.</p>

<h3>Is there a happy hour in Uptown Waterloo?</h3>
<p>Yes. Proof Kitchen + Lounge (110 Erb St W) prices signature cocktails at $12 from 4 to 6&nbsp;PM on weekdays, LaLa Social House (181 King St S) pours Peroni at $9 from 4 to 6&nbsp;PM Tuesday to Saturday, and The Duke of Wellington (100 King St S) has $5 Duke's Lager from Sunday to Thursday.</p>

<h3>Which Kitchener-Waterloo happy hours are on Sundays?</h3>
<p>Sunday deals include $5 Duke's Lager and a $10 Caesar at The Duke of Wellington, $2 off domestic pitchers at Bobby O'Brien's, $2 off Dos Equis and Madri on tap at Don Julio from 4:30&nbsp;PM, $6 Caesars at Whale &amp; Ale, and the Keg's 3 to 5&nbsp;PM weekend happy hour.</p>

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
    title: "Edmonton Happy Hours 2026: Every Confirmed Spot",
    metaDescription:
      "28 confirmed Edmonton happy hours for 2026, from $3.99 draught at 1st RND to Whyte Avenue and ICE District deals, with days and times. Checked Oct 31, 2026.",
    publishedAt: "2026-10-29",
    updatedAt: "2026-10-31",
    excerpt:
      "The most common Edmonton happy hour window is 2-5 PM (12 venues), and the lowest confirmed draught is $3.99 at 1st RND, per TodaysTab's October 31, 2026 checks.",
    contentHtml: `
<p>Quick answer: Edmonton happy hours most often run 2-5&nbsp;PM or 2-6&nbsp;PM, and confirmed prices start at $3.99 for a 12&nbsp;oz draught at 1st RND and $4.75 for a 20&nbsp;oz pint at The Black Dog Freehouse. Old Strathcona (Whyte Avenue) has the most spots. TodaysTab tracks 95 Edmonton venues with current, dated deals.</p>

<p>Last verified October 31, 2026. We re-check every special on this list monthly.</p>

<table>
<thead>
<tr><th>Venue</th><th>Deal</th><th>Days and times</th><th>Price</th><th>Neighbourhood</th></tr>
</thead>
<tbody>
<tr><td><a href="/edmonton/venues/742">The Black Dog Freehouse</a></td><td>20&nbsp;oz draught pints, well highballs, shots</td><td>Mon-Sat 2-7&nbsp;PM; Sunday specials</td><td>$4.75 pints, $4 highballs</td><td>Old Strathcona</td></tr>
<tr><td><a href="/edmonton/venues/7268">1st RND</a></td><td>Sliders, fish tacos, 12&nbsp;oz house draught</td><td>Mon-Sat 2-6&nbsp;PM and 9&nbsp;PM-close</td><td>$3.99 each</td><td>Downtown West</td></tr>
<tr><td><a href="/edmonton/venues/7344">The Pint Whyte</a></td><td>Highballs, wine, domestic taps</td><td>Mon-Sat 3-7&nbsp;PM; all day Sunday</td><td>$5</td><td>Old Strathcona</td></tr>
<tr><td><a href="/edmonton/venues/7198">The Bell in Scona Brewery</a></td><td>14&nbsp;oz draft, house wine, food from $5.45</td><td>Daily 2-5&nbsp;PM; all day Sunday</td><td>$5 draft</td><td>Old Strathcona</td></tr>
<tr><td><a href="/edmonton/venues/7341">Sugarbowl</a></td><td>Select house and rotating taps</td><td>Daily 3-6&nbsp;PM</td><td>$8</td><td>Garneau</td></tr>
<tr><td><a href="/edmonton/venues/740">O'Byrne's Irish Pub (ICE District)</a></td><td>Hi-balls, house pints, Jameson</td><td>Daily 2-7&nbsp;PM</td><td>$5</td><td>ICE District</td></tr>
<tr><td><a href="/edmonton/venues/3023">Woodwork</a></td><td>Draft beer, feature wine, classic cocktails</td><td>Mon-Fri 2-5&nbsp;PM</td><td>$8 draft, $14 cocktails</td><td>Downtown</td></tr>
<tr><td><a href="/edmonton/venues/7366">Bodega Whyte Avenue</a></td><td>Half-price feature wine, beer, cocktails</td><td>Daily 2-5&nbsp;PM</td><td>Half price</td><td>Old Strathcona</td></tr>
</tbody>
</table>

<p>In June 2016 Alberta changed the rules that shape these deals: the Alberta Gaming, Liquor and Cannabis commission <a href="https://www.aglc.ca/news/responsible-liquor-service-focus-happy-hours-policy-change">removed the 8&nbsp;PM limit on happy hours</a>, so a bar can discount at any time it is open, as long as prices stay above the provincial minimum. According to TodaysTab's checks on October 31, 2026, we track 228 active Edmonton venues, 110 have live specials, and 95 of those pass our test (confidence of 0.7 or higher, re-checked within 45 days, with a stated day or time). The most common happy hour window is 2-5&nbsp;PM (12 venues), then 2-6&nbsp;PM (8 venues). 23 venues run a happy hour that starts at 9&nbsp;PM or later, and 39 have a Sunday happy hour or Sunday drink special.</p>

<h2>Old Strathcona (Whyte Avenue)</h2>

<p>The densest strip in the city: 82 Avenue between 101 and 106 Street, plus 104 Street and 80 Avenue just south. Most bars here run daily windows that start at 2&nbsp;PM.</p>

<p><strong><a href="/edmonton/venues/742">The Black Dog Freehouse (10425 Whyte Ave NW)</a></strong> runs Monday to Saturday 2-7&nbsp;PM with 20&nbsp;oz draught pints at $4.75, $5 domestic bottles, and $4 shots and well highballs. Sunday pints and caesars are $5.25. Late-night specials follow from 7&nbsp;PM to 2&nbsp;AM.</p>

<p><strong><a href="/edmonton/venues/7346">The Buckingham (10439 Whyte Avenue)</a></strong> has a different special each day from 3&nbsp;PM to 2&nbsp;AM: $4.50 well highballs Monday and Wednesday, $5.25 tequila and margaritas Tuesday, 50% off burgers Thursday, $10 all-you-can-eat corn dogs Monday.</p>

<p><strong><a href="/edmonton/venues/7219">O'Byrne's Irish Pub (10616 Whyte Ave NW)</a></strong> runs 2-7&nbsp;PM with a rotating weekday theme: $8 Guinness family pints Tuesday, $4.25 house pints and half-price wine bottles Thursday, $5 flavoured whiskey shots Friday.</p>

<p><strong><a href="/edmonton/venues/739">Hudsons Canada's Pub (10307 82 Ave NW)</a></strong> starts its Monday and Tuesday deals at 6&nbsp;PM: $6.75 Alexander Keith's on Monday, $6 rotating taps on Tuesday. Wednesday is 50% off wings with a drink purchase.</p>

<p><strong><a href="/edmonton/venues/2183">Blowers &amp; Grafton (10550 82 Ave NW)</a></strong> posts a daily feature instead of a window: $1 off 20&nbsp;oz house lager Monday, $5 off any pizza Monday, $15 for half a dozen oysters Thursday, half-price wine bottles Thursday.</p>

<p><strong><a href="/edmonton/venues/7371">The Mash (10402 Whyte Ave NW)</a></strong> serves craft pints at $6 (core taps) and $6.50 (rotating taps) daily from 3 to 6&nbsp;PM, with a feature 10-inch pizza at $14 to $16 Sunday to Friday.</p>

<p><strong><a href="/edmonton/venues/7366">Bodega Whyte Avenue (10314 82 Ave NW)</a></strong> takes half off feature wine, beer and cocktails from 2 to 5&nbsp;PM daily. Wednesday adds half-price wine from 5 to 9&nbsp;PM.</p>

<p><strong><a href="/edmonton/venues/7198">The Bell in Scona Brewery (10416 80 Ave NW)</a></strong> charges $5 for 14&nbsp;oz drafts and 5&nbsp;oz house wine from 2 to 5&nbsp;PM daily, with beer towers at $37. Sunday is all-day happy hour, and Monday rotating taps are $5.</p>

<p><strong><a href="/edmonton/venues/7344">The Pint Whyte (8032 104 Street NW)</a></strong> charges $5 for highballs, wine and domestic taps from 3 to 7&nbsp;PM and all day Sunday. Tuesday has $2.25 8&nbsp;oz mini beers, and Friday and Saturday have a $2.99 power hour from 9 to 10&nbsp;PM.</p>

<p><strong><a href="/edmonton/venues/741">The Next Act Pub (8224 104 Street NW)</a></strong> starts a "Curtain Call" window at 9&nbsp;PM Sunday to Thursday: $1 off all draft, $3 off fail pails, and six late-night snacks for $8.</p>

<p><strong><a href="/edmonton/venues/7345">Boxer Albertan Kitchen &amp; Bar (10315 83 Ave NW)</a></strong> runs happy hour from opening until 5:30&nbsp;PM Sunday to Wednesday and until 5&nbsp;PM Friday and Saturday: $11 classic cocktails, 20% off pizza, 20% off draft beer and wine, $6 bread and butter.</p>

<h2>Garneau and Ritchie</h2>

<p>South of the river but off the main strip: a university-side tap house and a Ritchie brewery with weekday afternoons.</p>

<p><strong><a href="/edmonton/venues/7341">Sugarbowl (10922 88 Avenue NW)</a></strong> sets all select house and rotating taps at $8 from 3 to 6&nbsp;PM daily.</p>

<p><strong><a href="/edmonton/venues/2192">Campio Brewing Co. Ritchie (9570 76 Ave NW)</a></strong> runs Monday to Friday 3-6&nbsp;PM: $6.50 for 16&nbsp;oz beer, a $13 sampler of six 4&nbsp;oz pours, $7 wine, and $6 canned gin cocktails.</p>

<h2>Downtown and ICE District</h2>

<p>Rogers Place anchors the north end. Bars here lean on afternoon windows and late-night menus.</p>

<p><strong><a href="/edmonton/venues/7268">1st RND (11248 104 Ave NW)</a></strong> runs its "3 Star Happy Hour" Monday to Saturday 2-6&nbsp;PM and again from 9&nbsp;PM to close: $3.99 sliders, fish tacos and 12&nbsp;oz sleeves of house draught. Wednesday wings are half price after 6&nbsp;PM.</p>

<p><strong><a href="/edmonton/venues/3023">Woodwork (10132 100 Street NW)</a></strong> serves Monday to Friday 2-5&nbsp;PM: $8 draft, $12 feature wine, $14 shaken or stirred classic cocktails, and $8 hickory frites.</p>

<p><strong><a href="/edmonton/venues/7200">Bar Henry (10220 103 Ave NW)</a></strong> holds an aperitivo hour from 3 to 5&nbsp;PM, with $13 wine by the glass and snacks from $7.</p>

<p><strong><a href="/edmonton/venues/3027">Black Pearl Seafood Bar (10132 104 Street NW)</a></strong> starts a late-night happy hour at 8&nbsp;PM daily: $6 prosecco, $12 king crab mushroom caps. Tuesday adds a $99 cold seafood tower, and Wednesday wine bottles are half price.</p>

<p><strong><a href="/edmonton/venues/740">O'Byrne's Irish Pub, ICE District (10235 101 Street NW)</a></strong> runs 2-7&nbsp;PM daily with $5 hi-balls, house pints and Jameson, and $8 Guinness family pints on Tuesday.</p>

<p><strong><a href="/edmonton/venues/747">The Canadian Icehouse (10332 103 Street NW)</a></strong> posts a different special each day: $4.99 Jameson shots Sunday, $6.99 margaritas Tuesday, $10.99 tankards of any draught Thursday.</p>

<p><strong><a href="/edmonton/venues/7201">The Sherlock Holmes Pub Downtown (10012 101A Ave)</a></strong> says happy hour "starts at just $3" Monday to Saturday 2-6&nbsp;PM and from 11&nbsp;AM on Sunday. Tuesday is half-price dry ribs or wings.</p>

<p><strong><a href="/edmonton/venues/3021">Campio Brewing Co. (10257 105 Street NW)</a></strong> runs Monday to Thursday 3-6&nbsp;PM: $6.50 for 16&nbsp;oz beer, $7 wine, $13 for six 4&nbsp;oz samples, and $13 wings.</p>

<h2>124 Street and Oliver</h2>

<p>Galleries, wine bars and small restaurants. Windows here are shorter, often one or two hours.</p>

<p><strong><a href="/edmonton/venues/751">Bodega 124 Street (12417 Stony Plain Rd)</a></strong> runs half-price feature wine, beer and cocktails Tuesday to Saturday 4-5&nbsp;PM, and half-price wine by the bottle and glass on Wednesday from 4 to 9&nbsp;PM.</p>

<p><strong><a href="/edmonton/venues/7218">Three Vikings (10713 124 Street)</a></strong> takes 25% off all wine Tuesday to Friday 2-5&nbsp;PM, with a $5 cheese and olive plate. Daily pint features run $7.75 to $8.75.</p>

<p><strong><a href="/edmonton/venues/7267">Clementine (11957 Jasper Avenue NW)</a></strong> holds a daily 5-6&nbsp;PM window: $8 pilsner (16&nbsp;oz), $14 shaken or stirred cocktails, and $2 off feature wine pours.</p>

<p><strong><a href="/edmonton/venues/7354">Slow Pour Beer Bar (10416 122 St NW)</a></strong> has Sunday $7 Pilsner Urquell and $10 negronis, Tuesday 20% off draft, and Friday 4-6&nbsp;PM $6 cask ale pints.</p>

<h2>West and south Edmonton</h2>

<p>Suburban and mall locations with long, consistent windows.</p>

<p><strong><a href="/edmonton/venues/7223">Brewco Craft Kitchen &amp; Brewery (8882 170 Street NW, West Edmonton Mall)</a></strong> takes $3 off 16&nbsp;oz house draft and house wine daily 3-5&nbsp;PM and from 9&nbsp;PM to close, with starters from $2 for popcorn.</p>

<p><strong><a href="/edmonton/venues/7277">The Canadian Brewhouse, Lewis Estates (1320 Webber Greens Dr NW)</a></strong> runs Monday to Saturday 2-6&nbsp;PM: $3.99 Bud Light steins, $4.99 highballs and Fireball, $5.99 house wine.</p>

<p><strong><a href="/edmonton/venues/7199">Flame &amp; Barrel (1237 Windermere Way SW)</a></strong> runs 3-5&nbsp;PM daily: $5.50 domestic draft, $6 house wine, $5 highballs, a $9 small cheese pizza. A second window opens at 8:30&nbsp;PM.</p>

<h2>What's not on this list</h2>

<p>Of the 110 Edmonton venues with live specials, 82 are not described above. We kept this list to the 28 spots with the clearest prices and windows. Others, such as <a href="/edmonton/venues/7348">The Public Exchange (10909 Jasper Ave)</a>, <a href="/edmonton/venues/2187">The Common</a> and the other Canadian Brewhouse locations, are confirmed but only partly covered here. The Common's data shows weekly features such as $5.50 Tuesday margaritas, with no 3-6&nbsp;PM window like the one competitor lists give. Tavern on Whyte, Beer Revolution and El Cortez appear on older roundups, and we hold no confirmed specials for them. Malt &amp; Mortar (10416 82 Avenue), which older lists still recommend, is shown as closed on listings and in 2024 news.</p>

<h2>Frequently asked questions</h2>

<h3>What time is happy hour in Edmonton?</h3>
<p>The most common window in TodaysTab's October 31, 2026 data is 2-5&nbsp;PM, shared by 12 venues, followed by 2-6&nbsp;PM at 8 venues. The Black Dog Freehouse and O'Byrne's run 2-7&nbsp;PM, the longest windows on our list. Many Edmonton venues also run a second window from 9&nbsp;PM to close.</p>

<h3>Where is the cheapest happy hour in Edmonton?</h3>
<p>1st RND (11248 104 Ave NW) charges $3.99 for a 12&nbsp;oz sleeve of house draught, sliders and fish tacos Monday to Saturday 2-6&nbsp;PM. For a 20&nbsp;oz pint, The Black Dog Freehouse is lowest at $4.75 from 2 to 7&nbsp;PM. The Pint Whyte sells 8&nbsp;oz mini beers for $2.25 on Tuesdays.</p>

<h3>Which Edmonton bars have a late-night happy hour?</h3>
<p>23 venues in our data start a happy hour at 9&nbsp;PM or later. Examples are 1st RND (9&nbsp;PM to close, Monday to Saturday), <a href="/edmonton/venues/741">The Next Act Pub (8224 104 Street NW)</a> (Sunday to Thursday), <a href="/edmonton/venues/7349">The Banquet (10332 103 Street NW, Unit 210)</a>, and <a href="/edmonton/venues/7211">JOEY Bell Tower (10310 101 Street NW)</a>. <a href="/edmonton/venues/3027">Black Pearl Seafood Bar</a> starts at 8&nbsp;PM daily.</p>

<h3>Is there a happy hour on Sunday in Edmonton?</h3>
<p>Yes. 39 venues in our data have a Sunday happy hour or drink special. The Pint Whyte (all day, $5 highballs, wine and domestic taps), The Bell in Scona Brewery (all day, $5 drafts), The Buckingham (3&nbsp;PM to 2&nbsp;AM) and The Sherlock Holmes Pub Downtown (from 11&nbsp;AM) all run one.</p>

<h3>Which Edmonton neighbourhood has the most happy hours?</h3>
<p>Old Strathcona, around Whyte Avenue (82 Avenue). Eleven of the 28 venues on this list sit within a few blocks of it, from The Black Dog at 10425 Whyte Ave to The Pint Whyte on 104 Street. Downtown and the ICE District follow, with eight.</p>

<h3>Can bars discount drinks after 8 PM in Alberta?</h3>
<p>Yes. The Alberta Gaming, Liquor and Cannabis commission removed the 8&nbsp;PM limit on happy hours, so bars can discount at any time they are open if prices meet the minimum drink price. Edmonton bars such as <a href="/edmonton/venues/7268">1st RND</a>, <a href="/edmonton/venues/7223">Brewco</a> and <a href="/edmonton/venues/3027">Black Pearl</a> now advertise late-night windows.</p>

<h3>How do I know these Edmonton deals are current?</h3>
<p>Every special on this list was re-checked in the 45 days before October 31, 2026, has a confidence score of 0.7 or higher, and states a day or time. We re-check the list monthly. Our method is described in <a href="/edmonton/blog/how-we-verify-every-special">how we verify every special</a>.</p>

<h2>More Edmonton deals</h2>

<p>This guide is a snapshot from October 31, 2026. The live <a href="/edmonton">Edmonton deals page</a> is always current, and you can <a href="/edmonton/submit">submit a deal or correction</a>. Browse by day: <a href="/edmonton/friday">Friday</a>, <a href="/edmonton/sunday">Sunday</a> and <a href="/edmonton/tuesday">Tuesday</a>. See all posts on the <a href="/edmonton/blog">Edmonton blog</a>, or compare with our guides to <a href="/kelowna/blog/happy-hours-kelowna-2026">Kelowna</a> and <a href="/penticton/blog/happy-hours-penticton-2026">Penticton</a> happy hours.</p>
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

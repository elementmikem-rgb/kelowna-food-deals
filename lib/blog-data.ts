export interface BlogPost {
  slug: string;
  title: string;
  metaDescription: string;
  publishedAt: string; // YYYY-MM-DD
  excerpt: string;
  contentHtml: string;
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "how-we-verify-every-special",
    title: "How We Actually Verify Every Special on This Site",
    metaDescription:
      "Most Kelowna deals sites are copy-pasted lists nobody's checked in years. Here's exactly how we confirm a special is real before it goes live.",
    publishedAt: "2026-06-12",
    excerpt:
      "Every special on this site has to survive one rule: if we can't point to where it came from, it doesn't get published. Here's how that actually works.",
    contentHtml: `
<p>There are a handful of Kelowna food-deals sites out there, and most of them share the same problem: someone built a list once, maybe two years ago, and nobody's touched it since. Restaurants close, happy hours get cancelled, prices go up — the list doesn't know. You show up for $5 wings and pay $9.</p>
<p>We built this site around one non-negotiable rule: <strong>a special only gets published if we can point to the exact place it came from.</strong> Not "we're pretty sure," not "it was probably still running." An actual source.</p>
<h2>Where the data comes from</h2>
<p>Every listing on this site traces back to one of three sources:</p>
<ul>
<li><strong>The venue's own website</strong>, scraped daily and re-checked against what was there the day before. If nothing changed, we don't touch the listing. If something did, we re-extract it.</li>
<li><strong>A visitor submission</strong> — a photo of a chalkboard, a menu, a sign — that a person actually took at the venue.</li>
<li><strong>Public event listings</strong> for things like live music and trivia nights, cross-checked against the venue itself where possible.</li>
</ul>
<h2>The rule that stops us from making things up</h2>
<p>Whatever the source, the system extracting the special has to quote the exact words that prove it — a real price, a real discount, a real day. If it can't find that verbatim text, the item gets dropped. Not published with a caveat. Dropped entirely.</p>
<p>That sounds strict, and it is. It means this site will always have gaps — venues we know run specials but haven't been able to confirm the exact terms of. We'd rather show you fewer things and have them be right than show you everything and have half of it be wrong.</p>
<h2>What happens when something changes</h2>
<p>When a venue updates or drops a special, the old one doesn't just vanish — it moves to that venue's "Previously Featured" list, so you can see what used to run there. Every listing also shows when it was last checked, right on the card. If it says "stale," that's the site telling you on itself: this hasn't been re-confirmed recently, treat it with a grain of salt.</p>
<h2>You can help keep it honest</h2>
<p>If you spot something wrong — a special that's ended, a price that's changed — there's a "Report incorrect" link on every single card. If you spot something we're <em>missing</em>, you can <a href="/submit">submit it</a> with a photo, and it goes through the same verification process before it goes live.</p>
<p>That's the whole system. No magic, no guessing — just a hard rule about evidence, applied consistently, every single day.</p>
`,
  },
  {
    slug: "real-kelowna-happy-hour-guide",
    title: "The Real Kelowna Happy Hour Guide",
    metaDescription:
      "A happy hour guide for Kelowna built from specials we've actually confirmed are still running — not a list from 2022.",
    publishedAt: "2026-06-20",
    excerpt:
      "Forget the lists that haven't been updated since before the pandemic. Here's what's actually on right now, verified against each venue directly.",
    contentHtml: `
<p>Search "Kelowna happy hour" and you'll find the same three articles everyone else finds — dated, vague, and missing half the venues that actually run one. Here's what we've confirmed is real, verified against each venue's own current pricing.</p>
<h2>Creekside Pub &amp; Grill (Lakeshore Road)</h2>
<p>Creekside runs the most consistent happy hour rotation we've tracked in Kelowna — a different drink special most days of the week, starting around $4.75-$5.00. If you only bookmark one happy hour page this year, make it theirs; it changes often enough that checking day-of actually matters.</p>
<h2>BNA Brewing Co. &amp; Eatery (Ellis St)</h2>
<p>BNA's "Super Save Hour" runs $5 beers, $9 cocktails, $10 small plates, and $2 off wine — a genuinely full happy hour menu, not just a beer discount. They also run a Friday "Late Nite Power Hour" from 9pm with $4.99 highballs.</p>
<h2>Kelly O'Bryan's &amp; Carlos O'Bryan's (Bernard Ave)</h2>
<p>Their "Power Hour" gets you drinks for $3.50 — one of the lowest confirmed prices on this list — on top of a rotating weekly food-and-drink lineup that runs 20+ different specials across the week.</p>
<h2>Gulfstream (Airport Way)</h2>
<p>Run by the Four Points by Sheraton, Gulfstream's happy hour includes $5 house-liquor highballs, $11 dry ribs, and $15 margherita pizza — solid food options if you actually want to eat, not just drink.</p>
<h2>Earls, Moxies, JOEY, Cactus Club</h2>
<p>Yes, the chains run happy hour too — most confirmed at the familiar $5-drinks, $5-$13-apps formula, typically 2-5pm and again after 9pm. We've verified current pricing for each; check the individual venue pages for exact items, since chain menus rotate seasonally.</p>
<h2>The honest caveat</h2>
<p>Happy hour timing is the single most common thing venues change without warning. Every card on this site shows when it was last verified — if a listing says "checked today," trust it; if it's been a couple weeks, it's still probably right, but we'd rather you know than assume.</p>
<p>See the <a href="/">full, current list</a> filtered by day and category — this post is a snapshot, the site itself is always current.</p>
`,
  },
  {
    slug: "best-wing-nights-kelowna",
    title: "Best Wing Nights in Kelowna Right Now",
    metaDescription:
      "Every confirmed wing night special in Kelowna, with actual prices — from $0.35 wings to $12 all-you-can-handle deals.",
    publishedAt: "2026-07-03",
    excerpt:
      "We pulled every wing special we've verified across Kelowna and sorted them by day. Some of these prices are genuinely surprising.",
    contentHtml: `
<p>Wing night is the one special almost every pub in Kelowna runs — and the one where prices vary the most wildly. We've confirmed the following directly against each venue. Sorted by day.</p>
<h2>Sunday</h2>
<p><strong>WINGS Rutland</strong> — $12 wings all day, one flavour per order, dine-in only, beverage purchase required.</p>
<h2>Monday</h2>
<p><strong>Montana's BBQ &amp; Bar</strong> (Banks Rd) — half-price wings with a beverage purchase.<br>
<strong>Turtle Jack's</strong> (West Kelowna) — 1 lb of wings for $13.99, paired with a $6 Molson Canadian or Coors Light.</p>
<h2>Wednesday — the busiest wing night in town</h2>
<p><strong>Baxter's Bar &amp; Grill</strong> (Spall Rd) — $0.35 per wing, the lowest per-wing price we've confirmed anywhere in Kelowna.<br>
<strong>Mickie's Pub</strong> (Harvey Ave) — $0.50 per wing.<br>
<strong>McCulloch Station Pub</strong> — $6 per dozen.<br>
<strong>WINGS Rutland</strong> — $12 all day (same deal as Sunday).<br>
<strong>Tonics Pub</strong> (Ellis St) — $10 per pound.<br>
<strong>Train Station Pub</strong> (Ellis St) — half-price wings.<br>
<strong>Creekside Pub &amp; Grill</strong> — $5 off a pound of wings.</p>
<h2>Whenever (no set day confirmed)</h2>
<p><strong>Boomers Bar &amp; Grill</strong> — wings by the pound at $5.<br>
<strong>Mickie's Pub</strong> also runs a standing wing discount outside Wednesdays — worth calling ahead to confirm which night.</p>
<h2>The pattern worth noticing</h2>
<p>Wednesday is, by a wide margin, Kelowna's real wing night — seven of the eleven wing specials we've verified land on a Wednesday. If you're planning around price alone, Baxter's $0.35/wing Wednesday is the cheapest confirmed deal in the city; if you want volume, Tonics' $10/lb or Turtle Jack's $13.99/lb (paired with a cheap beer) go further per dollar for a group.</p>
<p>Prices and days shift without notice — that's true everywhere, not just here. Check the <a href="/?category=wing_night">live wing night list</a> before you go; it updates as soon as we catch a change.</p>
`,
  },
  {
    slug: "cheap-eats-kelowna-under-10",
    title: "Cheap Eats in Kelowna: Where $10 Still Buys You Something Real",
    metaDescription:
      "Confirmed Kelowna food and drink specials under $10 — real prices from real venues, not a generic 'budget dining' listicle.",
    publishedAt: "2026-07-18",
    excerpt:
      "We filtered every verified special on this site down to $10 or less. Twenty of them held up. Here's what's actually worth the trip.",
    contentHtml: `
<p>"Budget dining guide" posts are usually just restaurant names with no prices attached, because nobody actually checked. We did the opposite: we filtered our full database down to specials confirmed at $10 or under, and kept only the ones we can point to a real source for.</p>
<h2>Under $5</h2>
<p><strong>Baxter's Bar &amp; Grill</strong> — $0.35 wings, Wednesdays.<br>
<strong>Mickie's Pub</strong> — $0.50 wings.<br>
<strong>Baxter's Bar &amp; Grill</strong> — Friday tacos at $2 each.<br>
<strong>Erica Jane</strong> — $2 oysters, Thursdays, alongside sociable plates and rotating live music.<br>
<strong>Kelly O'Bryan's</strong> — $3.50 Power Hour drinks.<br>
<strong>Craft Beer Market</strong> — $4 happy hour sliders or spicy ahi tacos.<br>
<strong>Jac's On The Beach</strong> (Peachland) — happy hour starting at $4, running all day, every day.</p>
<h2>$5-$10</h2>
<p>This is where most of Kelowna's happy hour drink specials cluster: $5 highballs at Gulfstream, Cactus Club (both locations), and BNA Brewing; $4.75-$5 domestic beer at Creekside across multiple weekday specials; $4.99 happy hour drinks at BNA's Friday late-night hour and Montana's Monday happy hour.</p>
<p>On the food side: Boomers' $5/lb wings, Leopold's Tavern's $5 late-night menu, and Montana's Tuesday $5 tacos (with a beverage purchase) all confirmed under the $10 line.</p>
<h2>What this list doesn't include</h2>
<p>Notably absent: anything we found mentioned online but couldn't confirm against a real source. Several venues — Friends Pub, The Canadian Brewhouse, Whiski-Jack's — are reported by patrons to run wing or drink specials in this price range, but we couldn't verify the exact number, so they're not on this list. If you've got a photo of one of those boards, <a href="/submit">send it our way</a> and we'll add it properly.</p>
<p>This snapshot will age — that's the nature of a list like this. The <a href="/">live site</a> re-checks these daily.</p>
`,
  },
  {
    slug: "kelowna-west-kelowna-peachland-deals",
    title: "Kelowna vs. West Kelowna vs. Peachland: What We've Actually Verified So Far",
    metaDescription:
      "An honest look at food and drink special coverage across Kelowna, West Kelowna, Peachland, and Lake Country — including where the gaps still are.",
    publishedAt: "2026-08-02",
    excerpt:
      "We track specials across four Okanagan communities, but the coverage isn't even yet — and pretending otherwise would go against the whole point of this site.",
    contentHtml: `
<p>Most local guides act like a region is one uniform blob. It isn't, and pretending otherwise defeats the purpose of a site built around accuracy. So here's an honest breakdown of where our coverage actually stands across the four communities we track.</p>
<h2>Kelowna proper: the deep end</h2>
<p>The bulk of what's on this site — dozens of venues and well over a hundred verified specials — is in Kelowna itself, concentrated around Bernard Avenue, Harvey Avenue, and the downtown waterfront strip on Water Street. If you're looking for the widest selection on a given night, this is where it is, simply because it's where the density of pubs and restaurants is highest.</p>
<h2>West Kelowna: thinner, but real</h2>
<p>We track venues like Turtle Jack's, Sammy J's, Friends Pub, and 19 Okanagan Grill + Bar out here, but confirmed specials are sparser than across the bridge — partly because fewer of these venues publish specials on their own websites in a way we can verify, and partly because we simply haven't gotten as many visitor submissions from this side yet.</p>
<h2>Peachland: mostly untapped</h2>
<p>Peachland has real venues on our books — Jac's On The Beach, Edgewater Inn, Gasthaus on the Lake — but verified special data here is thin. Jac's confirmed all-day happy hour (starting at $4) is one of the few things we can point to with real confidence right now.</p>
<h2>Lake Country / Winfield: the frontier</h2>
<p>The smallest slice of what we track. Turtle Bay Pub and Woody's Pub are on the list, but we've only confirmed a couple of specials between them so far.</p>
<h2>Why the gap exists, and how it closes</h2>
<p>It's not that West Kelowna, Peachland, and Lake Country run fewer deals — it's that we haven't verified as many yet. Independent venues outside Kelowna's downtown core are less likely to list specials on a website we can scrape automatically, which means the fastest way to close this gap is exactly the kind of thing this site was built for: someone who's actually there sending in a photo of the board.</p>
<p>If you're in West Kelowna, Peachland, or Lake Country and you know a spot with a standing deal that isn't on here yet, <a href="/submit">tell us</a> — that's genuinely the fastest way this list gets more even.</p>
`,
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

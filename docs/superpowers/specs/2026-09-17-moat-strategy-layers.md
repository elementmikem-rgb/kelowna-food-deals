# TodaysTab Moat Strategy: Layered Lock-In

## Context

Competitor research (2026-09-16) found TodaysTab has no real moat on its own — the
scrape-and-verify approach is exactly what active, funded competitors (Hour,
HappyHopper) already do. The defensible pattern in this category (Yelp →
OpenTable/Resy) is supply-side lock-in: a venue that actively maintains its own
listing because it drives them customers creates a relationship a scraper can't
replicate.

Phase 1 (claim-your-listing) shipped 2026-09-17 — see the approved plan at the
time,`C:\Users\Mike\.claude\plans\peaceful-rolling-sunbeam.md` — as the entry
point. This doc captures the full layered strategy that Phase 1 is the first
rung of, so the rest of it doesn't stay conversation-only and get lost.

This is a strategy document, not an implementation plan — no layer past 1 is
scoped or scheduled yet. Each layer gets its own plan/scoping pass before build.

## The layers, roughly in order of how sticky they get

**Layer 1 — Claim it** (shipped). A venue takes ownership of their listing:
claim form, manual admin review, magic-link owner auth, owner dashboard, cron
skip, "Owner verified" badge. This alone creates *weak* lock-in — a venue could
still walk away with no real cost. Necessary, but cheap for a competitor to
copy on its own.

**Layer 2 — Give the owner a reason to come back, not just claim once.** A
one-time claim isn't sticky by itself; what makes Google Business/Yelp actually
sticky for owners is a recurring habit loop. Concretely: a weekly digest
("your happy hour got 142 views this week, up from 89") or a simple
"most-viewed pub in Kelowna on Thursday" callout. The `analytics_events`
infrastructure already logs pageviews — this is mostly a reporting layer on
data already being collected, not new plumbing.

**Layer 3 — Multi-location accounts for chains.** The DB already spans
multi-region chains — Boston Pizza, Cactus Club, White Spot, Match Eatery,
JOEY, Earls. A single login managing happy hours across 6-8 locations is a
materially stickier relationship than one independent pub claiming one
listing — losing TodaysTab means losing a consolidated tool, not just one
listing. Same wedge OpenTable used going from single-restaurant to
restaurant-group accounts. (See the `venueOwners` schema note flagging this
as "moat-layer-3" — one owner per venue is the deliberate Phase 1 limit this
layer would lift.)

**Layer 4 — Turn the listing into a transaction, not just a page.** The
biggest lever, and the one that actually changes the category. Stripe is
already wired up for bookings and tips. The jump from "directory listing"
(Yelp) to "place where money actually moves" (OpenTable/Resy) is historically
the strongest moat in this exact space — a venue that takes reservations or
event deposits through TodaysTab has real switching cost, not just
inconvenience. This is the one layer that would actually be hard for Hour or
HappyHopper to catch up to quickly, since it means becoming a
payments/booking product, not just a listings product. Bigger lift than 2-3,
but the only layer that changes the category rather than polishing the same
one.

**Layer 5 — Tie the claim flow to the actual unfair advantage: the Facebook
community presence.** No competitor has the grassroots regional Facebook
group relationships built region by region. A real incentive for claiming:
"claimed venues get featured in this week's [Region] Happy Hour Facebook
post." That's a distribution asset a scraper-based competitor structurally
cannot replicate — it's not code, it's relationships.

## Standing defensible niche (reinforce, not centerpiece)

Quebec/Bill 96 compliance and small-town coverage remain ground the funded
competitors are least likely to prioritize first. Worth defending as the
platform expands, but not a moat by itself — doesn't create lock-in on its
own, just reduces near-term competitive pressure in those markets.

## Honest sequencing take

Layer 1 is necessary but cheap to copy on its own. Layers 2-3 are what most
local-directory products stop at — real, but replicable with enough
engineering time from a funded competitor. Layer 4 is the one that would
actually be hard for Hour or HappyHopper to catch up to quickly, since it
means becoming a payments/booking product, not just a listings product —
bigger lift, but the only layer here that changes the category rather than
polishing the same one.

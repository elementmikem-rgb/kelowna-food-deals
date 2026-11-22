import { ownText } from "@/lib/inbox-signals";

// Replies are untrusted text from outside. These two checks tell Mike when a reply deserves a second look before
// he applies anything from it: a link to a site that is not the venue's own, and a sender whose address is not
// the one we have on file.

// Sites that are normal in a venue reply (social pages, maps, booking and delivery services, our own site).
const WELL_KNOWN = [
  "todaystab.com",
  "facebook.com",
  "fb.com",
  "fb.me",
  "instagram.com",
  "twitter.com",
  "x.com",
  "tiktok.com",
  "youtube.com",
  "youtu.be",
  "linkedin.com",
  "google.com",
  "goo.gl",
  "g.page",
  "eventbrite.com",
  "eventbrite.ca",
  "ticketmaster.ca",
  "ticketmaster.com",
  "opentable.com",
  "opentable.ca",
  "resy.com",
  "doordash.com",
  "ubereats.com",
  "skipthedishes.com",
  "yelp.com",
  "yelp.ca",
  "tripadvisor.com",
  "tripadvisor.ca",
  "linktr.ee",
  // Mail systems: Outlook footers and the security services that rewrite links in incoming mail.
  "aka.ms",
  "microsoft.com",
  "outlook.com",
  "office.com",
  "protection.outlook.com",
  "proofpoint.com",
  "cudasvc.com",
  "mimecast.com",
  "barracudanetworks.com",
];

function baseHost(h: string): string {
  return h.toLowerCase().replace(/^www\./, "");
}

function sameOrSub(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

export function unfamiliarLinkDomains(text: string | null | undefined, venueWebsite: string | null | undefined): string[] {
  if (!text) return [];
  let own: string | null = null;
  if (venueWebsite) {
    try {
      own = baseHost(new URL(/^https?:\/\//i.test(venueWebsite) ? venueWebsite : `https://${venueWebsite}`).hostname);
    } catch {
      own = null;
    }
  }
  const found: string[] = [];
  for (const m of ownText(text).matchAll(/https?:\/\/[^\s<>"')\]]+/gi)) {
    const raw = m[0].replace(/[.,;:!?]+$/, "");
    let host: string;
    try {
      host = baseHost(new URL(raw).hostname);
    } catch {
      continue;
    }
    // Not a real web address: needs a dot and a lettered ending (skips "514-498-2228" and "localhost").
    if (!/\.[a-z][a-z0-9-]*$/.test(host)) continue;
    if (own && sameOrSub(host, own)) continue;
    if (WELL_KNOWN.some((d) => sameOrSub(host, d))) continue;
    if (!found.includes(host)) found.push(host);
  }
  return found;
}

export function senderMismatch(fromEmail: string | null | undefined, contactEmail: string | null | undefined): boolean {
  if (!fromEmail || !contactEmail) return false;
  return fromEmail.trim().toLowerCase() !== contactEmail.trim().toLowerCase();
}

// How well we can show that a venue's contact address is one we are entitled to email (CASL). Computed from data we
// already have plus the new source fields, so it never needs a separate state to keep in sync. This only LABELS an
// address, it does not hold or block any email (Mike chose record-only on 2026-11-22).

export type EmailBasis = "owner_reply" | "verified" | "own_domain" | "personal" | "other_domain" | "unknown";

export const BASIS_LABEL: Record<EmailBasis, string> = {
  owner_reply: "The owner wrote to us from this address",
  verified: "Confirmed as published by the business",
  own_domain: "On the venue's own website domain",
  personal: "Personal mailbox, not proven",
  other_domain: "Different domain from the venue's website, not proven",
  unknown: "Origin not recorded",
};

// Strong evidence first, weakest last. "Proven" levels are the first three.
export const PROVEN: ReadonlySet<EmailBasis> = new Set(["owner_reply", "verified", "own_domain"]);

const PERSONAL_PROVIDERS = new Set([
  "gmail.com",
  "hotmail.com",
  "outlook.com",
  "yahoo.com",
  "yahoo.ca",
  "icloud.com",
  "live.com",
  "videotron.ca",
  "sympatico.ca",
  "shaw.ca",
  "telus.net",
  "bell.net",
  "msn.com",
  "me.com",
]);

export function websiteHost(website: string | null | undefined): string {
  if (!website) return "";
  try {
    return new URL(/^https?:/i.test(website) ? website : `https://${website}`).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function domainMatches(emailDomain: string, siteHost: string): boolean {
  if (!emailDomain || !siteHost) return false;
  return emailDomain === siteHost || emailDomain.endsWith(`.${siteHost}`) || siteHost.endsWith(`.${emailDomain}`);
}

export function emailBasis(v: {
  contactEmail: string;
  website: string | null;
  wroteUs: boolean;
  verifiedAt: Date | null;
  source: "website" | "web_search" | "owner_reply" | "manual" | null;
}): EmailBasis {
  if (v.wroteUs || v.source === "owner_reply") return "owner_reply";
  if (v.verifiedAt) return "verified";
  const emailDomain = v.contactEmail.split("@")[1]?.toLowerCase() ?? "";
  const host = websiteHost(v.website);
  if (domainMatches(emailDomain, host)) return "own_domain";
  if (PERSONAL_PROVIDERS.has(emailDomain)) return "personal";
  return host ? "other_domain" : "unknown";
}

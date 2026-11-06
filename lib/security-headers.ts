// Response headers sent with every page. Kept in a plain module so the values can be unit-tested.
//
// Deliberately NOT a full Content-Security-Policy: the site loads Cloudflare's analytics, Stripe checkout
// links, OpenStreetMap tiles, a Google Maps embed and inline scripts, and a strict policy written without
// a report-only trial would risk blanking pages. frame-ancestors is the one directive that is safe on its
// own, and it is the part that stops another site from putting ours inside a frame.
export const SECURITY_HEADERS = [
  // One year, this host only. Deliberately no includeSubDomains or preload: those are
  // hard to undo and www/other subdomains are not set up yet.
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
  // Older browsers that ignore frame-ancestors.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // The site asks for the visitor's position (sort by nearest) and nothing else; camera and microphone
  // are never used (the photo field is a plain file picker).
  { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=()" },
];

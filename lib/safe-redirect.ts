// Returns a same-site path (with query and fragment) that is safe to redirect to,
// or "/" when `to` is anything else. The string checks alone are not enough:
// WHATWG URL parsing treats a backslash like a slash and strips tab/newline, so
// "/\evil.example" and "/\t/evil.example" both parse as "//evil.example" and would
// redirect off-site. Reject those characters up front, then confirm the resolved
// URL still sits on the site's own origin.
export function safeRedirectPath(to: string, siteUrl: string): string {
  if (!to.startsWith("/") || to.startsWith("//")) return "/";
  if (/[\\\u0000-\u001f\u007f]/.test(to)) return "/";
  try {
    const site = new URL(siteUrl);
    const resolved = new URL(to, site);
    if (resolved.origin !== site.origin) return "/";
    return resolved.pathname + resolved.search + resolved.hash;
  } catch {
    return "/";
  }
}

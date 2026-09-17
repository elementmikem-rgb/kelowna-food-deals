import type { Language } from "@/lib/i18n";

// Shows the language you'd SWITCH TO, not the current one -- e.g. viewing in
// French shows an "EN" pill. Clicking it hits /api/lang/set, which sets the
// `lang-pref` cookie (the only thing that does -- see getEffectiveLanguage()
// in lib/i18n.ts) and redirects back to returnPath. A plain <a>, deliberately
// NOT next/link's Link -- Link intercepts the click for a client-side RSC
// fetch, which rewrites the request to `?_rsc=...` and drops our lang/to
// query params entirely, so the route 400s and the toggle silently does
// nothing. This must always be a real full-page navigation.
export function LanguageToggle({ lang, returnPath }: { lang: Language; returnPath: string }) {
  const target: Language = lang === "fr" ? "en" : "fr";
  const label = target === "fr" ? "FR" : "EN";
  return (
    <a
      href={`/api/lang/set?lang=${target}&to=${encodeURIComponent(returnPath)}`}
      className="press-pill inline-flex items-center rounded-full border border-border px-3 py-1.5 text-sm text-muted hover:border-muted hover:text-foreground"
      aria-label={target === "fr" ? "Passer au français" : "Switch to English"}
    >
      {label}
    </a>
  );
}

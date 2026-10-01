import { t, type Language } from "@/lib/i18n";
import { buildFaqJsonLd } from "@/lib/seo";

// Native <details>/<summary> accordion -- no client JS needed, and critically,
// the content is real visible DOM (not display:none) so the matching FAQPage
// JSON-LD (buildFaqJsonLd) reflects what's actually on the page, which is
// Google's requirement for FAQ rich results, not just a nice-to-have.
export function FAQSection({ lang = "en" }: { lang?: Language }) {
  const faq = t(lang).faq;
  const jsonLd = buildFaqJsonLd(faq.items);

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 text-sm text-muted flex flex-col gap-3">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <h2 className="font-display text-lg text-foreground">{faq.heading}</h2>
      <div className="flex flex-col divide-y divide-border">
        {faq.items.map((item) => (
          <details key={item.q} className="py-2.5 group">
            <summary className="cursor-pointer font-medium text-foreground list-none flex items-center justify-between gap-2">
              {item.q}
              <span className="text-muted-2 group-open:rotate-180 transition-transform">▾</span>
            </summary>
            <p className="pt-2">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

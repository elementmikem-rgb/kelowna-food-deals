import { describe, it, expect } from "vitest";
import { cleanBodyText, tokenizeLinks } from "./email-display";

describe("cleanBodyText", () => {
  it("removes [cid:...] inline image placeholders", () => {
    expect(cleanBodyText("Merci\n[cid:01cb6ffb-4ce2]\nTel")).toBe("Merci\nTel");
  });
  it("collapses 3+ blank lines to one blank line", () => {
    expect(cleanBodyText("a\n\n\n\n\nb")).toBe("a\n\nb");
  });
  it("removes a bracketed tracking url that trails a visible link label", () => {
    const t = "Voir votre fiche<https://bbaidbga.r.af.d.sendibt2.com/tr/cl/AAAA_bbbb-CCC>";
    expect(cleanBodyText(t)).toBe("Voir votre fiche <https://bbaidbga.r.af.d.sendibt2.com/tr/cl/AAAA_bbbb-CCC>");
  });
});

describe("tokenizeLinks", () => {
  it("splits text into text and link tokens", () => {
    const toks = tokenizeLinks("see https://todaystab.com/a/b now");
    expect(toks).toEqual([
      { type: "text", value: "see " },
      { type: "link", href: "https://todaystab.com/a/b", label: "todaystab.com/a/b" },
      { type: "text", value: " now" },
    ]);
  });
  it("shortens very long tracking urls to the host and an ellipsis", () => {
    const url = "https://bbaidbga.r.af.d.sendibt2.com/tr/cl/" + "A".repeat(300);
    const toks = tokenizeLinks(`x <${url}> y`);
    const link = toks.find((t) => t.type === "link");
    expect(link && link.type === "link" && link.href).toBe(url);
    expect(link && link.type === "link" && link.label).toBe("bbaidbga.r.af.d.sendibt2.com/…");
  });
  it("does not swallow trailing punctuation", () => {
    const toks = tokenizeLinks("go to https://a.com/x.");
    expect(toks[toks.length - 1]).toEqual({ type: "text", value: "." });
  });
  it("only linkifies http and https", () => {
    expect(tokenizeLinks("javascript:alert(1) ftp://x.com")).toEqual([
      { type: "text", value: "javascript:alert(1) ftp://x.com" },
    ]);
  });
});

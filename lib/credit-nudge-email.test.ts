import { describe, it, expect } from "vitest";
import { buildCreditNudge, creditNudgeFooter, tidyFirstName } from "./credit-nudge-email";

const input = {
  firstName: "Ana",
  venueName: "Pub X",
  dashboardUrl: "https://todaystab.com/owner/venue/9#promote",
};

describe("buildCreditNudge (English)", () => {
  const out = buildCreditNudge({ ...input, lang: "en" });

  it("names the venue in the subject and says what the owner has", () => {
    expect(out.subject).toBe("You have $10 in free credit waiting, Pub X");
  });

  it("only says what the product pages and code say", () => {
    for (const body of [out.html, out.text]) {
      expect(body).toMatch(/\$10 in free credit/);
      expect(body).toMatch(/Featured/);
      expect(body).toMatch(/Boost/);
      expect(body).toMatch(/No card needed/);
      expect(body).toMatch(/does not expire/);
      expect(body).toMatch(/review each one before it goes live/);
    }
  });

  it("links to the dashboard in both the button and the plain text", () => {
    expect(out.html).toContain(`href="${input.dashboardUrl}"`);
    expect(out.text).toContain(input.dashboardUrl);
  });

  it("has no em or en dashes, no emojis and no leftover placeholders", () => {
    for (const body of [out.subject, out.html, out.text]) {
      expect(body).not.toMatch(/[–—]/);
      expect(body).not.toMatch(/\{\{|\}\}/);
      expect(body).not.toMatch(/\p{Extended_Pictographic}/u);
    }
  });

  it("makes no results or reach claims", () => {
    expect(out.text).not.toMatch(/guarantee|more customers|views|clients|results/i);
  });
});

describe("buildCreditNudge (French)", () => {
  const out = buildCreditNudge({ ...input, lang: "fr" });

  it("is in French with the formal vous", () => {
    expect(out.subject).toBe("Vous avez 10 $ de crédit gratuit, Pub X");
    expect(out.text).toMatch(/Bonjour Ana,/);
    expect(out.text.toLowerCase()).toContain("vous avez");
    expect(out.text.toLowerCase()).toContain("votre");
    expect(out.text).not.toMatch(/\btu\b|\btoi\b|\btes\b/i);
    expect(out.text).toMatch(/Aucune carte requise/);
    expect(out.text).toMatch(/n'expire pas/);
  });

  it("has no em or en dashes and links to the dashboard", () => {
    for (const body of [out.subject, out.html, out.text]) expect(body).not.toMatch(/[–—]/);
    expect(out.html).toContain(`href="${input.dashboardUrl}"`);
  });
});

describe("safety of text that came from the database", () => {
  it("escapes the venue and owner names in the HTML but not in the plain text", () => {
    const out = buildCreditNudge({ ...input, lang: "en", venueName: "Fish & Chips <b>", firstName: "<i>Zed" });
    expect(out.html).toContain("Fish &amp; Chips &lt;b&gt;");
    expect(out.html).toContain("&lt;i&gt;Zed");
    expect(out.html).not.toContain("<b>Fish");
    expect(out.text).toContain("Fish & Chips <b>");
  });
  it("greets cleanly when there is no first name", () => {
    expect(buildCreditNudge({ ...input, lang: "en", firstName: "" }).text).toMatch(/^Hi,/);
    expect(buildCreditNudge({ ...input, lang: "fr", firstName: "" }).text).toMatch(/^Bonjour,/);
  });
});

describe("creditNudgeFooter", () => {
  it("has the mailing address and an unsubscribe link in the right language", () => {
    const en = creditNudgeFooter("en", "1 Main St, Kelowna BC", "https://todaystab.com/api/unsubscribe?x=1");
    expect(en.html).toContain("1 Main St, Kelowna BC");
    expect(en.html).toContain('href="https://todaystab.com/api/unsubscribe?x=1"');
    expect(en.text).toContain("Unsubscribe: https://todaystab.com/api/unsubscribe?x=1");
    const fr = creditNudgeFooter("fr", "1 rue Main, Montréal QC", "https://todaystab.com/api/unsubscribe?x=1");
    expect(fr.text).toMatch(/Se désabonner/);
  });
});

describe("tidyFirstName (names are stored as typed, sometimes in capitals)", () => {
  it("softens an all-capitals name", () => {
    expect(tidyFirstName("TARN")).toBe("Tarn");
    expect(tidyFirstName("JEAN-PIERRE")).toBe("Jean-Pierre");
    expect(tidyFirstName("MÉLANIE")).toBe("Mélanie");
  });
  it("leaves a normally written name alone, including unusual capitals", () => {
    expect(tidyFirstName("Ana")).toBe("Ana");
    expect(tidyFirstName("McKenzie")).toBe("McKenzie");
    expect(tidyFirstName("Jo")).toBe("Jo");
    expect(tidyFirstName("DJ")).toBe("DJ");
  });
  it("is empty for nothing", () => {
    expect(tidyFirstName("")).toBe("");
    expect(tidyFirstName("   ")).toBe("");
  });
});

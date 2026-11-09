import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// The privacy page keeps its copy inline, so this reads the English block and checks it
// says what the site really records (taps and impressions, browser type, how long it is
// kept, where the visitor id lives, and that owners see counts for their own listing).
const source = readFileSync(join(__dirname, "..", "app", "[region]", "privacy", "page.tsx"), "utf8");
const en = source.slice(source.indexOf("  en: {"), source.indexOf("  fr: {"));

describe("English privacy copy: analytics", () => {
  const analytics = en.slice(en.indexOf("analyticsBody:"), en.indexOf("submissionsHeading:"));

  it("covers interactions and on-screen listings, not just page views", () => {
    expect(analytics).toMatch(/tapping/i);
    expect(analytics).toMatch(/shown on screen/i);
  });

  it("discloses the browser type", () => {
    expect(analytics).toMatch(/browser type/i);
  });

  it("states how long it is kept, matching RETENTION_DAYS", () => {
    const lib = readFileSync(join(__dirname, "analytics.ts"), "utf8");
    const days = lib.match(/RETENTION_DAYS = (\d+)/)![1];
    expect(analytics).toContain(`${days} days`);
  });

  it("says venue owners see combined counts for their own listing", () => {
    expect(analytics).toMatch(/venue owner/i);
    expect(analytics).toMatch(/own listing/i);
  });

  it("does not over-promise anonymity: a random visitor ID can still be personal information", () => {
    expect(analytics).not.toMatch(/tied to you personally/i);
    expect(analytics).toMatch(/not used to identify you/i);
  });
});

describe("privacy copy: chat box and third parties", () => {
  const fr = source.slice(source.indexOf("  fr: {"));
  const section = (text: string, from: string, to: string) => text.slice(text.indexOf(from), text.indexOf(to));
  const enChat = section(en, "chatBody:", "tipsHeading:");
  const frChat = section(fr, "chatBody:", "tipsHeading:");
  const days = readFileSync(join(__dirname, "chat-retention.ts"), "utf8").match(/CHAT_RETENTION_DAYS = (\d+)/)![1];

  it("discloses AI, stored questions and IP, and the retention period matching the code", () => {
    expect(enChat).toMatch(/Anthropic/);
    expect(enChat).toMatch(/IP address/);
    expect(enChat).toContain(`${days} days`);
    expect(frChat).toMatch(/Anthropic/);
    expect(frChat).toContain(`${days} jours`);
  });

  it("points to 988 in both languages", () => {
    expect(enChat).toContain("988");
    expect(frChat).toContain("988");
  });

  it("names every service that receives visitor data", () => {
    const third = section(en, "thirdPartiesBody:", "tipsHeading:");
    for (const name of ["Cloudflare", "Railway", "Stripe", "Anthropic", "Brevo", "OpenStreetMap", "Google"]) {
      expect(third).toContain(name);
    }
  });

  it("the chat system prompt has a crisis rule that points to 988", () => {
    const chat = readFileSync(join(__dirname, "region-chat.ts"), "utf8");
    expect(chat).toMatch(/SAFETY OVERRIDE/);
    expect(chat).toContain("988");
  });
});

describe("English privacy copy: storage", () => {
  const cookies = en.slice(en.indexOf("cookiesBody:"), en.indexOf("sponsoredHeading:"));

  it("says the ids live in local storage, and the only cookie is for excluding our own visits", () => {
    expect(cookies).toMatch(/local storage/i);
    expect(cookies).toMatch(/our own team/i);
    expect(cookies).not.toMatch(/opt out/i);
    expect(cookies).not.toMatch(/A cookie stores your session\/visitor ID/);
  });
});

describe("French privacy copy", () => {
  const fr = source.slice(source.indexOf("  fr: {"));
  const analytics = fr.slice(fr.indexOf("analyticsBody:"), fr.indexOf("submissionsHeading:"));
  const cookies = fr.slice(fr.indexOf("cookiesBody:"), fr.indexOf("sponsoredHeading:"));

  it("covers interactions and on-screen listings", () => {
    expect(analytics).toMatch(/appuyer/i);
    expect(analytics).toMatch(/affichées à l'écran/i);
  });

  it("discloses the browser type and the retention period", () => {
    expect(analytics).toMatch(/type de navigateur/i);
    const lib = readFileSync(join(__dirname, "analytics.ts"), "utf8");
    expect(analytics).toContain(`${lib.match(/RETENTION_DAYS = (\d+)/)![1]} jours`);
  });

  it("says venue owners see combined counts for their own listing", () => {
    expect(analytics).toMatch(/propriétaire d'établissement/i);
    expect(analytics).toMatch(/propre fiche/i);
  });

  it("does not over-promise anonymity", () => {
    expect(analytics).not.toMatch(/liées à vous personnellement/i);
    expect(analytics).toMatch(/ne servent pas à vous identifier/i);
  });

  it("says the ids live in local storage and the only cookie excludes our own visits", () => {
    expect(cookies).toMatch(/stockage local/i);
    expect(cookies).toMatch(/notre propre équipe/i);
    expect(cookies).not.toMatch(/Un témoin \(cookie\) enregistre/);
  });
});

describe("privacy copy: accessibility notes", () => {
  const fr = source.slice(source.indexOf("  fr: {"));
  const section = (text: string) => text.slice(text.indexOf("accessBody:"), text.indexOf("cookiesHeading:"));
  const enAccess = section(en);
  const frAccess = section(fr);
  const lib = readFileSync(join(__dirname, "accessibility.ts"), "utf8");
  const months = Math.round(Number(lib.match(/ACCESS_MAX_AGE_DAYS = (\d+)/)![1]) / 30.4);

  it("explains what is stored: answers, a random browser id kept as a hash, no name or account", () => {
    expect(enAccess).toMatch(/random/i);
    expect(enAccess).toMatch(/local storage/i);
    expect(enAccess).toMatch(/hash/i);
    expect(enAccess).toMatch(/no name|not an account|no account/i);
    expect(frAccess).toMatch(/aléatoire/i);
    expect(frAccess).toMatch(/stockage local/i);
    expect(frAccess).toMatch(/hach/i);
  });

  it("says how long answers count, matching the code", () => {
    expect(enAccess).toContain(`${months} months`);
    expect(frAccess).toContain(`${months} mois`);
  });

  it("does not claim the site itself says a place is accessible", () => {
    expect(enAccess).toMatch(/reported by visitors|visitors confirm/i);
    expect(frAccess).toMatch(/visiteurs/i);
  });
});

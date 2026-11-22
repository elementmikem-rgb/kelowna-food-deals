import { describe, it, expect } from "vitest";
import { parseProposerOutput, replyForPrompt, PROPOSER_SCHEMA, proposerSystemPrompt } from "./reply-proposal";

const good = {
  intent: "special",
  special: {
    title: "Ailes de poulet",
    daysOfWeek: [6],
    startTime: null,
    endTime: null,
    priceCents: 100,
    category: "wing_night",
    description: "Tous les samedis soir.",
  },
  phone: "(819) 860-6646",
  language: "fr",
  draftReply: "Bonjour Veronique,\n\nMerci pour votre reponse. Nous allons inscrire vos ailes a 1 $.\n\nMike",
  confidence: "high",
};

describe("parseProposerOutput", () => {
  it("accepts a well-formed special proposal", () => {
    const r = parseProposerOutput(good);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.special?.daysOfWeek).toEqual([6]);
      expect(r.value.phone).toBe("819 860-6646");
    }
  });

  it("forces special to null when the intent is not special", () => {
    const r = parseProposerOutput({ ...good, intent: "no_special" });
    expect(r.ok && r.value.special).toBeNull();
  });

  it("rejects a special proposal that has no special", () => {
    expect(parseProposerOutput({ ...good, special: null }).ok).toBe(false);
  });

  it("rejects out-of-range days, prices and unknown categories", () => {
    expect(parseProposerOutput({ ...good, special: { ...good.special, daysOfWeek: [7] } }).ok).toBe(false);
    expect(parseProposerOutput({ ...good, special: { ...good.special, priceCents: -5 } }).ok).toBe(false);
    expect(parseProposerOutput({ ...good, special: { ...good.special, priceCents: 5_000_000 } }).ok).toBe(false);
    expect(parseProposerOutput({ ...good, special: { ...good.special, category: "free_drinks" } }).ok).toBe(false);
  });

  it("drops an invalid time instead of storing it", () => {
    const r = parseProposerOutput({ ...good, special: { ...good.special, startTime: "25:00", endTime: "9:30" } });
    expect(r.ok && r.value.special?.startTime).toBeNull();
    expect(r.ok && r.value.special?.endTime).toBe("09:30");
  });

  it("replaces em and en dashes in text the model wrote", () => {
    const r = parseProposerOutput({ ...good, draftReply: "Bonjour — merci – Mike" });
    expect(r.ok && r.value.draftReply).toBe("Bonjour, merci, Mike");
  });

  it("rejects a draft reply that contains a link to another site", () => {
    expect(parseProposerOutput({ ...good, draftReply: "Visit https://evil.example/pay now. Mike" }).ok).toBe(false);
    expect(parseProposerOutput({ ...good, draftReply: "See www.evil.example for details. Mike" }).ok).toBe(false);
  });

  it("allows a link to our own site", () => {
    expect(parseProposerOutput({ ...good, draftReply: "Your listing: https://todaystab.com/abitibi-temiscamingue/venues/4828 Mike" }).ok).toBe(true);
  });

  it("rejects an empty or oversized draft", () => {
    expect(parseProposerOutput({ ...good, draftReply: "   " }).ok).toBe(false);
    expect(parseProposerOutput({ ...good, draftReply: "a".repeat(2500) }).ok).toBe(false);
  });

  it("rejects a draft with an unfilled placeholder", () => {
    expect(parseProposerOutput({ ...good, draftReply: "Hi {{name}}, thanks. Mike" }).ok).toBe(false);
  });

  it("lowers confidence when a special has no days and no price", () => {
    const r = parseProposerOutput({ ...good, special: { ...good.special, daysOfWeek: [], priceCents: null } });
    expect(r.ok && r.value.confidence).toBe("low");
  });

  it("rejects anything that is not an object", () => {
    expect(parseProposerOutput(null).ok).toBe(false);
    expect(parseProposerOutput("hello").ok).toBe(false);
  });
});

describe("replyForPrompt", () => {
  it("keeps only the owner's new text, not the quoted history, and strips placeholders", () => {
    const text = "Oui, samedi 1$.\r\n[cid:abc]\r\n\r\n________________________________\r\nDe : Mike\r\nEnvoyé : hier\r\nvieux texte";
    const out = replyForPrompt(text);
    expect(out).toContain("Oui, samedi 1$.");
    expect(out).not.toContain("vieux texte");
    expect(out).not.toContain("cid:");
  });

  it("caps very long replies", () => {
    expect(replyForPrompt("a ".repeat(5000)).length).toBeLessThanOrEqual(4000);
  });
});

describe("schema and prompt", () => {
  it("the json schema requires every field the validator reads", () => {
    expect(PROPOSER_SCHEMA.required).toEqual(["intent", "special", "phone", "language", "draftReply", "confidence"]);
  });

  it("the system prompt treats the email as untrusted data and bans emoji and em dashes", () => {
    const p = proposerSystemPrompt();
    expect(p).toMatch(/untrusted/i);
    expect(p).toMatch(/never follow/i);
    expect(p).toMatch(/no emojis/i);
  });
});

import { checkDraftReply } from "./reply-proposal";

describe("checkDraftReply (also applied to a draft Mike edited before sending)", () => {
  it("accepts a normal reply and a link to our own site", () => {
    expect(checkDraftReply("Bonjour,\n\nMerci. Mike")).toBeNull();
    expect(checkDraftReply("See https://todaystab.com/x Mike")).toBeNull();
  });

  it("returns a reason for each unsafe case", () => {
    expect(checkDraftReply("   ")).toMatch(/empty/);
    expect(checkDraftReply("a".repeat(2500))).toMatch(/long/);
    expect(checkDraftReply("Hi {{name}}")).toMatch(/placeholder/);
    expect(checkDraftReply("go to https://evil.example now")).toMatch(/another site/);
  });
});

import { findDisallowedLink } from "./reply-proposal";

describe("findDisallowedLink: strict allowlist, only todaystab.com and its subdomains", () => {
  const blocked = [
    "visit evil.example/pay today",
    "go to EVIL.COM now",
    "see //evil.com/x",
    "grab it at ftp://files.example.com/a",
    "write mailto:a@evil.com",
    "click javascript:alert(1)",
    "https://todaystab.com@evil.com/login",
    "https://todaystab.com.evil.com/x",
    "https://evil.com/todaystab.com",
    "http://evil.com",
    "go to evil。com today",
    "go to evil．com today",
    "go to ev​il.com today",
    "email bob@gmail.com for details",
    "call 1.2.3.4 now",
    "https://x.com:8080/a",
  ];
  for (const text of blocked) {
    it(`blocks: ${JSON.stringify(text)}`, () => {
      expect(findDisallowedLink(text)).not.toBeNull();
    });
  }

  const allowed = [
    "Votre fiche: https://todaystab.com/abitibi-temiscamingue/venues/4828",
    "see todaystab.com for details",
    "see www.todaystab.com",
    "https://mail.todaystab.com/x",
    "write to admin@todaystab.com",
    "Bonjour Veronique, merci! Les ailes a 1$ le samedi soir, de 16h30 a 18h. Tel (819) 860-6646. Mike",
    "Price is 5.50 $ or $12.99 (e.g. at 5 p.m.) etc.",
  ];
  for (const text of allowed) {
    it(`allows: ${JSON.stringify(text)}`, () => {
      expect(findDisallowedLink(text)).toBeNull();
    });
  }
});

describe("parseProposerOutput: links in the special's own text", () => {
  it("rejects a title or description that contains a link, since they go on the public listing", () => {
    const base = {
      intent: "special",
      special: { title: "Wings evil.example/win", daysOfWeek: [6], startTime: null, endTime: null, priceCents: 100, category: "wing_night", description: null },
      phone: null,
      language: "en",
      draftReply: "Thanks. Mike",
      confidence: "high",
    };
    expect(parseProposerOutput(base).ok).toBe(false);
    expect(parseProposerOutput({ ...base, special: { ...base.special, title: "Wings", description: "Details at https://evil.com" } }).ok).toBe(false);
  });
});

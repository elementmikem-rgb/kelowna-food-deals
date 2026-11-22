import { describe, it, expect } from "vitest";
import { splitQuoted, stripQuotePrefix } from "./email-quote";

describe("splitQuoted", () => {
  it("returns the whole body when there is no quoted text", () => {
    expect(splitQuoted("Hi there\nThanks")).toEqual({ main: "Hi there\nThanks", quoted: null, after: "" });
  });

  it("splits a reply from the quoted thread beneath it", () => {
    const body = "Sounds good.\n\nOn Tue, Mike wrote:\n> original line 1\n> original line 2";
    const out = splitQuoted(body);
    expect(out.main).toBe("Sounds good.\n\nOn Tue, Mike wrote:");
    expect(out.quoted).toBe("> original line 1\n> original line 2");
    expect(out.after).toBe("");
  });

  it("drops blank lines between the reply and the quote", () => {
    expect(splitQuoted("Thanks\n\n\n> old").main).toBe("Thanks");
  });

  it("does not collapse anything when the very first line is quoted", () => {
    expect(splitQuoted("> only quoted\n> more")).toEqual({ main: "> only quoted\n> more", quoted: null, after: "" });
  });

  it("keeps a reply written BELOW the quote visible (bottom-posting)", () => {
    const body = "On Tue, Mike wrote:\n> Is that still accurate?\n> Thanks\nsome changes,\n\ni can send them sunday";
    const out = splitQuoted(body);
    expect(out.main).toBe("On Tue, Mike wrote:");
    expect(out.quoted).toBe("> Is that still accurate?\n> Thanks");
    expect(out.after).toBe("some changes,\n\ni can send them sunday");
  });

  it("keeps text written between quoted lines inside the collapsed block, not lost", () => {
    const out = splitQuoted("Intro\n> q1\nMy inline answer\n> q2");
    expect(out.main).toBe("Intro");
    expect(out.quoted).toContain("My inline answer");
  });
});

describe("stripQuotePrefix", () => {
  it("removes one level of '> ' or '>' from each line", () => {
    expect(stripQuotePrefix("> a\n>b\nplain")).toBe("a\nb\nplain");
  });

  it("only strips one level of nesting", () => {
    expect(stripQuotePrefix(">> deeper")).toBe("> deeper");
  });
});

describe("splitQuoted: header-style quotes (Outlook, French and English)", () => {
  const outlookFr =
    "Bonjour Mike,\n\nOui nous organisons des evenements.\n\nVeronique\nPub Theatre Metro\n[cid:abc]\n\n________________________________\nDe : Bons Plans <x@y.com>\nEnvoyé : 9 octobre 2026 15:37\nÀ : a@b.com\nObjet : Fiche\n\nBonjour,\nJe gère un site.";

  it("collapses everything from the Outlook divider down", () => {
    const out = splitQuoted(outlookFr);
    expect(out.main).toContain("Oui nous organisons");
    expect(out.main).not.toContain("Je gère un site");
    expect(out.main).not.toContain("________");
    expect(out.quoted).toContain("De : Bons Plans");
    expect(out.quoted).toContain("Je gère un site");
    expect(out.after).toBe("");
  });

  it("collapses an English Outlook block starting at From: with Sent: beneath", () => {
    const out = splitQuoted("Thanks!\n\nFrom: Mike <m@x.com>\nSent: Tuesday\nTo: a@b.com\nSubject: Hi\n\nold text");
    expect(out.main).toBe("Thanks!");
    expect(out.quoted).toContain("old text");
  });

  it("collapses a -----Original Message----- block", () => {
    const out = splitQuoted("Yes.\n\n-----Original Message-----\nFrom: a\nold");
    expect(out.main).toBe("Yes.");
    expect(out.quoted).toContain("old");
  });

  it("does not treat a lone 'From:' line in a normal message as a quote", () => {
    const body = "Hi\nFrom: the team at the pub we love Fridays\nbye";
    expect(splitQuoted(body)).toEqual({ main: body, quoted: null, after: "" });
  });

  it("does not collapse when the divider is the very first line", () => {
    const body = "________________\nDe : a\nEnvoyé : b\nx";
    expect(splitQuoted(body).quoted).toBeNull();
  });
});

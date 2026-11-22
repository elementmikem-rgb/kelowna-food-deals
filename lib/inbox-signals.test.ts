import { describe, it, expect } from "vitest";
import { ownText, detectStopRequest, detectDecline, detectLead, threadSignals } from "./inbox-signals";

describe("ownText (only what the sender wrote this time)", () => {
  it("drops quoted lines and everything after a reply header", () => {
    const body = "Please remove me.\n\nOn Mon, Nov 2, 2026 at 9:30 AM Mike wrote:\n> Hi, you can unsubscribe here\n> thanks";
    expect(ownText(body)).toBe("Please remove me.");
  });
  it("drops French reply headers and Outlook separators", () => {
    expect(ownText("Merci\n\nLe 2 nov. 2026 à 09:30, Mike a écrit :\n> bonjour")).toBe("Merci");
    expect(ownText("Thanks\n\n________________________________\nFrom: Mike\nunsubscribe")).toBe("Thanks");
  });
  it("cuts flattened mobile-client replies where the quote is on the same line", () => {
    expect(ownText("No thanks.Sent from my Galaxy -------- Original message --------From: Us <a@b.com> Date: x Subject: y Unsubscribe")).toBe("No thanks.Sent from my Galaxy");
    expect(ownText("Aperol 25$ ---- On Mon, 21 Sep 2026 16:12:11 -0600 a@b.com wrote ---- tarifs publicité")).toBe("Aperol 25$");
    expect(ownText("We are not a place Thanks Warren -------- Original message -------- From: Mississauga unsubscribe")).toBe("We are not a place Thanks Warren");
    expect(ownText("Merci! Le lun. 2 nov. 2026 à 09:30, Mike a écrit : bonjour")).toBe("Merci!");
    expect(ownText("Thanks On Tue, Nov 3, 2026 at 9:30 AM Mike <a@b.com> wrote: hi unsubscribe")).toBe("Thanks");
  });
  it("keeps a bottom-posted reply below a quote", () => {
    expect(ownText("> old text\n\nSounds good, thanks")).toBe("Sounds good, thanks");
  });
});

describe("detectStopRequest", () => {
  it.each([
    "Please remove me from your list",
    "Take us off your mailing list.",
    "Unsubscribe",
    "Please remove me.",
    "Stop emailing us please",
    "Do not contact us again",
    "Please don't email me again",
    "Je veux me désabonner",
    "Retirez-moi de votre liste svp",
    "Merci de ne plus nous contacter",
    "Je ne veux plus recevoir vos courriels",
    "Arrêtez de nous écrire",
    "At this time we are not interested. We kindly ask to be removed from your outreach list.",
    "Please have us removed from your mailing list",
  ])("flags: %s", (t) => {
    expect(detectStopRequest(t)).toBe(true);
  });
  it.each([
    "Can you remove the old happy hour and add the new one?",
    "Thanks, please update our phone number",
    "We are open Monday to Friday, happy hour 4 to 6",
    "Merci, vous pouvez enlever l'ancienne heure heureuse",
    "",
  ])("does not flag: %s", (t) => {
    expect(detectStopRequest(t)).toBe(false);
  });
  it("ignores an unsubscribe link that was only quoted", () => {
    expect(detectStopRequest(ownText("Thanks!\n\nOn Mon Mike wrote:\n> Unsubscribe here"))).toBe(false);
  });
});

describe("detectLead (advertising, pricing, sponsoring)", () => {
  it.each([
    "Do you offer advertising?",
    "How much does it cost to be featured?",
    "What are your rates?",
    "We would like to sponsor the page",
    "Do you have a pricing sheet",
    "Combien coûte la publicité?",
    "Quels sont vos tarifs pour une commandite?",
    "Comment être mis en vedette?",
  ])("flags: %s", (t) => {
    expect(detectLead(t)).toBe(true);
  });
  it.each([
    "Our wings are $0.75 each every Tuesday",
    "Happy hour 4 to 6, how much is a pint? $5",
    "Thanks for adding us, looks great",
    "Merci, voici notre horaire",
    "",
  ])("does not flag: %s", (t) => {
    expect(detectLead(t)).toBe(false);
  });
});

describe("detectDecline (a no, not a legal stop request)", () => {
  it.each(["Not interested", "No thanks.", "No thank you", "Pas intéressé, merci", "Non merci"])("flags: %s", (t) => {
    expect(detectDecline(t)).toBe(true);
  });
  it.each([
    "Thanks, no changes needed",
    "No happy hour on Sundays, but Monday to Friday 4 to 6",
    "Nous n'avons aucun happy hours. Merci",
    "",
  ])("does not flag: %s", (t) => {
    expect(detectDecline(t)).toBe(false);
  });
  it("ignores a long reply that merely contains the words", () => {
    const long = "We are not interested in changing the happy hour times, but here is our full weekly schedule. ".repeat(6);
    expect(detectDecline(long)).toBe(false);
  });
});

describe("threadSignals", () => {
  it("reads all three signals from the sender's own words only", () => {
    expect(threadSignals("Please remove me. Also how much is advertising?")).toEqual({ stop: true, decline: false, lead: true });
    expect(threadSignals("Not interested")).toEqual({ stop: false, decline: true, lead: false });
    expect(threadSignals("Thanks!\n\nOn Mon, Nov 2, 2026 at 9:30 AM Mike wrote:\n> unsubscribe")).toEqual({ stop: false, decline: false, lead: false });
  });
  it("is all false for no text", () => {
    expect(threadSignals(null)).toEqual({ stop: false, decline: false, lead: false });
  });
});

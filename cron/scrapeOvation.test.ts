import { describe, it, expect, vi } from "vitest";

// The scraper imports the database; only its pure parsing is tested here.
vi.mock("@/db", () => ({ db: {}, events: {}, venues: {}, regions: {} }));
vi.mock("./fetch", () => ({ isAllowedByRobots: vi.fn() }));
vi.mock("./rateLimit", () => ({ rateLimit: vi.fn() }));

import { parseFrenchDateTime, parseOvationPage, eventTypeFor, OVATION_HALLS } from "./scrapeOvation";

// Shape copied from a live Ovation "all events" page (Palace de Granby, Nov 2026).
const CARD = `
<div class="all-show">
  <div class="title">Sylvain Cossette<span class="event-additional-name"> | Tournée rendez-vous 25e anniversaire</span></div>
  <div><div class="info-show">
    <span class="text-info"> jeudi 5 novembre 2026, 19h30 </span><br><div></div>
    <span class="text-info"> Le Palace de Granby <br> Granby </span>
  </div>
  <div class="buy-link"><span class="button"><a href="/00000Z/fr/Event/Tickets/?eventId=0203HL">Billets</a></span></div></div>
  <p><a href="/00000Z/fr/Event/?eventId=0203HL">Plus d'info</a></p>
</div>
<div class="all-show">
  <div class="title">Les Cowboys Fringants &amp; Cie</div>
  <div><div class="info-show">
    <span class="text-info"> vendredi 1 janvier 2027, 20h </span>
    <span class="text-info"> Salle principale <br> Gatineau </span>
  </div></div>
  <p><a href="/00000Z/fr/Event/?eventId=ABC123">Plus d'info</a></p>
</div>
<div class="all-show"><div class="title">Sans date</div><p><a href="/00000Z/fr/Event/?eventId=ZZ">x</a></p></div>`;

describe("parseFrenchDateTime", () => {
  it("reads the date and the time", () => {
    expect(parseFrenchDateTime("jeudi 5 novembre 2026, 19h30")).toEqual({ date: "2026-11-05", time: "19:30" });
    expect(parseFrenchDateTime("vendredi 1 janvier 2027, 20h")).toEqual({ date: "2027-01-01", time: "20:00" });
    expect(parseFrenchDateTime("samedi 12 décembre 2026, 9h05")).toEqual({ date: "2026-12-12", time: "09:05" });
    expect(parseFrenchDateTime("mercredi 4 août 2027")).toEqual({ date: "2027-08-04", time: null });
  });
  it("returns null for text that is not a date", () => {
    expect(parseFrenchDateTime("Plusieurs dates")).toBeNull();
  });
});

describe("parseOvationPage", () => {
  const list = parseOvationPage(CARD);
  it("reads each card with a date and an event id, and skips the rest", () => {
    expect(list).toHaveLength(2);
  });
  it("reads title (without the additional name), date, time, hall and city", () => {
    expect(list[0]).toEqual({ title: "Sylvain Cossette", date: "2026-11-05", time: "19:30", venueName: "Le Palace de Granby", city: "Granby", eventId: "0203HL" });
    expect(list[1].title).toBe("Les Cowboys Fringants & Cie");
    expect(list[1].time).toBe("20:00");
  });
});

describe("eventTypeFor", () => {
  it("calls concerts live music and the rest other", () => {
    expect(eventTypeFor("Concert du temps des fêtes")).toBe("live_music");
    expect(eventTypeFor("Karaoké 90")).toBe("karaoke");
    expect(eventTypeFor("Trop longtemps seul")).toBe("other");
  });
});

describe("OVATION_HALLS", () => {
  it("has a code and a region for every hall", () => {
    for (const h of OVATION_HALLS) {
      expect(h.code).toMatch(/^[0-9A-Z]{6}$/);
      expect(h.regionSlug.length).toBeGreaterThan(2);
    }
  });
});

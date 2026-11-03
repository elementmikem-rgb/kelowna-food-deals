import { describe, it, expect } from "vitest";
import { isLateSpecial, nightEventKind } from "./nightlife";

describe("isLateSpecial", () => {
  it("counts a special that starts at 8pm or later", () => {
    expect(isLateSpecial("20:00:00", "23:00:00")).toBe(true);
    expect(isLateSpecial("21:30:00", null)).toBe(true);
  });
  it("counts a special that runs past 10pm", () => {
    expect(isLateSpecial("16:00:00", "22:30:00")).toBe(true);
    expect(isLateSpecial(null, "23:00:00")).toBe(true);
  });
  it("counts a special that wraps past midnight", () => {
    expect(isLateSpecial("18:00:00", "01:00:00")).toBe(true);
    expect(isLateSpecial("22:00:00", "02:00:00")).toBe(true);
  });
  it("leaves out ordinary afternoon happy hours", () => {
    expect(isLateSpecial("15:00:00", "18:00:00")).toBe(false);
    expect(isLateSpecial("16:00:00", "22:00:00")).toBe(false);
  });
  it("leaves out all-day specials that only end late", () => {
    expect(isLateSpecial("11:00:00", "23:59:00")).toBe(false);
    expect(isLateSpecial("10:00:00", "23:00:00")).toBe(false);
  });
  it("leaves out a special with no times at all", () => {
    expect(isLateSpecial(null, null)).toBe(false);
  });
  it("does not treat an early-morning end as late when the start is also early", () => {
    expect(isLateSpecial("06:00:00", "11:00:00")).toBe(false);
  });
});

describe("nightEventKind", () => {
  it("keeps live music and karaoke starting at 7pm or later", () => {
    expect(nightEventKind({ eventType: "live_music", startTime: "19:00:00", title: "Band", description: null, teamCode: null })).toBe("music");
    expect(nightEventKind({ eventType: "karaoke", startTime: "21:00:00", title: "Karaoke", description: null, teamCode: null })).toBe("karaoke");
  });
  it("drops music before 7pm and events with no start time", () => {
    expect(nightEventKind({ eventType: "live_music", startTime: "14:00:00", title: "Brunch band", description: null, teamCode: null })).toBeNull();
    expect(nightEventKind({ eventType: "live_music", startTime: null, title: "Band", description: null, teamCode: null })).toBeNull();
  });
  it("keeps an 'other' event only when it reads like a night out", () => {
    expect(nightEventKind({ eventType: "other", startTime: "22:00:00", title: "DJ Saturday", description: null, teamCode: null })).toBe("other");
    expect(nightEventKind({ eventType: "other", startTime: "21:00:00", title: "Drag Show", description: null, teamCode: null })).toBe("other");
    expect(nightEventKind({ eventType: "other", startTime: "20:00:00", title: "Tax seminar", description: null, teamCode: null })).toBeNull();
  });
  it("drops trivia, sports nights and NHL game rows", () => {
    expect(nightEventKind({ eventType: "trivia", startTime: "20:00:00", title: "Trivia", description: null, teamCode: null })).toBeNull();
    expect(nightEventKind({ eventType: "sports_night", startTime: "20:00:00", title: "Game", description: null, teamCode: null })).toBeNull();
    expect(nightEventKind({ eventType: "other", startTime: "19:00:00", title: "DJ party", description: null, teamCode: "VAN" })).toBeNull();
  });
});

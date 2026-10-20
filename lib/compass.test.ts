import { describe, it, expect } from "vitest";
import { headingFromOrientation, headingDiff } from "./compass";

describe("headingFromOrientation", () => {
  it("uses iOS webkitCompassHeading directly", () => {
    expect(headingFromOrientation({ type: "deviceorientation", alpha: 12, webkitCompassHeading: 90 })).toBe(90);
  });

  it("converts an Android absolute alpha (counter-clockwise) to a clockwise heading", () => {
    expect(headingFromOrientation({ type: "deviceorientationabsolute", alpha: 270 })).toBe(90);
    expect(headingFromOrientation({ type: "deviceorientationabsolute", alpha: 0 })).toBe(0);
  });

  it("ignores a plain Android deviceorientation alpha, which is not tied to north", () => {
    expect(headingFromOrientation({ type: "deviceorientation", alpha: 123, absolute: false })).toBeNull();
  });

  it("returns null when alpha is missing", () => {
    expect(headingFromOrientation({ type: "deviceorientationabsolute", alpha: null })).toBeNull();
  });

  it("adds the screen rotation and wraps into 0-359", () => {
    expect(headingFromOrientation({ type: "deviceorientation", alpha: 0, webkitCompassHeading: 350 }, 90)).toBe(80);
  });
});

describe("headingDiff", () => {
  it("measures the short way around", () => {
    expect(headingDiff(350, 10)).toBe(20);
    expect(headingDiff(10, 350)).toBe(20);
    expect(headingDiff(0, 180)).toBe(180);
    expect(headingDiff(45, 45)).toBe(0);
  });
});

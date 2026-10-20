// Compass heading helpers for the map's "my location" arrow. Pure: the browser's orientation
// event and the screen angle are passed in, so this is testable without a device.

export interface OrientationLike {
  type: string;
  alpha: number | null;
  absolute?: boolean;
  // iOS Safari's own compass heading (degrees clockwise from true north), present on its
  // plain deviceorientation events.
  webkitCompassHeading?: number;
}

// Degrees clockwise from north that the top of the phone points to, or null when the event
// carries no real compass reading. Android Chrome's plain deviceorientation alpha is relative
// to wherever the phone started, so only its "absolute" events are trusted.
export function headingFromOrientation(e: OrientationLike, screenAngle = 0): number | null {
  let heading: number | null = null;
  if (typeof e.webkitCompassHeading === "number" && Number.isFinite(e.webkitCompassHeading)) {
    heading = e.webkitCompassHeading;
  } else if ((e.type === "deviceorientationabsolute" || e.absolute === true) && e.alpha !== null) {
    heading = 360 - e.alpha;
  }
  if (heading === null) return null;
  return (((heading + screenAngle) % 360) + 360) % 360;
}

// Shortest angular distance between two headings, 0 to 180.
export function headingDiff(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

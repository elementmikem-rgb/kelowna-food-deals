import type { Language } from "@/lib/i18n";
import { formatTimeOfDay } from "@/lib/time";

// Where a time-boxed special sits against the region's current minute of the day. One function shared by
// the board (to order venues and to filter "On now" / "Starting soon") and by each row (to label itself),
// so the two can never disagree. Idea from the make-it-better experiment's live-status helper, with two
// differences: a start with no end time counts as on from the start (it used to read as "all day"), and a
// special with no start time is never called on now.
export type LiveStatus =
  | { kind: "live"; leftMin: number | null }
  | { kind: "soon"; inMin: number }
  | { kind: "ended" }
  | { kind: "allday" };

function toMinutes(time: string | null): number | null {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function nowMinutesInRegion(timezone: string, now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

export function liveStatus(startTime: string | null, endTime: string | null, now: number): LiveStatus {
  const start = toMinutes(startTime);
  if (start === null) return { kind: "allday" };
  const end = toMinutes(endTime);
  if (end === null) return now >= start ? { kind: "live", leftMin: null } : { kind: "soon", inMin: start - now };

  const overnight = end <= start;
  const endAbs = overnight ? end + 24 * 60 : end;
  if (now >= start && now < endAbs) return { kind: "live", leftMin: endAbs - now };
  // After midnight inside a window that began the evening before.
  if (overnight && now < end) return { kind: "live", leftMin: end - now };
  if (start > now) return { kind: "soon", inMin: start - now };
  return { kind: "ended" };
}

// Venue-level rank: 0 = something on now, 1 = coming up or untimed, 2 = everything finished.
export function statusRank(statuses: LiveStatus[]): 0 | 1 | 2 {
  if (statuses.some((s) => s.kind === "live")) return 0;
  if (statuses.some((s) => s.kind === "soon" || s.kind === "allday")) return 1;
  return 2;
}

function duration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// Starts within this many minutes read as a countdown; later ones read as a clock time.
const COUNTDOWN_MAX = 90;

export function statusLabel(status: LiveStatus, startTime: string | null, lang: Language = "en"): string | null {
  const fr = lang === "fr";
  const clock = formatTimeOfDay(startTime) ?? "";
  switch (status.kind) {
    case "live":
      if (status.leftMin === null) return fr ? `En cours · dès ${clock}` : `On now · from ${clock}`;
      return fr ? `En cours · encore ${duration(status.leftMin)}` : `On now · ${duration(status.leftMin)} left`;
    case "soon":
      if (status.inMin <= COUNTDOWN_MAX) return fr ? `Commence dans ${status.inMin} min` : `Starts in ${status.inMin} min`;
      return fr ? `Commence à ${clock}` : `Starts ${clock}`;
    case "ended":
      return fr ? "Terminé" : "Ended";
    default:
      return null;
  }
}

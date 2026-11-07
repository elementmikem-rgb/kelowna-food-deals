"use client";

import { useState } from "react";
import { formatBucket, indexAtRatio, labelIndices, niceCeil, yTicks } from "@/lib/chart-axis";

interface Point {
  date: string;
  pageviews: number;
  visitors: number;
}

const WIDTH = 600;
const HEIGHT = 160;
const PADDING = 8;

function xAt(i: number, count: number): number {
  const step = count > 1 ? (WIDTH - PADDING * 2) / (count - 1) : 0;
  return PADDING + i * step;
}

function yAt(v: number, top: number): number {
  return HEIGHT - PADDING - (top > 0 ? (v / top) * (HEIGHT - PADDING * 2) : 0);
}

function buildPath(values: number[], top: number): { line: string; area: string } {
  if (values.length === 0) return { line: "", area: "" };
  const points = values.map((v, i) => [xAt(i, values.length), yAt(v, top)] as const);
  const line = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area =
    line +
    ` L${points[points.length - 1][0].toFixed(1)},${HEIGHT - PADDING} L${points[0][0].toFixed(1)},${HEIGHT - PADDING} Z`;
  return { line, area };
}

// Hover (or tap) shows a crosshair, a dot on each line and a readout with the time, the numbers
// and any note for that point. A click or tap pins the readout so it stays put; click again to
// release it.
export function AnalyticsChart({ data, markers = [] }: { data: Point[]; markers?: { index: number; label: string }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-sm text-muted-2">
        No traffic recorded in this window yet.
      </div>
    );
  }

  const pageviews = data.map((d) => d.pageviews);
  const visitors = data.map((d) => d.visitors);
  const peakValue = Math.max(...pageviews);
  const top = niceCeil(peakValue);
  const ticks = yTicks(top);
  const hourly = data[0].date.length > 10;
  const peak = data[pageviews.indexOf(peakValue)];

  const pv = buildPath(pageviews, top);
  const vis = buildPath(visitors, top);
  const labelAt = labelIndices(data.length);

  const active = hover ?? pinned;
  const activePoint = active !== null ? data[active] : null;
  const activeNotes = active !== null ? markers.filter((m) => m.index === active).map((m) => m.label) : [];
  const activeLeftPct = active !== null ? (xAt(active, data.length) / WIDTH) * 100 : 0;

  const indexFromEvent = (e: React.PointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return indexAtRatio((e.clientX - rect.left) / rect.width, data.length);
  };

  return (
    <div>
      <div className="flex gap-2">
        <div className="relative w-9 shrink-0 h-40 text-[10px] text-muted-2 font-mono-tabular">
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute right-0 -translate-y-1/2"
              style={{ top: `${(yAt(t, top) / HEIGHT) * 100}%` }}
            >
              {t.toLocaleString("en-CA")}
            </span>
          ))}
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="relative h-40 cursor-crosshair touch-pan-y select-none"
            onPointerMove={(e) => setHover(indexFromEvent(e))}
            onPointerLeave={() => setHover(null)}
            onClick={(e) => {
              const i = indexFromEvent(e);
              setPinned((current) => (current === i ? null : i));
            }}
          >
            <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-40" preserveAspectRatio="none">
              <defs>
                <linearGradient id="pvGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {ticks.map((t) => (
                <line
                  key={t}
                  x1={0}
                  x2={WIDTH}
                  y1={yAt(t, top)}
                  y2={yAt(t, top)}
                  stroke="var(--border)"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {markers.map((m) => (
                <line
                  key={`${m.index}-${m.label}`}
                  x1={xAt(m.index, data.length)}
                  x2={xAt(m.index, data.length)}
                  y1={PADDING}
                  y2={HEIGHT - PADDING}
                  stroke="var(--muted-2)"
                  strokeWidth="1"
                  strokeDasharray="2 3"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              <path d={pv.area} fill="url(#pvGradient)" />
              <path d={pv.line} fill="none" stroke="var(--accent)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              <path
                d={vis.line}
                fill="none"
                stroke="var(--evergreen)"
                strokeWidth="1.5"
                strokeDasharray="4 3"
                vectorEffect="non-scaling-stroke"
              />
              {active !== null && (
                <line
                  x1={xAt(active, data.length)}
                  x2={xAt(active, data.length)}
                  y1={0}
                  y2={HEIGHT}
                  stroke="var(--foreground)"
                  strokeWidth="1"
                  strokeOpacity="0.5"
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </svg>
            {active !== null && activePoint && (
              <>
                {[
                  { value: activePoint.pageviews, color: "var(--accent)" },
                  { value: activePoint.visitors, color: "var(--evergreen)" },
                ].map((dot) => (
                  <span
                    key={dot.color}
                    className="absolute w-2.5 h-2.5 rounded-full border-2 border-background pointer-events-none"
                    style={{
                      left: `${activeLeftPct}%`,
                      top: `${(yAt(dot.value, top) / HEIGHT) * 100}%`,
                      background: dot.color,
                      transform: "translate(-50%, -50%)",
                    }}
                  />
                ))}
                <div
                  className="absolute top-1 z-10 pointer-events-none rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-md whitespace-nowrap"
                  style={{
                    left: `${activeLeftPct}%`,
                    transform: `translateX(${activeLeftPct > 55 ? "calc(-100% - 10px)" : "10px"})`,
                  }}
                >
                  <div className="font-display text-foreground">{formatBucket(activePoint.date, true)}</div>
                  <div className="text-foreground/90">
                    <span style={{ color: "var(--accent)" }}>Pageviews</span>{" "}
                    <span className="font-mono-tabular">{activePoint.pageviews.toLocaleString("en-CA")}</span>
                  </div>
                  <div className="text-foreground/90">
                    <span style={{ color: "var(--evergreen)" }}>Visitors</span>{" "}
                    <span className="font-mono-tabular">{activePoint.visitors.toLocaleString("en-CA")}</span>
                  </div>
                  {activeNotes.map((note) => (
                    <div key={note} className="text-muted-2 mt-1">
                      {note}
                    </div>
                  ))}
                  {hover === null && <div className="text-muted-2 mt-1">Pinned. Click again to release.</div>}
                </div>
              </>
            )}
          </div>
          <div className="relative h-4 mt-1 text-[10px] text-muted-2">
            {labelAt.map((i) => {
              const last = i === data.length - 1 && data.length > 1;
              const first = i === 0;
              return (
                <span
                  key={i}
                  className="absolute whitespace-nowrap"
                  style={{
                    left: `${(xAt(i, data.length) / WIDTH) * 100}%`,
                    transform: first ? "none" : last ? "translateX(-100%)" : "translateX(-50%)",
                  }}
                >
                  {formatBucket(data[i].date, hourly && (first || data[i].date.slice(11, 13) === "00"))}
                </span>
              );
            })}
          </div>
        </div>
      </div>
      <p className="mt-1 text-xs text-muted-2">
        Highest point: {peakValue.toLocaleString("en-CA")} pageview{peakValue === 1 ? "" : "s"} on{" "}
        {formatBucket(peak.date, true)}. Hover the chart for exact numbers, click to pin one.
      </p>
    </div>
  );
}

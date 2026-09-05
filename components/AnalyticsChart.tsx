interface Point {
  date: string;
  pageviews: number;
  visitors: number;
}

const WIDTH = 600;
const HEIGHT = 160;
const PADDING = 8;

function buildPath(values: number[], max: number): { line: string; area: string } {
  if (values.length === 0) return { line: "", area: "" };
  const step = values.length > 1 ? (WIDTH - PADDING * 2) / (values.length - 1) : 0;
  const points = values.map((v, i) => {
    const x = PADDING + i * step;
    const y = HEIGHT - PADDING - (max > 0 ? (v / max) * (HEIGHT - PADDING * 2) : 0);
    return [x, y] as const;
  });
  const line = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area =
    line +
    ` L${points[points.length - 1][0].toFixed(1)},${HEIGHT - PADDING} L${points[0][0].toFixed(1)},${HEIGHT - PADDING} Z`;
  return { line, area };
}

export function AnalyticsChart({ data }: { data: Point[] }) {
  if (data.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-sm text-muted-2">
        No traffic recorded in this window yet.
      </div>
    );
  }

  const pageviews = data.map((d) => d.pageviews);
  const visitors = data.map((d) => d.visitors);
  const max = Math.max(1, ...pageviews);

  const pv = buildPath(pageviews, max);
  const vis = buildPath(visitors, max);

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-40" preserveAspectRatio="none">
      <defs>
        <linearGradient id="pvGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={pv.area} fill="url(#pvGradient)" />
      <path d={pv.line} fill="none" stroke="var(--accent)" strokeWidth="2" />
      <path d={vis.line} fill="none" stroke="var(--evergreen)" strokeWidth="1.5" strokeDasharray="4 3" />
    </svg>
  );
}

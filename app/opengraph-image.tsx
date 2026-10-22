import { ImageResponse } from "next/og";

// Site home (todaystab.com/) has no region, so it can't use app/[region]/opengraph-image.tsx's
// per-region theme. Same layout, fixed brand colours (the layout's themeColor).
export const alt = "TodaysTab: local food & drink deals today";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#fbf6ef",
          backgroundImage: "radial-gradient(circle at 25% 20%, #f3dccb 0%, #fbf6ef 55%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28 }}>
          <div
            style={{
              display: "flex",
              width: 84,
              height: 84,
              borderRadius: "50%",
              backgroundColor: "#b5502c",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 40,
              color: "#fbf6ef",
              fontWeight: 700,
            }}
          >
            T
          </div>
          <div style={{ display: "flex", fontSize: 68, fontWeight: 700, color: "#2b2118", letterSpacing: -1 }}>
            TodaysTab
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 32, color: "#b5502c", fontWeight: 500 }}>
          What&apos;s actually on today -- verified, not guessed.
        </div>
      </div>
    ),
    { ...size }
  );
}

import { ImageResponse } from "next/og";
import { getPrimaryRegion } from "@/lib/regions";

// Auto-picked up by Next.js: generates the og:image/twitter:image meta tags for
// every page that doesn't define its own opengraph-image, so a shared link
// (Facebook, iMessage, Slack, etc.) shows a real branded card instead of
// nothing. Uses getPrimaryRegion() (a plain DB read, no headers()) rather than
// getCurrentRegion() so this stays compatible with static/ISR rendering --
// same reasoning as app/layout.tsx's own metadata. See docs/superpowers/specs/
// 2026-09-07-multi-region-platform-design.md's "Deferred" section: this will
// need to become genuinely per-domain once a second region actually launches.
export const alt = "Kelowna Food Deals";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const region = await getPrimaryRegion();

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
          backgroundColor: region.backgroundColor,
          backgroundImage: `radial-gradient(circle at 25% 20%, ${region.accentSoftColor} 0%, ${region.backgroundColor} 55%)`,
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            marginBottom: 28,
          }}
        >
          <div
            style={{
              display: "flex",
              width: 84,
              height: 84,
              borderRadius: "50%",
              backgroundColor: region.accentColor,
              alignItems: "center",
              justifyContent: "center",
              fontSize: 40,
              color: region.backgroundColor,
              fontWeight: 700,
            }}
          >
            {region.brandName.charAt(0)}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 68,
              fontWeight: 700,
              color: region.foregroundColor,
              letterSpacing: -1,
            }}
          >
            {region.brandName}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 32,
            color: region.evergreenColor,
            fontWeight: 500,
          }}
        >
          What&apos;s actually on today — verified, not guessed.
        </div>
      </div>
    ),
    { ...size }
  );
}

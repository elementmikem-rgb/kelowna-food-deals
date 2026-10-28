import { ImageResponse } from "next/og";
import { getCurrentRegion } from "@/lib/regions";

// Auto-picked up by Next.js: generates the og:image/twitter:image meta tags for
// every page that doesn't define its own opengraph-image, so a shared link
// (Facebook, iMessage, Slack, etc.) shows a real branded card instead of
// a plain placeholder.
export const alt = "Food & drink deals today";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const region = await getCurrentRegion();

  // Strip the generic suffix to get the city/region name only
  const cityName = region.brandName
    .replace(/ Food Deals$/, "")
    .replace(/ Spéciaux alimentaires$/, "")
    .trim();

  // Scale city name font down for longer names
  const cityFontSize = cityName.length > 18 ? 64 : cityName.length > 12 ? 80 : 96;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 80px",
          backgroundColor: region.backgroundColor,
          backgroundImage: `radial-gradient(ellipse at 0% 110%, ${region.accentSoftColor} 0%, ${region.backgroundColor} 52%)`,
          fontFamily: "sans-serif",
        }}
      >
        {/* Top: TodaysTab wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              display: "flex",
              width: 44,
              height: 44,
              borderRadius: "50%",
              backgroundColor: region.accentColor,
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              color: region.backgroundColor,
              fontWeight: 800,
            }}
          >
            T
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 26,
              fontWeight: 600,
              color: region.foregroundColor,
              opacity: 0.6,
              letterSpacing: -0.5,
            }}
          >
            TodaysTab
          </div>
        </div>

        {/* Centre: city name + tagline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              display: "flex",
              fontSize: cityFontSize,
              fontWeight: 800,
              color: region.foregroundColor,
              letterSpacing: -2,
              lineHeight: 1,
            }}
          >
            {cityName}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                width: 4,
                height: 36,
                borderRadius: 2,
                backgroundColor: region.accentColor,
              }}
            />
            <div
              style={{
                display: "flex",
                fontSize: 30,
                color: region.evergreenColor,
                fontWeight: 600,
              }}
            >
              {region.language === "fr"
                ? "Happy hours & spéciaux — vérifiés aujourd'hui"
                : "Happy hours & deals — checked today"}
            </div>
          </div>
        </div>

        {/* Bottom: domain */}
        <div
          style={{
            display: "flex",
            fontSize: 22,
            color: region.foregroundColor,
            opacity: 0.4,
            fontWeight: 500,
            letterSpacing: 0.5,
          }}
        >
          todaystab.com
        </div>
      </div>
    ),
    { ...size }
  );
}

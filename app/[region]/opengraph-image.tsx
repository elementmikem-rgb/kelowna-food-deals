import { readFileSync } from "fs";
import { join } from "path";
import { ImageResponse } from "next/og";
import { getCurrentRegion } from "@/lib/regions";

export const alt = "Food & drink deals today";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const region = await getCurrentRegion();

  const cityName = region.brandName
    .replace(/ Food Deals$/, "")
    .replace(/ Spéciaux alimentaires$/, "")
    .trim();

  const cityFontSize =
    cityName.length > 22 ? 58 :
    cityName.length > 16 ? 74 :
    cityName.length > 10 ? 90 : 108;

  const logoPng = readFileSync(join(process.cwd(), "public/icons/icon-512.png"));
  const logoSrc = `data:image/png;base64,${logoPng.toString("base64")}`;

  // Logo's own palette — always these regardless of region theme
  const logoCoral = "#e8946a";
  const logoGreen = "#3d6b48";
  const bg = "#f2ece0";
  const fg = "#12100a";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          backgroundColor: bg,
          fontFamily: "sans-serif",
        }}
      >
        {/* Logo — large, bleeds slightly off the left edge */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          width={500}
          height={500}
          alt=""
          style={{ marginLeft: -20, flexShrink: 0 }}
        />

        {/* Thin vertical divider */}
        <div
          style={{
            display: "flex",
            width: 3,
            height: 280,
            backgroundColor: logoGreen,
            opacity: 0.2,
            marginLeft: 52,
            marginRight: 52,
            borderRadius: 2,
            flexShrink: 0,
          }}
        />

        {/* Right: city name block */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div
            style={{
              display: "flex",
              fontSize: 14,
              fontWeight: 800,
              color: logoCoral,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              marginBottom: 12,
            }}
          >
            {region.language === "fr" ? "Spéciaux aujourd'hui à" : "Deals on now in"}
          </div>

          <div
            style={{
              display: "flex",
              fontSize: cityFontSize,
              fontWeight: 900,
              color: fg,
              letterSpacing: -3,
              lineHeight: 0.88,
            }}
          >
            {cityName}
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 22,
              color: logoGreen,
              fontWeight: 600,
              marginTop: 20,
              opacity: 0.8,
            }}
          >
            {region.language === "fr"
              ? "Happy hours & spéciaux — vérifiés aujourd'hui."
              : "Happy hours & specials — checked today."}
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 16,
              color: fg,
              opacity: 0.28,
              marginTop: 10,
              letterSpacing: "0.05em",
            }}
          >
            todaystab.com
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}

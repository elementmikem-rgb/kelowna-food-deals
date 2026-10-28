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
    cityName.length > 22 ? 54 :
    cityName.length > 16 ? 68 :
    cityName.length > 10 ? 84 : 100;

  const heroBuf = readFileSync(join(process.cwd(), "public/images/og-hero.jpg"));
  const heroSrc = `data:image/jpeg;base64,${heroBuf.toString("base64")}`;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", fontFamily: "sans-serif" }}>
        {/* Photo background — already sized 1200×630 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={heroSrc} width={1200} height={630} alt="" style={{ position: "absolute", top: 0, left: 0 }} />

        {/* Gradient: transparent left → dark right for text readability */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to right, rgba(0,0,0,0) 30%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0.72) 100%)",
            display: "flex",
          }}
        />

        {/* Text block — right side */}
        <div
          style={{
            position: "absolute",
            right: 72,
            top: 0,
            bottom: 0,
            width: 520,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 13,
              fontWeight: 800,
              color: "rgba(255,220,180,0.85)",
              textTransform: "uppercase",
              letterSpacing: "0.22em",
              marginBottom: 14,
            }}
          >
            {region.language === "fr" ? "Spéciaux aujourd'hui à" : "Deals on now in"}
          </div>

          <div
            style={{
              display: "flex",
              fontSize: cityFontSize,
              fontWeight: 900,
              color: "#ffffff",
              letterSpacing: -2,
              lineHeight: 0.9,
            }}
          >
            {cityName}
          </div>

          <div
            style={{
              display: "flex",
              width: 48,
              height: 3,
              backgroundColor: "#e8946a",
              borderRadius: 2,
              marginTop: 22,
              marginBottom: 18,
            }}
          />

          <div
            style={{
              display: "flex",
              fontSize: 21,
              color: "rgba(255,255,255,0.82)",
              fontWeight: 400,
              lineHeight: 1.35,
            }}
          >
            {region.language === "fr"
              ? "Happy hours & spéciaux — vérifiés aujourd'hui."
              : "Happy hours & specials — checked today."}
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 15,
              color: "rgba(255,255,255,0.38)",
              marginTop: 16,
              letterSpacing: "0.06em",
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

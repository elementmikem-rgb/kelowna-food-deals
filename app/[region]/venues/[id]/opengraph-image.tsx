import { readFileSync } from "fs";
import { join } from "path";
import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { getRegionById } from "@/lib/regions";
import { getVenueById, getVenueSpecials, getVenueCardPhoto } from "@/lib/venues-data";
import { pickCardDeal, truncateForCard, venueNameFontSize, cityFromBrand } from "@/lib/venue-card";

export const alt = "Venue specials on TodaysTab";
export const size = { width: 1200, height: 630 };
export const contentType = "image/jpeg";

// A venue's own photo, cropped to the card and re-encoded small. Stored photos run ~500KB and
// would otherwise be inlined as base64 into the rendered PNG. Any failure falls back to the
// shared hero (same photo the region card uses), so a bad image never breaks the preview.
async function venuePhotoSrc(venueId: number): Promise<string | null> {
  try {
    const photo = await getVenueCardPhoto(venueId);
    if (!photo) return null;
    const { default: sharp } = await import("sharp");
    const buf = await sharp(Buffer.from(photo.photoData, "base64"))
      .rotate()
      .resize(1200, 630, { fit: "cover" })
      .jpeg({ quality: 70 })
      .toBuffer();
    return `data:image/jpeg;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: Promise<{ region: string; id: string }> }) {
  const { id } = await params;
  const venueId = Number(id);
  if (!Number.isInteger(venueId)) notFound();

  const venue = await getVenueById(venueId);
  if (!venue) notFound();
  const region = await getRegionById(venue.regionId);
  if (!region) notFound();

  const lang = region.language === "fr" ? "fr" : "en";
  const cityName = cityFromBrand(region.brandName);

  const [specials, venuePhoto] = await Promise.all([getVenueSpecials(venue.id), venuePhotoSrc(venue.id)]);
  const deal = pickCardDeal(specials, lang);

  const photoSrc =
    venuePhoto ??
    `data:image/jpeg;base64,${readFileSync(join(process.cwd(), "public/images/og-hero.jpg")).toString("base64")}`;

  const name = truncateForCard(venue.name, 60);
  const fallbackLine = lang === "fr" ? "Happy hours & spéciaux alimentaires" : "Happy hours & food specials";

  const card = new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", fontFamily: "sans-serif" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photoSrc} width={1200} height={630} alt="" style={{ position: "absolute", top: 0, left: 0 }} />

        {venuePhoto ? (
          // A venue photo can be busy anywhere, so it gets an even dark wash plus a heavier fade
          // behind the text column. The shared hero is calm enough for the lighter fade below.
          <>
            <div style={{ position: "absolute", top: 0, left: 0, width: 1200, height: 630, backgroundColor: "rgba(12,9,6,0.45)", display: "flex" }} />
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: 1200,
                height: 630,
                background: "linear-gradient(to right, rgba(12,9,6,0) 35%, rgba(12,9,6,0.9) 55%, rgba(12,9,6,0.95) 100%)",
                display: "flex",
              }}
            />
          </>
        ) : (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 1200,
              height: 630,
              background: "linear-gradient(to right, rgba(0,0,0,0) 30%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0.72) 100%)",
              display: "flex",
            }}
          />
        )}

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
              fontSize: 17,
              fontWeight: 800,
              color: "#ffd9b8",
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              marginBottom: 14,
            }}
          >
            {lang === "fr" ? `Spéciaux à ${cityName}` : `Deals in ${cityName}`}
          </div>

          <div
            style={{
              display: "flex",
              fontSize: venueNameFontSize(name),
              fontWeight: 900,
              color: "#ffffff",
              letterSpacing: -2,
              lineHeight: 0.95,
              textShadow: "0 2px 16px rgba(0,0,0,0.6), 0 1px 4px rgba(0,0,0,0.8)",
            }}
          >
            {name}
          </div>

          <div style={{ display: "flex", width: 52, height: 3, backgroundColor: "#e8946a", borderRadius: 2, marginTop: 22, marginBottom: 20 }} />

          <div
            style={{
              display: "flex",
              fontSize: 30,
              color: "#ffffff",
              fontWeight: 700,
              lineHeight: 1.25,
              textShadow: "0 1px 8px rgba(0,0,0,0.75)",
            }}
          >
            {deal ?? fallbackLine}
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 19,
              color: "rgba(255,220,180,0.9)",
              marginTop: 10,
              textShadow: "0 1px 6px rgba(0,0,0,0.7)",
            }}
          >
            {truncateForCard(venue.address, 60)}
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 16,
              color: "rgba(255,255,255,0.55)",
              marginTop: 18,
              letterSpacing: "0.08em",
              textShadow: "0 1px 4px rgba(0,0,0,0.6)",
            }}
          >
            {lang === "fr" ? "Vérifié, pas deviné · todaystab.com" : "Verified, not guessed · todaystab.com"}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );

  // Re-encode the PNG as JPEG: roughly 10x smaller, which keeps the preview inside the size
  // limits some chat apps apply. Deals change, so unlike a static card this is not cached forever.
  const headers = { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" };
  const png = Buffer.from(await card.arrayBuffer());
  try {
    const { default: sharp } = await import("sharp");
    const jpeg = await sharp(png).jpeg({ quality: 82 }).toBuffer();
    return new Response(new Uint8Array(jpeg), { headers: { ...headers, "Content-Type": "image/jpeg" } });
  } catch {
    return new Response(new Uint8Array(png), { headers: { ...headers, "Content-Type": "image/png" } });
  }
}

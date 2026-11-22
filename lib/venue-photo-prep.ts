import sharp from "sharp";

// Turns an image a venue emailed us into the JPEG we store in venue_photos. Same output as the site's other
// photos (1000 px wide, JPEG q78), so storage stays small. Throws if the bytes are not a decodable image.

export type VenuePhotoMode = "photo" | "logo";

// The public listing page crops its hero image to a wide banner (object-cover): about 3.4 to 1 on desktop (h-72 at
// roughly 1000 px wide), which cuts a square logo to a strip. A logo is therefore centered on a banner-shaped canvas in the page's surface color (--surface:
// #fffbf0), so the whole logo shows and the edges blend into the card.
export const LOGO_CANVAS = { width: 1000, height: 290 } as const;
const SURFACE = { r: 255, g: 251, b: 240 };

export async function prepareVenuePhoto(
  input: Buffer,
  mode: VenuePhotoMode
): Promise<{ data: Buffer; mimeType: "image/jpeg" }> {
  const base = sharp(input).rotate(); // honour EXIF orientation
  if (mode === "logo") {
    const data = await base
      .flatten({ background: SURFACE })
      .resize({
        width: LOGO_CANVAS.width,
        height: LOGO_CANVAS.height,
        fit: "contain",
        background: SURFACE,
        withoutEnlargement: false,
      })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();
    return { data, mimeType: "image/jpeg" };
  }
  const data = await base
    .flatten({ background: "#ffffff" })
    .resize({ width: 1000, withoutEnlargement: true })
    .jpeg({ quality: 78, mozjpeg: true })
    .toBuffer();
  return { data, mimeType: "image/jpeg" };
}

import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { prepareVenuePhoto, LOGO_CANVAS } from "./venue-photo-prep";

async function solidPng(width: number, height: number, color: { r: number; g: number; b: number }, alpha = 1) {
  return sharp({ create: { width, height, channels: 4, background: { ...color, alpha } } }).png().toBuffer();
}

describe("prepareVenuePhoto: photo", () => {
  it("shrinks a large photo to 1000 px wide and re-encodes as JPEG", async () => {
    const out = await prepareVenuePhoto(await solidPng(3000, 2000, { r: 200, g: 40, b: 40 }), "photo");
    expect(out.mimeType).toBe("image/jpeg");
    const meta = await sharp(out.data).metadata();
    expect(meta.format).toBe("jpeg");
    expect(meta.width).toBe(1000);
    expect(meta.height).toBe(667);
  });

  it("never enlarges a small photo", async () => {
    const out = await prepareVenuePhoto(await solidPng(400, 300, { r: 10, g: 120, b: 60 }), "photo");
    const meta = await sharp(out.data).metadata();
    expect(meta.width).toBe(400);
    expect(meta.height).toBe(300);
  });

  it("flattens transparency onto white instead of black", async () => {
    const out = await prepareVenuePhoto(await solidPng(200, 200, { r: 0, g: 0, b: 0 }, 0), "photo");
    const { data } = await sharp(out.data).raw().toBuffer({ resolveWithObject: true });
    expect(data[0]).toBeGreaterThan(240);
  });
});

describe("prepareVenuePhoto: logo", () => {
  it("places the whole logo on a banner-shaped canvas so the wide hero does not crop it", async () => {
    const out = await prepareVenuePhoto(await solidPng(1000, 1000, { r: 30, g: 30, b: 30 }), "logo");
    const meta = await sharp(out.data).metadata();
    expect(meta.width).toBe(LOGO_CANVAS.width);
    expect(meta.height).toBe(LOGO_CANVAS.height);
  });

  it("fills the sides with the page surface color and keeps the logo in the middle", async () => {
    const out = await prepareVenuePhoto(await solidPng(1000, 1000, { r: 30, g: 30, b: 30 }), "logo");
    const { data, info } = await sharp(out.data).raw().toBuffer({ resolveWithObject: true });
    const px = (x: number, y: number) => {
      const i = (y * info.width + x) * info.channels;
      return [data[i], data[i + 1], data[i + 2]];
    };
    const left = px(5, Math.floor(info.height / 2));
    const centre = px(Math.floor(info.width / 2), Math.floor(info.height / 2));
    expect(left[0]).toBeGreaterThan(240); // cream, close to #fffbf0
    expect(centre[0]).toBeLessThan(60); // the dark logo
  });

  it("rejects bytes that are not an image", async () => {
    await expect(prepareVenuePhoto(Buffer.from("not an image at all"), "photo")).rejects.toThrow();
  });
});

"use client";

// Shared client-side image handling for anything that uploads a photo to the server as
// base64 (submissions, the boost photo/poster add-on). Extracted out of
// components/SubmitForm.tsx so both callers stay in sync on the same resize behavior
// instead of drifting.

export function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const MAX_DIMENSION = 1600;

// Phone camera photos are routinely well over the server's 4MB limit, so downscale
// through a canvas before base64-encoding rather than letting the upload fail
// server-side.
export async function fileToBase64(file: File): Promise<{ data: string; mimeType: string }> {
  const dataUrl = await readAsDataUrl(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not read that image"));
      el.src = dataUrl;
    });

    const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const resized = canvas.toDataURL("image/jpeg", 0.85);
    const [, base64] = resized.split(",", 2);
    if (!base64) throw new Error("Canvas encode failed");
    return { data: base64, mimeType: "image/jpeg" };
  } catch {
    // Fall back to the original bytes if canvas processing isn't available.
    const [, base64] = dataUrl.split(",", 2);
    return { data: base64, mimeType: file.type };
  }
}

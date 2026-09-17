// Shared allowlist for any user-uploaded image this app stores and later serves back
// with a Content-Type header taken from the upload itself (booking photo add-on,
// venue_photos, submission photos). Without this, a crafted upload could set
// Content-Type to something like image/svg+xml or text/html and the server would
// dutifully echo that back on serve -- an SVG can carry <script>, and a browser that
// renders the response as HTML enables stored XSS from a file that looked like "just a
// photo" at upload time. Enforce this at BOTH ends: reject anything not in the
// allowlist when accepting an upload, and re-check defensively when serving one back,
// in case an already-stored row somehow predates this check.
export const SAFE_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function isSafeImageMimeType(mimeType: string): boolean {
  return SAFE_IMAGE_MIME_TYPES.has(mimeType);
}

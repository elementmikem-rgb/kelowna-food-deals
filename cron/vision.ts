import Anthropic from "@anthropic-ai/sdk";
import crypto from "crypto";
import { db, imageTranscriptions } from "@/db";
import { eq } from "drizzle-orm";

const MODEL = "claude-haiku-4-5-20251001";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export function hashImageBytes(imageBuffer: Buffer): string {
  return crypto.createHash("sha256").update(imageBuffer).digest("hex");
}

// A venue's promo image almost never changes night to night, so re-running the
// vision call on every fetch mostly just re-pays for the same transcription --
// this is the image-transcription equivalent of scrapeRuns.contentHash for HTML
// text. Looked up by imageUrl (stable per venue) and confirmed unchanged by
// hashing the freshly downloaded bytes -- a URL match alone isn't enough, since
// a venue can swap a new flyer in behind the same filename.
async function getCachedTranscription(imageUrl: string, contentHash: string): Promise<string | null> {
  const [row] = await db
    .select({ contentHash: imageTranscriptions.contentHash, transcribedText: imageTranscriptions.transcribedText })
    .from(imageTranscriptions)
    .where(eq(imageTranscriptions.imageUrl, imageUrl))
    .limit(1);
  if (!row || row.contentHash !== contentHash) return null;
  return row.transcribedText;
}

async function storeTranscription(imageUrl: string, contentHash: string, transcribedText: string): Promise<void> {
  await db
    .insert(imageTranscriptions)
    .values({ imageUrl, contentHash, transcribedText, lastCheckedAt: new Date() })
    .onConflictDoUpdate({
      target: imageTranscriptions.imageUrl,
      set: { contentHash, transcribedText, lastCheckedAt: new Date() },
    });
}

// Anthropic's own per-image limit -- an oversized image would just error out
// on the API call anyway, so skip the request entirely rather than spend a
// round-trip finding that out.
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

type SupportedImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

function toSupportedMediaType(contentType: string): SupportedImageMediaType | null {
  const type = contentType.split(";")[0]?.trim().toLowerCase();
  if (type === "image/jpeg" || type === "image/png" || type === "image/gif" || type === "image/webp") {
    return type;
  }
  return null;
}

// Some venues' entire "specials" content is a promo graphic or a flyer
// screenshot -- a plain HTML fetch's cheerio pass strips <img> tags to
// nothing, so that content was previously invisible to the whole pipeline
// (found live 2026-09-11: Kirin Seafood's homepage promo and Guildford
// Station's happy-hour flyer, both plain JPGs, both zero specials for
// months). This transcribes the image to plain text and hands that text
// back into the SAME extractVenueContent()/evidence-quote pipeline as any
// other page -- deliberately NOT asking the vision call to identify specials
// itself, so the existing anti-hallucination verification (evidence_quote
// must appear verbatim in the source, price must appear in the quote) still
// applies to whatever this transcribes, instead of trusting a second model
// call blindly.
export async function transcribeImageText(
  imageBuffer: Buffer,
  contentType: string,
  imageUrl: string
): Promise<{ text: string; tokensUsed: number } | null> {
  if (imageBuffer.length > MAX_IMAGE_BYTES) {
    console.warn(`image transcription skipped: ${imageBuffer.length} bytes exceeds ${MAX_IMAGE_BYTES}`);
    return null;
  }
  const mediaType = toSupportedMediaType(contentType);
  if (!mediaType) {
    return null;
  }

  const contentHash = hashImageBytes(imageBuffer);
  try {
    const cached = await getCachedTranscription(imageUrl, contentHash);
    if (cached !== null) {
      return { text: cached, tokensUsed: 0 };
    }
  } catch (err) {
    // A cache-lookup failure shouldn't block transcription -- fall through and
    // pay for a fresh vision call rather than silently skipping the image.
    console.warn(`image transcription cache lookup failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      // 0, not the default -- this call's job is transcription of a static
      // image, not creative generation, so the correct output barely varies
      // run to run at temperature 0. Left at default, minor wording drift
      // between nights would change the image's transcribed text even when
      // the image itself never changed, which feeds into the venue's overall
      // content hash and would make "unchanged, skipped extraction" never
      // fire for an image-heavy venue -- paying for a fresh vision call and
      // a fresh Haiku extraction every single night for no real reason.
      temperature: 0,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: imageBuffer.toString("base64") } },
            {
              type: "text",
              text: "Transcribe ALL visible text in this image verbatim, exactly as written -- every item name, every price, every day/time/date. Do not summarize, interpret, categorize, or omit anything, and do not add any text that isn't visible in the image. If the image contains no readable text at all, respond with exactly: NO TEXT FOUND",
            },
          ],
        },
      ],
    });

    const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;
    const block = response.content.find((b) => b.type === "text");
    const text = block && block.type === "text" ? block.text.trim() : "";
    const finalText = /^no text found$/i.test(text) ? "" : text;
    try {
      await storeTranscription(imageUrl, contentHash, finalText);
    } catch (err) {
      // Losing the cache write just means tomorrow's fetch pays for a fresh
      // vision call again -- not worth failing an otherwise-successful transcription.
      console.warn(`image transcription cache write failed: ${err instanceof Error ? err.message : String(err)}`);
    }
    return { text: finalText, tokensUsed };
  } catch (err) {
    console.warn(`image transcription failed: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/request-rate-limit";
import {
  AUTOCOMPLETE_FIELD_MASK,
  buildAutocompleteBody,
  isValidSessionToken,
  normalizeAutocompleteQuery,
  parseAutocompleteResponse,
} from "@/lib/places-autocomplete";

// Address suggestions for the venue submission form. Needs GOOGLE_PLACES_API_KEY (server-only,
// never sent to the browser). Without it the route answers 503 and the form falls back to a plain box.
export async function GET(req: NextRequest) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return NextResponse.json({ suggestions: [], disabled: true }, { status: 503 });

  // 40 lookups per visitor per 10 minutes: a person typing an address needs a handful.
  const rl = await checkRateLimit(req, "places-autocomplete", 40, 10);
  if (!rl.ok) return NextResponse.json({ suggestions: [] }, { status: 429 });

  const q = normalizeAutocompleteQuery(req.nextUrl.searchParams.get("q"));
  const session = req.nextUrl.searchParams.get("s");
  if (!q || !isValidSessionToken(session)) return NextResponse.json({ suggestions: [] });

  try {
    const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": AUTOCOMPLETE_FIELD_MASK },
      body: JSON.stringify(buildAutocompleteBody(q, session!)),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return NextResponse.json({ suggestions: [] });
    return NextResponse.json(
      { suggestions: parseAutocompleteResponse(await res.json()) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}

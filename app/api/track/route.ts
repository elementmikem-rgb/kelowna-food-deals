import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { trackEvent, isBotUserAgent } from "@/lib/analytics";
import { checkRateLimit } from "@/lib/request-rate-limit";

const trackSchema = z.object({
  eventType: z.string().min(1).max(50),
  eventLabel: z.string().max(200).nullable().optional(),
  page: z.string().min(1).max(500),
  sessionId: z.string().min(1).max(100),
  visitorId: z.string().min(1).max(100),
  referrer: z.string().max(500).nullable().optional(),
  utmSource: z.string().max(100).nullable().optional(),
  utmMedium: z.string().max(100).nullable().optional(),
  utmCampaign: z.string().max(100).nullable().optional(),
});

// Public, unauthenticated by design (called from every visitor's browser).
// Always returns 200 regardless of outcome — never hand a scraper/bot a
// signal about whether it was detected or filtered.
export async function POST(req: NextRequest) {
  try {
    // Generous by design — a real visitor fires several events per page view.
    // This only exists to cap a scripted flood, not to constrain normal browsing.
    const { ok } = await checkRateLimit(req, "track", 60, 1);
    if (!ok) return NextResponse.json({ ok: true });

    const body = await req.json().catch(() => null);
    const parsed = trackSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ ok: true });

    const userAgent = req.headers.get("user-agent");
    if (isBotUserAgent(userAgent)) return NextResponse.json({ ok: true });

    // Second line of defense for the kds_dnt opt-out cookie (client already
    // skips sending when set) — covers any client that bypasses track.js.
    if (req.cookies.get("kds_dnt")?.value === "1") return NextResponse.json({ ok: true });

    const country = req.headers.get("cf-ipcountry");

    await trackEvent({
      ...parsed.data,
      country: country && country !== "XX" ? country : null,
    });
  } catch (err) {
    console.error("Analytics track failed:", err);
  }
  return NextResponse.json({ ok: true });
}

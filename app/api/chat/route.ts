import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, chatQueries } from "@/db";
import { sql } from "drizzle-orm";
import { checkRateLimit, clientIp } from "@/lib/request-rate-limit";
import { getRegionById, getRegionContext } from "@/lib/regions";
import { answerRegionQuestion, QuestionTooLongError } from "@/lib/region-chat";

// Backstop against a single day draining the account -- this is the first real-time
// (non-batch) Anthropic cost this app has, unlike the nightly cron's tightly-budgeted
// Batch API spend. Checked before every Anthropic call, so a day over the cap costs
// nothing further regardless of how many people ask.
const CHAT_DAILY_QUERY_CAP = Number(process.env.CHAT_DAILY_QUERY_CAP) || 300;
const UNAVAILABLE_MESSAGE = "This is getting a lot of questions right now -- please try again tomorrow.";

const chatTurnSchema = z.object({
  question: z.string().trim().min(1).max(200),
  answer: z.string().trim().min(1).max(1000),
});

const chatSchema = z.object({
  regionId: z.number().int().positive(),
  question: z.string().trim().min(1).max(200),
  // Client sends its own visible log back so the server stays stateless -- capped here
  // too (not just in lib/region-chat.ts) so a tampered request can't force a bigger call
  // than the UI would ever produce on its own.
  history: z.array(chatTurnSchema).max(4).optional(),
});

export async function POST(req: NextRequest) {
  // Raised from 5 -- with follow-ups now supported, a single real conversation can be
  // several messages, and the old cap tripped mid-conversation for a normal visitor.
  const { ok: withinLimit } = await checkRateLimit(req, "chat", 12, 30);
  if (!withinLimit) {
    return NextResponse.json({ error: "too many questions, try again later" }, { status: 429 });
  }

  const parsed = chatSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "invalid payload" }, { status: 400 });
  }
  const { regionId, question, history } = parsed.data;

  const region = await getRegionById(regionId);
  if (!region) {
    return NextResponse.json({ error: "region not found" }, { status: 404 });
  }

  // Pacific calendar day, matching the same convention lib/scrape-health.ts's
  // getCronSpend and the weekly digest already use for "today" across this app.
  const [{ count: todayCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(chatQueries)
    .where(sql`${chatQueries.createdAt} AT TIME ZONE 'America/Vancouver' >= date_trunc('day', now() AT TIME ZONE 'America/Vancouver')`);

  if (todayCount >= CHAT_DAILY_QUERY_CAP) {
    return NextResponse.json({ answer: UNAVAILABLE_MESSAGE });
  }

  const { timezone } = await getRegionContext(region);

  try {
    const { answer, tokensUsed } = await answerRegionQuestion(
      region.id,
      timezone,
      region.brandName,
      region.language,
      question,
      history
    );

    await db.insert(chatQueries).values({
      regionId: region.id,
      question,
      answer,
      tokensUsed,
      ip: clientIp(req),
    });

    return NextResponse.json({ answer });
  } catch (err) {
    if (err instanceof QuestionTooLongError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Region chat failed:", err);
    return NextResponse.json({ error: "couldn't get an answer, try again" }, { status: 500 });
  }
}

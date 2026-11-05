import { lt } from "drizzle-orm";
import { db, chatQueries } from "@/db";

// Questions are stored with the asker's IP, so they are not kept indefinitely. The privacy page
// states this number (checked by lib/privacy-copy.test.ts). Kept apart from chat-data.ts because
// the nightly cron imports this file and chat-data pulls in next/headers.
export const CHAT_RETENTION_DAYS = 90;

export async function pruneChatQueries(): Promise<{ deleted: number }> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - CHAT_RETENTION_DAYS);
  const result = await db
    .delete(chatQueries)
    .where(lt(chatQueries.createdAt, cutoff))
    .returning({ id: chatQueries.id });
  return { deleted: result.length };
}

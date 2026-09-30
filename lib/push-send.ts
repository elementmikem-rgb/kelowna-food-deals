import webpush from "web-push";
import { db, pushSubscriptions } from "@/db";
import { eq, inArray } from "drizzle-orm";

let configured = false;
function ensureConfigured(): boolean {
  if (configured) return true;
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  // All three unset (nothing pasted into Railway yet, see the feature's own rollout
  // note) or missing -- every send becomes a silent no-op rather than a crash, so the
  // rest of the app (flash special posting, etc.) works identically whether or not
  // push has been switched on yet.
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) return false;
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  configured = true;
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  url: string;
}

// Sends to every subscription in a region and prunes ones the push service reports as
// gone (404/410 -- the browser unsubscribed, uninstalled, or the endpoint expired).
// Never throws: a push failure should never break the caller's own flow (e.g. posting a
// flash special still succeeds even if notifying subscribers fails).
export async function sendPushToRegion(regionId: number, payload: PushPayload): Promise<void> {
  if (!ensureConfigured()) return;

  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.regionId, regionId));
  if (subs.length === 0) return;

  const dead: number[] = [];
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload),
          // Without an explicit urgency, Android/FCM delivers the push but doesn't
          // treat it as important enough for a heads-up banner -- it just lands
          // silently in the notification tray (confirmed live: vibration + icon
          // fired, no pop-down). "high" is the right call here specifically because
          // every payload this function ever sends is a flash deal, which is
          // inherently time-limited and worth interrupting for -- this isn't a
          // general-purpose notification sender.
          { urgency: "high" }
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) dead.push(sub.id);
        // Any other error (network blip, malformed payload) is left alone -- a single
        // failed send isn't evidence the subscription itself is dead.
      }
    })
  );

  if (dead.length > 0) {
    await db.delete(pushSubscriptions).where(inArray(pushSubscriptions.id, dead));
  }
}

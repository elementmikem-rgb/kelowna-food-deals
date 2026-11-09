// The weekly owner digest is off unless WEEKLY_DIGEST_ENABLED=1 is set on the cron
// service. It also needs ADMIN_SESSION_SECRET, BREVO_API_KEY and REPORT_EMAIL_FROM there.
export function weeklyDigestsEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.WEEKLY_DIGEST_ENABLED === "1";
}

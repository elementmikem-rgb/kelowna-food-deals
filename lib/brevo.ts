interface SendEmailParams {
  subject: string;
  textContent: string;
}

export async function sendReportEmail({ subject, textContent }: SendEmailParams): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  const toEmail = process.env.REPORT_EMAIL_TO;
  const fromEmail = process.env.REPORT_EMAIL_FROM;

  if (!apiKey || !toEmail || !fromEmail) {
    throw new Error("BREVO_API_KEY, REPORT_EMAIL_TO, and REPORT_EMAIL_FROM must be set");
  }

  // Retry network failures and 5xx only — a 4xx (bad key, bad payload) will
  // never succeed on retry.
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 500));

    let res: Response;
    try {
      res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey,
        },
        body: JSON.stringify({
          sender: { email: fromEmail, name: "Kelowna Daily Specials" },
          to: [{ email: toEmail }],
          subject,
          textContent,
        }),
        signal: AbortSignal.timeout(15000),
      });
    } catch (err) {
      lastError = new Error(
        `Brevo send failed: ${err instanceof Error ? err.message : String(err)}`
      );
      continue;
    }

    if (res.ok) return;

    const body = await res.text();
    lastError = new Error(`Brevo send failed: ${res.status} ${body}`);
    if (res.status < 500) throw lastError;
  }

  throw lastError ?? new Error("Brevo send failed");
}

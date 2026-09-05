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

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
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
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Brevo send failed: ${res.status} ${body}`);
  }
}

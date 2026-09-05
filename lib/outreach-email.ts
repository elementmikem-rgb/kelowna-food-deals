interface SendParams {
  to: string;
  subject: string;
  htmlContent: string;
  replyTo?: string;
  headers?: Record<string, string>;
}

interface SendResult {
  messageId: string;
}

export async function sendOutreachEmail({
  to,
  subject,
  htmlContent,
  replyTo,
  headers,
}: SendParams): Promise<SendResult> {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.REPORT_EMAIL_FROM;

  if (!apiKey || !fromEmail) {
    throw new Error("BREVO_API_KEY and REPORT_EMAIL_FROM must be set");
  }

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      sender: { email: fromEmail, name: "Kelowna Food Deals" },
      to: [{ email: to }],
      replyTo: replyTo ? { email: replyTo } : { email: "reply@reply.kelownafooddeals.shop" },
      subject,
      htmlContent,
      headers,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Brevo send failed: ${res.status} ${body}`);
  }

  const data = (await res.json()) as { messageId: string };
  return { messageId: data.messageId };
}

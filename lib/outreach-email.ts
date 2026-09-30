interface SendParams {
  to: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  replyTo?: string;
  senderName?: string;
  headers?: Record<string, string>;
  // Echoed back verbatim on every open/click/bounce event Brevo posts to our
  // webhook -- unlike the SMTP messageId this call returns, which is NOT what
  // Brevo's webhook payload's own "message-id" field contains (that's a
  // separate internal id, format "an#..."), so tags are the only reliable way
  // to tie an engagement event back to a specific outreachSends row.
  tags?: string[];
}

interface SendResult {
  messageId: string;
}

export async function sendOutreachEmail({
  to,
  subject,
  htmlContent,
  textContent,
  replyTo,
  senderName,
  headers,
  tags,
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
      sender: { email: fromEmail, name: senderName ?? "TodaysTab" },
      to: [{ email: to }],
      replyTo: replyTo ? { email: replyTo } : { email: fromEmail },
      subject,
      htmlContent,
      textContent,
      headers,
      tags,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Brevo send failed: ${res.status} ${body}`);
  }

  const data = (await res.json()) as { messageId: string };
  return { messageId: data.messageId };
}

// Detects auto replies, out-of-office messages and bounce notices arriving at
// the inbound webhook (app/api/webhooks/brevo-inbound/[token]/route.ts).
//
// Brevo's inbound payload carries a "Headers" object: header name to value, a
// string for a header that appears once and a string[] for one that repeats
// (per Brevo's inbound parsing docs). Header names are matched
// case-insensitively. The body is deliberately NOT inspected: a real reply
// can easily say "I'm out of office next week", and archiving a real reply is
// worse than letting an auto reply through.

export type InboundHeaders = Record<string, string | string[] | undefined>;

export interface InboundClassification {
  kind: "reply" | "auto_reply" | "bounce_notice";
  reason: string;
}

interface ClassifyInput {
  headers: InboundHeaders | null | undefined;
  subject: string | null | undefined;
  fromEmail: string;
  // Accepted for callers' convenience but intentionally unused (see above).
  textBody?: string | null;
}

function header(headers: InboundHeaders | null | undefined, name: string): string | null {
  if (!headers) return null;
  const wanted = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() !== wanted || value === undefined) continue;
    return (Array.isArray(value) ? value.join(" ") : value).trim();
  }
  return null;
}

// Lowercase and strip accents so "Réponse automatique" matches "reponse automatique".
function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

const BOUNCE_SUBJECTS = [
  "undeliverable",
  "undelivered mail",
  "delivery status notification",
  "mail delivery failed",
  "delivery failure",
  "returned mail",
  "non remis",
  "echec de la remise",
];

const AUTO_REPLY_SUBJECTS = [
  "automatic reply",
  "auto reply",
  "auto-reply",
  "autoreply",
  "out of office",
  "out of the office",
  "reponse automatique",
  "absence du bureau",
  "absent du bureau",
];

export function classifyInbound({ headers, subject, fromEmail }: ClassifyInput): InboundClassification {
  const localPart = fromEmail.toLowerCase().split("@")[0];
  if (localPart === "mailer-daemon" || localPart === "postmaster") {
    return { kind: "bounce_notice", reason: `sender is ${localPart}` };
  }

  const normalizedSubject = normalize(subject ?? "");
  const bounceSubject = BOUNCE_SUBJECTS.find((s) => normalizedSubject.includes(s));
  if (bounceSubject) return { kind: "bounce_notice", reason: `subject contains "${bounceSubject}"` };

  const autoSubmitted = header(headers, "Auto-Submitted");
  if (autoSubmitted && autoSubmitted.toLowerCase() !== "no") {
    return { kind: "auto_reply", reason: `Auto-Submitted: ${autoSubmitted}` };
  }

  const precedence = header(headers, "Precedence")?.toLowerCase();
  if (precedence === "bulk" || precedence === "auto_reply" || precedence === "junk") {
    return { kind: "auto_reply", reason: `Precedence: ${precedence}` };
  }

  for (const name of ["X-Autoreply", "X-Autorespond"]) {
    const value = header(headers, name);
    if (value) return { kind: "auto_reply", reason: `${name}: ${value}` };
  }

  const autoSubject = AUTO_REPLY_SUBJECTS.find((s) => normalizedSubject.includes(s));
  if (autoSubject) return { kind: "auto_reply", reason: `subject contains "${autoSubject}"` };

  return { kind: "reply", reason: "no auto-reply or bounce signal" };
}

import { describe, it, expect } from "vitest";
import { classifyInbound } from "./inbound-classify";

const base = {
  headers: undefined,
  subject: "Re: Your free listing on TodaysTab",
  fromEmail: "owner@venue.com",
  textBody: "Thanks, our happy hour is 3 to 6.",
};

describe("classifyInbound: real replies", () => {
  it("classifies a plain reply as a reply", () => {
    expect(classifyInbound(base).kind).toBe("reply");
  });

  it("keeps a real reply that mentions out of office in the body", () => {
    const r = classifyInbound({
      ...base,
      textBody: "Sounds good. I will be out of office next week, so please email my manager. Automatic reply is off.",
    });
    expect(r.kind).toBe("reply");
  });

  it("keeps a reply whose Auto-Submitted header is 'no'", () => {
    expect(classifyInbound({ ...base, headers: { "Auto-Submitted": "no" } }).kind).toBe("reply");
  });

  it("keeps a reply with a normal Precedence header", () => {
    expect(classifyInbound({ ...base, headers: { Precedence: "first-class" } }).kind).toBe("reply");
  });

  it("handles missing subject and headers", () => {
    expect(classifyInbound({ headers: undefined, subject: null, fromEmail: "a@b.com", textBody: null }).kind).toBe(
      "reply"
    );
  });
});

describe("classifyInbound: auto replies (headers)", () => {
  it("flags Auto-Submitted auto-replied", () => {
    const r = classifyInbound({ ...base, headers: { "Auto-Submitted": "auto-replied" } });
    expect(r.kind).toBe("auto_reply");
    expect(r.reason).toMatch(/auto-submitted/i);
  });

  it("matches header names case-insensitively", () => {
    expect(classifyInbound({ ...base, headers: { "auto-submitted": "auto-generated" } }).kind).toBe("auto_reply");
  });

  it("flags Precedence bulk, auto_reply and junk", () => {
    for (const p of ["bulk", "auto_reply", "junk", "Bulk"]) {
      expect(classifyInbound({ ...base, headers: { Precedence: p } }).kind).toBe("auto_reply");
    }
  });

  it("flags X-Autoreply", () => {
    expect(classifyInbound({ ...base, headers: { "X-Autoreply": "yes" } }).kind).toBe("auto_reply");
  });

  it("does NOT treat X-Auto-Response-Suppress alone as an auto reply (Exchange stamps it on ordinary human mail)", () => {
    expect(classifyInbound({ ...base, headers: { "X-Auto-Response-Suppress": "DR, NDR, RN, NRN, OOF, AutoReply" } }).kind).toBe("reply");
  });

  it("reads array-valued headers (Brevo sends repeated headers as arrays)", () => {
    expect(classifyInbound({ ...base, headers: { "Auto-Submitted": ["auto-replied"] } }).kind).toBe("auto_reply");
  });
});

describe("classifyInbound: auto replies (subjects)", () => {
  it("flags English out-of-office subjects", () => {
    for (const subject of [
      "Automatic reply: Your free listing on TodaysTab",
      "Out of Office: Your free listing",
      "Auto Reply: hello",
      "Autoreply: hello",
    ]) {
      expect(classifyInbound({ ...base, subject }).kind).toBe("auto_reply");
    }
  });

  it("flags French out-of-office subjects, with or without accents", () => {
    for (const subject of [
      "Réponse automatique : Votre fiche gratuite sur TodaysTab",
      "Reponse automatique: Votre fiche",
      "Absence du bureau : Votre fiche",
      "Absent du bureau",
    ]) {
      expect(classifyInbound({ ...base, subject }).kind).toBe("auto_reply");
    }
  });
});

describe("classifyInbound: bounce notices", () => {
  it("flags English bounce subjects", () => {
    for (const subject of [
      "Undeliverable: Your free listing on TodaysTab",
      "Delivery Status Notification (Failure)",
      "Mail delivery failed: returning message to sender",
    ]) {
      expect(classifyInbound({ ...base, subject }).kind).toBe("bounce_notice");
    }
  });

  it("flags French bounce subjects", () => {
    expect(classifyInbound({ ...base, subject: "Non remis : Votre fiche gratuite" }).kind).toBe("bounce_notice");
  });

  it("flags mailer-daemon and postmaster senders", () => {
    expect(classifyInbound({ ...base, fromEmail: "MAILER-DAEMON@mx.example.com" }).kind).toBe("bounce_notice");
    expect(classifyInbound({ ...base, fromEmail: "postmaster@outlook.com" }).kind).toBe("bounce_notice");
  });

  it("prefers bounce_notice over auto_reply when both signals are present", () => {
    const r = classifyInbound({
      ...base,
      fromEmail: "mailer-daemon@googlemail.com",
      headers: { "Auto-Submitted": "auto-replied" },
      subject: "Delivery Status Notification (Failure)",
    });
    expect(r.kind).toBe("bounce_notice");
  });

  it("does not flag a sender whose address merely contains postmaster", () => {
    expect(classifyInbound({ ...base, fromEmail: "jane.postmasterson@venue.com" }).kind).toBe("reply");
  });
});

import { describe, it, expect } from "vitest";
import { emailBasis, websiteHost, BASIS_LABEL } from "./email-basis";

const base = { contactEmail: "info@pub.ca", website: "https://www.pub.ca/menu", wroteUs: false, verifiedAt: null, source: null };

describe("websiteHost", () => {
  it("returns the host without www, with or without a scheme", () => {
    expect(websiteHost("https://www.Pub.ca/menu?x=1")).toBe("pub.ca");
    expect(websiteHost("pub.ca/specials")).toBe("pub.ca");
  });
  it("returns an empty string for nothing or nonsense", () => {
    expect(websiteHost(null)).toBe("");
    expect(websiteHost("")).toBe("");
  });
});

describe("emailBasis", () => {
  it("owner_reply when they wrote to us from that address", () => {
    expect(emailBasis({ ...base, contactEmail: "bob@gmail.com", wroteUs: true })).toBe("owner_reply");
  });

  it("owner_reply is recorded as the source even if no inbound row is found", () => {
    expect(emailBasis({ ...base, contactEmail: "bob@gmail.com", source: "owner_reply" })).toBe("owner_reply");
  });

  it("verified when Mike confirmed it, whatever the address looks like", () => {
    expect(emailBasis({ ...base, contactEmail: "bob@gmail.com", verifiedAt: new Date() })).toBe("verified");
  });

  it("own_domain when the address is on the venue's own website domain", () => {
    expect(emailBasis(base)).toBe("own_domain");
    expect(emailBasis({ ...base, contactEmail: "events@mail.pub.ca" })).toBe("own_domain");
  });

  it("personal when it is a free mailbox provider and nothing else proves it", () => {
    expect(emailBasis({ ...base, contactEmail: "pubowner@gmail.com" })).toBe("personal");
    expect(emailBasis({ ...base, contactEmail: "x@videotron.ca" })).toBe("personal");
  });

  it("other_domain when the domain differs from the website", () => {
    expect(emailBasis({ ...base, contactEmail: "info@hospitalitygroup.com" })).toBe("other_domain");
  });

  it("unknown when there is no website to compare and it is not personal", () => {
    expect(emailBasis({ ...base, website: null, contactEmail: "info@somewhere.com" })).toBe("unknown");
  });

  it("is not fooled by a look-alike domain", () => {
    expect(emailBasis({ ...base, contactEmail: "info@notpub.ca" })).toBe("other_domain");
    expect(emailBasis({ ...base, contactEmail: "info@pub.ca.evil.com" })).toBe("other_domain");
  });

  it("has a readable label for every level", () => {
    for (const k of ["owner_reply", "verified", "own_domain", "personal", "other_domain", "unknown"] as const) {
      expect(BASIS_LABEL[k].length).toBeGreaterThan(0);
    }
  });
});

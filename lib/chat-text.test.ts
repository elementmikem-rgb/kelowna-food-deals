import { describe, it, expect } from "vitest";
import { chatText } from "./chat-text";

describe("chatText", () => {
  it("has the same wording keys in English and French, and no empty strings", () => {
    const en = chatText("en");
    const fr = chatText("fr");
    expect(Object.keys(fr).sort()).toEqual(Object.keys(en).sort());
    for (const v of [...Object.values(en), ...Object.values(fr)]) expect(v.length).toBeGreaterThan(0);
  });

  it("is actually French for a French region", () => {
    expect(chatText("fr").list).toBe("Liste");
    expect(chatText("fr").map).toBe("Carte");
    expect(chatText("en").list).toBe("List");
  });
});

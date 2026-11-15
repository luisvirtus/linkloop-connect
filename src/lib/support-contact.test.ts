import { describe, expect, it } from "vitest";
import { SUPPORT_WHATSAPP_URL } from "./support-contact";

describe("contato de suporte", () => {
  it("abre o WhatsApp com o número informado pelo responsável", () => {
    expect(SUPPORT_WHATSAPP_URL).toBe("https://wa.me/5541988083645");
  });
});

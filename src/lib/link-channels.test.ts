import { describe, expect, it } from "vitest";
import { normalizeLinkValue } from "./link-channels";
import { publicChannelEnabled } from "./commercial-rules";

describe("chamar atendente", () => {
  it("usa o número de WhatsApp do estabelecimento", () => {
    expect(normalizeLinkValue("waiter", "(11) 99999-8888")).toBe("https://wa.me/5511999998888");
  });
  it("fica pausado quando a assinatura vence", () => {
    expect(publicChannelEnabled(true, "waiter")).toBe(false);
  });
});
